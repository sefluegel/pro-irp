import React from 'react';
import { Bell, User } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="h-16 flex items-center px-6 bg-primary text-white shadow-md">
      <div className="flex items-center">
        <img src="/logo.png" alt="Pro IRP" className="h-10 w-10" />
        <h1 className="ml-3 text-2xl font-semibold">Pro IRP</h1>
      </div>
      <div className="ml-auto flex items-center space-x-4">
        <Bell className="cursor-pointer" />
        <User className="cursor-pointer" />
      </div>
    </nav>
  );
}
