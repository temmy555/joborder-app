// src/components/layout/Layout.jsx
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { useDarkMode } from '../../store/uiStore';
import { useInactivityLogout } from '../../hooks/useInactivityLogout';

export default function Layout() {
  const { dark } = useDarkMode();
  useInactivityLogout(); // auto logout setelah 3 jam tidak aktif

  return (
    <div className={`min-h-screen flex flex-col ${dark ? 'bg-gray-950' : 'bg-slate-50'}`}>
      <Navbar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <footer className={`text-center py-2.5 text-xs border-t ${dark ? 'border-gray-800 text-gray-700' : 'border-gray-100 text-gray-400'}`}>
        © 2026 Job Order Wonokitri
      </footer>
    </div>
  );
}
