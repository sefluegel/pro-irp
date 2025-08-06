import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogIn, UserPlus, KeyRound, LayoutDashboard } from 'lucide-react';

const navItems = [
  { to: "/", label: "Login", icon: <LogIn size={20} /> },
  { to: "/signup", label: "Sign Up", icon: <UserPlus size={20} /> },
  { to: "/forgot", label: "Forgot Password", icon: <KeyRound size={20} /> },
  { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
];

const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className="w-64 min-h-screen bg-blue-700 flex flex-col shadow-2xl font-[Inter]">
      <div className="flex items-center gap-2 px-6 py-8 border-b border-blue-800">
        <span className="text-3xl font-bold tracking-tight text-white">Pro<span className="text-blue-200">IRP</span></span>
      </div>
      <nav className="flex-1 flex flex-col py-8 gap-2">
        <ul className="space-y-2">
          {navItems.map(({ to, label, icon }) => (
            <li key={to}>
              <Link
                to={to}
                className={`flex items-center gap-3 px-6 py-3 rounded-xl text-lg font-semibold tracking-wide transition
                  ${location.pathname === to
                    ? 'bg-blue-600 text-white'
                    : 'text-white hover:bg-blue-600 hover:text-blue-200'}
                `}
              >
                {icon}
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mb-8 mt-auto px-6">
        <button className="flex items-center gap-2 w-full py-2 px-3 bg-blue-800 hover:bg-blue-600 rounded-xl transition text-white font-semibold">
          {/* You can add a logout icon or text here if you wish */}
          Log Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
