import React from 'react';
import {
    ArrowRight,
    ArrowDown,
    ArrowDownRight,
    ArrowUpRight,
    MoveRight,
    TrendingUp,
    GitBranch,
    Zap
} from 'lucide-react';

const edgeTypes = [
    {
        id: 'default',
        name: 'Recta',
        icon: ArrowRight,
        color: '#00F0FF',
        type: 'default',
        animated: true,
        description: 'Conexión directa',
    },
    {
        id: 'step',
        name: 'Escalera',
        icon: ArrowDownRight,
        color: '#8B5CF6',
        type: 'step',
        animated: true,
        description: 'Conexión en escalera',
    },
    {
        id: 'smoothstep',
        name: 'Suave',
        icon: TrendingUp,
        color: '#10b981',
        type: 'smoothstep',
        animated: true,
        description: 'Conexión suave',
    },
    {
        id: 'straight',
        name: 'Directa',
        icon: MoveRight,
        color: '#f59e0b',
        type: 'straight',
        animated: false,
        description: 'Línea recta',
    },
    {
        id: 'animated-cyan',
        name: 'Flujo Cyan',
        icon: Zap,
        color: '#00F0FF',
        type: 'animated',
        animated: true,
        description: 'Flujo animado cyan',
    },
    {
        id: 'animated-purple',
        name: 'Flujo Púrpura',
        icon: Zap,
        color: '#8B5CF6',
        type: 'animated',
        animated: true,
        description: 'Flujo animado púrpura',
    },
    {
        id: 'animated-green',
        name: 'Flujo Verde',
        icon: Zap,
        color: '#10b981',
        type: 'animated',
        animated: true,
        description: 'Flujo animado verde',
    },
];

function EdgeToolbar({ selectedEdgeType, onSelectEdgeType }) {
    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
            <div className="backdrop-blur-xl bg-glass-light border border-glass-border rounded-2xl shadow-float p-3">
                {/* Header */}
                <div className="mb-3 text-center">
                    <h3 className="text-xs font-bold text-white mb-1">Tipos de Conexión</h3>
                    <p className="text-[10px] text-gray-400">Selecciona el estilo de flecha</p>
                </div>

                {/* Edge types grid */}
                <div className="grid grid-cols-7 gap-2">
                    {edgeTypes.map((edgeType) => {
                        const Icon = edgeType.icon;
                        const isSelected = selectedEdgeType?.id === edgeType.id;

                        return (
                            <button
                                key={edgeType.id}
                                onClick={() => onSelectEdgeType(edgeType)}
                                className={`group relative p-3 rounded-xl border transition-all ${isSelected
                                        ? 'bg-glass-medium border-neon-cyan shadow-glow-sm scale-105'
                                        : 'bg-glass-light border-glass-border hover:border-glass-hover hover:bg-glass-medium'
                                    }`}
                                title={edgeType.description}
                            >
                                {/* Icon */}
                                <div
                                    className="flex items-center justify-center"
                                    style={{
                                        color: isSelected ? edgeType.color : '#9ca3af',
                                    }}
                                >
                                    <Icon className="w-5 h-5" />
                                </div>

                                {/* Name */}
                                <div className="mt-2 text-center">
                                    <p className={`text-[9px] font-medium ${isSelected ? 'text-white' : 'text-gray-400'
                                        }`}>
                                        {edgeType.name}
                                    </p>
                                </div>

                                {/* Selected indicator */}
                                {isSelected && (
                                    <div
                                        className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-deep"
                                        style={{ backgroundColor: edgeType.color }}
                                    />
                                )}

                                {/* Animated badge */}
                                {edgeType.animated && (
                                    <div className="absolute -top-1 -left-1">
                                        <div className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Selected edge info */}
                {selectedEdgeType && (
                    <div className="mt-3 pt-3 border-t border-glass-border">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: selectedEdgeType.color }}
                            />
                            <p className="text-xs text-white font-medium">
                                {selectedEdgeType.description}
                            </p>
                            {selectedEdgeType.animated && (
                                <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30">
                                    Animado
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Instructions */}
                <div className="mt-3 p-2 rounded-lg bg-neon-blue/5 border border-neon-blue/20">
                    <p className="text-[9px] text-neon-blue leading-relaxed">
                        💡 <strong>Tip:</strong> Selecciona un tipo y conecta nodos para aplicar el estilo
                    </p>
                </div>
            </div>
        </div>
    );
}

export default EdgeToolbar;
