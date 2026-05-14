import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  X,
  Shield,
  Globe
} from 'lucide-react';
import { logout } from '../lib/api';
import { useI18n, translations, Language, Theme } from '../lib/i18n';
import { User as UserType } from '../types';

interface SidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  onLogout: () => void;
  user: UserType | null;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, setIsMobileOpen, onLogout, user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, theme, setLanguage, setTheme } = useI18n();
  const t = translations[language];

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { id: 'dashboard', path: '/dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'catalog', path: '/catalog', label: t.analytics, icon: Search },
    { id: 'campaigns', path: '/campaigns', label: t.campaigns, icon: Rocket },
    { id: 'payments', path: '/payments', label: t.payments, icon: CreditCard },
    { id: 'orders', path: '/orders', label: t.history, icon: History },
    { id: 'profile', path: '/profile', label: t.profile, icon: User },
  ];

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'ELITE';

  const NavItem = ({ item }: { item: typeof navItems[0]; key?: string }) => {
    const active = isActive(item.path);
    return (
      <button
        onClick={() => {
          navigate(item.path);
          setIsMobileOpen(false);
        }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group relative ${
          active
            ? 'bg-hive-amber/10 text-hive-amber'
            : 'text-white/50 hover:text-white hover:bg-white/5'
        }`}
      >
        {active && (
          <motion.div
            layoutId="active-pill"
            className="absolute left-0 w-1 h-6 bg-hive-amber rounded-r-full"
          />
        )}
        <item.icon size={20} className={active ? 'text-hive-amber' : 'group-hover:text-hive-amber transition-colors'} />
        <span className="font-display font-medium text-sm tracking-wide">{item.label}</span>
      </button>
    );
  };

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
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

          {/* Admin link - only for ADMIN/ELITE */}
          {isAdmin && (
            <button
              onClick={() => { navigate('/admin'); setIsMobileOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group relative ${
                isActive('/admin')
                  ? 'bg-hive-amber/10 text-hive-amber'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              {isActive('/admin') && (
                <motion.div layoutId="active-pill-admin" className="absolute left-0 w-1 h-6 bg-hive-amber rounded-r-full" />
              )}
              <Shield size={20} className={isActive('/admin') ? 'text-hive-amber' : 'group-hover:text-hive-amber transition-colors'} />
              <span className="font-display font-medium text-sm tracking-wide">Admin Panel</span>
            </button>
          )}

          <div className="pt-8 px-4">
            <button
              onClick={() => navigate('/catalog')}
              className="hive-button w-full"
            >
              <Zap size={14} className="fill-current" />
              {t.launchBoost}
            </button>
          </div>
        </nav>

        <div className="p-6 mt-auto">
          <div className="bg-white/5 rounded-xl p-4 border border-white/5">
            <div className="text-xs font-mono text-white/40 space-y-1">
              <div className="flex items-center gap-2 mb-3">
                <Globe size={14} className="text-hive-amber" />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="bg-transparent text-white/60 text-[10px] font-mono uppercase tracking-widest border border-white/10 rounded-lg px-2 py-1 outline-none"
                >
                  <option value="en" className="bg-hive-dark">EN</option>
                  <option value="ru" className="bg-hive-dark">RU</option>
                  <option value="es" className="bg-hive-dark">ES</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleThemeToggle} className="text-[10px] font-mono text-white/40 hover:text-hive-amber uppercase tracking-widest transition-colors">
                  {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
                </button>
              </div>
            </div>
          </div>

          <button onClick={async () => { try { await logout(); } catch (e) {} onLogout(); navigate('/login'); }} className="w-full flex items-center gap-3 px-4 py-4 mt-6 text-white/30 hover:text-red-400 transition-colors group">
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
                <h1 className="font-display font-bold text-lg text-white">Boost Hive</h1>
              </div>
              <button onClick={() => setIsMobileOpen(false)} className="text-white/50 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <nav className="flex-1 px-4 mt-6 space-y-2">
              {navItems.map((item) => (
                <NavItem key={item.id} item={item} />
              ))}

              {isAdmin && (
                <button
                  onClick={() => { navigate('/admin'); setIsMobileOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 text-white/50 hover:text-white hover:bg-white/5 group`}
                >
                  <Shield size={20} className="group-hover:text-hive-amber transition-colors" />
                  <span className="font-display font-medium text-sm tracking-wide">Admin Panel</span>
                </button>
              )}
            </nav>

            {/* Mobile settings */}
            <div className="border-t border-white/10 px-4 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">{t.language}</span>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="bg-hive-dark text-white/60 text-[10px] font-mono uppercase tracking-widest border border-white/10 rounded-lg px-2 py-1 outline-none"
                >
                  <option value="en" className="bg-hive-dark">English</option>
                  <option value="ru" className="bg-hive-dark">Русский</option>
                  <option value="es" className="bg-hive-dark">Español</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">{t.theme}</span>
                <button onClick={handleThemeToggle} className="text-[10px] font-mono text-white/40 hover:text-hive-amber uppercase tracking-widest transition-colors border border-white/10 rounded-lg px-2 py-1">
                  {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
                </button>
              </div>
            </div>

            <button onClick={async () => { try { await logout(); } catch (e) {} onLogout(); navigate('/login'); }} className="w-full flex items-center gap-3 px-6 py-4 text-white/30 hover:text-red-400 transition-colors border-t border-white/10">
              <LogOut size={18} />
              <span className="font-display font-bold text-xs uppercase tracking-widest">{t.deactivateTerminal}</span>
            </button>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
