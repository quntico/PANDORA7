import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { TransformControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Zap, Activity, Gauge, Cpu, Anchor } from 'lucide-react';

function Equipment3DModel({ node, index, onClick, onTransformEnd, isSelected, onSetAnchorStart, isPickingAnchor, labelRef, isCollapsed = false }) {
    const meshRef = useRef();
    const lineRef = useRef();
    const [hovered, setHovered] = useState(false);

    const lastMousePos = useRef({ x: 0, y: 0 });

    const handlePointerDown = (e) => {
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleClick = (e) => {
        e.stopPropagation();
        const dist = Math.sqrt(
            Math.pow(e.clientX - lastMousePos.current.x, 2) +
            Math.pow(e.clientY - lastMousePos.current.y, 2)
        );

        if (dist < 5) {
            onClick(e);
        }
    };

    // Validación
    if (!node || !node.data) return null;

    // Posición
    const defaultPos = {
        x: (index % 5) * 3 - 6,
        y: 0,
        z: Math.floor(index / 5) * 3 - 3
    };
    const position = node.data.position3D || defaultPos;

    // Calculate relative anchor point if it exists
    const anchorRel = useMemo(() => {
        if (node.data.anchorPoint) {
            return new THREE.Vector3(
                node.data.anchorPoint.x - position.x,
                node.data.anchorPoint.y - position.y,
                node.data.anchorPoint.z - position.z
            );
        }
        return null;
    }, [node.data.anchorPoint, position.x, position.y, position.z]);

    // Label Position Relative to Group
    const labelPos = useMemo(() => {
        return node.data.labelPosition
            ? new THREE.Vector3(node.data.labelPosition.x, node.data.labelPosition.y, node.data.labelPosition.z)
            : new THREE.Vector3(0, 2.2, 0);
    }, [node.data.labelPosition]);

    const groupYPosition = node.data.position3D?.y ?? defaultPos.y;

    // Color
    const getColor = () => {
        const colorMap = {
            'Mezcladora': '#00F0FF', // Cyan
            'Extrusora': '#8B5CF6', // Purple
            'Molino': '#10b981',    // Emerald
            'Secadora': '#f59e0b',  // Amber
            'Empacadora': '#ec4899',// Pink
            'Transportador': '#06b6d4', // Cyan dark
        };
        // Case-insensitive check
        const typeKey = Object.keys(colorMap).find(k => k.toLowerCase() === (node.data.type || '').toLowerCase());
        return node.data.color || (typeKey ? colorMap[typeKey] : '#00F0FF');
    };
    const color = getColor();

    // Actualizar geometría de la línea (cuerda del globo) en cada frame
    useFrame(() => {
        if (lineRef.current && anchorRel && labelRef.current) {
            const positions = lineRef.current.geometry.attributes.position.array;

            // Punto 0: Anclaje (Fijo relativo al grupo)
            positions[0] = anchorRel.x;
            positions[1] = anchorRel.y;
            positions[2] = anchorRel.z;

            // Punto 1: Etiqueta (Móvil)
            const labelCurrentPos = labelRef.current.position;
            positions[3] = labelCurrentPos.x;
            // Ajustar para que la línea llegue a la base de la tarjeta (aprox)
            positions[4] = labelCurrentPos.y - 0.9;
            positions[5] = labelCurrentPos.z;

            lineRef.current.geometry.attributes.position.needsUpdate = true;
        }
    });

    return (
        <group>
            {/* Si hay anclaje, dibujar la "Cuerda" dinámica */}
            {anchorRel && (
                <>
                    <line ref={lineRef}>
                        <bufferGeometry>
                            <bufferAttribute
                                attach="attributes-position"
                                count={2}
                                array={new Float32Array(6)} // 2 puntos * 3 coords
                                itemSize={3}
                            />
                        </bufferGeometry>
                        <lineBasicMaterial color={color} transparent opacity={0.5} linewidth={1} />
                    </line>

                    {/* Punto exacto de anclaje visual */}
                    <mesh position={anchorRel}>
                        <sphereGeometry args={[0.08, 16, 16]} />
                        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
                    </mesh>
                </>
            )}

            {/* Esfera Base (Equipo Físico) */}
            <mesh
                ref={meshRef}
                onClick={(e) => {
                    e.stopPropagation();
                    onClick(e);
                }}
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
            >
                <sphereGeometry args={[0.4, 32, 32]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={hovered || isSelected ? 2 : 1}
                    toneMapped={false}
                />
            </mesh>

            {/* Línea de guía vertical si está elevado Y NO tiene anclaje personalizado */}
            {!anchorRel && groupYPosition > 0.1 && isSelected && (
                <mesh position={[0, -groupYPosition / 2, 0]}>
                    <cylinderGeometry args={[0.02, 0.02, groupYPosition, 8]} />
                    <meshBasicMaterial color={color} transparent opacity={0.3} />
                </mesh>
            )}

            {/* Anillo de Selección */}
            {isSelected && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                    <ringGeometry args={[0.5, 0.6, 64]} />
                    <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
                </mesh>
            )}

            {/* Poste de soporte (Stem) - Solo si NO hay anclaje custom */}
            {!anchorRel && (
                <mesh position={[0, 1.1, 0]}>
                    <cylinderGeometry args={[0.03, 0.03, 2.2, 8]} />
                    <meshStandardMaterial color={color} transparent opacity={0.6} />
                </mesh>
            )}

            {/* GRUPO DE ETIQUETA MOVIBLE */}
            <group ref={labelRef} position={labelPos}>
                {/* Cubo "Contenedor" 3D Detrás de la UI (Ajustado según modo colapsado) */}
                <mesh position={[0, 0, -0.11]} castShadow receiveShadow>
                    <boxGeometry args={isCollapsed ? [3.4, 0.8, 0.2] : [3.4, 2.2, 0.2]} />
                    <meshStandardMaterial
                        color="#05080F"
                        roughness={0.2}
                        metalness={0.8}
                        emissive={isSelected ? color : '#000000'}
                        emissiveIntensity={isSelected ? 0.1 : 0}
                    />
                    <lineSegments>
                        <edgesGeometry args={[new THREE.BoxGeometry(3.4, isCollapsed ? 0.8 : 2.2, 0.2)]} />
                        <lineBasicMaterial color={isSelected ? color : '#374151'} transparent opacity={isSelected ? 1 : 0.3} />
                    </lineSegments>
                </mesh>

                {/* Tarjeta Flotante UI Rediseñada */}
                <Html position={[0, 0, 0]} transform center distanceFactor={10} style={{ pointerEvents: 'auto' }} zIndexRange={[100, 0]}>
                    <div
                        className={`relative w-[340px] bg-[#0A0D14]/95 rounded-2xl border border-gray-700/50 backdrop-blur-xl font-sans select-none overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.6)] flex flex-col transform transition-all duration-300 ${hovered ? 'scale-105' : ''}`}
                        onPointerDown={handlePointerDown}
                        onClick={handleClick}
                        style={{
                            boxShadow: isSelected ? `0 0 40px -10px ${color}40` : '0 0 30px -10px rgba(0,0,0,0.5)',
                            borderColor: isSelected ? `${color}40` : 'rgba(55,65,81,0.5)'
                        }}
                    >
                        {/* Header Compacto */}
                        <div className="flex items-center gap-3 p-4 pb-3 bg-gradient-to-r from-gray-900 via-gray-900/80 to-transparent border-b border-gray-800">
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                style={{
                                    backgroundColor: `${color}10`,
                                    border: `1px solid ${color}30`,
                                    boxShadow: `inset 0 0 10px ${color}10`
                                }}
                            >
                                <Cpu className="w-5 h-5" style={{ color: color, filter: `drop-shadow(0 0 5px ${color})` }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-white font-black text-lg tracking-tight truncate leading-tight uppercase">
                                    {node.data.label || 'Equipo'}
                                </h3>
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70 truncate" style={{ color: color }}>
                                    {node.data.type || 'SISTEMA'}
                                </p>
                            </div>
                            {isSelected && (
                                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color }}></div>
                            )}
                        </div>

                        {/* Body: Specs GRID Grande - Solo visible si NO está colapsado */}
                        {!isCollapsed && (
                            <div className="grid grid-cols-2 divide-x divide-gray-800 bg-[#0F1218]/50">
                                {/* Capacidad */}
                                <div className="p-4 flex flex-col justify-center relative group/cap hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-2 mb-0.5 opacity-60 group-hover/cap:opacity-100 transition-opacity">
                                        <Gauge className="w-3 h-3 text-gray-400" />
                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Capacidad</span>
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-black text-white leading-none tracking-tighter drop-shadow-lg w-full truncate">
                                            {node.data.capacity || '0'}
                                        </span>
                                        <span className="text-[10px] font-bold text-gray-500 absolute bottom-4 right-4">kg/h</span>
                                    </div>
                                </div>

                                {/* Consumo */}
                                <div className="p-4 flex flex-col justify-center relative group/pow hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-2 mb-0.5 opacity-60 group-hover/pow:opacity-100 transition-opacity">
                                        <Zap className="w-3 h-3 text-yellow-500" />
                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Potencia</span>
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-black text-white leading-none tracking-tighter drop-shadow-lg w-full truncate">
                                            {node.data.power || '0'}
                                        </span>
                                        <span className="text-[10px] font-bold text-gray-500 absolute bottom-4 right-4">kW</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Footer bar decorative */}
                        <div className="h-1 w-full relative overflow-hidden bg-gray-900">
                            <div className="absolute inset-0 opacity-50" style={{ backgroundColor: color }}></div>
                            <div className="absolute inset-0 w-1/2 h-full animate-[shimmer_2s_infinite]" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}></div>
                        </div>
                    </div>
                </Html>
            </group>
        </group>
    );
}

