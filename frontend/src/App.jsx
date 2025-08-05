import React, { useState } from 'react';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Clients from './pages/Clients';

export default function App() {
  const [authed, setAuthed] = useState(!!localStorage.getItem('token'));
  return authed
    ? <Clients />
    : (
      <div style={{ maxWidth: 400, margin: 'auto', padding: 20 }}>
        <h1>Pro IRP MVP</h1>
        <Signup onSuccess={() => setAuthed(true)} />
        <hr/>
        <Login onSuccess={() => setAuthed(true)} />
      </div>
    );
}
