// frontend/src/components/Sidebar.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const Sidebar = () => (
  <aside className="h-full bg-white border-r border-gray-200 p-4">
    <div className="mb-6 flex items-center">
      <img
        src={process.env.PUBLIC_URL + '/logo.png'}
        alt="Pro IRP Logo"
        className="h-10 w-auto mr-2"
      />
      <span className="text-xl font-bold text-blue-600">Pro IRP</span>
    </div>
    <nav>
      <ul className="space-y-4">
        <li>
          <Link to="/" className="text-gray-700 hover:text-blue-600">
            Home
          </Link>
        </li>
        <li>
          <Link to="/dashboard" className="text-gray-700 hover:text-blue-600">
            Dashboard
          </Link>
        </li>
        {/* add more links here */}
      </ul>
    </nav>
  </aside>
);

export default Sidebar;
