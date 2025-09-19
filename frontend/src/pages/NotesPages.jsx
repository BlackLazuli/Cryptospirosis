import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const NotesPages = () => {
  const [notes, setNotes] = useState([]);
  const [editingNote, setEditingNote] = useState(null); // 🔹 holds note being edited
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
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
  };

  // 💾 SAVE EDIT
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:8080/api/notes/${editingNote.notesId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });

      if (res.ok) {
        const updatedNote = { ...editingNote, title, body };
        setNotes(notes.map((n) => (n.notesId === updatedNote.notesId ? updatedNote : n)));
        setEditingNote(null); // close modal
      } else {
        console.error("Failed to update note");
      }
    } catch (err) {
      console.error(err);
    }
  };

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
                <small className="block text-gray-500 mb-4">
                  Created At: {new Date(note.createdAt).toLocaleString()}
                </small>

                <div className="flex gap-3">
                  <button
                    onClick={() => openEditModal(note)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition"
                  >
                    ✏️ Update
                  </button>
                  <button
                    onClick={() => handleDelete(note.notesId)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600 transition"
                  >
                    🗑 Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 🔹 Modal */}
      {editingNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Edit Note</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-400"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Body</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows="5"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-400"
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingNote(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-500 text-white rounded-lg shadow hover:bg-indigo-600"
                >
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
