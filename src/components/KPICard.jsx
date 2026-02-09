
import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

function KPICard({ title, value, subtitle, icon: Icon, trend, status, borderColor = "border-neon-cyan/20", className }) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl p-3 md:p-4 backdrop-blur-xl bg-glass-light border transition-all duration-300 hover:bg-glass-medium hover:border-glass-hover group shadow-float",
      borderColor,
      className
    )}>
      {/* Glow effect on hover */}
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-neon-cyan/5 blur-3xl rounded-full pointer-events-none group-hover:bg-neon-cyan/10 transition-all duration-500" />

      {/* Icon and Status Row */}
      <div className="flex justify-between items-start mb-2 relative z-10">
        <div className="p-1.5 rounded-lg bg-glass-light border border-glass-border text-gray-400 group-hover:text-neon-cyan group-hover:border-neon-cyan/30 transition-all">
          {Icon && <Icon className="w-4 h-4" />}
        </div>
        {status && (
          <span className={cn(
            "px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase rounded-full border",
            status === 'high' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
              status === 'medium' ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" :
                "bg-red-500/10 text-red-400 border-red-500/30"
          )}>
            {status === 'high' ? 'Alto' : status === 'medium' ? 'Medio' : 'Bajo'}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="space-y-1 relative z-10">
        <h3 className="text-[11px] font-semibold text-gray-500 tracking-wide uppercase">{title}</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl md:text-[28px] font-bold text-white tracking-tight leading-none">{value}</span>
          {trend && (
            <span className={cn(
              "flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-md",
              trend > 0 ? "bg-emerald-500/10 text-emerald-400" : trend < 0 ? "bg-red-500/10 text-red-400" : "text-gray-400"
            )}>
              {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : trend < 0 ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-[11px] text-gray-500 font-medium leading-tight">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

export default KPICard;
