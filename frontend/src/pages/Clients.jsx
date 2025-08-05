// frontend/src/pages/Clients.jsx
import React, { useEffect, useState } from 'react';
import { getClients, createClient, updateClient, deleteClient } from '../services/api';

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [name, setName] = useState('');

  const load = async () => {
    setClients(await getClients());
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    await createClient({ name, medications: '' });
    setName('');
    load();
  };

  const remove = async (id) => {
    await deleteClient(id);
    load();
  };

  return (
    <div>
      <h2>Clients</h2>
      <input
        placeholder="Name"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <button onClick={add}>Add Client</button>
      <ul>
        {clients.map(c => (
          <li key={c.clientId}>
            {c.name}{' '}
            <button onClick={() => remove(c.clientId)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
