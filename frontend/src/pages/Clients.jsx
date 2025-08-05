import React, { useEffect, useState } from 'react';
import { getClients, createClient, deleteClient } from '../services/api';

export default function Clients() {
  const [list, setList] = useState([]);
  const [name, setName] = useState('');
  const reload = async()=> setList(await getClients());
  useEffect(()=>{ reload() }, []);
  const add = async()=>{ await createClient({ name, medications: "" }); setName(""); reload() };
  const rm  = async id=>{ await deleteClient(id); reload() };

  return (
    <div style={{ maxWidth: 600, margin: 'auto', padding: 20 }}>
      <h2>Clients</h2>
      <input
        placeholder="Name"
        value={name}
        onChange={e=>setName(e.target.value)}
      />
      <button onClick={add}>Add</button>
      <ul>
        {list.map(c=>(
          <li key={c.clientId}>
            {c.name}
            <button onClick={()=>rm(c.clientId)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
