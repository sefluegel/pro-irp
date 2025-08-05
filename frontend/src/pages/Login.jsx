import React, { useState } from 'react';
import { login } from '../services/api';

export default function Login({ onSuccess }) {
  const [e, setE] = useState(''), [p, setP] = useState(''), [err, setErr] = useState();
  const submit = async ev => {
    ev.preventDefault();
    try {
      const { token } = await login(e,p);
      localStorage.setItem('token', token);
      onSuccess();
    } catch (x) {
      setErr(x.message);
    }
  };
  return (
    <form onSubmit={submit}>
      <h2>Log In</h2>
      {err && <div style={{color:'red'}}>{err}</div>}
      <input type="email" placeholder="Email" value={e}
             onChange={e=>setE(e.target.value)} required />
      <input type="password" placeholder="Password" value={p}
             onChange={e=>setP(e.target.value)} required />
      <button type="submit">Log In</button>
    </form>
  );
}
