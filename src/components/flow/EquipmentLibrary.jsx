import React from 'react';
import {
    Blend,
    Cog,
    Hammer,
    Wind,
    Package,
    MoveRight,
    Plus,
    Star,
    Zap,
    Droplet,
    Flame,
    Box
} from 'lucide-react';

const ICON_MAP = {
    'Engranaje': Cog,
    'Mezclador': Blend,
    'Martillo': Hammer,
    'Viento': Wind,
    'Paquete': Package,
    'Flecha': MoveRight,
    'Rayo': Zap,
    'Gota': Droplet,
    'Fuego': Flame,
    'Caja': Box
};

const equipmentTypes = [
    {
        type: 'Mezcladora',
        icon: Blend,
        capacity: 500,
        power: 15,
        efficiency: 95,
        cost: 25000,
        inputType: 'raw',
        outputType: 'mix',
        color: '#00F0FF',
    },
    {
        type: 'Extrusora',
        icon: Cog,
        capacity: 300,
        power: 45,
        efficiency: 90,
        cost: 45000,
        inputType: 'mix',
        outputType: 'profile',
        color: '#8B5CF6',
    },
    {
        type: 'Molino',
        icon: Hammer,
        capacity: 800,
        power: 30,
        efficiency: 92,
        cost: 35000,
        inputType: 'solid',
        outputType: 'powder',
        color: '#10b981',
    },
    {
        type: 'Secadora',
        icon: Wind,
        capacity: 400,
        power: 25,
        efficiency: 88,
        cost: 30000,
        inputType: 'wet',
        outputType: 'dry',
        color: '#f59e0b',
    },
    {
        type: 'Empacadora',
        icon: Package,
        capacity: 600,
        power: 10,
        efficiency: 98,
        cost: 20000,
        inputType: 'product',
        outputType: 'packed',
        color: '#ec4899',
    },
    {
        type: 'Transportador',
        icon: MoveRight,
        capacity: 1000,
        power: 5,
        efficiency: 99,
        cost: 15000,
        inputType: 'any',
        outputType: 'any',
        color: '#6b7280',
    },
];

