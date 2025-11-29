import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Address,
  BigNum,
  LinearFee,
  Transaction,
  TransactionBuilder,
  TransactionBuilderConfigBuilder,
  TransactionOutput,
  TransactionUnspentOutput,
  TransactionUnspentOutputs,
  TransactionWitnessSet,
  Value,
} from '@emurgo/cardano-serialization-lib-browser';
import { Buffer } from 'buffer';
import { authService } from '../services/authService';
import '../components/Dashboard.css';

const BLOCKFROST_PROJECT_ID = 'previewzmMNAoEknB2pGpjPqEJa2pI3rwdHAeua';
const NETWORK = 'preview';
const WALLET_WHITELIST = [
  { id: 'nami', label: 'Nami' },
  { id: 'eternl', label: 'Eternl' },
  { id: 'flint', label: 'Flint' },
  { id: 'gerowallet', label: 'GeroWallet' },
  { id: 'lace', label: 'Lace' },
];

const explorerBaseUrl = NETWORK === 'mainnet'
  ? 'https://cexplorer.io/tx/'
  : 'https://preview.cexplorer.io/tx/';

const sanitizeWalletLabel = (walletId) => {
  const preset = WALLET_WHITELIST.find((wallet) => wallet.id === walletId);
  if (preset) return preset.label;
  return walletId ? walletId.charAt(0).toUpperCase() + walletId.slice(1) : walletId;
};

