import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { TransactionBuilder, TransactionBuilderConfigBuilder, TransactionOutput, LinearFee, Value, Address, BigNum, Transaction, TransactionWitnessSet, TransactionUnspentOutput, TransactionUnspentOutputs } from '@emurgo/cardano-serialization-lib-browser';
import { Buffer } from 'buffer';
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

      // 1️⃣ Get UTXOs - check format first
      // getUtxos() should return only unspent UTXOs, but we'll fetch fresh ones each time
      const utxosHex = await walletApi.getUtxos();
      if (utxosHex.length === 0) {
        setTransactionStatus('No funds in wallet!');
        return alert("No funds in wallet!");
      }
      
      console.log(`Found ${utxosHex.length} unspent UTXO(s) in wallet`);

      console.log("UTXOs from wallet:", utxosHex);
      console.log("First UTXO type:", typeof utxosHex[0], utxosHex[0]);

      // 2️⃣ Create recipient address and amount
      const recipientAddr = Address.from_bech32(recipient);
      const amountLovelace = BigNum.from_str((parseFloat(amount) * 1_000_000).toString());
      const outputValue = Value.new(amountLovelace);

      // 3️⃣ Create TransactionOutput
      const output = TransactionOutput.new(recipientAddr, outputValue);

      // 4️⃣ Build transaction using TransactionBuilder
      // Create TransactionBuilderConfig using the builder pattern
      const feeAlgo = LinearFee.new(BigNum.from_str('44'), BigNum.from_str('155381'));
      
      let txBuilderConfig;
      try {
        const builder = TransactionBuilderConfigBuilder.new();
        
        // Set all required fields - chain methods
        const builderWithFee = builder.fee_algo(feeAlgo);
        const builderWithPool = builderWithFee.pool_deposit(BigNum.from_str('500000000'));
        const builderWithKey = builderWithPool.key_deposit(BigNum.from_str('2000000'));
        const builderWithMaxVal = builderWithKey.max_value_size(5000);
        const builderWithMaxTx = builderWithMaxVal.max_tx_size(16384);
        
        // Set coins_per_utxo_byte or coins_per_utxo_word (required field)
        // Preview network: coins_per_utxo_byte = 4310 lovelace per byte
        let builderWithCoins = builderWithMaxTx;
        
        // Check if method exists before calling
        if (typeof builderWithMaxTx.coins_per_utxo_byte === 'function') {
          builderWithCoins = builderWithMaxTx.coins_per_utxo_byte(BigNum.from_str('4310'));
        } else if (typeof builderWithMaxTx.coins_per_utxo_word === 'function') {
          // Fallback: Preview network uses 34482 lovelace per word (8 bytes = 1 word)
          builderWithCoins = builderWithMaxTx.coins_per_utxo_word(BigNum.from_str('34482'));
        } else {
          // If neither exists, try calling them anyway (might be a WASM binding issue)
          try {
            builderWithCoins = builderWithMaxTx.coins_per_utxo_byte(BigNum.from_str('4310'));
          } catch (e1) {
            try {
              builderWithCoins = builderWithMaxTx.coins_per_utxo_word(BigNum.from_str('34482'));
            } catch (e2) {
              throw new Error('Required field coins_per_utxo_byte or coins_per_utxo_word must be set. Methods not found on builder.');
            }
          }
        }
        
        txBuilderConfig = builderWithCoins.build();
        console.log("Config built successfully:", txBuilderConfig);
      } catch (configError) {
        console.error("Error building config:", configError);
        throw configError;
      }
      
      const txBuilder = TransactionBuilder.new(txBuilderConfig);

      // Add output
      txBuilder.add_output(output);

      // 5️⃣ Add UTXOs as inputs
      // WASM should already be initialized from earlier operations
      // Just verify we can create a BigNum (simpler test)
      try {
        const testValue = BigNum.from_str('1000000');
        if (!testValue) {
          throw new Error('WASM not ready');
        }
        console.log("WASM verified, proceeding with UTXO parsing");
      } catch (e) {
        console.error("WASM verification failed:", e);
        throw new Error("Cardano library not properly initialized. Please refresh the page.");
      }

      // Parse all UTXOs first, then add them as a collection
      const parsedUtxos = [];
      
      for (let i = 0; i < utxosHex.length && i < 10; i++) {
        try {
          const utxoHex = utxosHex[i];
          let utxoBytes;
          
          if (utxoHex instanceof Uint8Array) {
            utxoBytes = utxoHex;
          } else if (typeof utxoHex === 'string') {
            // Convert hex string to Uint8Array
            const cleanHex = utxoHex.startsWith('0x') ? utxoHex.slice(2) : utxoHex;
            if (cleanHex.length % 2 !== 0) {
              console.warn(`Invalid hex length for UTXO ${i}, skipping`);
              continue;
            }
            utxoBytes = new Uint8Array(cleanHex.length / 2);
            for (let j = 0; j < cleanHex.length; j += 2) {
              const byte = parseInt(cleanHex.slice(j, j + 2), 16);
              if (isNaN(byte)) {
                throw new Error(`Invalid hex character at position ${j}`);
              }
              utxoBytes[j / 2] = byte;
            }
          } else {
            console.warn("Unknown UTXO format, skipping:", utxoHex);
            continue;
          }

          // Parse UTXO using the library
          const utxo = TransactionUnspentOutput.from_bytes(utxoBytes);
          parsedUtxos.push(utxo);
        } catch (error) {
          console.error(`Error parsing UTXO ${i}:`, error, utxosHex[i]);
          // Continue with other UTXOs
        }
      }

      if (parsedUtxos.length === 0) {
        throw new Error("Failed to parse any UTXOs. Please check the wallet connection.");
      }

      // Create TransactionUnspentOutputs collection and add all UTXOs
      const utxosCollection = TransactionUnspentOutputs.new();
      for (const utxo of parsedUtxos) {
        utxosCollection.add(utxo);
      }

      // Add all UTXOs to transaction builder at once
      txBuilder.add_inputs_from(utxosCollection);
      console.log(`Added ${parsedUtxos.length} UTXO(s) to transaction`);

      // 6️⃣ Set change address
      // Wallet address might be in hex format, try to convert or use directly
      let changeAddr;
      try {
        // Try bech32 first (standard format)
        changeAddr = Address.from_bech32(walletAddress);
      } catch (e) {
        // If bech32 fails, try hex format
        try {
          const hexBytes = new Uint8Array(walletAddress.length / 2);
          for (let i = 0; i < walletAddress.length; i += 2) {
            hexBytes[i / 2] = parseInt(walletAddress.slice(i, i + 2), 16);
          }
          changeAddr = Address.from_bytes(hexBytes);
        } catch (e2) {
          // If both fail, try getting a fresh address from wallet
          const freshAddress = await walletApi.getChangeAddress();
          changeAddr = Address.from_bech32(freshAddress);
        }
      }
      txBuilder.add_change_if_needed(changeAddr);

      // 7️⃣ Build and sign
      setTransactionStatus('Signing transaction...');
      
      // Build transaction body
      const txBody = txBuilder.build();
      console.log("Transaction body built, inputs:", txBody.inputs()?.len() || 0, "outputs:", txBody.outputs()?.len() || 0);
      
      // Create unsigned transaction with empty witness set
      const witnessSet = TransactionWitnessSet.new();
      const unsignedTx = Transaction.new(txBody, witnessSet);
      
      // Verify transaction structure
      const unsignedTxBytes = unsignedTx.to_bytes();
      
      // Convert bytes to hex string - ensure proper encoding
      let unsignedTxHex = '';
      for (let i = 0; i < unsignedTxBytes.length; i++) {
        const hex = unsignedTxBytes[i].toString(16).padStart(2, '0');
        unsignedTxHex += hex;
      }
      
      console.log("Unsigned transaction hex length:", unsignedTxHex.length);
      console.log("Transaction body fee:", txBody.fee()?.to_str() || 'N/A');
      console.log("Transaction inputs count:", txBody.inputs()?.len() || 0);
      console.log("Transaction outputs count:", txBody.outputs()?.len() || 0);
      
      // Verify the transaction bytes are valid
      if (unsignedTxBytes.length === 0) {
        throw new Error("Transaction bytes are empty - transaction build failed");
      }
      
      // Sign and submit transaction
      setTransactionStatus('Signing transaction...');
      console.log("Signing transaction with wallet...");
      
      // Clean the unsigned transaction hex
      const cleanUnsignedHex = unsignedTxHex.replace(/^0x/i, '').replace(/\s/g, '');
      console.log("Unsigned transaction hex length:", cleanUnsignedHex.length);
      console.log("First 100 chars of unsigned tx:", cleanUnsignedHex.substring(0, 100));
      
      // Try wallet's submitTx method first (if available) - it will sign and submit
      let res = null;
      let signedTxHex = null;
      
      if (typeof walletApi.submitTx === 'function') {
        console.log("Using wallet's submitTx method (will sign and submit)");
        try {
          // Some wallets' submitTx expects unsigned transaction and signs it internally
          const txId = await walletApi.submitTx(cleanUnsignedHex);
          console.log("Transaction submitted via wallet, TX ID:", txId);
          res = { ok: true, status: 200 };
        } catch (submitError) {
          console.error("Wallet submitTx failed, trying signTx approach:", submitError);
          // If submitTx fails, try signing first then submitting
          res = null;
        }
      }
      
      // If submitTx didn't work or isn't available, sign first then submit via Blockfrost
      if (!res) {
        console.log("Signing transaction with wallet...");
        
        // signTx with false returns just the witness set, with true might return full tx or just witness
        // Let's try with false first to get witness, then combine with transaction body
        const witnessHex = await walletApi.signTx(cleanUnsignedHex, false);
        console.log("Witness hex length:", witnessHex.length);
        console.log("Witness (first 100 chars):", witnessHex.substring(0, 100));
        
        // Parse witness set from hex
        const cleanWitnessHex = witnessHex.replace(/^0x/i, '').replace(/\s/g, '');
        const witnessBytes = new Uint8Array(cleanWitnessHex.length / 2);
        for (let i = 0; i < cleanWitnessHex.length; i += 2) {
          witnessBytes[i / 2] = parseInt(cleanWitnessHex.slice(i, i + 2), 16);
        }
        
        // Create witness set from bytes
        const witnessSet = TransactionWitnessSet.from_bytes(witnessBytes);
        
        // Combine transaction body with witness set to create signed transaction
        const signedTx = Transaction.new(txBody, witnessSet);
        const signedTxBytes = signedTx.to_bytes();
        
        // Convert to hex
        signedTxHex = '';
        for (let i = 0; i < signedTxBytes.length; i++) {
          signedTxHex += signedTxBytes[i].toString(16).padStart(2, '0');
        }
        
        console.log("Full signed transaction hex length:", signedTxHex.length);
        console.log("Signed transaction (first 100 chars):", signedTxHex.substring(0, 100));
      }
      
      // If wallet submission failed or not available, use Blockfrost
      if (!res && signedTxHex) {
        console.log("Using Blockfrost API for submission");
        setTransactionStatus('Submitting transaction...');
        
        // Convert hex to Uint8Array for submission
        // Ensure hex string is clean (no 0x prefix, no spaces)
        const cleanSignedHexForBlockfrost = signedTxHex.replace(/^0x/i, '').replace(/\s/g, '');
        
        if (cleanSignedHexForBlockfrost.length % 2 !== 0) {
          throw new Error(`Invalid signed transaction hex length: ${cleanSignedHexForBlockfrost.length}`);
        }
        
        const signedTxBytes = new Uint8Array(cleanSignedHexForBlockfrost.length / 2);
        for (let i = 0; i < cleanSignedHexForBlockfrost.length; i += 2) {
          const byte = parseInt(cleanSignedHexForBlockfrost.slice(i, i + 2), 16);
          if (isNaN(byte)) {
            throw new Error(`Invalid hex character at position ${i} in signed transaction`);
          }
          signedTxBytes[i / 2] = byte;
        }
        
        console.log("Submitting transaction, CBOR length:", signedTxBytes.length, "bytes");
        
        res = await fetch(`https://cardano-${NETWORK}.blockfrost.io/api/v0/tx/submit`, {
          method: 'POST',
          headers: {
            'project_id': BLOCKFROST_PROJECT_ID,
            'Content-Type': 'application/cbor'
          },
          body: signedTxBytes
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error("Blockfrost submission error:", errorText);
          throw new Error(errorText);
        }
      }

      setTransactionStatus('Transaction submitted successfully!');
      alert('Transaction submitted! Check console for details.');
      
      // Reset form
      setRecipient('');
      setAmount('');
      
      console.log(`Sent ${amount} ADA from ${walletAddress} to ${recipient}`);
      
      // Note: UTXOs will be refreshed on the next transaction attempt
      // The wallet's getUtxos() should return only unspent UTXOs

    } catch (error) {
      console.error("Transaction failed:", error);
      
      // Check if error is about bad inputs (spent UTXO)
      const errorMessage = error.message || error.info || '';
      if (errorMessage.includes('BadInputsUTxO') || errorMessage.includes('ValueNotConservedUTxO')) {
        setTransactionStatus('Transaction failed: UTXO already spent. Please wait a moment and try again.');
        alert('Transaction failed: The UTXO has already been spent. This can happen if you just sent a transaction. Please wait a few seconds for the wallet to update, then try again.');
      } else {
        setTransactionStatus(`Transaction failed: ${error.message}`);
        alert("Transaction failed. See console for details.");
      }
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