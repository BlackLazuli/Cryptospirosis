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

        // Try to parse JSON only if content exists
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
    <div style={{ padding: '20px' }}>
      <h2>Add New Note</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Title</label><br/>
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required 
          />
        </div>
        <div>
          <label>Body</label><br/>
          <textarea 
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required 
          />
        </div>
        <button type="submit">Save Note</button>
      </form>
    </div>
  );
};

export default AddNotePage;
