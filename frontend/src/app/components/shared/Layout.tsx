import { NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import DarkVeil from '../../../components/DarkVeil';
import {
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  Users,
  LogOut,
  ChevronRight,
  History,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '../ui/utils';

const userNav = [
  { to: '/user/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/user/submit', icon: PlusCircle, label: 'Submit Complaint' },
];

const staffNav = [
  { to: '/staff/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/staff/history', icon: History, label: 'Resolution History' },
];

const adminNav = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/assign', icon: ClipboardList, label: 'Assign Complaints' },
  { to: '/admin/staff', icon: Users, label: 'Staff Directory' },
];

const loginNav = [
  { to: '/login', icon: LogOut, label: 'Login' },
  { to: '/register', icon: Users, label: 'Register' },
]

const roleColors: Record<string, string> = {
  user: 'bg-red-600',
  staff: 'bg-amber-500',
  admin: 'bg-amber-500',
};

const roleLabels: Record<string, string> = {
  user: 'User',
  staff: 'Staff',
  admin: 'Administrator',
};

export function Layout() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const role = currentUser?.role ?? 'user';
  const navItems = role === 'user' ? userNav : role === 'staff' ? staffNav : adminNav;
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="relative h-screen bg-black overflow-hidden">
      <div className="absolute inset-0 z-0">
        <DarkVeil hueShift={237} brightness={0.25}/>
      </div>
      <div className="relative z-10 flex h-full overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-black flex flex-col flex-shrink-0">
        {/* Brand */}
        <div className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white text-sm" style={{ fontWeight: 600, lineHeight: '1.2' }}>
                ResolvIQ
              </p>
              <p className="text-white/40 text-xs">Issue Tracking</p>
            </div>
          </div>
        </div>

        {/* Role Badge */}
        <div className="px-6 py-4">
          <span
            className={cn(
              'text-xs text-white px-2 py-1 rounded-full uppercase tracking-wider',
              roleColors[role]
            )}
          >
            {roleLabels[role]}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group',
                  isActive
                    ? 'bg-red-600 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight className="w-3 h-3 opacity-70" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Profile */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-xs flex-shrink-0" style={{ fontWeight: 600 }}>
              {currentUser?.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs truncate" style={{ fontWeight: 500 }}>
                {currentUser?.name}
              </p>
              <p className="text-white/40 text-xs truncate">{currentUser?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-white/50 hover:text-red-400 hover:bg-white/5 rounded-lg text-xs transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="relative z-20 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-black/10">
        <Outlet />
      </main>
      </div>
    </div>
  );
}