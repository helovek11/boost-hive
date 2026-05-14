import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Shield,
  Users,
  ShoppingBag,
  Activity,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  ChevronRight,
  Server,
  ExternalLink,
  Plus,
  Trash2,
  DollarSign
} from 'lucide-react';
import api from '../lib/api';

type AdminTab = 'overview' | 'users' | 'orders' | 'providers';

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  balance: number;
  createdAt: string;
}

interface AdminOrder {
  id: string;
  userId: string;
  serviceId: string;
  target: string;
  quantity: number;
  price: number;
  status: string;
  progress: number;
  createdAt: string;
  user: { email: string; name: string | null };
}

interface AdminStats {
  users: number;
  totalOrders: number;
  activeOrders: number;
  uptime: number;
}

interface Provider {
  id: string;
  name: string;
  apiUrl: string;
  isActive: boolean;
  priority: number;
  balance: number;
  minBalanceAlert: number;
  balanceCurrency: string;
  topUpUrl: string | null;
  lastChecked: string | null;
  createdAt: string;
}

const Admin = () => {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [checkingBalances, setCheckingBalances] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, ordersRes, providersRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/orders'),
        api.get('/admin/providers'),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.data || usersRes.data);
      setOrders(ordersRes.data.data || ordersRes.data);
      setProviders(providersRes.data);
    } catch (err) {
      console.error('Admin fetch failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role });
      fetchData();
    } catch {
      alert('Failed to update role');
    }
  };

  const handleCheckBalance = async (providerId: string) => {
    try {
      await api.post(`/admin/providers/${providerId}/check-balance`);
      fetchData();
    } catch {
      alert('Balance check failed');
    }
  };

  const handleCheckAllBalances = async () => {
    setCheckingBalances(true);
    try {
      await api.post('/admin/providers/check-all-balances');
      fetchData();
    } catch {
      alert('Balance check failed for some providers');
    } finally {
      setCheckingBalances(false);
    }
  };

  const handleDeleteProvider = async (id: string) => {
    if (!confirm('Delete this provider?')) return;
    try {
      await api.delete(`/admin/providers/${id}`);
      fetchData();
    } catch {
      alert('Failed to delete provider');
    }
  };

  const handleToggleProvider = async (id: string) => {
    try {
      await api.patch(`/admin/providers/${id}/toggle`);
      fetchData();
    } catch {
      alert('Failed to toggle provider');
    }
  };

  const tabs: { id: AdminTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'System Overview', icon: Activity },
    { id: 'providers', label: 'Providers', icon: Server },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'orders', label: 'All Orders', icon: ShoppingBag },
  ];

  const filteredUsers = users.filter(
    u => u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
         (u.name?.toLowerCase() || '').includes(userSearch.toLowerCase())
  );

  const statusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'RUNNING': return 'text-hive-amber bg-hive-amber/10 border-hive-amber/20';
      case 'PENDING': return 'text-white/50 bg-white/5 border-white/10';
      default: return 'text-red-500 bg-red-500/10 border-red-500/20';
    }
  };

  const balanceIndicator = (balance: number, minAlert: number) => {
    if (balance > minAlert * 3) return { color: 'bg-green-500', text: 'OK', textColor: 'text-green-500' };
    if (balance > minAlert) return { color: 'bg-hive-amber', text: 'Normal', textColor: 'text-hive-amber' };
    return { color: 'bg-red-500 animate-pulse', text: 'LOW', textColor: 'text-red-500' };
  };

  // Add provider modal
  const [newProvider, setNewProvider] = useState({
    name: '', apiUrl: '', apiKey: '', topUpUrl: '', priority: 0, minBalanceAlert: 500,
  });

  const handleAddProvider = async () => {
    try {
      await api.post('/admin/providers', newProvider);
      setShowAddProvider(false);
      setNewProvider({ name: '', apiUrl: '', apiKey: '', topUpUrl: '', priority: 0, minBalanceAlert: 500 });
      fetchData();
    } catch {
      alert('Failed to add provider');
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('ru-RU');
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center">
          <Shield size={20} className="text-red-500" />
        </div>
        <div>
          <h1 className="font-display font-black text-4xl lg:text-5xl text-white tracking-tighter italic">Admin Panel</h1>
          <p className="text-white/40 text-[10px] uppercase tracking-[0.3em] font-mono mt-1">System Control • Restricted Access</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-white/5 pb-4 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all text-[10px] font-mono uppercase tracking-widest shrink-0 ${
              tab === t.id
                ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                : 'text-white/40 hover:text-white border border-transparent hover:border-white/10'
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={32} className="text-hive-amber animate-spin" />
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {tab === 'overview' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="hive-card border-l-4 border-l-hive-amber">
                  <p className="text-[10px] font-mono text-hive-amber uppercase tracking-widest mb-2">Users</p>
                  <p className="text-4xl font-display font-black text-white">{stats.users}</p>
                </div>
                <div className="hive-card border-l-4 border-l-blue-500">
                  <p className="text-[10px] font-mono text-blue-500 uppercase tracking-widest mb-2">Total Orders</p>
                  <p className="text-4xl font-display font-black text-white">{stats.totalOrders}</p>
                </div>
                <div className="hive-card border-l-4 border-l-green-500">
                  <p className="text-[10px] font-mono text-green-500 uppercase tracking-widest mb-2">Active Orders</p>
                  <p className="text-4xl font-display font-black text-white">{stats.activeOrders}</p>
                </div>
                <div className="hive-card border-l-4 border-l-purple-500">
                  <p className="text-[10px] font-mono text-purple-500 uppercase tracking-widest mb-2">Uptime</p>
                  <p className="text-4xl font-display font-black text-white">{Math.floor(stats.uptime / 3600)}h</p>
                </div>
              </div>

              <div className="hive-card">
                <h3 className="font-display font-black text-xl text-white italic tracking-tight mb-4">Quick Actions</h3>
                <div className="flex gap-4 flex-wrap">
                  <button onClick={() => setTab('providers')} className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-white/60 hover:text-white transition-all text-[10px] font-mono uppercase tracking-widest">
                    <Server size={14} /> Providers <ChevronRight size={12} />
                  </button>
                  <button onClick={() => setTab('users')} className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-white/60 hover:text-white transition-all text-[10px] font-mono uppercase tracking-widest">
                    <Users size={14} /> Manage Users <ChevronRight size={12} />
                  </button>
                  <button onClick={() => setTab('orders')} className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-white/60 hover:text-white transition-all text-[10px] font-mono uppercase tracking-widest">
                    <ShoppingBag size={14} /> View Orders <ChevronRight size={12} />
                  </button>
                  <button onClick={fetchData} className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-white/60 hover:text-white transition-all text-[10px] font-mono uppercase tracking-widest">
                    <RefreshCw size={14} /> Refresh Data
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Providers Tab */}
          {tab === 'providers' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">{providers.length} providers</p>
                <div className="flex gap-3">
                  <button
                    onClick={handleCheckAllBalances}
                    disabled={checkingBalances}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-white/60 hover:text-white transition-all text-[10px] font-mono uppercase tracking-widest"
                  >
                    <RefreshCw size={14} className={checkingBalances ? 'animate-spin' : ''} />
                    Check All Balances
                  </button>
                  <button
                    onClick={() => setShowAddProvider(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-hive-amber/10 hover:bg-hive-amber/20 border border-hive-amber/20 text-hive-amber rounded-xl transition-all text-[10px] font-mono uppercase tracking-widest"
                  >
                    <Plus size={14} /> Add Provider
                  </button>
                </div>
              </div>

              {/* Provider cards */}
              <div className="grid gap-4">
                {providers.map(p => {
                  const bal = balanceIndicator(p.balance, p.minBalanceAlert);
                  return (
                    <div key={p.id} className="hive-card flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`w-3 h-3 rounded-full ${bal.color} shadow-[0_0_8px_${bal.color === 'bg-green-500' ? '#22c55e' : bal.color === 'bg-hive-amber' ? '#ffb100' : '#ef4444'}] shrink-0`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-display font-bold text-white text-lg">{p.name}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-mono font-bold uppercase tracking-widest border ${
                              p.isActive ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-white/5 text-white/30 border-white/10'
                            }`}>
                              {p.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="text-[10px] font-mono text-white/30 truncate mt-0.5">{p.apiUrl}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 md:gap-8">
                        <div className="text-right">
                          <p className={`text-lg font-mono font-bold ${bal.textColor}`}>
                            {p.balance.toFixed(2)} ₽
                          </p>
                          <p className={`text-[9px] font-mono uppercase tracking-widest ${bal.textColor}`}>{bal.text}</p>
                        </div>
                        <div className="text-right text-[10px] font-mono text-white/30 min-w-[100px]">
                          <p>Alert: {p.minBalanceAlert} ₽</p>
                          <p>Checked: {p.lastChecked ? new Date(p.lastChecked).toLocaleTimeString('ru-RU') : '—'}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleToggleProvider(p.id)}
                            className={`p-2 rounded-lg border transition-all ${
                              p.isActive
                                ? 'bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20'
                                : 'bg-white/5 border-white/10 text-white/30 hover:text-white'
                            }`}
                            title={p.isActive ? 'Disable' : 'Enable'}
                          >
                            <span className="block w-3.5 h-3.5 rounded-sm border-2 currentColor" style={p.isActive ? { background: 'currentColor' } : {}} />
                          </button>
                          <button
                            onClick={() => handleCheckBalance(p.id)}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-white/40 hover:text-hive-amber transition-all"
                            title="Check balance"
                          >
                            <RefreshCw size={14} />
                          </button>
                          {p.topUpUrl && (
                            <a
                              href={p.topUpUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 bg-hive-amber/10 hover:bg-hive-amber/20 rounded-lg border border-hive-amber/20 text-hive-amber transition-all inline-flex items-center"
                              title="Top up"
                            >
                              <DollarSign size={14} />
                            </a>
                          )}
                          <button
                            onClick={() => handleDeleteProvider(p.id)}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/20 text-red-500/60 hover:text-red-500 transition-all"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {providers.length === 0 && (
                  <div className="hive-card text-center py-12">
                    <Server size={40} className="text-white/10 mx-auto mb-4" />
                    <p className="text-white/40 text-sm">No providers configured</p>
                    <button onClick={() => setShowAddProvider(true)} className="mt-4 text-hive-amber text-xs font-mono uppercase tracking-widest hover:underline">
                      Add your first provider
                    </button>
                  </div>
                )}
              </div>

              {/* Add Provider Modal */}
              {showAddProvider && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAddProvider(false)} />
                  <div className="hive-card w-full max-w-lg relative z-10 !p-8 space-y-6">
                    <h3 className="font-display font-black text-2xl text-white italic tracking-tight">Add Provider</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="hive-label">Name</label>
                        <input value={newProvider.name} onChange={e => setNewProvider({ ...newProvider, name: e.target.value })}
                          className="hive-input w-full" placeholder="Profi-like" />
                      </div>
                      <div>
                        <label className="hive-label">API URL</label>
                        <input value={newProvider.apiUrl} onChange={e => setNewProvider({ ...newProvider, apiUrl: e.target.value })}
                          className="hive-input w-full font-mono text-xs" placeholder="https://api.profi-like.ru/v1" />
                      </div>
                      <div>
                        <label className="hive-label">API Key</label>
                        <input value={newProvider.apiKey} onChange={e => setNewProvider({ ...newProvider, apiKey: e.target.value })}
                          className="hive-input w-full font-mono text-xs" placeholder="your-api-key" />
                      </div>
                      <div>
                        <label className="hive-label">Top-Up URL (optional)</label>
                        <input value={newProvider.topUpUrl} onChange={e => setNewProvider({ ...newProvider, topUpUrl: e.target.value })}
                          className="hive-input w-full font-mono text-xs" placeholder="https://profi-like.ru/deposit" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="hive-label">Priority</label>
                          <input type="number" value={newProvider.priority} onChange={e => setNewProvider({ ...newProvider, priority: parseInt(e.target.value) || 0 })}
                            className="hive-input w-full" />
                        </div>
                        <div>
                          <label className="hive-label">Min Balance Alert (₽)</label>
                          <input type="number" value={newProvider.minBalanceAlert} onChange={e => setNewProvider({ ...newProvider, minBalanceAlert: parseInt(e.target.value) || 500 })}
                            className="hive-input w-full" />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4 pt-4">
                      <button onClick={() => setShowAddProvider(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white/60 font-mono text-[10px] uppercase font-bold py-4 rounded-xl transition-all tracking-widest">
                        Cancel
                      </button>
                      <button onClick={handleAddProvider} disabled={!newProvider.name || !newProvider.apiUrl || !newProvider.apiKey}
                        className="flex-[2] hive-button !py-4">
                        Add Provider
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Users Tab */}
          {tab === 'users' && (
            <div className="hive-card !p-0 overflow-hidden">
              <div className="p-6 border-b border-white/5 flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="hive-input w-full pl-12"
                  />
                </div>
                <span className="text-[10px] font-mono text-white/30">{filteredUsers.length} users</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/[0.01]">
                      <th className="px-6 py-4 text-[10px] font-mono text-white/20 uppercase tracking-[0.2em] border-b border-white/5">Email</th>
                      <th className="px-6 py-4 text-[10px] font-mono text-white/20 uppercase tracking-[0.2em] border-b border-white/5">Name</th>
                      <th className="px-6 py-4 text-[10px] font-mono text-white/20 uppercase tracking-[0.2em] border-b border-white/5">Role</th>
                      <th className="px-6 py-4 text-[10px] font-mono text-white/20 uppercase tracking-[0.2em] border-b border-white/5">Balance</th>
                      <th className="px-6 py-4 text-[10px] font-mono text-white/20 uppercase tracking-[0.2em] border-b border-white/5">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 text-sm font-mono text-white/60">{u.email}</td>
                        <td className="px-6 py-4 text-sm text-white">{u.name || '—'}</td>
                        <td className="px-6 py-4">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className={`text-[10px] font-mono font-bold uppercase tracking-widest rounded-lg px-2 py-1 border outline-none ${
                              u.role === 'ADMIN' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                              u.role === 'ELITE' ? 'bg-hive-amber/10 text-hive-amber border-hive-amber/20' :
                              'bg-white/5 text-white/50 border-white/10'
                            }`}
                          >
                            <option value="USER">USER</option>
                            <option value="ELITE">ELITE</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 text-sm font-mono text-white/40">{u.balance.toFixed(2)} ₽</td>
                        <td className="px-6 py-4 text-[11px] font-mono text-white/30">{new Date(u.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Orders Tab */}
          {tab === 'orders' && (
            <div className="hive-card !p-0 overflow-hidden">
              <div className="p-6 border-b border-white/5">
                <span className="text-[10px] font-mono text-white/30">{orders.length} orders</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/[0.01]">
                      <th className="px-6 py-4 text-[10px] font-mono text-white/20 uppercase tracking-[0.2em] border-b border-white/5">Order ID</th>
                      <th className="px-6 py-4 text-[10px] font-mono text-white/20 uppercase tracking-[0.2em] border-b border-white/5">User</th>
                      <th className="px-6 py-4 text-[10px] font-mono text-white/20 uppercase tracking-[0.2em] border-b border-white/5">Service</th>
                      <th className="px-6 py-4 text-[10px] font-mono text-white/20 uppercase tracking-[0.2em] border-b border-white/5">Qty</th>
                      <th className="px-6 py-4 text-[10px] font-mono text-white/20 uppercase tracking-[0.2em] border-b border-white/5">Price</th>
                      <th className="px-6 py-4 text-[10px] font-mono text-white/20 uppercase tracking-[0.2em] border-b border-white/5">Status</th>
                      <th className="px-6 py-4 text-[10px] font-mono text-white/20 uppercase tracking-[0.2em] border-b border-white/5">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {orders.map(o => (
                      <tr key={o.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-hive-amber">{o.id.slice(0, 12)}</td>
                        <td className="px-6 py-4 text-xs text-white/60">{o.user?.email || o.userId.slice(0, 12)}</td>
                        <td className="px-6 py-4 text-xs text-white/40">{o.serviceId}</td>
                        <td className="px-6 py-4 text-xs font-mono text-white/60">{o.quantity.toLocaleString()}</td>
                        <td className="px-6 py-4 text-xs font-mono text-white/60">{o.price.toFixed(2)} ₽</td>
                        <td className="px-6 py-4">
                          <span className={`text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-1 rounded-full border ${statusColor(o.status)}`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[11px] font-mono text-white/30">{new Date(o.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Admin;
