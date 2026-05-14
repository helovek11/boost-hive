import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Zap, 
  Rocket, 
  ShieldCheck, 
  Fingerprint, 
  Key, 
  Lock,
  RefreshCw,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { useI18n, translations } from '../lib/i18n';
import { login, register } from '../lib/api';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useI18n();
  const t = translations[language];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    setError(null);
    
    try {
      if (isRegister) {
        await register(email, password, name || undefined);
      } else {
        await login(email, password);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || (isRegister ? 'Ошибка регистрации' : 'Ошибка входа'));
      setIsConnecting(false);
    }
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-hive-black text-[#dee2ec] font-sans overflow-hidden selection:bg-hive-amber selection:text-hive-black relative flex items-center justify-center p-6 hex-bg">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,177,0,0.08)_0%,transparent_70%)] pointer-events-none" />

      <div className="w-full max-w-[1200px] grid lg:grid-cols-2 gap-12 items-center relative z-10">
        
        {/* Left Side: Branding & Stats */}
        <div className="hidden lg:flex flex-col space-y-12">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-hive-amber rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(255,177,0,0.4)]">
                <Zap className="text-hive-black fill-hive-black" size={32} />
              </div>
              <h1 className="font-display font-black text-6xl tracking-tighter italic text-white leading-none">Boost Hive</h1>
            </div>
            <p className="text-white/40 font-display text-2xl max-w-md italic leading-tight">
              {t.boostHiveTagline}
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="hive-card bg-[#161b22]/40"
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} className="text-hive-amber" />
                <span className="text-[10px] uppercase font-mono text-white/30 tracking-widest leading-none">{t.operationalUptime}</span>
              </div>
              <div className="text-4xl font-display font-black text-white">99.9%</div>
              <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-hive-amber w-[99.9%]" />
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="hive-card bg-[#161b22]/40"
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap size={16} className="text-hive-amber" />
                <span className="text-[10px] uppercase font-mono text-white/30 tracking-widest leading-none">{t.tasksExecuted}</span>
              </div>
              <div className="text-4xl font-display font-black text-white">12M+</div>
              <p className="mt-2 text-[10px] font-mono text-white/20 uppercase tracking-tighter">{t.realTimeProcessing}</p>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="relative rounded-[2.5rem] overflow-hidden aspect-[16/10] border border-white/5 shadow-2xl group"
          >
             <img 
               src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1200" 
               alt="Server Room" 
               className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-[2s] grayscale group-hover:grayscale-0" 
             />
             <div className="absolute inset-0 bg-gradient-to-t from-hive-black to-transparent" />
             <div className="absolute bottom-6 left-6 flex items-center gap-4">
               <div className="flex -space-x-3">
                 {[1,2,3].map(i => (
                   <div key={i} className="w-10 h-10 rounded-full border-2 border-hive-black bg-hive-muted overflow-hidden bg-cover" style={{ backgroundImage: `url(https://api.dicebear.com/7.x/avataaars/svg?seed=${i * 99})` }} />
                 ))}
                 <div className="w-10 h-10 rounded-full border-2 border-hive-black bg-hive-amber flex items-center justify-center text-[10px] font-bold text-hive-black">+2k</div>
               </div>
               <span className="text-[10px] font-mono text-hive-amber uppercase tracking-[0.2em] font-bold">{t.eliteUsersOnline}</span>
             </div>
          </motion.div>
        </div>

        {/* Right Side: Login Form */}
        <div className="flex justify-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="hive-card w-full max-w-[460px] !p-12 lg:!p-16 shadow-[0_0_100px_rgba(0,0,0,0.6)] border-white/10"
          >
            <div className="mb-12 text-center lg:text-left">
              <div className="lg:hidden flex justify-center items-center gap-3 mb-10">
                <div className="w-12 h-12 bg-hive-amber rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(255,177,0,0.3)]">
                  <Zap className="text-hive-black fill-hive-black" size={28} />
                </div>
                <span className="text-3xl font-black text-white italic tracking-tighter">Boost Hive</span>
              </div>
              <h2 className="text-4xl font-display font-black text-white mb-3 italic tracking-tight">{t.enterTheHive}</h2>
              <p className="text-white/40 text-[13px] leading-relaxed">{t.accessTerminalDesc}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-500 text-[10px] font-mono uppercase tracking-widest leading-relaxed"
                >
                  <AlertTriangle size={16} className="shrink-0" />
                  {error}
                </motion.div>
              )}

              {isRegister && (
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] ml-1">{t.agentName}</label>
                  <div className="relative group">
                    <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-hive-amber transition-colors" size={20} />
                    <input 
                      type="text" 
                      placeholder={t.agentName} 
                      className="hive-input w-full pl-12 font-mono text-[13px]"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] ml-1">{t.identityIdentifier}</label>
                <div className="relative group">
                  <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-hive-amber transition-colors" size={20} />
                  <input 
                    type="email" 
                    placeholder={t.emailPlaceholder} 
                    className="hive-input w-full pl-12 font-mono text-[13px]"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em]">{t.securityProtocolKey}</label>
                </div>
                <div className="relative group">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-hive-amber transition-colors" size={20} />
                  <input 
                    type="password" 
                    placeholder="••••••••••••" 
                    className="hive-input w-full pl-12 font-mono tracking-[0.4em] text-[13px]"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 px-1 py-1">
                <input 
                  type="checkbox" 
                  id="remember" 
                  className="w-4 h-4 rounded border-white/10 bg-hive-muted text-hive-amber focus:ring-hive-amber focus:ring-offset-hive-black transition-all cursor-pointer" 
                />
                <label htmlFor="remember" className="text-[11px] text-white/40 select-none cursor-pointer uppercase tracking-widest font-mono">{t.keepSessionActive}</label>
              </div>

              <button 
                type="submit" 
                disabled={isConnecting}
                className="w-full hive-button !py-5 shadow-[0_4px_40px_rgba(255,177,0,0.2)] mt-4"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} />
                    <span>{isRegister ? t.creatingIdentity : t.synchronizingCore}</span>
                  </>
                ) : (
                  <>
                    {isRegister ? t.initiateRegistration : t.initiateConnection}
                    <Lock size={16} className="ml-1" />
                  </>
                )}
              </button>

              <div className="text-center mt-4">
                <button 
                  type="button"
                  onClick={toggleMode}
                  className="text-[11px] font-mono text-white/40 hover:text-hive-amber transition-colors uppercase tracking-widest"
                >
                  {isRegister ? t.backToLogin : t.createNewIdentity}
                </button>
              </div>
            </form>

            <div className="mt-12 pt-8 border-t border-white/5">
              <div className="flex items-center justify-between text-[9px] font-mono text-white/20 uppercase tracking-[0.2em]">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  {t.terminalOnline}
                </div>
                <div className="flex gap-4">
                  <button className="hover:text-hive-amber transition-colors">{t.privacy}</button>
                  <button className="hover:text-hive-amber transition-colors">{t.nodes}</button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="fixed bottom-10 left-10 hidden xl:block">
        <div className="flex flex-col gap-2 text-[9px] font-mono text-white/10 uppercase tracking-[0.4em]">
          <span>© 2024 Boost Hive Terminal</span>
          <span>RSA-4096 Security Protocol</span>
        </div>
      </div>
      
      <div className="fixed bottom-10 right-10 hidden xl:block">
        <div className="flex flex-col gap-2 items-end text-[9px] font-mono text-white/10 uppercase tracking-[0.4em]">
          <span>{t.privacy} Protocol</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
