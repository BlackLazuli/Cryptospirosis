import React, { useEffect, useState } from "react";
import "../components/TransactionHistory.css";

const BLOCKFROST_PROJECT_ID = "previewzmMNAoEknB2pGpjPqEJa2pI3rwdHAeua";
const NETWORK = "preview";

const explorerBaseUrl =
  NETWORK === "mainnet"
    ? "https://cexplorer.io/tx/"
    : "https://preview.cexplorer.io/tx/";

export default function TransactionHistory() {
  const [availableWallets, setAvailableWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState("");
  const [walletApi, setWalletApi] = useState(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [balance, setBalance] = useState(null);
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [adaPrice, setAdaPrice] = useState(null);

  // For decoding hex -> bech32
  const AddressFromHex = async (hex) => {
    try {
      const { Address } = await import("@emurgo/cardano-serialization-lib-browser");
      const bytes = Buffer.from(hex, "hex");
      return Address.from_bytes(bytes).to_bech32();
    } catch (err) {
      console.error("Address conversion error:", err);
      return hex;
    }
  };

  // Convert lovelace to ADA
  const lovelaceToAda = (lovelace) => {
    return (parseInt(lovelace) / 1000000).toFixed(6);
  };

  // Fetch current ADA price in USD
  const fetchAdaPrice = async () => {
    try {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=cardano&vs_currencies=usd"
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ADA price: ${response.status}`);
      }
      
      const data = await response.json();
      setAdaPrice(data.cardano.usd);
    } catch (err) {
      console.error("Failed to fetch ADA price", err);
      // You could set a fallback price here if needed
    }
  };

  // Calculate USD value
  const calculateUsdValue = (adaAmount) => {
    if (!adaPrice) return null;
    return (parseFloat(adaAmount) * adaPrice).toFixed(2);
  };

  // Scan installed wallets on load
  useEffect(() => {
    if (!window.cardano) return;

    const wallets = Object.keys(window.cardano)
      .filter((id) => window.cardano[id].enable)
      .map((id) => ({
        id,
        name: window.cardano[id].name || id,
        icon: window.cardano[id].icon || null,
      }));

    setAvailableWallets(wallets);
    
    // Fetch ADA price when component mounts
    fetchAdaPrice();
  }, []);

  // Fetch wallet balance
  const fetchBalance = async (address) => {
    try {
      const res = await fetch(
        `https://cardano-${NETWORK}.blockfrost.io/api/v0/addresses/${address}`,
        {
          headers: { project_id: BLOCKFROST_PROJECT_ID },
        }
      );
      
      if (!res.ok) {
        throw new Error(`Failed to fetch balance: ${res.status}`);
      }
      
      const data = await res.json();
      const adaBalance = lovelaceToAda(data.amount[0]?.quantity || "0");
      const usdBalance = calculateUsdValue(adaBalance);
      
      setBalance({
        ada: adaBalance,
        usd: usdBalance,
        lovelace: data.amount[0]?.quantity || "0",
      });
    } catch (err) {
      console.error("Failed to load balance", err);
    }
  };

  // When user selects a wallet
  const connectWallet = async (walletId) => {
    try {
      setError("");
      setLoading(true);
      setSelectedWallet(walletId);
      
      const api = await window.cardano[walletId].enable();
      setWalletApi(api);

      const changeAddrHex = await api.getChangeAddress();
      const addr = await AddressFromHex(changeAddrHex);

      setWalletAddress(addr);
      await Promise.all([fetchBalance(addr), fetchHistory(addr)]);
    } catch (err) {
      console.error("Wallet connection failed", err);
      setError(`Failed to connect wallet: ${err.message}`);
      setSelectedWallet("");
    } finally {
      setLoading(false);
    }
  };

  // Load transaction history
  const fetchHistory = async (address) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `https://cardano-${NETWORK}.blockfrost.io/api/v0/addresses/${address}/transactions`,
        {
          headers: { project_id: BLOCKFROST_PROJECT_ID },
        }
      );
      
      if (!res.ok) {
        throw new Error(`Failed to fetch transactions: ${res.status}`);
      }
      
      const data = await res.json();
      setTxs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load history", err);
      setError(`Failed to load history: ${err.message}`);
      setTxs([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    // Refresh ADA price first
    await fetchAdaPrice();
    
    if (walletAddress) {
      await Promise.all([fetchBalance(walletAddress), fetchHistory(walletAddress)]);
    }
  };

  return (
    <div className="tx-history-container">
      <div className="tx-history-header">
        <h2 className="tx-history-title">Transaction History</h2>
        <p className="tx-history-subtitle">Connect your wallet to view balance and transaction history</p>
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="tx-error-alert">
          <span className="tx-error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* WALLET SELECTOR */}
      <div className="tx-wallet-section">
        <h4 className="tx-section-title">Select Wallet</h4>

        {availableWallets.length === 0 ? (
          <div className="tx-no-wallets">
            <p>No Cardano wallets detected</p>
            <p className="tx-no-wallets-hint">Please install a Cardano wallet extension (Nami, Eternl, etc.)</p>
          </div>
        ) : (
          <div className="tx-wallet-grid">
            {availableWallets.map((w) => (
              <button
                key={w.id}
                onClick={() => connectWallet(w.id)}
                disabled={loading}
                className={`tx-wallet-btn ${selectedWallet === w.id ? "tx-wallet-btn-active" : ""}`}
              >
                {w.icon && <img src={w.icon} alt={w.name} className="tx-wallet-icon" />}
                <span>{w.name}</span>
                {selectedWallet === w.id && <span className="tx-wallet-check">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* BALANCE & ADDRESS DISPLAY */}
      {walletAddress && (
        <div className="tx-info-grid">
          {/* Balance Card */}
          <div className="tx-balance-card">
            <div className="tx-balance-header">
              <span className="tx-balance-label">Total Balance</span>
              <div className="tx-balance-actions">
                {adaPrice && (
                  <span className="tx-ada-price">
                    ADA: ${adaPrice}
                  </span>
                )}
                <button 
                  onClick={refreshData} 
                  disabled={loading}
                  className="tx-refresh-btn"
                  title="Refresh"
                >
                  ↻
                </button>
              </div>
            </div>
            {balance ? (
              <div className="tx-balance-amounts">
                <div className="tx-balance-primary">
                  <span className="tx-balance-ada">{balance.ada}</span>
                  <span className="tx-balance-unit">ADA</span>
                </div>
                {balance.usd && (
                  <div className="tx-balance-secondary">
                    <span className="tx-balance-usd">${balance.usd}</span>
                    <span className="tx-balance-unit">USD</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="tx-balance-loading">Loading...</div>
            )}
          </div>

          {/* Address Card */}
          <div className="tx-address-card">
            <span className="tx-address-label">Connected Wallet</span>
            <div className="tx-address-value">
              {walletAddress.substring(0, 20)}...{walletAddress.substring(walletAddress.length - 20)}
            </div>
          </div>
        </div>
      )}

      {/* LOADING STATE */}
      {loading && (
        <div className="tx-loading">
          <div className="tx-loading-spinner"></div>
          <span>Loading...</span>
        </div>
      )}

      {/* TRANSACTION LIST */}
      {!loading && walletAddress && (
        <div className="tx-list-section">
          <h4 className="tx-section-title">
            Recent Transactions
            <span className="tx-count-badge">{txs.length}</span>
          </h4>

          {txs.length === 0 ? (
            <div className="tx-empty-state">
              <span className="tx-empty-icon">📝</span>
              <p>No transaction history found</p>
            </div>
          ) : (
            <div className="tx-list">
              {txs.map((tx) => (
                <div key={tx.tx_hash} className="tx-item">
                  <div className="tx-item-header">
                    <span className="tx-item-label">Transaction Hash</span>
                    <span className="tx-item-time">
                      {new Date(tx.block_time * 1000).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <a
                    href={`${explorerBaseUrl}${tx.tx_hash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="tx-item-hash"
                  >
                    {tx.tx_hash.substring(0, 16)}...{tx.tx_hash.substring(tx.tx_hash.length - 16)}
                  </a>

                  <div className="tx-item-details">
                    <div className="tx-item-detail">
                      <span className="tx-detail-label">Block Height:</span>
                      <span className="tx-detail-value">{tx.block_height.toLocaleString()}</span>
                    </div>
                    <div className="tx-item-detail">
                      <span className="tx-detail-label">Index:</span>
                      <span className="tx-detail-value">{tx.tx_index}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}