function EquipmentLibrary({ customEquipments = [], onCreateEquipment, onSelectEquipment, selectedEquipmentType }) {
    const onDragStart = (event, equipment) => {
        // Strip icon component before drag to avoid serialization issues
        const { icon, ...safeEquipment } = equipment;
        event.dataTransfer.setData(
            'application/reactflow',
            JSON.stringify(safeEquipment)
        );
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div className="p-4 space-y-4">
            <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h2 className="text-sm font-bold text-white mb-1">Equipos3D</h2>
                        <p className="text-xs text-gray-400">Click para seleccionar y colocar</p>
                    </div>
                    <button
                        onClick={onCreateEquipment}
                        className="p-2 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/20 transition-all"
                        title="Crear equipo personalizado"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Equipos personalizados */}
            {customEquipments.length > 0 && (
                <>
                    <div className="mb-3">
                        <h3 className="text-xs font-bold text-neon-cyan mb-2 flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            Personalizados
                        </h3>
                    </div>
                    <div className="space-y-3 mb-4">
                        {customEquipments.map((equipment, index) => {
                            // Resolve Icon safely
                            let Icon = Cog; // Default

                            // 1. Try by name (preferred)
                            if (equipment.iconName && typeof equipment.iconName === 'string' && ICON_MAP[equipment.iconName]) {
                                Icon = ICON_MAP[equipment.iconName];
                            }
                            // 2. Try legacy: only use if it's actually a valid function component
                            else if (equipment.icon && typeof equipment.icon === 'function') {
                                Icon = equipment.icon;
                            }

                            // FINAL SAFETY CHECK: If Icon is not a function (component), force Cog
                            // This catches edge cases where an object might slip through or imports fail
                            if (typeof Icon !== 'function') {
                                console.warn('EquipmentLibrary: Icon corrupted, using fallback', equipment);
                                Icon = Cog;
                            }
                            // Any other case (object, null, undefined): use default Cog

                            const isSelected = selectedEquipmentType?.type === equipment.type;
                            return (
                                <div
                                    key={`custom-${index}`}
                                    draggable
                                    onDragStart={(e) => onDragStart(e, equipment)}
                                    onClick={() => onSelectEquipment && onSelectEquipment(equipment)}
                                    className={`group cursor-pointer active:scale-95 transition-all duration-200 ${isSelected ? 'scale-105' : ''}`}
                                >
                                    <div className={`p-3 rounded-xl backdrop-blur-xl bg-glass-light border transition-all shadow-float hover:shadow-glow-sm
                                        ${isSelected ? 'border-neon-cyan bg-neon-cyan/10 ring-1 ring-neon-cyan' : 'border-neon-cyan/30 hover:bg-glass-medium hover:border-neon-cyan/50'}
                                    `}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div
                                                className="p-1.5 rounded-lg"
                                                style={{
                                                    backgroundColor: `${equipment.color}15`,
                                                    color: equipment.color,
                                                    borderWidth: '1px',
                                                    borderColor: `${equipment.color}40`,
                                                }}
                                            >
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <h3 className="text-xs font-semibold text-white">
                                                {equipment.type}
                                            </h3>
                                        </div>
                                        <div className="space-y-1 text-[10px] text-gray-400">
                                            <div className="flex justify-between">
                                                <span>Capacidad:</span>
                                                <span className="text-gray-300 font-medium">
                                                    {equipment.capacity} kg/h
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Consumo:</span>
                                                <span className="text-gray-300 font-medium">
                                                    {equipment.power} kW
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Eficiencia:</span>
                                                <span className="text-gray-300 font-medium">
                                                    {equipment.efficiency}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="h-px bg-glass-border mb-4" />
                </>
            )}

            {/* Equipos predefinidos */}
            <div className="mb-2">
                <h3 className="text-xs font-bold text-gray-400 mb-2">Predefinidos</h3>
            </div>

            <div className="space-y-3">
                {equipmentTypes.map((equipment) => {
                    const Icon = equipment.icon;
                    const isSelected = selectedEquipmentType?.type === equipment.type;
                    return (
                        <div
                            key={equipment.type}
                            draggable
                            onDragStart={(e) => onDragStart(e, equipment)}
                            onClick={() => onSelectEquipment && onSelectEquipment(equipment)}
                            className={`group cursor-pointer active:scale-95 transition-all duration-200 ${isSelected ? 'scale-105' : ''}`}
                        >
                            <div className={`p-3 rounded-xl backdrop-blur-xl bg-glass-light border transition-all shadow-float hover:shadow-glow-sm
                                ${isSelected ? 'border-neon-cyan bg-neon-cyan/10 ring-1 ring-neon-cyan' : 'border-glass-border hover:bg-glass-medium hover:border-glass-hover'}
                            `}>
                                <div className="flex items-center gap-2 mb-2">
                                    <div
                                        className="p-1.5 rounded-lg"
                                        style={{
                                            backgroundColor: `${equipment.color}15`,
                                            color: equipment.color,
                                            borderWidth: '1px',
                                            borderColor: `${equipment.color}40`,
                                        }}
                                    >
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <h3 className="text-xs font-semibold text-white">
                                        {equipment.type}
                                    </h3>
                                </div>
                                <div className="space-y-1 text-[10px] text-gray-400">
                                    <div className="flex justify-between">
                                        <span>Capacidad:</span>
                                        <span className="text-gray-300 font-medium">
                                            {equipment.capacity} kg/h
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Consumo:</span>
                                        <span className="text-gray-300 font-medium">
                                            {equipment.power} kW
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Eficiencia:</span>
                                        <span className="text-gray-300 font-medium">
                                            {equipment.efficiency}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-6 p-3 rounded-xl bg-neon-cyan/5 border border-neon-cyan/20">
                <p className="text-[10px] text-neon-cyan leading-relaxed">
                    💡 <strong>Tip:</strong> Arrastra equipos al canvas y conéctalos para
                    diseñar tu línea de producción.
                </p>
            </div>
        </div>
    );
}

export default EquipmentLibrary;
