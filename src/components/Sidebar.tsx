import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Search, 
  Rocket, 
  CreditCard, 
  History, 
  User, 
  LogOut,
  Zap,
  Bell,
  Settings,
  HelpCircle,
  Menu,
  X
} from 'lucide-react';
import { Page } from '../types';
import { logout } from '../lib/api';
import { useI18n, translations } from '../lib/i18n';

interface SidebarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage, isMobileOpen, setIsMobileOpen, onLogout }) => {
  const { language } = useI18n();
  const t = translations[language];
  
  const navItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'catalog', label: t.analytics, icon: Search },
    { id: 'campaigns', label: t.campaigns, icon: Rocket },
    { id: 'payments', label: t.payments, icon: CreditCard },
    { id: 'history', label: t.history, icon: History },
    { id: 'profile', label: t.profile, icon: User },
  ];

  const NavItem = ({ item }: { item: typeof navItems[0]; key?: string }) => {
    const isActive = currentPage === item.id;
    return (
      <button
        onClick={() => {
          setCurrentPage(item.id as Page);
          setIsMobileOpen(false);
        }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group relative ${
          isActive 
            ? 'bg-hive-amber/10 text-hive-amber' 
            : 'text-white/50 hover:text-white hover:bg-white/5'
        }`}
      >
        {isActive && (
          <motion.div
            layoutId="active-pill"
            className="absolute left-0 w-1 h-6 bg-hive-amber rounded-r-full"
          />
        )}
        <item.icon size={20} className={isActive ? 'text-hive-amber' : 'group-hover:text-hive-amber transition-colors'} />
        <span className="font-display font-medium text-sm tracking-wide">{item.label}</span>
      </button>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 glass-panel border-r border-white/10 h-screen fixed left-0 top-0 overflow-y-auto z-50">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-hive-amber rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(255,177,0,0.3)]">
            <Zap className="text-hive-black fill-hive-black" size={24} />
          </div>
          <div>
            <h1 className="font-display font-black text-xl tracking-tighter italic text-hive-amber">Boost Hive</h1>
            <span className="text-[10px] uppercase font-mono text-white/40 tracking-widest mt-0.5 block">Elite SMM Terminal</span>
          </div>
        </div>

        <nav className="flex-1 px-4 mt-4 space-y-1">
          {navItems.map((item) => (
            <NavItem key={item.id} item={item} />
          ))}
          
          <div className="pt-8 px-4">
            <button 
              onClick={() => setCurrentPage('catalog')}
              className="hive-button w-full"
            >
              <Zap size={14} className="fill-current" />
              {t.launchBoost}
            </button>
          </div>
        </nav>

        <div className="p-6 mt-auto">
          <div className="bg-white/5 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 text-hive-amber/80 mb-2">
              <HelpCircle size={16} />
              <span className="text-[10px] font-mono uppercase tracking-widest">{t.operatorSupport}</span>
            </div>
            <button onClick={() => alert('Support contact: support@boosthive.elite')} className="text-xs text-white/40 hover:text-white transition-colors block">{t.technicalDocs}</button>
          </div>
          
          <button onClick={async () => { try { await logout(); } catch (e) { } onLogout(); }} className="w-full flex items-center gap-3 px-4 py-4 mt-6 text-white/30 hover:text-red-400 transition-colors group">
            <LogOut size={18} />
            <span className="font-display font-bold text-xs uppercase tracking-widest">{t.deactivateTerminal}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Content */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 20 }}
            className="lg:hidden fixed left-0 top-0 w-72 h-screen bg-hive-dark border-r border-hive-border z-[70] flex flex-col"
          >
            <div className="p-6 flex items-center justify-between">
               <div className="flex items-center gap-3">
                <Zap className="text-hive-amber" size={24} />
                <h1 className="font-display font-bold text-lg">Boost Hive</h1>
              </div>
              <button onClick={() => setIsMobileOpen(false)} className="text-white/50 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <nav className="flex-1 px-4 mt-6 space-y-2">
              {navItems.map((item) => (
                <NavItem key={item.id} item={item} />
              ))}
            </nav>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
