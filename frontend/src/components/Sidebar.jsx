const navItems = [
  { icon: <Home size={20} />, label: 'Dashboard', to: '/' },
  { icon: <Users size={20} />, label: 'Clients',   to: '/clients' },
  { icon: <Calendar size={20} />, label: 'Tasks',   to: '/tasks' },
  { icon: <BarChart2 size={20} />, label: 'Reports', to: '/reports' },
  { icon: <Settings size={20} />, label: 'Settings',to: '/settings' },
];

export default function Sidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="w-64 bg-white border-r shadow-sm">
      <div className="p-6 text-xl font-bold text-primary">PRO IRP</div>
      <ul>
        {navItems.map(({ icon, label, to }) => (
          <li key={label} className={`px-6 py-3 ${pathname === to ? 'bg-gray-100' : ''}`}>
            <Link to={to} className="flex items-center space-x-3 text-gray-700 hover:text-primary">
              {icon}<span className="font-medium">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
