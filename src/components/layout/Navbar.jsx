// src/components/layout/Navbar.jsx
import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, KanbanSquare, History, Users,
  Bell, Sun, Moon, LogOut, ChevronDown, KeyRound
} from 'lucide-react';
import { useAuth }               from '../../hooks/useAuth';
import { useJobOrders }          from '../../hooks/useJobOrders';
import { useDarkMode }           from '../../store/uiStore';
import { LogoCompact }           from '../ui/Logo';
import ChangePasswordModal       from '../ui/ChangePasswordModal';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/kanban',    label: 'Project',   Icon: KanbanSquare     },
  { to: '/history',   label: 'History',   Icon: History          },
  { to: '/users',     label: 'Users',     Icon: Users            },
];

const isOverdue = (d) => d && new Date(d) < new Date();

export default function Navbar() {
  const { user, logout }         = useAuth();
  const { data: jobOrders = [] } = useJobOrders();
  const { dark, toggle }         = useDarkMode();
  const navigate                 = useNavigate();
  const [showMenu,     setShowMenu]     = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);

  // Hitung kartu aktif yang overdue untuk notifikasi bell
  const activeColIds = ['JOB ORDER', 'ON PROGRESS', 'ON SERVER'];
  const overdueCount = jobOrders.filter(
    j => activeColIds.includes(j.column_id) && isOverdue(j.due_date)
  ).length;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Inisial user untuk avatar
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'U';

  return (
  <>
    <nav className={`sticky top-0 z-40 border-b shadow-sm ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center h-[60px] px-5 gap-4">

        {/* Logo */}
        <div className="flex-shrink-0 mr-2">
          <LogoCompact dark={dark} />
        </div>

        {/* Nav links */}
        <div className="flex items-center gap-0.5 flex-1">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all
                ${isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : dark
                    ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">

          {/* Overdue notification bell */}
          {overdueCount > 0 && (
            <button className="relative p-2 rounded-xl text-amber-500 hover:bg-amber-50 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold leading-none">
                {overdueCount}
              </span>
            </button>
          )}

          {/* Dark mode toggle */}
          <button
            onClick={toggle}
            className={`p-2 rounded-xl transition-colors ${dark ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(v => !v)}
              className={`flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl transition-colors ${dark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                {initials}
              </div>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMenu ? 'rotate-180' : ''} ${dark ? 'text-gray-400' : 'text-gray-400'}`} />
            </button>

            {showMenu && (
              <>
                {/* Backdrop untuk close menu */}
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className={`absolute right-0 top-full mt-1.5 w-52 rounded-xl border shadow-lg overflow-hidden z-50 ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  {/* Email */}
                  <div className={`px-4 py-3 border-b ${dark ? 'border-gray-700' : 'border-gray-100'}`}>
                    <p className={`text-xs font-medium truncate ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{user?.email}</p>
                  </div>

                  {/* Ganti Password */}
                  <button
                    onClick={() => { setShowMenu(false); setShowChangePw(true); }}
                    className={`w-full flex items-center gap-2 px-4 py-3 text-sm transition-colors
                      ${dark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <KeyRound className="w-4 h-4" />
                    Ganti Password
                  </button>

                  {/* Divider */}
                  <div className={`border-t ${dark ? 'border-gray-700' : 'border-gray-100'}`} />

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className={`w-full flex items-center gap-2 px-4 py-3 text-sm transition-colors text-red-500 ${dark ? 'hover:bg-gray-700' : 'hover:bg-red-50'}`}
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>

    {showChangePw && (
      <ChangePasswordModal
        onClose={() => setShowChangePw(false)}
        dark={dark}
      />
    )}
  </>
  );
}
