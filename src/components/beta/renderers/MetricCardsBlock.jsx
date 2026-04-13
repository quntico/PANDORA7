
import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Shield, Zap, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MetricCardsBlock({ title, items }) {
  if (!items || !items.length) return null;

  return (
    <div className="my-10 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse" />
        <h4 className="text-[10px] font-black uppercase tracking-[4px] text-neon-cyan/60">{title || 'INDICADORES CLAVE'}</h4>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-neon-cyan/20 hover:bg-white/[0.05] transition-all group shadow-2xl"
          >
            <div className="flex justify-between items-start mb-4">
               <div className="p-2.5 rounded-xl bg-neon-cyan/5 border border-neon-cyan/10 group-hover:border-neon-cyan/30 transition-all">
                  <TrendingUp className="w-4 h-4 text-neon-cyan" />
               </div>
               <span className={cn(
                  "text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest",
                  item.label.toLowerCase().includes('riesgo') ? "bg-red-500/10 text-red-400" : "bg-neon-cyan/10 text-neon-cyan"
               )}>
                  {item.label}
               </span>
            </div>
            <div className="text-3xl font-black text-white tracking-tight group-hover:text-neon-cyan transition-colors">
              {item.value}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
