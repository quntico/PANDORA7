
import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

function AlertBox({ type = 'info', title, message, className }) {
  const configs = {
    error: {
      icon: AlertCircle,
      bgClass: 'bg-red-900/20 border-red-500/30',
      iconClass: 'text-red-400',
      titleClass: 'text-red-300'
    },
    warning: {
      icon: AlertTriangle,
      bgClass: 'bg-yellow-900/20 border-yellow-500/30',
      iconClass: 'text-yellow-400',
      titleClass: 'text-yellow-300'
    },
    info: {
      icon: Info,
      bgClass: 'bg-cyan-900/20 border-cyan-500/30',
      iconClass: 'text-cyan-400',
      titleClass: 'text-cyan-300'
    },
    success: {
      icon: CheckCircle2,
      bgClass: 'bg-green-900/20 border-green-500/30',
      iconClass: 'text-green-400',
      titleClass: 'text-green-300'
    }
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <div className={cn(
      'p-4 rounded-xl border backdrop-blur-md shadow-sm flex gap-3 transition-all',
      config.bgClass,
      className
    )}>
      <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', config.iconClass)} />
      <div className="flex-1">
        {title && (
          <h4 className={cn('font-semibold mb-1 text-sm', config.titleClass)}>
            {title}
          </h4>
        )}
        <p className="text-sm text-gray-300 leading-relaxed">{message}</p>
      </div>
    </div>
  );
}

export default AlertBox;
