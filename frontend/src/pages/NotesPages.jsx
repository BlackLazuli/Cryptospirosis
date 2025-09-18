import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const NotesPages = () => {
  const [notes, setNotes] = useState([]);
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

  return (
    <div style={{ padding: '20px' }}>
      <h2>Your Notes</h2>
      <button 
        onClick={() => navigate('/notes/add')} 
        style={{ marginBottom: '20px' }}
      >
        ➕ Add Note
      </button>

      {notes.length === 0 ? (
        <p>No notes found. Add your first note!</p>
      ) : (
        <ul>
          {notes.map(note => (
            <li key={note.notesId} style={{ marginBottom: '15px' }}>
              <h3>{note.title}</h3>
              <p>{note.body}</p>
              <small>
                Created At: {new Date(note.createdAt).toLocaleString()}
              </small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default NotesPages;
