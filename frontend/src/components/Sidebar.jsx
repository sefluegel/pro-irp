import React from 'react';
import { Link } from 'react-router-dom';

const Sidebar = () => (
  <aside className="w-64 bg-white border-r border-gray-200 p-6 shadow-lg min-h-screen">
    <nav>
      <ul className="space-y-4">
        <li>
          <Link to="/" className="block text-blue-700 font-bold hover:text-blue-900 transition">Login</Link>
        </li>
        <li>
          <Link to="/signup" className="block text-gray-700 hover:text-blue-600 transition">Sign Up</Link>
        </li>
        <li>
          <Link to="/forgot" className="block text-gray-700 hover:text-blue-600 transition">Forgot Password</Link>
        </li>
        <li>
          <Link to="/dashboard" className="block text-gray-700 hover:text-blue-600 transition">Dashboard</Link>
        </li>
      </ul>
    </nav>
  </aside>
);

export default Sidebar;
