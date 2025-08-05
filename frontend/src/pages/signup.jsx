// frontend/src/pages/Signup.jsx
import React, { useState } from 'react';
import { signup } from '../services/api';

export default function Signup({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handle = async (e) => {
    e.preventDefault();
    try {
      await signup(email, password);
      onSuccess();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handle}>
      <h2>Sign Up</h2>
      {error && <div style={{color:'red'}}>{error}</div>}
      <input type="email" placeholder="Email" value={email}
        onChange={e => setEmail(e.target.value)} required />
      <input type="password" placeholder="Password" value={password}
        onChange={e => setPassword(e.target.value)} required />
      <button type="submit">Sign Up</button>
    </form>
  );
}
