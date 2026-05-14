import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Zap, Instagram, Tv, MessageSquare, CheckCircle2,
  ArrowLeft, Loader2, Timer, DollarSign, Search, SortAsc
} from 'lucide-react';
import { getServices, createOrder } from '../lib/api';
import { Service } from '../types';
import { useI18n, translations } from '../lib/i18n';

const speedColors: Record<string, string> = {
  Fast: 'text-green-500 bg-green-500/10 border-green-500/20',
  Standard: 'text-hive-amber bg-hive-amber/10 border-hive-amber/20',
  Slow: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
};

const priceLabel: Record<string, string> = {
  premium: '₽₽₽',
  standard: '₽₽',
  budget: '₽',
};

type SortMode = 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc';

// --- Order Modal ---
const OrderModal = ({ service, onClose, onSuccess }: {
  service: Service; onClose: () => void; onSuccess: (id: string) => void;
}) => {
  const { language } = useI18n();
  const t = translations[language];
  const [quantity, setQuantity] = useState<number>(service.minOrder);
  const [target, setTarget] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState('');
  const displayName = language === 'ru' && service.nameOriginal ? service.nameOriginal : service.name;
  const totalPrice = service.pricePer1k * (quantity / 1000);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeploying(true);
    setError('');
    try {
      const res = await createOrder({ serviceId: service.id, target, quantity });
      onSuccess(res.orderId);
    } catch (err: any) {
      setError(err.response?.data?.error || t.error);
      setIsDeploying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-hive-black/90 backdrop-blur-md" />
      <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="hive-card w-full max-w-[540px] relative z-10 !p-10 border-white/10">
        <div className="mb-10 text-center">
          <div className="flex items-center justify-center gap-3 mb-5">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase tracking-widest border ${speedColors[service.speedLabel] || ''}`}>
              <Timer size={14} /> {service.speedLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold tracking-widest border bg-white/5 text-white/60 border-white/10">
              <DollarSign size={14} /> {priceLabel[service.priceTier] || '₽₽'}
            </span>
          </div>
          <h2 className="text-3xl font-display font-black text-white italic tracking-tight">{displayName}</h2>
          <p className="text-white/40 text-[11px] mt-2 font-mono uppercase tracking-[0.2em]">{service.category}</p>
          <div className="mt-6 p-5 bg-white/[0.03] border border-white/5 rounded-xl text-left space-y-2">
            <p className="text-[10px] font-mono text-white/20">[ID:{service.providerServiceId}]</p>
            <p className="text-[11px] text-white/70 leading-relaxed">{service.description}</p>
            <p className="text-[9px] font-mono text-white/40">Текущая скорость: {service.speedLabel === 'Fast' ? 'до 50 000 в сутки' : 'до 5 000 в сутки'}</p>
            <p className="text-[9px] font-mono text-green-500/80">{service.priceTier === 'premium' ? 'Списания: 0% в течение 30 дней' : 'Списания: до 5%'}</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-8">
          {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-mono">ERROR: {error}</div>}
          <div className="space-y-2">
            <label className="hive-label text-[11px]">Deployment Target</label>
            <input type="text" required className="hive-input w-full font-mono text-sm"
              placeholder="https://instagram.com/p/..." value={target} onChange={e => setTarget(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="hive-label text-[11px]">Quantity</label>
              <input type="number" min={service.minOrder} max={service.maxOrder} required
                className="hive-input w-full font-mono text-sm" value={quantity}
                onChange={e => setQuantity(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <label className="hive-label text-[11px]">Cost</label>
              <div className="p-3 bg-white/5 border border-white/5 rounded-xl h-[46px] flex items-center justify-center">
                <span className="text-xl font-display font-black text-hive-amber">₽{totalPrice >= 10 ? Math.round(totalPrice) : totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose}
              className="flex-1 bg-white/5 hover:bg-white/10 text-white/60 font-mono text-[11px] uppercase font-bold py-4 rounded-xl transition-all tracking-widest">{t.cancel}</button>
            <button disabled={isDeploying} className="flex-[2] hive-button !py-4 shadow-xl">
              {isDeploying ? t.processing : t.placeOrder}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// --- Helpers ---
function getCategoryIcon(cat: string) {
  const c = cat.toUpperCase();
  if (c.includes('INSTAGRAM')) return Instagram;
  if (c.includes('TIKTOK') || c.includes('YOUTUBE') || c.includes('TWITCH')) return Tv;
  if (c.includes('X') || c.includes('TWITTER') || c.includes('TELEGRAM') || c.includes('FACEBOOK') || c.includes('DISCORD')) return MessageSquare;
  return Zap;
}

function getCategoryLabel(cat: string): string {
  const { language } = useI18n.getState();
  const t = translations[language];
  const key = `category_${cat.replace(/[^a-zA-Z0-9]/g, '')}` as any;
  return (t as any)[key] || cat;
}

function getServiceDisplayName(s: Service, lang: string): string {
  return lang === 'ru' && s.nameOriginal ? s.nameOriginal : s.name;
}

function getPriceDisplay(price: number): string {
  if (price >= 10) return Math.round(price).toString();
  if (price >= 1) return price.toFixed(1);
  return price.toFixed(2);
}

// --- Main Component ---
const Catalog: React.FC = () => {
  const { language } = useI18n();
  const t = translations[language];
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('price_asc');

  useEffect(() => {
    (async () => {
      try {
        const response = await getServices();
        setServices(response.data || []);
      } catch { setServices([]); } finally { setIsLoading(false); }
    })();
  }, []);

  // Derive sorted categories
  const platformOrder = ['Instagram', 'TikTok', 'YouTube', 'Telegram', 'X (Twitter)', 'Facebook', 'Twitch', 'VK', 'Quora', 'LinkedIn', 'Discord', 'Spotify', 'SoundCloud', 'Pinterest', 'Other'];
  const categories: string[] = [];
  for (const s of services) {
    const cat = s.category || 'Other';
    if (!categories.includes(cat)) categories.push(cat);
  }
  categories.sort((a, b) => {
    const ai = platformOrder.indexOf(a);
    const bi = platformOrder.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  // Filter and sort
  const filteredServices = useMemo((): Service[] => {
    let filtered = selectedCategory
      ? services.filter(s => s.category === selectedCategory)
      : services;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        getServiceDisplayName(s, language).toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        (s.serviceType || '').toLowerCase().includes(q)
      );
    }

    return filtered.sort((a, b) => {
      const aName = getServiceDisplayName(a, language).toLowerCase();
      const bName = getServiceDisplayName(b, language).toLowerCase();
      switch (sortMode) {
        case 'price_asc': return a.pricePer1k - b.pricePer1k;
        case 'price_desc': return b.pricePer1k - a.pricePer1k;
        case 'name_asc': return aName.localeCompare(bName);
        case 'name_desc': return bName.localeCompare(aName);
        default: return 0;
      }
    });
  }, [services, selectedCategory, searchQuery, sortMode, language]);

  // Group by type
  const groupedByType = useMemo((): Record<string, Service[]> => {
    const groups: Record<string, Service[]> = {};
    for (const s of filteredServices) {
      const key = s.serviceType || s.group || 'Other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    }
    return groups;
  }, [filteredServices]);

  if (isLoading) {
    return (
      <div className="py-40 flex flex-col items-center justify-center space-y-4 font-mono">
        <Loader2 size={48} className="text-hive-amber animate-spin" />
        <p className="text-xs text-hive-amber uppercase tracking-[0.3em] animate-pulse">Downloading Hive Inventory...</p>
      </div>
    );
  }

  const sortOptions: { value: SortMode; label: string }[] = [
    { value: 'price_asc', label: 'Price ↑' },
    { value: 'price_desc', label: 'Price ↓' },
    { value: 'name_asc', label: 'Name A-Z' },
    { value: 'name_desc', label: 'Name Z-A' },
  ];

  return (
    <div className="space-y-8 pb-20 w-full max-w-full overflow-hidden">
      <AnimatePresence>
        {selectedService && !successOrderId && (
          <OrderModal service={selectedService} onClose={() => setSelectedService(null)}
            onSuccess={(id) => setSuccessOrderId(id)} />
        )}
        {successOrderId && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-hive-black/90 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="hive-card w-full max-w-md text-center flex flex-col items-center !p-12 relative z-10">
              <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-[2rem] flex items-center justify-center text-green-500 mb-8">
                <CheckCircle2 size={42} />
              </div>
              <h2 className="text-3xl font-display font-black text-white italic tracking-tight mb-2">Order Placed</h2>
              <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] mb-10">ID: {successOrderId}</p>
              <button onClick={() => { setSelectedService(null); setSuccessOrderId(null); }}
                className="hive-button w-full !py-4">Confirm & Continue</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center gap-3">
        {selectedCategory && (
          <button onClick={() => { setSelectedCategory(null); setSearchQuery(''); }}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-white/40 hover:text-white transition-all">
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-black text-4xl lg:text-5xl text-white tracking-tighter italic">
            {selectedCategory ? getCategoryLabel(selectedCategory) : t.serviceCatalog}
          </h1>
          <p className="text-white/40 text-[10px] uppercase tracking-[0.3em] font-mono mt-1">
            {selectedCategory ? `${filteredServices.length} services` : t.selectProtocol}
          </p>
        </div>
      </div>

      {/* Search + Sort bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
          <input type="text" placeholder="Search services..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="hive-input w-full pl-11 font-mono text-sm" />
        </div>
        <div className="flex gap-2 shrink-0">
          {sortOptions.map(opt => (
            <button key={opt.value} onClick={() => setSortMode(opt.value)}
              className={`px-3 py-2 rounded-lg text-[10px] font-mono uppercase tracking-widest border transition-all whitespace-nowrap ${
                sortMode === opt.value
                  ? 'bg-hive-amber/10 text-hive-amber border-hive-amber/20'
                  : 'bg-white/5 text-white/40 hover:text-white border-white/5'
              }`}>
              {opt.value.startsWith('price') ? <DollarSign size={12} className="inline mr-1" /> : <SortAsc size={12} className="inline mr-1" />}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category Pills (only in category view) */}
      {selectedCategory && (
        <div className="w-full overflow-x-auto pb-2 scrollbar-thin -mt-2">
          <div className="flex gap-2 w-max max-w-none">
            {categories.map(cat => {
              const Icon = getCategoryIcon(cat);
              const isActive = selectedCategory === cat;
              return (
                <button key={cat} onClick={() => setSelectedCategory(isActive ? null : cat)}
                  className={`flex items-center gap-2 px-4 py-2 text-[10px] font-mono uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${
                    isActive ? 'bg-hive-amber text-hive-black font-bold shadow-lg' : 'bg-white/5 text-white/40 hover:text-white border border-white/5'
                  }`}>
                  <Icon size={14} /> {getCategoryLabel(cat)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Content */}
      {selectedCategory || searchQuery ? (
        <div className="space-y-6">
          {Object.entries(groupedByType).map(([type, services]: [string, Service[]]) => (
            <div key={type} className="hive-card !p-5 border-white/5">
              <h3 className="text-[11px] font-mono text-hive-amber uppercase tracking-widest mb-4 font-bold">
                <span className="w-4 h-[1px] bg-hive-amber/30 inline-block mr-2 align-middle" />
                {type} <span className="text-white/20 font-normal">({services.length})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {services.map(s => {
                  const displayName = getServiceDisplayName(s, language);
                  return (
                    <div key={s.id}
                      className="bg-white/[0.03] hover:bg-white/5 border border-white/5 hover:border-hive-amber/20 rounded-xl p-4 transition-all cursor-pointer"
                      onClick={() => setSelectedService(s)}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-widest border ${speedColors[s.speedLabel] || ''}`}>
                          <Timer size={12} className="inline mr-1" />{s.speedLabel}
                        </span>
                        <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-widest border bg-white/5 text-white/60 border-white/10">
                          {priceLabel[s.priceTier] || '₽₽'}
                        </span>
                      </div>
                      <p className="font-display font-bold text-sm text-white mb-2 leading-tight line-clamp-2">{displayName}</p>
                      <div className="flex justify-between items-end">
                        <div>
                          <span className="text-hive-amber font-mono text-lg font-bold">{getPriceDisplay(s.pricePer1k)}</span>
                          <span className="text-white/30 text-[9px] font-mono ml-0.5">₽/1k</span>
                        </div>
                        <span className="text-[10px] font-mono text-white/30">
                          {s.minOrder.toLocaleString()}–{s.maxOrder.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {filteredServices.length === 0 && (
            <div className="text-center py-16">
              <Search size={40} className="text-white/10 mx-auto mb-4" />
              <p className="text-white/40 text-sm">No services found</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {categories.map(cat => {
            const Icon = getCategoryIcon(cat);
            const catServices = services.filter(s => s.category === cat);
                    const tiers = [...new Set(catServices.map(s => s.speedLabel))] as string[];
            return (
              <motion.div key={cat} whileHover={{ scale: 1.01 }}
                className="hive-card cursor-pointer hover:border-hive-amber/30 transition-all"
                onClick={() => setSelectedCategory(cat)}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-hive-amber/10 border border-hive-amber/20 rounded-xl flex items-center justify-center shrink-0">
                    <Icon size={24} className="text-hive-amber" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-display font-black text-xl text-white italic tracking-tight">{getCategoryLabel(cat)}</h2>
                    <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest mt-0.5">{catServices.length} services</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {tiers.map(t => (
                      <span key={t} className={`px-2 py-1 rounded text-[8px] font-mono font-bold uppercase tracking-widest border ${speedColors[t] || ''}`}>{t}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {categories.length === 0 && (
        <div className="hive-card text-center py-20">
          <Zap size={48} className="text-white/10 mx-auto mb-4" />
          <p className="text-white/40 text-sm">No services available</p>
        </div>
      )}
    </div>
  );
};

export default Catalog;
