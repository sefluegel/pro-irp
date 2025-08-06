// frontend/src/components/Sidebar.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const Sidebar = () => (
  <aside>
    <nav>
      <ul>
        <li><Link to="/">Home</Link></li>
        <li><Link to="/dashboard">Dashboard</Link></li>
        {/* Add additional navigation items here */}
      </ul>
    </nav>
  </aside>
);

export default Sidebar;
