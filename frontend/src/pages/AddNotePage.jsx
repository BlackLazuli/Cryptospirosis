import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const AddNotePage = () => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const navigate = useNavigate();
  const user = authService.getAuthState().user;

  const handleSubmit = (e) => {
    e.preventDefault();

    const payload = { title, body };
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
    <div className="min-h-screen bg-gradient-to-br from-[#f5f7fa] to-[#c3cfe2] flex items-center justify-center px-4">
      <div className="bg-white shadow-xl rounded-2xl w-full max-w-2xl p-8 animate-fadeIn">
        <h2 className="text-3xl font-semibold text-gray-800 text-center mb-6">
          Add New Note
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#667eea] focus:outline-none transition"
              placeholder="Enter note title"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Body
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows="6"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#667eea] focus:outline-none transition resize-none"
              placeholder="Write your note here..."
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => navigate('/notes')}
              className="px-5 py-2 rounded-lg border border-gray-300 text-gray-600 font-medium hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white font-semibold rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition"
            >
              Save Note
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddNotePage;
