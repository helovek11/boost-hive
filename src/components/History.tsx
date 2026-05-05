import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  History as HistoryIcon, 
  ExternalLink, 
  Search, 
  Filter, 
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  MoreVertical,
  Zap,
  TrendingUp,
  CreditCard
} from 'lucide-react';
import { getOrders } from '../lib/api';

const History: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await getOrders();
        setOrders(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to fetch orders', error);
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, []);
  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="font-display font-black text-4xl lg:text-5xl text-white tracking-tighter italic">Order History</h1>
          <p className="text-white/40 max-w-2xl mt-2 text-[10px] uppercase tracking-[0.3em] font-mono">
            Transaction Archive • Deployment Logs • Operational History
          </p>
        </div>
        
        <div className="flex gap-3">
          <button onClick={() => alert('No orders to filter')} className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10 text-white/60 hover:text-white transition-colors text-[10px] font-mono uppercase tracking-widest">
            <Filter size={14} /> Filter
          </button>
          <button onClick={() => alert('No orders to export')} className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10 text-white/60 hover:text-white transition-colors text-[10px] font-mono uppercase tracking-widest">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div className="hive-card !p-0 overflow-hidden relative">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `radial-gradient(#ffb100 0.5px, transparent 0.5px)`, backgroundSize: '16px 16px' }} />
        
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02] relative z-10">
          <div className="flex items-center gap-3">
             <HistoryIcon className="text-hive-amber" size={20} />
             <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-white/80">Active Hive Operations</h2>
          </div>
          <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Showing last 12 orders</span>
        </div>

        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.01]">
                <th className="px-8 py-4 text-[10px] font-mono text-white/20 uppercase tracking-[0.2em] border-b border-white/5">Order ID</th>
                <th className="px-8 py-4 text-[10px] font-mono text-white/20 uppercase tracking-[0.2em] border-b border-white/5">Service / Campaign</th>
                <th className="px-8 py-4 text-[10px] font-mono text-white/20 uppercase tracking-[0.2em] border-b border-white/5">Progress</th>
                <th className="px-8 py-4 text-[10px] font-mono text-white/20 uppercase tracking-[0.2em] border-b border-white/5">Status</th>
                <th className="px-8 py-4 text-[10px] font-mono text-white/20 uppercase tracking-[0.2em] border-b border-white/5">Date</th>
                <th className="px-8 py-4 text-[10px] font-mono text-white/20 uppercase tracking-[0.2em] border-b border-white/5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-white/40 font-mono text-sm">
                    No orders yet. Start by selecting a service from the catalog.
                  </td>
                </tr>
              ) : (
              orders.map((order: any) => (
                <tr key={order.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-8 py-6 font-mono text-sm text-hive-amber">{order.id?.slice(0, 12)}</td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-hive-amber/10 flex items-center justify-center border border-hive-amber/20 group-hover:bg-hive-amber/20 transition-all">
                        <Zap size={18} className="text-hive-amber" />
                      </div>
                      <div>
                        <p className="text-sm font-display font-bold italic tracking-tight text-white group-hover:text-hive-amber transition-colors">{order.serviceId}</p>
                        <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mt-1">{order.target}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 min-w-[200px]">
                    <div className="space-y-2">
                       <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-white/30">{(order.progress || 0) === 100 ? 'COMPLETE' : `${order.progress || 0}% SYNCED`}</span>
                          <span className={(order.progress || 0) === 100 ? 'text-green-500' : 'text-hive-amber'}>{order.progress || 0}%</span>
                       </div>
                       <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${(order.progress || 0) === 100 ? 'bg-green-500/50' : 'bg-hive-amber shadow-[0_0_10px_#ffb100]'}`} 
                            style={{ width: `${order.progress || 0}%` }} 
                          />
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-mono font-bold uppercase tracking-[0.2em] border ${
                      order.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                      order.status === 'RUNNING' ? 'bg-hive-amber/10 text-hive-amber border-hive-amber/20' :
                      'bg-white/5 text-white/30 border-white/10'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 font-mono text-[11px] text-white/30">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}</td>
                  <td className="px-8 py-6">
                    <button className="p-2 text-white/20 hover:text-white transition-colors">
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-6 border-t border-white/5 text-center relative z-10">
          <button className="text-[10px] font-mono text-white/30 hover:text-hive-amber uppercase tracking-[0.3em] transition-colors font-bold">
            View Full Transaction Archive
          </button>
        </div>
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="hive-card relative overflow-hidden flex flex-col justify-between min-h-[200px] group">
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: `radial-gradient(#ffb100 0.5px, transparent 0.5px)`, backgroundSize: '12px 12px' }} />
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[10px] font-mono text-hive-amber uppercase tracking-widest mb-1">Performance Metrics</p>
              <h3 className="text-xl font-display font-bold italic tracking-tight">Hive Efficiency</h3>
            </div>
            <div className="w-12 h-12 bg-hive-amber/10 border border-hive-amber/20 rounded-xl flex items-center justify-center text-hive-amber group-hover:scale-110 transition-transform">
              <TrendingUp size={24} />
            </div>
          </div>
          <div className="mt-8 flex items-end gap-4 relative z-10">
             <span className="text-5xl font-display font-black text-hive-amber tracking-tighter">0<span className="text-2xl text-hive-amber/50 font-mono">%</span></span>
             <div className="mb-2">
                <span className="text-white/30 font-mono text-xs font-bold">--</span>
                <p className="text-[9px] text-white/20 uppercase tracking-tighter">API Success Rate</p>
             </div>
          </div>
        </div>

        <div className="hive-card flex flex-col justify-between min-h-[200px] group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-mono text-hive-amber uppercase tracking-widest mb-1">Financial Insight</p>
              <h3 className="text-xl font-display font-bold italic tracking-tight">Spend Analysis</h3>
            </div>
            <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white/40 group-hover:text-hive-amber transition-colors">
              <CreditCard size={24} />
            </div>
          </div>
          <div className="mt-4">
             <p className="text-xs text-white/40 leading-relaxed uppercase tracking-tighter">
               No orders yet. Start by selecting a service from the catalog to begin tracking your spending.
             </p>
             <div className="mt-6 space-y-2">
                <div className="flex justify-between text-[10px] font-mono">
                   <span className="text-white/20">TOTAL SPEND</span>
                   <span className="text-white/60">$0.00</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                   <div className="h-full bg-gradient-to-r from-hive-amber/80 to-hive-amber" style={{ width: '0%' }} />
                </div>
             </div>
          </div>
        </div>

        <div className="hive-card !p-0 relative overflow-hidden group min-h-[200px]">
           <img 
            src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800" 
            alt="Core Health" 
            className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-[2s]"
           />
           <div className="absolute inset-0 bg-gradient-to-t from-hive-black to-transparent" />
           <div className="absolute bottom-6 left-6">
              <div className="flex items-center gap-2 mb-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                 <span className="text-[10px] font-mono text-green-500 uppercase tracking-widest font-bold">Core Health: Ready</span>
              </div>
              <h3 className="text-lg font-display font-bold italic tracking-tight text-white">0 Active Orders</h3>
              <p className="text-[10px] text-white/40 uppercase tracking-tighter mt-1">Waiting for first order...</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default History;
