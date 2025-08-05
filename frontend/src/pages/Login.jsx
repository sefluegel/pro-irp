// frontend/src/pages/Login.jsx
import React, { useState } from 'react';
import { login } from '../services/api';

export default function Login({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handle = async (e) => {
    e.preventDefault();
    try {
      const { token } = await login(email, password);
      localStorage.setItem('token', token);
      onSuccess();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handle}>
      <h2>Login</h2>
      {error && <div style={{color:'red'}}>{error}</div>}
      <input type="email" placeholder="Email" value={email}
        onChange={e => setEmail(e.target.value)} required />
      <input type="password" placeholder="Password" value={password}
        onChange={e => setPassword(e.target.value)} required />
      <button type="submit">Log In</button>
    </form>
  );
}
