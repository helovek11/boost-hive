import { useState } from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { User } from '../types';

type LayoutContext = { user: User; setUser: (u: User) => void };

const AppLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, setUser } = useOutletContext<LayoutContext>();

  const handleLogout = () => {
    setUser(null as any);
  };

  return (
    <div className="min-h-screen bg-hive-black flex font-sans overflow-x-hidden hex-bg">
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
        onLogout={handleLogout}
        user={user}
      />

      <main className="flex-1 lg:ml-64 flex flex-col min-h-screen relative min-w-0 overflow-x-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-hive-amber/5 rounded-full blur-[120px] pointer-events-none" />

        <Header
          onMenuClick={() => setIsMobileMenuOpen(true)}
          user={user}
        />

        <div className="flex-1 p-4 sm:p-6 lg:p-10 relative min-w-0 max-w-full overflow-x-hidden">
          <div className="relative z-10 mx-auto max-w-7xl w-full min-w-0 overflow-x-hidden">
            <Outlet context={{ user, setUser }} />
          </div>
        </div>

        <footer className="p-8 border-t border-white/5 bg-hive-black/30 mt-auto backdrop-blur-md">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
              <p className="text-[9px] font-mono text-white/30 uppercase tracking-[0.2em]">Global Hive Node Status: Optimal</p>
            </div>
            <div className="flex gap-8 text-[9px] font-mono text-white/10 uppercase tracking-[0.4em]">
              <span>© 2024 Boost Hive</span>
              <span className="hidden sm:inline">Encrypted Transmission</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default AppLayout;
