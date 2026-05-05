import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Instagram, 
  Tv, 
  MessageSquare, 
  CheckCircle2, 
  ArrowRight,
  TrendingUp,
  Award,
  ShieldCheck,
  Search,
  Loader2
} from 'lucide-react';
import { getServices, createOrder } from '../lib/api';
import { Service } from '../types';
import { useI18n, translations } from '../lib/i18n';

const OrderModal = ({ 
  service, 
  onClose, 
  onSuccess 
}: { 
  service: Service; 
  onClose: () => void; 
  onSuccess: (id: string) => void;
}) => {
  const { language } = useI18n();
  const t = translations[language];
  const [quantity, setQuantity] = useState<number>(service.minOrder);
  const [target, setTarget] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState('');

  const totalPrice = service.pricePer1k * (quantity / 1000);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeploying(true);
    setError('');
    
    try {
      const response = await createOrder({ serviceId: service.id, target, quantity });
      onSuccess(response.orderId);
    } catch (err: any) {
      setError(err.response?.data?.error || t.error);
      setIsDeploying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-hive-black/90 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="hive-card w-full max-w-[540px] relative z-10 !p-10 border-white/10"
      >
        <div className="mb-10 text-center">
           <div className="inline-flex items-center gap-2 px-3 py-1 bg-hive-amber/10 border border-hive-amber/20 rounded-full text-[9px] font-mono text-hive-amber uppercase font-bold tracking-widest mb-4">
              <Zap size={10} className="fill-current" /> {t.serviceCatalog}
           </div>
           <h2 className="text-3xl font-display font-black text-white italic tracking-tight">{service.name}</h2>
           <p className="text-white/40 text-[11px] mt-2 font-mono uppercase tracking-[0.2em]">{service.category} Node Configuration</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
           {error && (
             <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-mono uppercase tracking-widest leading-relaxed">
                ERROR: {error}
             </div>
           )}

           <div className="space-y-2">
              <label className="hive-label">Deployment Target (Link/User)</label>
              <input 
                type="text" 
                required
                className="hive-input w-full font-mono text-xs" 
                placeholder="https://instagram.com/p/..."
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
           </div>

           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="hive-label">Quantity</label>
                <input 
                  type="number" 
                  min={service.minOrder} 
                  max={service.maxOrder}
                  required
                  className="hive-input w-full font-mono text-xs"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <label className="hive-label">Operational Cost</label>
                <div className="p-3 bg-white/5 border border-white/5 rounded-xl h-[46px] flex items-center justify-center">
                   <span className="text-xl font-display font-black text-hive-amber">₽{Math.round(totalPrice)}</span>
                </div>
              </div>
           </div>

           <div className="p-6 bg-white/5 border border-dashed border-white/10 rounded-xl">
              <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                 <div>
                    <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest">{t.min}</p>
                    <p className="text-xs font-display font-bold text-white">{service.minOrder.toLocaleString()}</p>
                 </div>
                 <div>
                    <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest">{t.max}</p>
                    <p className="text-xs font-display font-bold text-white">{service.maxOrder.toLocaleString()}</p>
                 </div>
                 <div>
                    <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest">{t.speed || 'Speed'}</p>
                    <p className="text-xs font-display font-bold text-hive-amber uppercase">{service.speed}</p>
                 </div>
                 <div>
                    <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest">{t.retention || 'Retention'}</p>
                    <p className="text-xs font-display font-bold text-green-500 uppercase">{service.retention}</p>
                 </div>
              </div>
           </div>

           <div className="flex gap-4 pt-4">
              <button 
                type="button" 
                onClick={onClose}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white/60 font-mono text-[10px] uppercase font-bold py-4 rounded-xl transition-all tracking-widest"
              >
                {t.cancel}
              </button>
              <button 
                disabled={isDeploying}
                className="flex-[2] hive-button !py-4 shadow-xl"
              >
                {isDeploying ? t.processing : t.placeOrder}
              </button>
           </div>
        </form>
      </motion.div>
    </div>
  );
};