function EquipmentWrapper({ node, index, isSelected, onClick, onUpdate, onSetAnchorStart, isPickingAnchor, isCollapsed = false, heightOffset = 0 }) {
    const groupRef = useRef();
    const labelRef = useRef();
    const { controls } = useThree();

    return (
        <>
            <group
                ref={groupRef}
                position={[
                    node.data.position3D?.x ?? ((index % 5) * 3 - 6),
                    (node.data.position3D?.y ?? 0) + heightOffset,
                    node.data.position3D?.z ?? (Math.floor(index / 5) * 3 - 3)
                ]}
                rotation={node.data.rotation3D || [0, 0, 0]}
                scale={node.data.scale3D || [1, 1, 1]}
            >
                <Equipment3DModel
                    node={node}
                    index={index}
                    onClick={onClick}
                    isSelected={isSelected}
                    onSetAnchorStart={onSetAnchorStart}
                    isPickingAnchor={isPickingAnchor}
                    labelRef={labelRef}
                    isCollapsed={isCollapsed}
                />
            </group>

            {isSelected && !node.data.anchorPoint && (
                <TransformControls
                    object={groupRef}
                    mode="translate"
                    showX={true} showY={true} showZ={true}
                    size={0.8}
                    space="world"
                    onDraggingChanged={(event) => {
                        if (controls) controls.enabled = !event.value;
                    }}
                    onMouseUp={() => {
                        if (groupRef.current && onUpdate) {
                            const { position, rotation, scale } = groupRef.current;
                            onUpdate(node.id, {
                                position3D: { x: position.x, y: position.y, z: position.z },
                                rotation3D: [rotation.x, rotation.y, rotation.z],
                                scale3D: [scale.x, scale.y, scale.z]
                            });
                        }
                    }}
                />
            )}

            {isSelected && node.data.anchorPoint && (
                <TransformControls
                    object={labelRef}
                    mode="translate"
                    showX={true} showY={true} showZ={true}
                    size={1.0}
                    space="local"
                    onDraggingChanged={(event) => {
                        if (controls) controls.enabled = !event.value;
                    }}
                    onMouseUp={() => {
                        if (labelRef.current && onUpdate) {
                            const pos = labelRef.current.position;
                            onUpdate(node.id, {
                                labelPosition: { x: pos.x, y: pos.y, z: pos.z }
                            });
                        }
                    }}
                />
            )}
        </>
    );
}

export default EquipmentWrapper;
