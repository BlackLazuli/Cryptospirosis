import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { authService } from '../services/authService';
import '../components/Dashboard.css';
import './NotesPages.css';
import './ViewNotePage.css';

const ViewNotePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = authService.getAuthState().user;

  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const fetchNote = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:8080/api/notes/${id}`, { signal: controller.signal });
        if (!response.ok) {
          throw new Error('Unable to load note details.');
        }
        const data = await response.json();
        setNote(data);
        setError('');
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Unexpected error while loading the note.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchNote();
    return () => controller.abort();
  }, [id]);

  const handleMakeTransaction = () => {
    if (!note || !note.payeeAddress || note.payeeAmount == null) {
      return;
    }

    navigate('/transactions', {
      state: {
        fromNote: {
          title: note.title,
          recipient: note.payeeAddress,
          amount: note.payeeAmount,
        },
      },
    });
  };

  const renderContent = () => {
    if (loading) {
      return <div className="note-detail__placeholder">Loading note details…</div>;
    }

    if (error) {
      return <div className="note-detail__placeholder error">{error}</div>;
    }

    if (!note) {
      return <div className="note-detail__placeholder">Note not found.</div>;
    }

    const hasPaymentMetadata = Boolean(note.payeeAddress && note.payeeAmount != null);

    return (
      <div className="note-detail">
        <div className="note-detail__meta">
          <span>ID #{note.notesId}</span>
          <time>{new Date(note.createdAt).toLocaleString()}</time>
        </div>
        <h2>{note.title}</h2>
        <p className="note-detail__body">{note.body}</p>

        <div className="note-detail__grid">
          <div>
            <p className="note-detail__label">Recipient Wallet</p>
            <div className="note-detail__value">
              {note.payeeAddress || 'Not provided'}
            </div>
          </div>
          <div>
            <p className="note-detail__label">Suggested Amount (ADA)</p>
            <div className="note-detail__value">
              {note.payeeAmount != null ? note.payeeAmount : 'Not provided'}
            </div>
          </div>
        </div>

        <div className="note-detail__actions">
          <button className="notes-btn ghost" onClick={() => navigate('/notes')}>
            Back to Notes
          </button>
          <button className="notes-btn secondary" onClick={() => navigate(`/notes/edit/${note.notesId}`)}>
            ✏️ Edit
          </button>
          <button
            className="notes-btn accent"
            onClick={handleMakeTransaction}
            disabled={!hasPaymentMetadata}
            title={hasPaymentMetadata ? 'Open Cardano workspace' : 'Add payee info before sending'}
          >
            💸 Make Transaction
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Cryptospirosis Notes</h1>
          <div className="header-actions">
            <span className="user-greeting">Viewing, {user?.username || 'friend'}.</span>
            <button className="action-button" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="welcome-section">
          <div className="welcome-card note-detail-shell">
            <div className="notes-heading">
              <div>
                <p className="notes-eyebrow">Detail</p>
                <h2>Note Overview</h2>
              </div>
            </div>
            {renderContent()}
          </div>
        </div>
      </main>

      <footer className="dashboard-footer">
        <p>&copy; 2025 Cryptospirosis Notes. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default ViewNotePage;
