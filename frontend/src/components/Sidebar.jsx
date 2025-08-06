// frontend/src/components/Sidebar.jsx
import React from 'react';
import Home from '../pages/Home';

const Sidebar = () => (
  <aside>
    <nav>
      <ul>
        <li>
          <Home />
        </li>
        {/* Add additional navigation items here */}
      </ul>
    </nav>
  </aside>
);

export default Sidebar;
