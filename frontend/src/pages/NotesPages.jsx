import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import '../components/Dashboard.css';
import './NotesPages.css';

const NotesPages = () => {
  const [notes, setNotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState(""); // 🔍 search bar input
  const [editingNote, setEditingNote] = useState(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [payeeAddress, setPayeeAddress] = useState("");
  const [payeeAmount, setPayeeAmount] = useState("");
  const navigate = useNavigate();
  const user = authService.getAuthState().user;

  useEffect(() => {
    if (user) {
      fetch(`http://localhost:8080/api/notes/user/${user.userId}`)
        .then(res => res.json())
        .then(data => setNotes(data))
        .catch(err => console.error(err));
    }
  }, [user]);

  // 🔴 DELETE
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this note?")) return;

    try {
      const res = await fetch(`http://localhost:8080/api/notes/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setNotes(notes.filter((n) => n.notesId !== id));
      } else {
        console.error("Failed to delete note");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ✏️ OPEN MODAL for editing
  const openEditModal = (note) => {
    setEditingNote(note);
    setTitle(note.title);
    setBody(note.body);
    setPayeeAddress(note.payeeAddress || "");
    setPayeeAmount(note.payeeAmount ?? "");
  };

  // 💾 SAVE EDIT
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:8080/api/notes/${editingNote.notesId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          payeeAddress: payeeAddress.trim() || null,
          payeeAmount: payeeAmount ? Number(payeeAmount) : null,
        }),
      });

      if (res.ok) {
        const updatedNote = {
          ...editingNote,
          title,
          body,
          payeeAddress: payeeAddress.trim() || null,
          payeeAmount: payeeAmount ? Number(payeeAmount) : null,
        };
        setNotes(notes.map((n) => (n.notesId === updatedNote.notesId ? updatedNote : n)));
        setEditingNote(null);
        setPayeeAddress("");
        setPayeeAmount("");
      } else {
        console.error("Failed to update note");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 🔍 Filter notes based on search
  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.body.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="dashboard-container">
          <header className="dashboard-header">
            <div className="header-content">
              <h1>Cryptospirosis Notes</h1>
              <div className="header-actions">
                <span className="user-greeting">Stay organized, {user?.username || 'friend'}.</span>
                <button className="action-button" onClick={() => navigate('/dashboard')}>
                  Back to Dashboard
                </button>
              </div>
            </div>
          </header>

          <main className="dashboard-main">
            <div className="welcome-section">
              <div className="welcome-card notes-shell">
                <div className="notes-heading">
                  <div>
                    <p className="notes-eyebrow">Workspace</p>
                    <h2>Your Notes</h2>
                  </div>
                  <button className="action-button" onClick={() => navigate('/notes/add')}>
                    ➕ Add Note
                  </button>
                </div>

                <div className="notes-toolbar">
                  <input
                    type="text"
                    placeholder="Search notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="notes-search"
                  />
                  <div className="notes-meta">
                    <span>{filteredNotes.length}</span> showing
                  </div>
                </div>

                {filteredNotes.length === 0 ? (
                  <div className="notes-empty">
                    {notes.length === 0
                      ? 'No notes yet. Tap "Add Note" to create your first one.'
                      : 'No notes match your search. Try another keyword.'}
                  </div>
                ) : (
                  <ul className="notes-list">
                    {filteredNotes.map((note) => (
                      <li key={note.notesId} className="note-card">
                        <div className="note-card__content">
                          <div className="note-card__header">
                            <h3>{note.title}</h3>
                            <time>{new Date(note.createdAt).toLocaleString()}</time>
                          </div>
                          <p className="note-card__body">{note.body}</p>

                          {(note.payeeAddress || note.payeeAmount) && (
                            <div className="note-card__payment">
                              <div className="note-card__payment-header">Linked Payment</div>
                              {note.payeeAddress && (
                                <p>
                                  <span>Address:</span> {note.payeeAddress}
                                </p>
                              )}
                              {note.payeeAmount != null && (
                                <p>
                                  <span>Amount:</span> {note.payeeAmount} ADA
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="note-card__actions">
                          <button
                            className="notes-btn secondary"
                            onClick={() => navigate(`/notes/view/${note.notesId}`)}
                          >
                            👁 View
                          </button>
                          <button className="notes-btn primary" onClick={() => openEditModal(note)}>
                            ✏️ Update
                          </button>
                          <button className="notes-btn danger" onClick={() => handleDelete(note.notesId)}>
                            🗑 Delete
                          </button>
                          {note.payeeAddress && note.payeeAmount != null && (
                            <button
                              className="notes-btn accent"
                              onClick={() =>
                                navigate('/transactions', {
                                  state: {
                                    fromNote: {
                                      title: note.title,
                                      recipient: note.payeeAddress,
                                      amount: note.payeeAmount,
                                    },
                                  },
                                })
                              }
                            >
                              💸 Send ADA
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </main>

          <footer className="dashboard-footer">
            <p>&copy; 2025 Cryptospirosis Notes. All rights reserved.</p>
          </footer>

          {editingNote && (
            <div className="notes-modal" role="dialog" aria-modal="true">
              <div className="notes-modal__backdrop" onClick={() => setEditingNote(null)} />
              <div className="notes-modal__content">
                <h2>Edit Note</h2>
                <form onSubmit={handleUpdate}>
                  <label>
                    <span>Title</span>
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
                  </label>
                  <label>
                    <span>Body</span>
                    <textarea value={body} onChange={(e) => setBody(e.target.value)} rows="4" required />
                  </label>
                  <label>
                    <span>Payee Wallet Address (optional)</span>
                    <textarea value={payeeAddress} onChange={(e) => setPayeeAddress(e.target.value)} rows="2" />
                  </label>
                  <label>
                    <span>Suggested ADA Amount (optional)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.000001"
                      value={payeeAmount}
                      onChange={(e) => setPayeeAmount(e.target.value)}
                    />
                  </label>
                  <div className="notes-modal__actions">
                    <button
                      type="button"
                      className="notes-btn ghost"
                      onClick={() => {
                        setEditingNote(null);
                        setPayeeAddress('');
                        setPayeeAmount('');
                      }}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="notes-btn primary">
                      💾 Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
    </div>
  );
};

export default NotesPages;
