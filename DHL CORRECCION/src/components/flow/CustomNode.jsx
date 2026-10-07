import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import {
    Blend,
    Cog,
    Hammer,
    Wind,
    Package,
    MoveRight,
    Zap,
    Gauge
} from 'lucide-react';

const iconMap = {
    Mezcladora: Blend,
    Extrusora: Cog,
    Molino: Hammer,
    Secadora: Wind,
    Empacadora: Package,
    Transportador: MoveRight,
};

function CustomNode({ data, selected }) {
    const Icon = iconMap[data.type] || Cog;

    return (
        <div
            className={`relative rounded-2xl backdrop-blur-xl bg-glass-light border-2 transition-all shadow-float min-w-[200px] ${selected
                    ? 'border-neon-cyan shadow-glow-md scale-105'
                    : 'border-glass-border hover:border-glass-hover hover:shadow-glow-sm'
                }`}
        >
            {/* Glow effect */}
            <div
                className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity"
                style={{
                    background: `radial-gradient(circle, ${data.color}40 0%, transparent 70%)`,
                }}
            />

            {/* Header */}
            <div className="relative p-3 border-b border-glass-border">
                <div className="flex items-center gap-2">
                    <div
                        className="p-1.5 rounded-lg"
                        style={{
                            backgroundColor: `${data.color}15`,
                            color: data.color,
                            borderWidth: '1px',
                            borderColor: `${data.color}40`,
                        }}
                    >
                        <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-white truncate">
                            {data.name}
                        </h3>
                        <p className="text-[10px] text-gray-400">{data.type}</p>
                    </div>
                    <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: data.color }}
                    />
                </div>
            </div>

            {/* Body */}
            <div className="relative p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs">
                    <Gauge className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-400">Capacidad:</span>
                    <span className="ml-auto text-white font-semibold">
                        {data.capacity} kg/h
                    </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <Zap className="w-3 h-3 text-yellow-400" />
                    <span className="text-gray-400">Consumo:</span>
                    <span className="ml-auto text-white font-semibold">
                        {data.power} kW
                    </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    </div>
                    <span className="text-gray-400">Eficiencia:</span>
                    <span className="ml-auto text-white font-semibold">
                        {data.efficiency}%
                    </span>
                </div>
            </div>

            {/* Handles (puntos de conexión) */}
            <Handle
                type="target"
                position={Position.Left}
                className="w-3 h-3 !bg-neon-cyan border-2 border-deep"
                style={{ left: -6 }}
            />
            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 !bg-neon-purple border-2 border-deep"
                style={{ right: -6 }}
            />
        </div>
    );
}

export default memo(CustomNode);
