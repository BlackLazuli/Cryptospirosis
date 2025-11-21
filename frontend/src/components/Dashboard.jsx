import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { TransactionBuilder, TransactionOutput, LinearFee, Value, Address, BigNum, Transaction, TransactionWitnessSet } from '@emurgo/cardano-serialization-lib-browser';
import './Dashboard.css';

const BLOCKFROST_PROJECT_ID = 'previewzmMNAoEknB2pGpjPqEJa2pI3rwdHAeua'; // replace with your project ID
const NETWORK = 'preview'; // 'mainnet' for real ADA

const Dashboard = () => {
  const [wallets, setWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState('');
  const [walletApi, setWalletApi] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [authState, setAuthState] = useState(authService.getAuthState());
  const [transactionStatus, setTransactionStatus] = useState('');
  const navigate = useNavigate();

  // Load installed wallets
  useEffect(() => {
    if (window.cardano) {
      setWallets(Object.keys(window.cardano));
    }
  }, []);

  // Subscribe to auth state
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

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  // Connect wallet function
  const handleConnectWallet = async () => {
    try {
      if (!selectedWallet) return alert("Please select a wallet first!");
      
      setTransactionStatus('Connecting to wallet...');
      const api = await window.cardano[selectedWallet].enable();
      setWalletApi(api);
      
      // Get the main wallet address
      const changeAddress = await api.getChangeAddress();
      setWalletAddress(changeAddress);
      
      setTransactionStatus(`${selectedWallet} wallet connected successfully!`);
      console.log("Wallet enabled:", api);
      console.log("Wallet address:", changeAddress);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      setTransactionStatus('Failed to connect wallet.');
      alert("Failed to connect wallet. Make sure it is installed and unlocked.");
    }
  };

  // Handle input changes
  const handleRecipientChange = (e) => setRecipient(e.target.value);
  const handleAmountChange = (e) => setAmount(e.target.value);

  // Send transaction function
  const handleSendADA = async () => {
    try {
      if (!walletApi) return alert("Connect a wallet first!");
      if (!recipient) return alert("Enter a recipient address!");
      if (!amount) return alert("Enter an amount to send!");

      setTransactionStatus('Building transaction...');

      // 1️⃣ Get UTXOs
      const utxosHex = await walletApi.getUtxos();
      if (utxosHex.length === 0) {
        setTransactionStatus('No funds in wallet!');
        return alert("No funds in wallet!");
      }

      const utxos = utxosHex.map(hex => Transaction.unmarshal(Buffer.from(hex, 'hex')));

      // 2️⃣ Create a TransactionOutput
      const output = TransactionOutput.new(
        Address.from_bech32(recipient),
        Value.new(BigNum.from_str((parseFloat(amount) * 1_000_000).toString()))
      );

      // 3️⃣ Build transaction
      const txBuilder = TransactionBuilder.new(
        LinearFee.new(BigNum.from_str('44'), BigNum.from_str('155381')),
        BigNum.from_str('1000000'),
        BigNum.from_str('500000000'),
        BigNum.from_str('2000000')
      );

      // Add output
      txBuilder.add_output(output);

      // Add inputs (just the first UTXO for simplicity)
      txBuilder.add_input(
        Address.from_bytes(utxos[0].input().address().to_bytes()),
        utxos[0].input(),
        utxos[0].output().amount()
      );

      // 4️⃣ Set change
      const changeAddr = Address.from_bech32(walletAddress);
      txBuilder.add_change_if_needed(changeAddr);

      // 5️⃣ Build and sign
      setTransactionStatus('Signing transaction...');
      const txBody = txBuilder.build();
      const tx = Transaction.new(txBody, TransactionWitnessSet.new());
      const txHex = Buffer.from(tx.to_bytes()).toString('hex');
      const signedTxHex = await walletApi.signTx(txHex, true);

      // 6️⃣ Submit transaction via Blockfrost
      setTransactionStatus('Submitting transaction...');
      const res = await fetch(`https://cardano-${NETWORK}.blockfrost.io/api/v0/tx/submit`, {
        method: 'POST',
        headers: {
          project_id: BLOCKFROST_PROJECT_ID,
          'Content-Type': 'application/cbor'
        },
        body: Buffer.from(signedTxHex, 'hex')
      });

      if (!res.ok) throw new Error(await res.text());

      setTransactionStatus('Transaction submitted successfully!');
      alert('Transaction submitted! Check console for details.');
      
      // Reset form
      setRecipient('');
      setAmount('');
      
      console.log(`Sent ${amount} ADA from ${walletAddress} to ${recipient}`);

    } catch (error) {
      console.error("Transaction failed:", error);
      setTransactionStatus(`Transaction failed: ${error.message}`);
      alert("Transaction failed. See console for details.");
    }
  };

  if (authState.loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        fontSize: '18px', 
        color: '#666',
      }}>
        Loading...
      </div>
    );
  }

  if (!authState.isAuthenticated) return null;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Cryptospirosis Notes</h1>
          <div className="header-actions">
            <span className="user-greeting">
              Welcome, {authState.user?.username || 'User'}!
            </span>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="welcome-section">
          <div className="welcome-card">
            <h2>Welcome to your Dashboard</h2>
            <p>
              Hello <strong>{authState.user?.username}</strong>, you have successfully logged in!
            </p>

            <div className="user-info">
              <h3>Your Account Information:</h3>
              <div className="info-item">
                <span className="info-label">Username:</span>
                <span className="info-value">{authState.user?.username}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Email:</span>
                <span className="info-value">{authState.user?.email}</span>
              </div>
              <div className="info-item">
                <span className="info-label">User ID:</span>
                <span className="info-value">{authState.user?.userId}</span>
              </div>
            </div>

            <div className="dashboard-actions">
              {/* Notes Card */}
              <div className="action-card">
                <h4>🗒️ Notes</h4>
                <p>Manage your personal notes</p>
                <button className="action-button" onClick={() => navigate('/notes')}>
                  View Notes
                </button>
              </div>

              {/* Profile Card */}
              <div className="action-card">
                <h4>👤 Profile</h4>
                <p>Update your profile information (Coming Soon)</p>
                <button className="action-button" disabled>
                  Edit Profile
                </button>
              </div>

              {/* Connect Wallet Card */}
              <div className="action-card">
                <h4>💼 Connect Wallet</h4>
                <p>Link your crypto wallet</p>
                <div style={{ marginBottom: '10px' }}>
                  <select 
                    value={selectedWallet} 
                    onChange={(e) => setSelectedWallet(e.target.value)}
                    className="wallet-select"
                  >
                    <option value="">Select Wallet</option>
                    {wallets.length > 0 && wallets.map((wallet) => (
                      <option key={wallet} value={wallet}>
                        {wallet}
                      </option>
                    ))}
                  </select>
                </div>
                <button className="action-button" onClick={handleConnectWallet}>
                  Connect Wallet
                </button>
                {walletAddress && (
                  <div className="wallet-info">
                    <p><strong>Connected Wallet:</strong> {selectedWallet}</p>
                    <p><strong>Address:</strong> {walletAddress}</p>
                  </div>
                )}
              </div>

              {/* Send Transaction Card */}
              <div className="action-card">
                <h4>💸 Send ADA</h4>
                <div className="input-group">
                  <label>Recipient Address:</label>
                  <input 
                    type="text" 
                    placeholder="Wallet address" 
                    value={recipient} 
                    onChange={handleRecipientChange}
                    className="transaction-input"
                  />
                </div>
                <div className="input-group">
                  <label>Amount (ADA):</label>
                  <input 
                    type="number" 
                    placeholder="Amount" 
                    value={amount} 
                    onChange={handleAmountChange}
                    className="transaction-input"
                  />
                </div>
                <button className="action-button" onClick={handleSendADA}>
                  Send ADA
                </button>
                
                {transactionStatus && (
                  <div className="transaction-status">
                    <p><strong>Status:</strong> {transactionStatus}</p>
                  </div>
                )}
              </div>

              {/* Settings Card */}
              <div className="action-card">
                <h4>⚙️ Settings</h4>
                <p>Customize your experience (Coming Soon)</p>
                <button className="action-button" disabled>
                  Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="dashboard-footer">
        <p>&copy; 2025 Cryptospirosis Notes. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Dashboard;