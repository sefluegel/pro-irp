import React from 'react';

const Header = () => (
  <header className="bg-blue-600 text-white flex items-center px-6 py-4 shadow-md">
    <img
      src={process.env.PUBLIC_URL + '/logo.png'}
      alt="Pro IRP Logo"
      className="h-8 w-auto mr-3"
    />
    <h1 className="text-2xl font-bold">Pro IRP</h1>
  </header>
);

export default Header;
