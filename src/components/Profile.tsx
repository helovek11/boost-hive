import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  User, 
  Shield, 
  Key, 
  Settings, 
  CreditCard, 
  Zap, 
  Bell, 
  Terminal,
  LogOut,
  ChevronRight,
  Fingerprint,
  Mail,
  Smartphone,
  Globe
} from 'lucide-react';
import { User as UserType } from '../types';

const Profile: React.FC = () => {
  const { user } = useOutletContext<{ user: UserType | null }>();
  return (
    <div className="space-y-10 pb-20">
      <div>
        <h1 className="font-display font-black text-4xl lg:text-5xl text-white tracking-tighter italic">Operator Identity</h1>
        <p className="text-white/40 max-w-2xl mt-2 text-[10px] uppercase tracking-[0.3em] font-mono">
          Identity Matrix • Security Clearance • Authority Credentials
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="hive-card flex flex-col items-center text-center relative pt-20">
             <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-hive-amber/10 to-transparent rounded-t-xl" />
             <div className="absolute top-8 left-1/2 -translate-x-1/2">
                <div className="w-24 h-24 rounded-[2rem] border-4 border-hive-black bg-hive-muted relative overflow-hidden group">
                   <img 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'user'}`}
                    alt="Operator" 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                   />
                   <button onClick={() => alert('Profile editing coming soon')} className="absolute inset-0 bg-hive-amber/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[10px] font-mono font-bold text-hive-black uppercase">Edit</span>
                   </button>
                </div>
             </div>
             
             <div className="mt-4">
                <h2 className="text-2xl font-display font-black italic tracking-tight text-white mb-1">{user?.name || 'New Operator'}</h2>
                <div className="flex items-center justify-center gap-2 mb-6">
                   <span className="px-2 py-0.5 rounded-full bg-hive-amber text-hive-black text-[9px] font-mono font-bold uppercase tracking-widest">{user?.role || 'USER'}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 w-full">
                   <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                      <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest mb-1 text-left">ESTABLISHED</p>
                      <p className="text-sm font-display font-bold italic tracking-tight text-white text-left">{new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                   </div>
                   <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                      <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest mb-1 text-left">STATUS</p>
                      <p className="text-sm font-display font-bold italic tracking-tight text-hive-amber text-left">ACTIVE</p>
                   </div>
                </div>
             </div>
          </div>

          <div className="hive-card space-y-4">
             <div className="flex items-center gap-3 mb-2">
                <Shield className="text-hive-amber" size={18} />
                <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/60">Authentication Matrix</h3>
             </div>
             
             <button className="w-full flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all group">
                <div className="flex items-center gap-3">
                   <Fingerprint size={18} className="text-white/40 group-hover:text-hive-amber" />
                   <span className="text-xs font-mono text-white/60 group-hover:text-white uppercase tracking-widest">Biometric Sync</span>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
             </button>
             
             <button className="w-full flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all group">
                <div className="flex items-center gap-3">
                   <Smartphone size={18} className="text-white/40 group-hover:text-hive-amber" />
                   <span className="text-xs font-mono text-white/60 group-hover:text-white uppercase tracking-widest">Two-Factor Auth</span>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
             </button>
          </div>
        </div>

        {/* Settings Grid */}
        <div className="lg:col-span-2 space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="hive-card border-l-4 border-l-hive-amber">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-hive-amber/10 flex items-center justify-center text-hive-amber">
                       <User size={18} />
                    </div>
                    <h3 className="text-lg font-display font-black italic tracking-tight text-white">Identity Details</h3>
                 </div>
                 
                 <div className="space-y-4">
                    <div>
                       <label className="hive-label">Canonical Identifier</label>
                       <div className="flex items-center gap-2 text-sm font-mono text-white group cursor-pointer hover:text-hive-amber transition-colors">
                          <Mail size={14} className="text-white/20 group-hover:text-hive-amber" />
                          <span>{user?.email || 'Not set'}</span>
                       </div>
                    </div>
                    <div>
                        <label className="hive-label">Operational Alias</label>
                        <div className="flex items-center gap-2 text-sm font-mono text-white group cursor-pointer hover:text-hive-amber transition-colors">
                           <Terminal size={14} className="text-white/20 group-hover:text-hive-amber" />
                           <span>{user?.name || 'Not set'}</span>
                        </div>
                    </div>
                    <div>
                        <label className="hive-label">Primary Region</label>
                        <div className="flex items-center gap-2 text-sm font-mono text-white group cursor-pointer hover:text-hive-amber transition-colors">
                           <Globe size={14} className="text-white/20 group-hover:text-hive-amber" />
                           <span>GLOBAL</span>
                        </div>
                    </div>
                 </div>
              </div>

              <div className="hive-card">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-hive-amber/10 flex items-center justify-center text-hive-amber">
                       <CreditCard size={18} />
                    </div>
                    <h3 className="text-lg font-display font-black italic tracking-tight text-white">Billing Protocol</h3>
                 </div>
                 
                 <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5">
                        <div>
                           <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">CURRENT BALANCE</p>
                           <p className="text-2xl font-display font-black text-hive-amber">$0.00</p>
                        </div>
                        <button className="p-3 bg-hive-amber/10 hover:bg-hive-amber/20 border border-hive-amber/20 rounded-xl text-hive-amber transition-all">
                           <Zap size={20} />
                        </button>
                    </div>
                    
                    <button onClick={() => alert('No transactions yet')} className="w-full flex items-center justify-between p-4 text-xs font-mono text-white/40 hover:text-white transition-colors border border-dashed border-white/10 rounded-xl">
                       <span>VIEW TRANSACTION LOGS</span>
                       <ChevronRight size={14} />
                    </button>
                 </div>
              </div>
           </div>

           <div className="hive-card relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8">
                 <Settings size={64} className="text-white/[0.03] rotate-12" />
              </div>
              
              <div className="flex items-center gap-3 mb-8 relative z-10">
                 <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40">
                    <Bell size={18} />
                 </div>
                 <h3 className="text-xl font-display font-black italic tracking-tight text-white">Hive Configuration</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                 <div className="space-y-6">
                    <div className="flex items-center justify-between">
                       <div className="space-y-1">
                          <p className="text-sm font-display font-bold text-white italic">Telegram Node Alerts</p>
                          <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Real-time order synchronization</p>
                       </div>
                       <input type="checkbox" defaultChecked className="w-10 h-5 bg-white/5 rounded-full appearance-none checked:bg-hive-amber cursor-pointer transition-all border border-white/10" />
                    </div>
                    <div className="flex items-center justify-between">
                       <div className="space-y-1">
                          <p className="text-sm font-display font-bold text-white italic">Elite Tier Insights</p>
                          <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Monthly engagement reports</p>
                       </div>
                       <input type="checkbox" defaultChecked className="w-10 h-5 bg-white/5 rounded-full appearance-none checked:bg-hive-amber cursor-pointer transition-all border border-white/10" />
                    </div>
                 </div>

                 <div className="space-y-6">
                    <div className="flex items-center justify-between">
                       <div className="space-y-1">
                          <p className="text-sm font-display font-bold text-white italic">Advanced Diagnostics</p>
                          <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Verbose terminal logging</p>
                       </div>
                       <input type="checkbox" className="w-10 h-5 bg-white/5 rounded-full appearance-none checked:bg-hive-amber cursor-pointer transition-all border border-white/10" />
                    </div>
                    <div className="flex items-center justify-between">
                       <div className="space-y-1">
                          <p className="text-sm font-display font-bold text-white italic">Public Identity</p>
                          <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Visible on global ops board</p>
                       </div>
                       <input type="checkbox" className="w-10 h-5 bg-white/5 rounded-full appearance-none checked:bg-hive-amber cursor-pointer transition-all border border-white/10" />
                    </div>
                 </div>
              </div>

              <div className="mt-12 flex justify-end gap-4 border-t border-white/5 pt-8 relative z-10">
                 <button className="flex items-center gap-2 text-red-500/50 hover:text-red-500 transition-colors text-[10px] font-mono font-bold uppercase tracking-widest">
                    <LogOut size={16} /> Deactivate Account
                 </button>
                 <button className="hive-button !py-4 px-10">Save Configuration</button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
