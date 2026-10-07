
import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MetricCard({ label, value, trend, subtitle, ...props }) {
  const actualLabel = label || props.name || props.title || props.metric || 'MÉTRICA CLAVE';
  const isUp = trend === 'up';
  const isDown = trend === 'down';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-neon-cyan/20 hover:bg-white/[0.05] transition-all group relative overflow-hidden"
    >
      <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity">
         {isUp ? <TrendingUp className="w-5 h-5 text-neon-cyan" /> : isDown ? <TrendingDown className="w-5 h-5 text-red-500" /> : <Minus className="w-5 h-5 text-gray-500" />}
      </div>

      <div className="space-y-1.5">
        <span className="text-[9px] font-black uppercase tracking-[3px] text-gray-500 group-hover:text-neon-cyan/60 transition-colors block">{actualLabel}</span>
        {subtitle && <span className="text-[8px] font-medium text-gray-600 uppercase tracking-wider block">{subtitle}</span>}
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-xl font-black text-white tracking-tight group-hover:text-neon-cyan transition-colors">
            {value}
          </span>
          {trend && (
            <span className={cn(
              "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
              isUp ? "bg-neon-cyan/10 text-neon-cyan" : "bg-red-500/10 text-red-400"
            )}>
              {isUp ? '↑' : isDown ? '↓' : '→'}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
