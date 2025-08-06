import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const nav = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pw })
    });
    if (res.ok) nav('/login');
    else {
      const { error } = await res.json();
      setErr(error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">Sign Up</h2>
      {err && <p className="text-red-600">{err}</p>}
      <input type="email" placeholder="Email"
        value={email} onChange={e => setEmail(e.target.value)}
        className="w-full mb-3 p-2 border" required />
      <input type="password" placeholder="Password"
        value={pw} onChange={e => setPw(e.target.value)}
        className="w-full mb-3 p-2 border" required />
      <button type="submit" className="bg-blue-600 text-white px-4 py-2">Sign Up</button>
    </form>
  );
};

export default Signup;
