import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import EquipmentWrapper from './Equipment3DModel';
import Connection3DArrow from './Connection3DArrow';
import LayoutLoader from './LayoutLoader';

function Flow3DViewer({ nodes, edges, onNodeClick, onNodeUpdate }) {
    const [layout, setLayout] = useState(null);
    const [selectedNodeId, setSelectedNodeId] = useState(null);

    // Validación de props
    if (!nodes || !Array.isArray(nodes)) {
        return (
            <div className="w-full h-full bg-deep flex items-center justify-center">
                <p className="text-gray-400">No hay equipos para visualizar</p>
            </div>
        );
    }

    const handleNodeClick = (e, node) => {
        // e.stopPropagation(); // Ya manejado en el componente hijo
        setSelectedNodeId(node.id);
        if (onNodeClick) onNodeClick(e, node);
    };

    const handleCanvasClick = (e) => {
        // Deseleccionar al hacer click en el fondo (si no es sobre un objeto)
        // Esto es truculento en R3F, mejor usar un botón de cerrar o click fuera
        setSelectedNodeId(null);
    };

    return (
        <div className="w-full h-full bg-deep relative">
            {/* Info overlay */}
            <div className="absolute top-4 left-4 z-10 backdrop-blur-xl bg-glass-light border border-glass-border rounded-xl p-3">
                <p className="text-xs text-gray-400">
                    <span className="text-neon-cyan font-bold">Vista 3D</span> • Digital Twin
                </p>
                <p className="text-[10px] text-gray-500 mt-1">
                    1. Carga tu entorno (Layout)
                    <br />
                    2. Selecciona un equipo para moverlo
                </p>
            </div>

            {/* Canvas 3D */}
            <Canvas
                shadows
                camera={{ position: [20, 20, 20], fov: 50 }}
                style={{ background: '#070A12' }}
                onPointerMissed={() => setSelectedNodeId(null)}
            >
                {/* Cámara */}
                <PerspectiveCamera makeDefault position={[20, 20, 20]} fov={50} />

                {/* Luces */}
                <ambientLight intensity={0.5} />
                <directionalLight
                    position={[10, 20, 10]}
                    intensity={1}
                    castShadow
                    shadow-mapSize={[2048, 2048]}
                />
                <pointLight position={[-10, 10, -10]} intensity={0.5} color="#00F0FF" />

                {/* Grid de piso (Opcional, si hay layout se puede ocultar) */}
                {!layout && <gridHelper args={[50, 50, '#8B5CF6', '#1e293b']} position={[0, -0.01, 0]} />}

                {/* Piso transparente para recibir sombras */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
                    <planeGeometry args={[100, 100]} />
                    <meshStandardMaterial color="#070A12" opacity={0.5} transparent />
                </mesh>

                {/* Loader de Layout (Entorno) */}
                {/* Renderizado dentro del Canvas para usar useLoader */}
                {/* Pero LayoutLoader tiene UI HTML, así que necesitamos una estructura mixta */}
                {/* LayoutLoader se encarga de renderizar el modelo dentro de si mismo */}
            </Canvas>

            {/* LayoutLoader y UI superpuesta */}
            {/* El componente LayoutLoader maneja su propia UI HTML y renderiza el modelo en el Canvas mediante un portal o contexto? */}
            {/* No, LayoutLoader debe estar FUERA del canvas para la UI, y DENTRO para el modelo... */}
            {/* Solución: LayoutLoader renderiza UI y pasa la URL a un componente interno del Canvas */}

            <div className="absolute inset-0 pointer-events-none">
                <div className="pointer-events-auto h-full w-full">
                    {/* Renderizamos Canvas DE NUEVO? No. */}
                    {/* Necesitamos que LayoutLoader sea hijo del div relativo padre, y controle el estado layout */}
                </div>
            </div>

            {/* Re-estructuración: */}
            {/* El Canvas está arriba. Ahora los hijos del Canvas: */}
        </div>
    );
}
// VOY A REESCRIBIR FLOW3DVIEWER CORRECTAMENTE ABAJO para manejar la composición UI/Canvas
