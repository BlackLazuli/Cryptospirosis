import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import '../components/Dashboard.css';
import './AddNotePage.css';

const AddNotePage = () => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [payeeAddress, setPayeeAddress] = useState('');
  const [payeeAmount, setPayeeAmount] = useState('');
  const navigate = useNavigate();
  const user = authService.getAuthState().user;

  const handleSubmit = (e) => {
    e.preventDefault();
 
    const payload = {
      title,
      body,
      payeeAddress: payeeAddress.trim() || null,
      payeeAmount: payeeAmount ? Number(payeeAmount) : null,
    };
    console.log("📤 Sending payload to backend:", payload);
    console.log("➡️ URL:", `http://localhost:8080/notes/user/${user.userId}`);

    fetch(`http://localhost:8080/api/notes/user/${user.userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(async res => {
        console.log("✅ Raw response:", res);
        const text = await res.text();
        console.log("📥 Raw response body:", text);

        if (text) {
          return JSON.parse(text);
        }
        return null;
      })
      .then(data => {
        console.log("✅ Parsed response data:", data);
        navigate('/notes');
      })
      .catch(err => console.error("❌ Error during request:", err));
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Cryptospirosis Notes</h1>
          <div className="header-actions">
            <span className="user-greeting">Create something great, {user?.username || 'friend'}.</span>
            <button className="action-button" onClick={() => navigate('/notes')}>
              Back to Notes
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="welcome-section">
          <div className="welcome-card note-form-shell">
            <div className="note-form-header">
              <div>
                <p className="notes-eyebrow">New Entry</p>
                <h2>Add Note</h2>
              </div>
              <span className="note-form-hint">Fields marked optional can be skipped.</span>
            </div>

            <form onSubmit={handleSubmit} className="note-form">
              <label>
                <span>Title</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Enter note title"
                />
              </label>

              <label>
                <span>Body</span>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows="6"
                  required
                  placeholder="Write your note here..."
                />
              </label>

              <label>
                <span>Recipient Wallet Address</span>
                <textarea
                  value={payeeAddress}
                  onChange={(e) => setPayeeAddress(e.target.value)}
                  rows="3"
                  placeholder="addr..."
                />
              </label>

              <label>
                <span>Suggested ADA Amount</span>
                <input
                  type="number"
                  min="0"
                  step="0.000001"
                  value={payeeAmount}
                  onChange={(e) => setPayeeAmount(e.target.value)}
                  placeholder="0.00"
                />
              </label>

              <div className="note-form__actions">
                <button type="button" className="notes-btn ghost" onClick={() => navigate('/notes')}>
                  Cancel
                </button>
                <button type="submit" className="notes-btn primary">
                  💾 Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <footer className="dashboard-footer">
        <p>&copy; 2025 Cryptospirosis Notes. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default AddNotePage;
