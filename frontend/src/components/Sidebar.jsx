import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png'; // update path if needed

const Sidebar = () => (
  <aside className="h-full bg-white border-r border-gray-200 p-4">
    <div className="mb-6">
      <img src={logo} alt="Pro IRP Logo" className="h-10 w-auto" />
    </div>
    <nav>
      <ul className="space-y-4">
        <li>
          <Link to="/" className="text-gray-700 hover:text-blue-600">Home</Link>
        </li>
        <li>
          <Link to="/dashboard" className="text-gray-700 hover:text-blue-600">Dashboard</Link>
        </li>
        {/* add more links here */}
      </ul>
    </nav>
  </aside>
);

export default Sidebar;
