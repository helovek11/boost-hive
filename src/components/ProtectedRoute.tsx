import { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { motion } from 'motion/react';
import api from '../lib/api';
import { User } from '../types';

const ProtectedRoute = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/me')
      .then(res => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-hive-black flex items-center justify-center relative overflow-hidden">
        <div className="hex-bg absolute inset-0 opacity-20" />
        <div className="z-10 flex flex-col items-center gap-8">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 180, 360],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-16 h-16 border-2 border-hive-amber rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.5)]"
          >
            <div className="w-8 h-8 bg-hive-amber rounded" />
          </motion.div>
          <div className="space-y-2 text-center">
            <h1 className="text-lg font-mono text-hive-amber uppercase tracking-[0.5em] animate-pulse">Initializing Hive</h1>
            <p className="text-[10px] font-mono text-white/20 uppercase tracking-[0.3em]">Establishing secure proxy tunnels...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet context={{ user, setUser }} />;
};

export default ProtectedRoute;
