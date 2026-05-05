import React, { useState, useRef, useEffect } from 'react';
import { Bell, Settings, ChevronDown, Rocket, X, Globe, Moon, Sun, Mail, Key, Wallet } from 'lucide-react';
import { Page, User } from '../types';
import { useI18n, translations, Language, Currency } from '../lib/i18n';
import { formatCurrency, getCachedRates, refreshCurrencyRates } from '../lib/currency';

interface HeaderProps {
  onMenuClick: () => void;
  setCurrentPage: (page: Page) => void;
  user: User | null;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, setCurrentPage, user }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [rates, setRates] = useState(getCachedRates());
  const { language, theme, currency, setLanguage, setTheme, setCurrency } = useI18n();
  const notifRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const notifications = [
    { id: 1, title: translations[language].welcomeTitle, message: translations[language].welcomeMessage, time: translations[language].now, read: false },
  ];

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    refreshCurrencyRates().then(setRates);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
  };

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="h-16 border-b border-white/5 bg-hive-black/60 backdrop-blur-xl sticky top-0 z-40 px-6 lg:px-10 flex items-center justify-between shadow-[0_0_15px_rgba(255,177,0,0.05)]">
      <div className="flex items-center gap-6">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 text-white/70 hover:text-hive-amber transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        <div className="hidden md:flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2 group focus-within:border-hive-amber/30 transition-all">
          <svg className="w-4 h-4 text-white/30 group-focus-within:text-hive-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder={translations[language].search}
            className="bg-transparent border-none outline-none text-xs font-mono w-64 text-white placeholder:text-white/20 p-0 focus:ring-0"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 lg:gap-8">
        <div className="flex items-center gap-3 bg-hive-amber/10 border border-hive-amber/20 px-4 py-2 rounded-full">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-mono text-hive-amber uppercase tracking-widest leading-none mb-1">{translations[language].balance}</span>
            <span className="font-mono font-bold text-hive-amber text-sm">₽0</span>
          </div>
          <button 
            onClick={() => setCurrentPage('payments')}
            className="p-1.5 bg-hive-amber text-hive-black rounded-lg hover:brightness-110 shadow-lg active:scale-95 transition-all"
          >
            <Rocket size={14} className="fill-current" />
          </button>
        </div>

        <div className="flex items-center gap-1 sm:gap-4 border-l border-white/5 sm:pl-6 pl-2">
          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-white/30 hover:text-hive-amber transition-colors relative hidden sm:block"
            >
              <Bell size={20} />
              {notifications.some(n => !n.read) && (
                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-hive-amber rounded-full shadow-[0_0_10px_rgba(255,177,0,1)]" />
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 bg-hive-dark border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="p-4 border-b border-white/5 flex justify-between items-center">
                  <h3 className="font-mono text-sm font-bold text-white uppercase tracking-widest">{translations[language].notifications}</h3>
                  <button onClick={() => setShowNotifications(false)} className="text-white/30 hover:text-white">
                    <X size={16} />
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-center text-white/40 text-sm">{translations[language].noNotifications}</p>
                  ) : (
                    notifications.map(notif => (
                      <div key={notif.id} className={`p-4 border-b border-white/5 hover:bg-white/5 ${!notif.read ? 'bg-hive-amber/5' : ''}`}>
                        <p className="text-sm font-bold text-white">{notif.title}</p>
                        <p className="text-xs text-white/40 mt-1">{notif.message}</p>
                        <p className="text-[10px] text-white/20 mt-2 font-mono">{notif.time}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Settings */}
          <div className="relative" ref={settingsRef}>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="hidden sm:block p-2 text-white/30 hover:text-hive-amber transition-colors"
            >
              <Settings size={20} />
            </button>
            
            {showSettings && (
              <div className="absolute right-0 top-12 w-72 bg-hive-dark border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="p-4 border-b border-white/5 flex justify-between items-center">
                  <h3 className="font-mono text-sm font-bold text-white uppercase tracking-widest">{translations[language].settings}</h3>
                  <button onClick={() => setShowSettings(false)} className="text-white/30 hover:text-white">
                    <X size={16} />
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  {/* Language */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Globe size={16} className="text-white/40" />
                      <span className="text-sm text-white/60">{translations[language].language}</span>
                    </div>
                    <div className="relative">
                      <select 
                        value={language}
                        onChange={(e) => handleLanguageChange(e.target.value as Language)}
                        className="appearance-none bg-hive-dark border border-hive-amber/30 rounded-lg px-8 py-1.5 text-xs text-hive-amber font-mono focus:border-hive-amber outline-none cursor-pointer"
                        style={{ backgroundImage: 'none' }}
                      >
                        <option value="en" className="bg-hive-dark">English</option>
                        <option value="ru" className="bg-hive-dark">Русский</option>
                        <option value="es" className="bg-hive-dark">Español</option>
                      </select>
                      <Globe size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-hive-amber pointer-events-none" />
                    </div>
                  </div>
                  
                  {/* Theme */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {theme === 'dark' ? <Moon size={16} className="text-white/40" /> : <Sun size={16} className="text-white/40" />}
                      <span className="text-sm text-white/60">{translations[language].theme}</span>
                    </div>
                    <button 
                      onClick={handleThemeToggle}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                    >
                      {theme === 'dark' ? '🌙 ' + translations[language].dark : '☀️ ' + translations[language].light}
                    </button>
                  </div>
                  
                  <div className="border-t border-white/5 pt-4 mt-4">
                    <p className="text-[10px] text-white/30 font-mono uppercase tracking-widest mb-3">{translations[language].account}</p>
                    <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors">
                      <Mail size={14} />
                      <span className="text-xs">{user?.email || 'Not connected'}</span>
                    </button>
                    <button onClick={() => alert('API Keys management coming soon')} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors">
                      <Key size={14} />
                      <span className="text-xs">{translations[language].apiKeys}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button onClick={() => setCurrentPage('profile')} className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-full border border-hive-amber/30 p-0.5 overflow-hidden group-hover:border-hive-amber transition-colors">
              <img 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'user'}`}
                alt="Avatar" 
                className="w-full h-full object-cover rounded-full bg-hive-muted"
              />
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold font-display group-hover:text-hive-amber transition-colors">{user?.name || user?.email || 'User'}</p>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <p className="text-[9px] font-mono text-white/40 uppercase tracking-tighter">{user?.role || 'USER'}</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
