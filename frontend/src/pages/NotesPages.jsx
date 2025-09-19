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
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8 animate-fadeIn">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          Your Notes
        </h2>

        <div className="flex justify-end mb-6">
          <button
            onClick={() => navigate('/notes/add')}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-5 py-2 rounded-lg shadow hover:scale-105 transition-transform"
          >
            ➕ Add Note
          </button>
        </div>

        {notes.length === 0 ? (
          <p className="text-gray-600 text-center italic">
            No notes found. Add your first note!
          </p>
        ) : (
          <ul className="space-y-6">
            {notes.map(note => (
              <li
                key={note.notesId}
                className="bg-gray-50 p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
              >
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  {note.title}
                </h3>
                <p className="text-gray-700 mb-3">{note.body}</p>
                <small className="text-gray-500">
                  Created At: {new Date(note.createdAt).toLocaleString()}
                </small>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default NotesPages;
