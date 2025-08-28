import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ children }) => (
  <div className="flex min-h-screen bg-gray-100">
    <Sidebar />
    <div className="flex-1 flex flex-col">
      <Header />
      <main className="p-6 flex-1">{children}</main>
    </div>
  </div>
);

export default Layout;
