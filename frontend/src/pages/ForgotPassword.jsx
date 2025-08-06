import React, { useState } from 'react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Password reset link sent to ${email} (stub)`);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">Forgot Password</h2>
      <input type="email" placeholder="Enter your email"
        value={email} onChange={e => setEmail(e.target.value)}
        className="w-full mb-3 p-2 border" required />
      <button type="submit" className="bg-gray-600 text-white px-4 py-2">
        Send Reset Link
      </button>
    </form>
  );
};

export default ForgotPassword;
