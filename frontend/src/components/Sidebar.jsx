/ frontend/src/components/Sidebar.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';  // Update path to your actual logo file

const Sidebar = () => (
  <aside className="bg-white w-64 border-r border-gray-200 p-6 shadow-lg">
    {/* Brand header with logo */}
    <div className="flex items-center mb-8">
      <img src={logo} alt="Pro IRP logo" className="h-8 w-8 mr-3" />
      <span className="text-2xl font-bold text-blue-600">Pro IRP</span>
    </div>

    {/* Navigation links */}
    <nav>
      <ul className="space-y-4">
        <li>
          <Link to="/" className="block text-gray-700 hover:text-blue-600 transition-colors">
            Home
          </Link>
        </li>
        <li>
          <Link to="/dashboard" className="block text-gray-700 hover:text-blue-600 transition-colors">
            Dashboard
          </Link>
        </li>
        {/* Add additional navigation items here */}
      </ul>
    </nav>
  </aside>
);

export default Sidebar;
