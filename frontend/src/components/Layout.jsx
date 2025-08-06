// frontend/src/components/Layout.jsx
import React from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children }) => (
  <div style={{ display: 'flex', minHeight: '100vh' }}>
    <aside style={{ width: 240, background: '#f5f5f5', padding: '1rem' }}>
      <Sidebar />
    </aside>
    <main style={{ flex: 1, padding: '2rem' }}>
      {children}
    </main>
  </div>
);

export default Layout;
