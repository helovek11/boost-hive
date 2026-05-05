import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Zap, 
  TrendingUp, 
  Activity, 
  ArrowUpRight, 
  RefreshCw,
  Clock,
  ExternalLink,
  ChevronRight,
  Rocket
} from 'lucide-react';
import { getOrders } from '../lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const Dashboard: React.FC = () => {
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

  const activeOrders = orders.filter(o => o.status === 'RUNNING' || o.status === 'PENDING');
  const completedOrders = orders.filter(o => o.status === 'COMPLETED');
  const totalSpent = orders.reduce((sum, o) => sum + (o.price || 0), 0);
  return (
    <div className="space-y-8 pb-10">
      {/* Bento Grid Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Hive Score Gauge */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="md:col-span-4 hive-card relative overflow-hidden flex flex-col items-center justify-center text-center group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-hive-amber/5 to-transparent pointer-events-none" />
          <div className="relative w-48 h-48 mb-4">
            <svg className="w-full h-full transform -rotate-90">
              <circle 
                className="text-white/5" 
                cx="96" cy="96" r="88" 
                fill="transparent" 
                stroke="currentColor" 
                strokeWidth="4" 
              />
              <motion.circle 
                initial={{ strokeDashoffset: 552.92 }}
                animate={{ strokeDashoffset: 88.46 }}
                transition={{ duration: 2, ease: "easeOut" }}
                className="text-hive-amber" 
                cx="96" cy="96" r="88" 
                fill="transparent" 
                stroke="currentColor" 
                strokeWidth="10" 
                strokeDasharray="552.92"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-6xl font-display font-black text-hive-amber tracking-tighter leading-none">0</span>
              <span className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] mt-2">HIVE SCORE</span>
            </div>
          </div>
          <p className="text-xs text-white/40 px-4 leading-relaxed uppercase tracking-tighter">
            Start your first order to begin tracking efficiency.
          </p>
        </motion.div>

        {/* Active Orders Card */}
        <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="hive-card flex flex-col justify-between group hover:border-hive-amber/30 transition-all border-l-4 border-l-hive-amber"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="w-10 h-10 bg-hive-amber/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Zap className="text-hive-amber fill-hive-amber/20" size={20} />
                </div>
                <h3 className="text-lg font-display font-bold italic tracking-tight">Active Operations</h3>
              </div>
            </div>
            
            <div className="mt-8">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-display font-black tracking-tighter">{activeOrders.length}</span>
                <span className="text-xs font-mono text-white/30 uppercase tracking-widest">Tasks in Progress</span>
              </div>
              <div className="mt-4 w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: activeOrders.length > 0 ? '50%' : '0%' }}
                   transition={{ duration: 1, delay: 0.5 }}
                   className="h-full bg-hive-amber shadow-[0_0_10px_#ffb100]" 
                />
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="hive-card flex flex-col justify-between group hover:border-hive-amber/30 transition-all"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <TrendingUp className="text-white/40 group-hover:text-hive-amber" size={20} />
                </div>
                <h3 className="text-lg font-display font-bold italic tracking-tight">Total Spent</h3>
              </div>
            </div>

            <div className="mt-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-display font-black text-hive-amber tracking-tighter">${totalSpent.toFixed(2)}</span>
                  <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Total Revenue</span>
                </div>
                <div className="mt-4 flex gap-1 h-10 items-end">
                  {[30, 50, 40, 70, 60, 80].map((h, i) => (
                    <motion.div 
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ delay: 0.5 + (i * 0.1) }}
                      className={`flex-1 rounded-t-sm ${i === 5 ? 'bg-hive-amber' : 'bg-hive-amber/20'}`}
                    />
                  ))}
                </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Command Feed (Live Order Status) */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel rounded-2xl overflow-hidden shadow-2xl"
      >
        <div className="px-8 py-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-hive-amber rounded-full animate-pulse shadow-[0_0_10px_#ffb100]" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-white/80">Command Feed: Live Status</h3>
          </div>
          <button onClick={() => alert('No orders to export')} className="text-[10px] font-mono text-white/30 hover:text-hive-amber transition-colors flex items-center gap-2 uppercase tracking-widest">
            Export Records <ExternalLink size={12} />
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-white/40 text-sm font-mono">No orders yet. Start by selecting a service from the catalog.</p>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.01]">
                <th className="px-8 py-4 text-[10px] font-mono text-white/20 uppercase tracking-[0.2em] border-b border-white/5">Target Identifier</th>
                <th className="px-8 py-4 text-[10px] font-mono text-white/20 uppercase tracking-[0.2em] border-b border-white/5">Service Module</th>
                <th className="px-8 py-4 text-[10px] font-mono text-white/20 uppercase tracking-[0.2em] border-b border-white/5">Units</th>
                <th className="px-8 py-4 text-[10px] font-mono text-white/20 uppercase tracking-[0.2em] border-b border-white/5">Sync Status</th>
                <th className="px-8 py-4 text-[10px] font-mono text-white/20 uppercase tracking-[0.2em] border-b border-white/5">Efficiency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {orders.map((order: any) => (
                <tr key={order.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-8 py-5 text-sm font-mono text-white/60 group-hover:text-white transition-colors">{order.target}</td>
                  <td className="px-8 py-5 text-xs font-display font-medium text-white/80 italic tracking-tight">{order.serviceId}</td>
                  <td className="px-8 py-5 text-sm font-mono text-white/40">{order.quantity?.toLocaleString()}</td>
                  <td className="px-8 py-5">
                    <span className={`flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest ${
                      order.status === 'COMPLETED' ? 'text-green-500' : 
                      order.status === 'RUNNING' ? 'text-hive-amber' : 'text-white/30'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        order.status === 'COMPLETED' ? 'bg-green-500' : 
                        order.status === 'RUNNING' ? 'bg-hive-amber animate-pulse' : 'bg-white/20'
                      }`} />
                      {order.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 max-w-[150px]">
                     <div className="flex items-center gap-3">
                        <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                           <div className={`h-full ${order.status === 'COMPLETED' ? 'bg-green-500/50' : 'bg-hive-amber'}`} style={{ width: `${order.progress || 0}%` }} />
                        </div>
                        <span className="text-[10px] font-mono text-white/30">{order.progress || 0}%</span>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </motion.section>
    </div>
  );
};

export default Dashboard;
