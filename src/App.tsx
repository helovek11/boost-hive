import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Catalog from './components/Catalog';
import History from './components/History';
import Profile from './components/Profile';
import Payments from './components/Payments';
import Login from './components/Login';
import { Page, User } from './types';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Simulate initial system load
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'catalog':
        return <Catalog />;
      case 'campaigns':
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
            <div className="hive-card aspect-square w-32 flex items-center justify-center border-dashed">
               <span className="text-4xl">🚀</span>
            </div>
            <div>
              <h2 className="text-3xl font-display font-black italic tracking-tight">Campaign Manager</h2>
              <p className="text-white/40 mt-2">Active deployment oversight is being upgraded. Stand by.</p>
            </div>
          </div>
        );
      case 'payments':
        return <Payments />;
      case 'history':
        return <History />;
      case 'profile':
        return <Profile user={user} />;
      default:
        return <Dashboard />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-hive-black flex items-center justify-center relative overflow-hidden">
        <div className="hex-bg absolute inset-0 opacity-20" />
        <div className="z-10 flex flex-col items-center gap-8">
           <motion.div 
             animate={{ 
               scale: [1, 1.1, 1],
               rotate: [0, 180, 360],
               opacity: [0.5, 1, 0.5]
             }}
             transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
             className="w-16 h-16 border-2 border-hive-amber rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.5)]"
           >
              <div className="w-8 h-8 bg-hive-amber rounded" />
           </motion.div>
           <div className="space-y-2 text-center">
             <h1 className="text-lg font-mono text-hive-amber uppercase tracking-[0.5em] animate-pulse">Initializing Hive</h1>
             <p className="text-[10px] font-mono text-white/20 uppercase tracking-[0.3em]">Establishing secure proxy tunnels...</p>
           </div>
        </div>
      </div>
    );
  }

  const handleLogin = (userData: User) => {
    setUser(userData);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setUser(null);
    setIsLoggedIn(false);
    setCurrentPage('dashboard');
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-hive-black flex font-sans overflow-x-hidden hex-bg">
      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
        onLogout={handleLogout}
      />
      
      <main className="flex-1 lg:ml-64 flex flex-col min-h-screen relative min-w-0 overflow-x-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-hive-amber/5 rounded-full blur-[120px] pointer-events-none" />
        
        <Header 
          onMenuClick={() => setIsMobileMenuOpen(true)} 
          setCurrentPage={setCurrentPage}
          user={user}
        />
        
        <div className="flex-1 p-4 sm:p-6 lg:p-10 relative min-w-0 max-w-full overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="relative z-10 mx-auto max-w-7xl w-full min-w-0 overflow-x-hidden"
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
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

export default App;