const Catalog: React.FC = () => {
  const { language } = useI18n();
  const t = translations[language];
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);

  const fixedCategories = ['Facebook', 'Telegram', 'YouTube', 'TikTok', 'X', 'Instagram', 'Twitch', 'VK', 'Quora', 'Twitter'];
  const categoriesSet = new Set(services.map(s => s.category || 'Other'));
  const allCategories = [...new Set([...fixedCategories, ...Array.from(categoriesSet)])];
  const categories = [t.all.toUpperCase(), ...allCategories.sort()];

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response: any = await getServices();
        const data = Array.isArray(response) ? response : (response?.data || []);
        setServices(data);
      } catch (error) {
        console.error('Failed to fetch services', error);
        setServices([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchServices();
  }, []);

  const filteredServices = filter === t.all.toUpperCase() 
    ? services 
    : services.filter(s => {
        const cat = s.category?.toUpperCase() || 'OTHER';
        return cat === filter.toUpperCase();
      });

  return (
    <div className="space-y-10 pb-20 w-full max-w-full overflow-hidden">
      <AnimatePresence>
        {selectedService && !successOrderId && (
          <OrderModal 
            service={selectedService} 
            onClose={() => setSelectedService(null)} 
            onSuccess={(id) => setSuccessOrderId(id)}
          />
        )}
        
        {successOrderId && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-hive-black/90 backdrop-blur-md" />
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="hive-card w-full max-w-md text-center flex flex-col items-center !p-12 relative z-10"
            >
               <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-[2rem] flex items-center justify-center text-green-500 mb-8">
                  <CheckCircle2 size={42} />
               </div>
               <h2 className="text-3xl font-display font-black text-white italic tracking-tight mb-2">Operation Launched</h2>
               <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] mb-10">OrderID: {successOrderId}</p>
               <p className="text-xs text-white/60 mb-10 leading-relaxed font-sans">
                 Your engagement deployment has been queued in the Hive network. You can track progress in the History archive.
               </p>
               <button 
                onClick={() => {
                  setSelectedService(null);
                  setSuccessOrderId(null);
                }}
                className="hive-button w-full !py-4"
               >
                 Confirm & Continue
               </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 w-full max-w-full min-w-0">
        <div className="min-w-0">
          <h1 className="font-display font-black text-4xl lg:text-5xl text-white tracking-tighter italic">{t.serviceCatalog}</h1>
          <p className="text-white/40 max-w-2xl mt-2 text-[10px] uppercase tracking-[0.3em] font-mono">
            {t.selectProtocol}
          </p>
        </div>
        
        <div className="w-full max-w-full min-w-0 overflow-x-auto pb-2 scrollbar-thin">
          <div className="flex gap-2 w-max max-w-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${
                  filter === cat 
                    ? 'bg-hive-amber text-hive-black font-bold shadow-lg' 
                    : 'bg-white/5 text-white/40 hover:text-white border border-white/5'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full max-w-full min-w-0 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 min-w-0 max-w-full">
        {isLoading ? (
          <div className="col-span-full py-40 flex flex-col items-center justify-center space-y-4 font-mono">
             <Loader2 size={48} className="text-hive-amber animate-spin" />
             <p className="text-xs text-hive-amber uppercase tracking-[0.3em] animate-pulse">Downloading Hive Inventory...</p>
          </div>
        ) : filteredServices.map((service, index) => (
          <motion.div
            key={service.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="hive-card group hover:border-hive-amber/40 transition-all flex flex-col h-full relative overflow-hidden min-w-0 max-w-full"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center group-hover:border-hive-amber/30 transition-colors">
                {service.category.toUpperCase() === 'INSTAGRAM' && <Instagram size={28} className="text-hive-amber" />}
                {service.category.toUpperCase() === 'TIKTOK' && <Tv size={28} className="text-hive-amber" />}
                {service.category.toUpperCase() === 'YOUTUBE' && <Tv size={28} className="text-hive-amber" />}
                {service.category.toUpperCase() === 'X' && <MessageSquare size={28} className="text-hive-amber" />}
                {!['INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'X'].includes(service.category.toUpperCase()) && <Zap size={28} className="text-hive-amber" />}
              </div>
              <span className={`px-3 py-1 rounded-full text-[9px] font-mono font-bold uppercase tracking-[0.2em] border ${
                service.badge === 'ELITE HIVE' ? 'bg-hive-amber/10 text-hive-amber border-hive-amber/20' : 'bg-white/5 text-white/30 border-white/10'
              }`}>
                {service.badge || "High Retention"}
              </span>
            </div>

            <h3 className="font-display font-black text-xl text-white group-hover:text-hive-amber transition-colors line-clamp-1 italic tracking-tight">
              {service.name}
            </h3>
            <p className="text-white/40 text-[11px] mt-2 line-clamp-2 leading-relaxed mb-8 font-sans">
              {service.description || "Deploy elite growth modules instantly across the global network nodes with proprietary engagement logic."}
            </p>

            <div className="mt-auto pt-6 border-t border-white/5 flex items-end justify-between">
              <div>
                <span className="text-white/20 text-[9px] uppercase font-mono font-bold tracking-[0.2em] block mb-1">{t.rate}</span>
                <span className="text-hive-amber font-mono text-2xl font-bold tracking-tighter">₽{Math.round(service.pricePer1k)}</span>
                <span className="text-white/20 text-[8px] font-mono block mt-0.5">{t.per1000}</span>
              </div>
              <button 
                onClick={() => setSelectedService(service)}
                className="hive-button !py-2.5 !px-5 hover:scale-105 active:scale-95"
              >
                {t.placeOrder}
              </button>
            </div>
            
            {/* Hover Glow Effect */}
            <div className="absolute inset-0 bg-hive-amber/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </motion.div>
        ))}
        </div>
      </div>

      <div className="hive-card bg-hive-muted/20 border-dashed border-hive-amber/20 p-8 flex flex-col md:flex-row items-center gap-8">
         <div className="w-20 h-20 bg-hive-amber/10 rounded-2xl flex items-center justify-center">
            <TrendingUp size={40} className="text-hive-amber" />
         </div>
         <div className="flex-1 text-center md:text-left">
            <h3 className="text-2xl font-display font-black italic tracking-tight mb-2">{t.serviceNotSelected}</h3>
            <p className="text-white/50">Enterprise-grade API access and bulk custom campaigns are available for high-volume partners.</p>
         </div>
         <button onClick={() => alert('Contact: support@boosthive.elite')} className="hive-button bg-transparent border border-hive-amber text-hive-amber hover:bg-hive-amber/10 h-fit">
            {t.account}
         </button>
      </div>
    </div>
  );
};

export default Catalog;
