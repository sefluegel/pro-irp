import React from 'react';
import { Link } from 'react-router-dom';

const Sidebar = () => (
  <aside className="w-64 bg-white border-r border-gray-200 p-6 shadow-lg">
    <nav>
      <ul className="space-y-4">
        <li>
          <Link
            to="/"
            className="block text-gray-700 hover:text-blue-600 transition"
          >
            Home
          </Link>
        </li>
        <li>
          <Link
            to="/dashboard"
            className="block text-gray-700 hover:text-blue-600 transition"
          >
            Dashboard
          </Link>
        </li>
        {/* more links */}
      </ul>
    </nav>
  </aside>
);

export default Sidebar;
