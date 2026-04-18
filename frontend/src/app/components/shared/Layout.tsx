import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import DarkVeil from '../../../components/DarkVeil';
import staffApplicationService, {
  subscribePendingStaffApplicationsUpdated,
} from '../../../services/staffApplicationService';
import {
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  Users,
  LogOut,
  ChevronRight,
  History,
  ShieldAlert,
  Settings,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '../ui/utils';

const userNav = [
  { to: '/user/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/user/submit', icon: PlusCircle, label: 'Submit Complaint' },
  { to: '/user/settings', icon: Settings, label: 'Settings' },
];

const staffNav = [
  { to: '/staff/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/staff/history', icon: History, label: 'Resolution History' },
  { to: '/staff/settings', icon: Settings, label: 'Settings' },
];

const adminNav = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/assign', icon: ClipboardList, label: 'Assign Complaints' },
  { to: '/admin/staff', icon: Users, label: 'Staff Directory' },
];

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

type NavItem = (typeof userNav)[number];

function SidebarContent({
  role,
  navItems,
  pendingStaffApplications,
  onNavClick,
  onLogout,
}: {
  role: string;
  navItems: NavItem[];
  pendingStaffApplications: number;
  onNavClick?: () => void;
  onLogout: () => void;
}) {
  const { currentUser } = useAuth();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-white/10 px-5 py-5 md:px-6 md:py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-red-600">
            <ShieldAlert className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white" style={{ fontWeight: 600, lineHeight: '1.2' }}>
              ResolvIQ
            </p>
            <p className="text-xs text-white/40">Issue Tracking</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-3 md:px-6 md:py-4">
        <span
          className={cn(
            'rounded-full px-2 py-1 text-xs uppercase tracking-wider text-white',
            roleColors[role]
          )}
        >
          {roleLabels[role]}
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-2 md:px-3">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavClick}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all',
                isActive
                  ? 'bg-red-600 text-white'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {role === 'admin' && label === 'Staff Directory' && pendingStaffApplications > 0 && (
                  <span
                    aria-label={`${pendingStaffApplications} pending staff applications`}
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-red-500"
                  />
                )}
                {isActive && <ChevronRight className="h-3 w-3 opacity-70" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 px-3 py-4 md:px-4">
        <div className="mb-3 flex items-center gap-3">
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-xs text-white"
            style={{ fontWeight: 600 }}
          >
            {currentUser?.name?.charAt(0) ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-white" style={{ fontWeight: 500 }}>
              {currentUser?.name}
            </p>
            <p className="truncate text-xs text-white/40">{currentUser?.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/50 transition-colors hover:bg-white/5 hover:text-red-400"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export function Layout() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [pendingStaffApplications, setPendingStaffApplications] = useState(0);

  const role = currentUser?.role ?? 'user';
  const navItems = role === 'user' ? userNav : role === 'staff' ? staffNav : adminNav;

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (role !== 'admin') {
      setPendingStaffApplications(0);
      return;
    }

    let isMounted = true;

    const loadPendingCount = async () => {
      try {
        const pendingList = await staffApplicationService.getPending();
        if (isMounted) {
          setPendingStaffApplications(pendingList.length);
        }
      } catch (error) {
        console.error('Failed to load pending staff applications for navigation badge:', error);
        if (isMounted) {
          setPendingStaffApplications(0);
        }
      }
    };

    void loadPendingCount();
    const unsubscribe = subscribePendingStaffApplicationsUpdated(setPendingStaffApplications);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [role, location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="fixed inset-0 z-0 min-h-0 overflow-hidden bg-black">
      <div className="absolute inset-0 z-0">
        <DarkVeil hueShift={237} brightness={0.25} />
      </div>
      <div className="relative z-10 flex h-full min-h-0 flex-col md:flex-row md:overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-black px-3 md:hidden">
          <button
            type="button"
            aria-expanded={mobileNavOpen}
            aria-label="Open navigation menu"
            onClick={() => setMobileNavOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="text-sm font-semibold text-white">ResolvIQ</span>
          <span className="w-10" aria-hidden />
        </header>

        <aside className="hidden h-full min-h-0 w-64 shrink-0 flex-col border-r border-white/10 bg-black md:flex">
          <SidebarContent
            role={role}
            navItems={navItems}
            pendingStaffApplications={pendingStaffApplications}
            onLogout={() => {
              handleLogout();
            }}
          />
        </aside>

        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              aria-label="Close navigation menu"
              className="absolute inset-0 bg-black/70"
              onClick={() => setMobileNavOpen(false)}
            />
            <aside className="absolute left-0 top-0 flex h-full w-[min(18rem,88vw)] flex-col border-r border-white/10 bg-black shadow-2xl shadow-black/50">
              <div className="flex items-center justify-end border-b border-white/10 p-2">
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setMobileNavOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <SidebarContent
                role={role}
                navItems={navItems}
                pendingStaffApplications={pendingStaffApplications}
                onNavClick={() => setMobileNavOpen(false)}
                onLogout={() => {
                  setMobileNavOpen(false);
                  handleLogout();
                }}
              />
            </aside>
          </div>
        )}

        <main className="relative z-20 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-black/10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
