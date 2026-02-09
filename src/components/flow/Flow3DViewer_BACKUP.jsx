import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Equipment3DModel from './Equipment3DModel';
import Connection3DArrow from './Connection3DArrow';

function Flow3DViewer({ nodes, edges, onNodeClick }) {
    // Validación de props
    if (!nodes || !Array.isArray(nodes)) {
        return (
            <div className="w-full h-full bg-deep flex items-center justify-center">
                <p className="text-gray-400">No hay equipos para visualizar</p>
            </div>
        );
    }
    return (
        <div className="w-full h-full bg-deep relative">
            {/* Info overlay */}
            <div className="absolute top-4 left-4 z-10 backdrop-blur-xl bg-glass-light border border-glass-border rounded-xl p-3">
                <p className="text-xs text-gray-400">
                    <span className="text-neon-cyan font-bold">Vista 3D</span> • Digital Twin
                </p>
                <p className="text-[10px] text-gray-500 mt-1">
                    Click en equipos para ver detalles
                </p>
            </div>

            {/* Canvas 3D */}
            <Canvas
                camera={{ position: [15, 15, 15], fov: 50 }}
                style={{ background: '#070A12' }}
            >
                {/* Luces */}
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 20, 10]} intensity={1} />
                <pointLight position={[-10, 10, -10]} intensity={0.5} color="#00F0FF" />

                {/* Grid de piso */}
                <gridHelper args={[30, 30, '#8B5CF6', '#00F0FF']} />

                {/* Piso */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
                    <planeGeometry args={[100, 100]} />
                    <meshStandardMaterial color="#070A12" opacity={0.5} transparent />
                </mesh>

                {/* Equipos 3D */}
                {nodes.map((node, index) => (
                    <Equipment3DModel
                        key={node.id}
                        node={node}
                        index={index}
                        onClick={() => onNodeClick(null, node)}
                    />
                ))}

                {/* Conexiones 3D */}
                {edges.map(edge => (
                    <Connection3DArrow
                        key={edge.id}
                        edge={edge}
                        nodes={nodes}
                    />
                ))}

                {/* Controles de cámara */}
                <OrbitControls
                    enableDamping
                    dampingFactor={0.05}
                    minDistance={5}
                    maxDistance={50}
                    maxPolarAngle={Math.PI / 2}
                />
            </Canvas>

            {/* Controles de ayuda */}
            <div className="absolute bottom-4 right-4 z-10 backdrop-blur-xl bg-glass-light border border-glass-border rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-neon-cyan" />
                    <p className="text-[10px] text-gray-400">Click izq: Rotar</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-neon-purple" />
                    <p className="text-[10px] text-gray-400">Scroll: Zoom</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-neon-blue" />
                    <p className="text-[10px] text-gray-400">Click der: Pan</p>
                </div>
            </div>
        </div>
    );
}

export default Flow3DViewer;
