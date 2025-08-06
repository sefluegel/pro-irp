import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = () => {
    if (email === 'demo@proirp.io' && password === 'DemoPass123') {
      localStorage.setItem('isLoggedIn', 'true');
      navigate('/');
    } else {
      alert('Invalid credentials');
    }
  };

  const handleDemo = () => {
    setEmail('demo@proirp.io');
    setPassword('DemoPass123');
    localStorage.setItem('isLoggedIn', 'true');
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold mb-6 text-center text-primary">Pro IRP Login</h2>
        <label className="block mb-2">Email</label>
        <input
          type="email"
          className="w-full mb-4 p-2 border rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label className="block mb-2">Password</label>
        <input
          type="password"
          className="w-full mb-6 p-2 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          className="w-full bg-primary text-white py-2 rounded mb-4"
          onClick={handleLogin}
        >Login</button>
        <button
          className="w-full bg-secondary text-white py-2 rounded"
          onClick={handleDemo}
        >Demo User</button>
      </div>
    </div>
  );
}
