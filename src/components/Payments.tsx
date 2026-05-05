import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  CreditCard, 
  Zap, 
  Wallet, 
  TrendingUp, 
  ShieldCheck, 
  Clock, 
  AlertTriangle,
  ChevronRight,
  Bitcoin
} from 'lucide-react';
import { useI18n, translations } from '../lib/i18n';

const Payments: React.FC = () => {
  const { language } = useI18n();
  const t = translations[language];
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'crypto' | 'yoomoney'>('card');
  const [amount, setAmount] = useState<string>('100');

  const paymentMethods = [
    { id: 'card', name: t.creditDebit, icon: CreditCard, subtitle: t.creditDebitSubtitle },
    { id: 'crypto', name: t.cryptoAssets, icon: Bitcoin, subtitle: t.cryptoAssetsSubtitle },
    { id: 'yoomoney', name: t.yoomoney, icon: Wallet, subtitle: t.yoomoneySubtitle }
  ];

  return (
    <div className="space-y-10 pb-20">
      <div>
        <h1 className="font-display font-black text-4xl lg:text-5xl text-white tracking-tighter italic">{t.financialHub}</h1>
        <p className="text-white/40 max-w-2xl mt-2 text-[10px] uppercase tracking-[0.3em] font-mono">
          {t.capitalInjection}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Input Section */}
        <div className="lg:col-span-2 space-y-6">
           <div className="hive-card">
              <div className="flex items-center gap-3 mb-8">
                 <div className="w-10 h-10 rounded-xl bg-hive-amber/10 flex items-center justify-center text-hive-amber">
                    <Wallet size={24} />
                 </div>
                 <div>
                    <h2 className="text-xl font-display font-black italic tracking-tight text-white">{t.depositCapital}</h2>
                    <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">{t.paymentSelectProtocol}</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                 {paymentMethods.map((method) => (
                   <button 
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id as any)}
                    className={`flex flex-col items-start p-5 rounded-xl border transition-all duration-300 text-left relative overflow-hidden group ${
                      selectedMethod === method.id 
                        ? 'bg-hive-amber/10 border-hive-amber shadow-[0_0_20px_rgba(255,177,0,0.1)]' 
                        : 'bg-white/5 border-white/5 hover:border-white/20'
                    }`}
                   >
                     {selectedMethod === method.id && (
                       <div className="absolute top-0 right-0 p-2">
                          <Zap size={14} className="text-hive-amber fill-hive-amber" />
                       </div>
                     )}
                     <method.icon className={`mb-4 transition-colors ${selectedMethod === method.id ? 'text-hive-amber' : 'text-white/30'}`} size={24} />
                     <span className={`text-[11px] font-mono font-bold uppercase tracking-widest mb-1 ${selectedMethod === method.id ? 'text-white' : 'text-white/50'}`}>{method.name}</span>
                     <span className="text-[9px] font-mono text-white/20 uppercase tracking-tighter leading-none">{method.subtitle}</span>
                   </button>
                 ))}
              </div>

              <div className="space-y-6">
                 <div>
                    <label className="hive-label">{t.injectionAmount}</label>
                    <div className="relative group">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-hive-amber font-display font-black text-xl">₽</span>
                       <input 
                        type="number" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="hive-input w-full pl-10 text-2xl font-display font-black tracking-tight"
                        placeholder="0"
                       />
                    </div>
                    <div className="flex gap-2 mt-4">
                       {['100', '500', '1000', '5000', '10000'].map((val) => (
                         <button 
                          key={val}
                          onClick={() => setAmount(val)}
                          className={`px-4 py-2 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all ${
                            amount === val 
                              ? 'bg-hive-amber text-hive-black font-bold' 
                              : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                          }`}
                         >
                           ₽{val}
                         </button>
                       ))}
                    </div>
                 </div>

                 <div className="bg-[#090f15] border border-white/5 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                          <ShieldCheck size={28} />
                       </div>
                       <div>
                          <p className="text-sm font-display font-bold italic tracking-tight text-white leading-none">{t.instantProvisioning}</p>
                          <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest mt-2 leading-none">{t.securedByAES}</p>
                       </div>
                    </div>
                    <button className="hive-button !py-4 px-12 order-first md:order-last w-full md:w-auto">
                       {t.initiateDeposit}
                    </button>
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="hive-card border-l-4 border-l-hive-amber flex items-center gap-6">
                 <div className="w-14 h-14 shrink-0 rounded-2xl bg-hive-amber/10 flex items-center justify-center text-hive-amber">
                    <TrendingUp size={32} />
                 </div>
                 <div>
                    <h3 className="text-lg font-display font-black italic tracking-tight text-white">{t.eliteBonus}</h3>
                    <p className="text-xs text-white/40 mt-1 uppercase tracking-tighter">{t.eliteBonusDesc}</p>
                 </div>
              </div>
              <div className="hive-card border-l-4 border-l-white/10 flex items-center gap-6 opacity-60">
                 <div className="w-14 h-14 shrink-0 rounded-2xl bg-white/5 flex items-center justify-center text-white/20">
                    <AlertTriangle size={32} />
                 </div>
                 <div>
                    <h3 className="text-lg font-display font-black italic tracking-tight text-white/50">{t.voucherNode}</h3>
                    <p className="text-xs text-white/40 mt-1 uppercase tracking-tighter">{t.voucherNodeDesc}</p>
                 </div>
              </div>
           </div>
        </div>

        {/* Right: Info Section */}
        <div className="lg:col-span-1 space-y-6">
           <div className="hive-card relative overflow-hidden bg-gradient-to-br from-hive-dark to-hive-black">
              <div className="absolute top-0 right-0 p-6 opacity-[0.05]">
                 <Bitcoin size={80} />
              </div>
              <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-white/40 mb-6">{t.paymentGuidelines}</h3>
              <div className="space-y-6 relative z-10">
                 <div className="flex gap-4">
                    <div className="w-8 h-8 shrink-0 rounded-lg bg-white/5 flex items-center justify-center text-hive-amber">
                       <Clock size={16} />
                    </div>
                    <div>
                       <p className="text-[11px] font-display font-bold italic tracking-tight text-white">{t.confirmations}</p>
                       <p className="text-[10px] font-mono text-white/20 mt-1 leading-relaxed">{t.confirmationsDesc}</p>
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <div className="w-8 h-8 shrink-0 rounded-lg bg-white/5 flex items-center justify-center text-hive-amber">
                       <AlertTriangle size={16} />
                    </div>
                    <div>
                       <p className="text-[11px] font-display font-bold italic tracking-tight text-white">{t.minimumInput}</p>
                       <p className="text-[10px] font-mono text-white/20 mt-1 leading-relaxed">{t.minimumInputDesc}</p>
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <div className="w-8 h-8 shrink-0 rounded-lg bg-white/5 flex items-center justify-center text-hive-amber">
                       <ShieldCheck size={16} />
                    </div>
                    <div>
                       <p className="text-[11px] font-display font-bold italic tracking-tight text-white">{t.antiFraudNode}</p>
                       <p className="text-[10px] font-mono text-white/20 mt-1 leading-relaxed">{t.antiFraudNodeDesc}</p>
                    </div>
                 </div>
              </div>

              <div className="mt-10 pt-8 border-t border-white/5">
                 <button className="w-full flex items-center justify-between text-[10px] font-mono text-hive-amber hover:text-white transition-colors uppercase tracking-[0.2em]">
                    <span>{t.termsOfService}</span>
                    <ChevronRight size={14} />
                 </button>
              </div>
           </div>

           <div className="hive-card !p-0 overflow-hidden group">
              <img 
               src="https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&q=80&w=800" 
               alt="Digital Vault" 
               className="w-full h-40 object-cover opacity-30 grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-[2s]"
              />
              <div className="p-6">
                 <h4 className="text-sm font-display font-bold italic tracking-tight text-white">{t.globalCapital}</h4>
                 <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest mt-2">{t.globalCapitalDesc}</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Payments;