const TransactionPage = () => {
  const [authState, setAuthState] = useState(authService.getAuthState());
  const [wallets, setWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState('');
  const [walletApi, setWalletApi] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState({ type: 'info', message: 'Connect a wallet to get started.' });
  const [txHash, setTxHash] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryDetails, setSummaryDetails] = useState(null);
  const [prefillMeta, setPrefillMeta] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState);
    if (!authState.isAuthenticated && !authState.loading) {
      authService.initialize();
    }
    if (!authState.loading && !authState.isAuthenticated) {
      navigate('/login');
    }
    return unsubscribe;
  }, [navigate, authState.isAuthenticated, authState.loading]);

  useEffect(() => {
    const discoverWallets = () => {
      if (typeof window === 'undefined' || !window.cardano) return [];
      const detected = Object.entries(window.cardano)
        .filter(([, api]) => api && typeof api.enable === 'function')
        .map(([id]) => id);
      return [...new Set(detected)];
    };

    setWallets(discoverWallets());
  }, []);

  useEffect(() => {
    if (location.state?.fromNote) {
      const prefill = location.state.fromNote;
      setRecipient(prefill.recipient || '');
      setAmount(prefill.amount != null ? String(prefill.amount) : '');
      setPrefillMeta(prefill);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  const availableWallets = useMemo(
    () => wallets.map((walletId) => ({ id: walletId, label: sanitizeWalletLabel(walletId) })),
    [wallets]
  );

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const handleConnectWallet = async () => {
    try {
      if (!selectedWallet) {
        setStatus({ type: 'error', message: 'Please pick a wallet first.' });
        return;
      }
      if (!window.cardano?.[selectedWallet]) {
        setStatus({ type: 'error', message: `${selectedWallet} is not available in this browser.` });
        return;
      }

      setIsBusy(true);
      setTxHash('');
      setStatus({ type: 'info', message: 'Connecting to wallet…' });

      const api = await window.cardano[selectedWallet].enable();
      const changeAddressHex = await api.getChangeAddress();
      const displayAddress = toBech32(changeAddressHex);

      setWalletApi(api);
      setWalletAddress(displayAddress);
      setStatus({ type: 'success', message: `${sanitizeWalletLabel(selectedWallet)} connected.` });
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      setStatus({ type: 'error', message: error?.message ?? 'Failed to connect wallet.' });
    } finally {
      setIsBusy(false);
    }
  };

  const handleSendAda = async () => {
    try {
      if (!walletApi) {
        setStatus({ type: 'error', message: 'Connect a wallet before sending ADA.' });
        return;
      }
      if (!walletAddress) {
        setStatus({ type: 'error', message: 'Wallet address unavailable. Reconnect your wallet.' });
        return;
      }
      if (!recipient.trim()) {
        setStatus({ type: 'error', message: 'Enter a recipient address.' });
        return;
      }
      const numericAmount = parseFloat(amount);
      if (Number.isNaN(numericAmount) || numericAmount <= 0) {
        setStatus({ type: 'error', message: 'Enter a valid ADA amount greater than zero.' });
        return;
      }

      setIsBusy(true);
      setStatus({ type: 'info', message: 'Building transaction…' });
      setTxHash('');

      const utxosHex = await walletApi.getUtxos();
      if (!utxosHex.length) {
        setStatus({ type: 'error', message: 'Wallet has no spendable UTXOs.' });
        return;
      }

      const utxos = parseUtxos(utxosHex);
      const lovelace = BigNum.from_str(Math.floor(numericAmount * 1_000_000).toString());
      let recipientAddress;
      try {
        recipientAddress = Address.from_bech32(recipient.trim());
      } catch (parseError) {
        setStatus({ type: 'error', message: 'Recipient address is not a valid Cardano bech32 address.' });
        return;
      }

      const txBuilder = TransactionBuilder.new(buildTxBuilderConfig());
      txBuilder.add_output(TransactionOutput.new(recipientAddress, Value.new(lovelace)));

      const utxoCollection = TransactionUnspentOutputs.new();
      utxos.forEach((utxo) => utxoCollection.add(utxo));
      txBuilder.add_inputs_from(utxoCollection);

      const changeAddress = await resolveChangeAddress(walletAddress, walletApi);
      txBuilder.add_change_if_needed(changeAddress);

      setStatus({ type: 'info', message: 'Signing transaction…' });
      const txBody = txBuilder.build();
      const unsignedTx = Transaction.new(txBody, TransactionWitnessSet.new());
      const unsignedTxHex = Buffer.from(unsignedTx.to_bytes()).toString('hex');
      const rawSignatureHex = await walletApi.signTx(unsignedTxHex, true);

      const signedTxBytes = buildSignedTransactionBytes(txBody, rawSignatureHex);

      setStatus({ type: 'info', message: 'Submitting transaction…' });
      const submitResponse = await fetch(`https://cardano-${NETWORK}.blockfrost.io/api/v0/tx/submit`, {
        method: 'POST',
        headers: {
          project_id: BLOCKFROST_PROJECT_ID,
          'Content-Type': 'application/cbor',
        },
        body: signedTxBytes,
      });

      if (!submitResponse.ok) {
        const errorText = await submitResponse.text();
        throw new Error(errorText || 'Blockfrost rejected the transaction.');
      }

      const hash = (await submitResponse.text()).replace(/"/g, '').trim();
      setTxHash(hash);
      setSummaryDetails({
        wallet: sanitizeWalletLabel(selectedWallet),
        from: walletAddress,
        recipient: recipient.trim(),
        amount: numericAmount,
        hash,
      });
      setShowSummary(true);
      setRecipient('');
      setAmount('');
      setStatus({ type: 'success', message: 'Transaction submitted successfully!' });
    } catch (error) {
      console.error('Transaction failed:', error);
      const message = error?.message || 'Unknown transaction error.';
      if (/BadInputsUTxO|ValueNotConservedUTxO/i.test(message)) {
        setStatus({
          type: 'error',
          message: 'UTXO already spent. Wait for the wallet to refresh and try again.',
        });
      } else {
        setStatus({ type: 'error', message });
      }
    } finally {
      setIsBusy(false);
    }
  };

  if (authState.loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontSize: '18px',
          color: '#666',
        }}
      >
        Loading...
      </div>
    );
  }

  if (!authState.isAuthenticated) return null;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Cardano Workspace</h1>
          <div className="header-actions">
            <button onClick={() => navigate('/dashboard')} className="logout-button">
              Back to Dashboard
            </button>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="welcome-section">
          <div className="welcome-card">
            <h2>Transaction Studio</h2>
            <p>
              Hello <strong>{authState.user?.username}</strong>, craft Cardano transactions separately from your notes
              workflow.
            </p>

            <div className="transaction-layout">
              {prefillMeta && (
                <div
                  className="transaction-card"
                  style={{ backgroundColor: '#f0f8ff', border: '1px solid #bee3f8' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '12px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <h4>Prefilled from '{prefillMeta.title || 'Note'}'</h4>
                      <p style={{ marginBottom: '8px' }}>Review the address and amount before sending.</p>
                      <p className="transaction-label" style={{ marginBottom: 0 }}>Recipient</p>
                      <div className="wallet-address" style={{ marginBottom: '8px' }}>
                        {prefillMeta.recipient}
                      </div>
                      <p className="transaction-label" style={{ marginBottom: 0 }}>Amount</p>
                      <p style={{ fontWeight: 600 }}>{prefillMeta.amount} ADA</p>
                    </div>
                    <button
                      className="action-button"
                      style={{ backgroundColor: '#e53e3e' }}
                      onClick={() => {
                        setPrefillMeta(null);
                        setRecipient('');
                        setAmount('');
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              <div className="transaction-grid">
                <div className="transaction-card">
                  <h4>Connect a Wallet</h4>
                  <p>Select any installed CIP-30 wallet, then authorize the connection.</p>

                  <label className="transaction-label" htmlFor="wallet-select">
                    Wallet Provider
                  </label>
                  <select
                    id="wallet-select"
                    className="transaction-select"
                    value={selectedWallet}
                    onChange={(event) => setSelectedWallet(event.target.value)}
                    disabled={!availableWallets.length || isBusy}
                  >
                    <option value="">Choose a wallet</option>
                    {availableWallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.label}
                      </option>
                    ))}
                  </select>

                  <button className="action-button" onClick={handleConnectWallet} disabled={isBusy || !availableWallets.length}>
                    {walletApi ? 'Reconnect Wallet' : 'Connect Wallet'}
                  </button>

                  {walletAddress && (
                    <div className="wallet-info">
                      <strong>Connected ({sanitizeWalletLabel(selectedWallet)})</strong>
                      <div className="wallet-address">{walletAddress}</div>
                    </div>
                  )}

                  {!availableWallets.length && (
                    <p style={{ marginTop: '12px', color: '#b45309' }}>
                      No CIP-30 wallets detected. Install Nami, Eternl, Lace, or any compatible wallet.
                    </p>
                  )}
                </div>

                <div className="transaction-card">
                  <h4>Send ADA</h4>
                  <p>Enter a destination address and the amount to transfer.</p>

                  <label className="transaction-label" htmlFor="recipient">
                    Recipient Address
                  </label>
                  <textarea
                    id="recipient"
                    className="transaction-input"
                    rows={3}
                    placeholder="addr..."
                    value={recipient}
                    onChange={(event) => setRecipient(event.target.value)}
                    disabled={isBusy}
                  />

                  <label className="transaction-label" htmlFor="amount">
                    Amount (ADA)
                  </label>
                  <input
                    id="amount"
                    className="transaction-input"
                    type="number"
                    min="0"
                    step="0.000001"
                    placeholder="0.00"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    disabled={isBusy}
                  />

                  <button className="action-button" onClick={handleSendAda} disabled={isBusy}>
                    {isBusy ? 'Processing…' : 'Send Transaction'}
                  </button>
                </div>
              </div>

              <div className="transaction-status-panel">
                <span className={`status-chip ${status.type}`}>
                  {status.message}
                </span>
                {txHash && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>Latest transaction hash</div>
                    <div className="wallet-address">
                      <a
                        href={`${explorerBaseUrl}${txHash}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {txHash}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="dashboard-footer">
        <p>&copy; 2025 Cryptospirosis Notes. All rights reserved.</p>
      </footer>

      {showSummary && summaryDetails && (
        <div className="transaction-modal" role="dialog" aria-modal="true">
          <div className="transaction-modal__backdrop" onClick={() => setShowSummary(false)} />
          <div className="transaction-modal__content">
            <h3>Transaction Details</h3>
            <p className="transaction-modal__intro">
              Here's a quick summary of the transaction you just submitted.
            </p>
            <div className="transaction-modal__list">
              <div>
                <span className="transaction-label">Wallet</span>
                <div className="wallet-address">{summaryDetails.wallet}</div>
              </div>
              <div>
                <span className="transaction-label">From</span>
                <div className="wallet-address">{summaryDetails.from}</div>
              </div>
              <div>
                <span className="transaction-label">To</span>
                <div className="wallet-address">{summaryDetails.recipient}</div>
              </div>
              <div>
                <span className="transaction-label">Amount (ADA)</span>
                <div className="wallet-address">{summaryDetails.amount}</div>
              </div>
              <div>
                <span className="transaction-label">Transaction Hash</span>
                <div className="wallet-address">
                  <a href={`${explorerBaseUrl}${summaryDetails.hash}`} target="_blank" rel="noreferrer">
                    {summaryDetails.hash}
                  </a>
                </div>
              </div>
            </div>
            <div className="transaction-modal__actions">
              <button className="action-button" onClick={() => setShowSummary(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function toBech32(addressHex) {
  try {
    return Address.from_bytes(Buffer.from(addressHex, 'hex')).to_bech32();
  } catch (error) {
    console.warn('Unable to convert address to bech32', error);
    return addressHex;
  }
}

function buildTxBuilderConfig() {
  const feeAlgo = LinearFee.new(BigNum.from_str('44'), BigNum.from_str('155381'));
  let builder = TransactionBuilderConfigBuilder.new()
    .fee_algo(feeAlgo)
    .pool_deposit(BigNum.from_str('500000000'))
    .key_deposit(BigNum.from_str('2000000'))
    .max_value_size(5000)
    .max_tx_size(16384);

  if (typeof builder.coins_per_utxo_byte === 'function') {
    builder = builder.coins_per_utxo_byte(BigNum.from_str('4310'));
  } else if (typeof builder.coins_per_utxo_word === 'function') {
    builder = builder.coins_per_utxo_word(BigNum.from_str('34482'));
  } else {
    throw new Error('Cardano WASM missing coins_per_utxo_* bindings.');
  }

  return builder.build();
}

function parseUtxos(utxosHex) {
  const parsed = [];
  utxosHex.forEach((hex, index) => {
    try {
      const cleanHex = typeof hex === 'string' ? hex.replace(/^0x/i, '') : Buffer.from(hex).toString('hex');
      parsed.push(TransactionUnspentOutput.from_bytes(Buffer.from(cleanHex, 'hex')));
    } catch (error) {
      console.warn(`Unable to parse UTXO[${index}]`, error);
    }
  });

  if (!parsed.length) {
    throw new Error('Failed to parse wallet UTXOs. Please reconnect wallet.');
  }

  return parsed;
}

async function resolveChangeAddress(walletAddress, walletApi) {
  try {
    return Address.from_bech32(walletAddress);
  } catch (bech32Error) {
    try {
      return Address.from_bytes(Buffer.from(walletAddress, 'hex'));
    } catch (hexError) {
      const fresh = await walletApi.getChangeAddress();
      return Address.from_bech32(fresh);
    }
  }
}

function buildSignedTransactionBytes(txBody, signatureHex) {
  const cleanHex = normalizeHex(signatureHex);
  try {
    const txBytes = Buffer.from(cleanHex, 'hex');
    Transaction.from_bytes(txBytes);
    return txBytes;
  } catch (parseError) {
    const witnessBytes = Buffer.from(cleanHex, 'hex');
    const witnessSet = TransactionWitnessSet.from_bytes(witnessBytes);
    const signedTx = Transaction.new(txBody, witnessSet);
    return signedTx.to_bytes();
  }
}

function normalizeHex(value) {
  if (typeof value !== 'string') {
    return Buffer.from(value).toString('hex');
  }
  return value.replace(/^0x/i, '').replace(/\s+/g, '');
}

export default TransactionPage;
