import React, { useState, useRef, Suspense, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { TransformControls, OrbitControls, PerspectiveCamera, Bounds, useBounds, Grid, Html } from '@react-three/drei';
import { Upload, FileUp, Move, RotateCw, Trash2, Maximize2, ZoomIn, ZoomOut, MousePointer2, Grip, Scan, Hand, Lock, Home, Maximize, Box, Layers, Tv, Link2, Activity, Minus, Video, Square, Camera, Circle, Play, Pause, RotateCcw, ChevronRight, ChevronLeft } from 'lucide-react';
import EquipmentWrapper from './Equipment3DModel';
import Connection3DArrow from './Connection3DArrow';
import LayoutControls, { LayoutModel } from './LayoutLoader';
import * as THREE from 'three';
import { process3DFile } from '@/utils/fileProcessor';
import { supabase } from '@/supabase';
import { useProject } from '@/context/ProjectContext';

// Componente para controlar la cámara (Vistas Predefinidas)
function ControlLimiter({ controlsRef }) {
    useFrame(({ camera }) => {
        if (controlsRef.current) {
            const controls = controlsRef.current;
            const target = controls.target;

            // 1. Limitar el desplazamiento del Pan (Ancla) - Radio más estricto (30m)
            const maxPan = 30;
            const distSq = target.x * target.x + target.z * target.z;
            if (distSq > maxPan * maxPan) {
                const scale = maxPan / Math.sqrt(distSq);
                target.x *= scale;
                target.z *= scale;
            }

            // 2. Limitar verticalmente para no perder el suelo
            // Evitar ir demasiado abajo (underground) o muy arriba
            target.y = THREE.MathUtils.clamp(target.y, -2, 10);

            // 3. Seguridad extra: Evitar que la cámara se aleje infinito
            const maxCamDist = 80;
            const camDist = camera.position.length();
            if (camDist > maxCamDist) {
                camera.position.setLength(maxCamDist);
            }

            // 4. Piso estricto para la cámara
            if (camera.position.y < 0.5) camera.position.y = 0.5;
        }
    });
    return null;
}

function CameraManager({ resetTrigger }) {
    const { camera } = useThree();
    const bounds = useBounds(); // Hook bounds para Reset inteligente
    const controls = useThree((state) => state.controls);

    const animateView = useCallback((pos) => {
        camera.position.set(...pos);
        camera.lookAt(0, 0, 0);
        if (controls) {
            controls.target.set(0, 0, 0);
            controls.update();
        }
    }, [camera, controls]);

    // Efecto para escuchar el trigger externo
    useEffect(() => {
        if (resetTrigger > 0) {
            if (bounds) {
                bounds.refresh().clip().fit();
            } else {
                animateView([20, 20, 20]);
            }
        }
    }, [resetTrigger, bounds, animateView]);

    return (
        <Html fullscreen style={{ pointerEvents: 'none' }} zIndexRange={[100, 0]}>
            <div className="absolute top-24 right-6 flex flex-col gap-3 pointer-events-auto">
                <div className="bg-gray-900/90 backdrop-blur-md p-2 rounded-xl border border-gray-700 shadow-xl flex flex-col gap-2">
                    <button
                        onClick={() => {
                            if (bounds) {
                                bounds.refresh().clip().fit();
                            } else {
                                animateView([20, 20, 20]);
                            }
                        }}
                        className="p-2 hover:bg-gray-700/50 rounded-lg text-gray-400 hover:text-neon-cyan transition-colors group flex items-center gap-2 border-b border-gray-700/50 mb-1"
                        title="Centrar Vista (Reset)"
                    >
                        <Home className="w-5 h-5" />
                        <span className="text-[10px] font-bold hidden group-hover:block text-white">RESET</span>
                    </button>
                    <button
                        onClick={() => animateView([15, 15, 15])}
                        className="p-2 hover:bg-gray-700/50 rounded-lg text-gray-400 hover:text-neon-cyan transition-colors group flex items-center gap-2"
                        title="Vista Isométrica"
                    >
                        <Box className="w-5 h-5" />
                        <span className="text-[10px] font-bold hidden group-hover:block text-white">ISO</span>
                    </button>
                    <button
                        onClick={() => animateView([0, 20, 0.01])}
                        className="p-2 hover:bg-gray-700/50 rounded-lg text-gray-400 hover:text-neon-cyan transition-colors group flex items-center gap-2"
                        title="Vista Superior"
                    >
                        <Layers className="w-5 h-5" />
                        <span className="text-[10px] font-bold hidden group-hover:block text-white">TOP</span>
                    </button>
                    <button
                        onClick={() => animateView([20, 5, 20])}
                        className="p-2 hover:bg-gray-700/50 rounded-lg text-gray-400 hover:text-neon-cyan transition-colors group flex items-center gap-2"
                        title="Vista Lateral"
                    >
                        <Tv className="w-5 h-5" />
                        <span className="text-[10px] font-bold hidden group-hover:block text-white">LAT</span>
                    </button>
                </div>
            </div>
        </Html>
    );
}

// Componente para resolver coordenadas de drop 3D
function DropResolver({ pendingDrop, onClear, onDrop3D }) {
    const { camera, raycaster } = useThree();

    useEffect(() => {
        if (pendingDrop) {
            const canvas = document.querySelector('canvas');
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                const mouse = new THREE.Vector2(
                    ((pendingDrop.x - rect.left) / rect.width) * 2 - 1,
                    -((pendingDrop.y - rect.top) / rect.height) * 2 + 1
                );

                raycaster.setFromCamera(mouse, camera);
                const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // Plano Y=0
                const target = new THREE.Vector3();
                raycaster.ray.intersectPlane(plane, target);

                if (target && onDrop3D) {
                    onDrop3D(pendingDrop.data, { x: target.x, y: 0, z: target.z });
                }
            }
            onClear();
        }
    }, [pendingDrop, camera, raycaster, onDrop3D, onClear]);
    return null;
}

// Componente para Control de Cámara via Botones/Teclado
function CameraKeyboardControls({ orbitRef }) {
    // Función para mover la cámara
    const moveCamera = useCallback((action) => {
        if (!orbitRef.current) return;
        const controls = orbitRef.current;
        const speed = 2; // Velocidad de panning
        const rotSpeed = 0.1; // Velocidad de rotación
        const zoomSpeed = 2;

        switch (action) {
            // Panning (Mover objetivo y cámara)
            case 'PAN_LEFT': // A
                controls.target.x -= speed;
                controls.object.position.x -= speed;
                break;
            case 'PAN_RIGHT': // D
                controls.target.x += speed;
                controls.object.position.x += speed;
                break;
            case 'PAN_UP': // W
                controls.target.z -= speed;
                controls.object.position.z -= speed;
                break;
            case 'PAN_DOWN': // S
                controls.target.z += speed;
                controls.object.position.z += speed;
                break;
            // Rotación
            case 'ROT_LEFT': // Q
                controls.setAzimuthalAngle(controls.getAzimuthalAngle() + rotSpeed);
                break;
            case 'ROT_RIGHT': // E
                controls.setAzimuthalAngle(controls.getAzimuthalAngle() - rotSpeed);
                break;
            // Zoom
            case 'ZOOM_IN': // +
                if (controls.object.zoom) { // Orthographic
                    controls.object.zoom = Math.min(controls.object.zoom + 0.1, 5);
                    controls.object.updateProjectionMatrix();
                } else { // Perspective (dolly in)
                    const vec = new THREE.Vector3().copy(controls.object.position).sub(controls.target);
                    vec.setLength(Math.max(vec.length() - zoomSpeed, 5));
                    controls.object.position.copy(controls.target).add(vec);
                }
                break;
            case 'ZOOM_OUT': // -
                if (controls.object.zoom) {
                    controls.object.zoom = Math.max(controls.object.zoom - 0.1, 0.1);
                    controls.object.updateProjectionMatrix();
                } else {
                    const vec = new THREE.Vector3().copy(controls.object.position).sub(controls.target);
                    vec.setLength(Math.min(vec.length() + zoomSpeed, 100));
                    controls.object.position.copy(controls.target).add(vec);
                }
                break;
        }
        controls.update();
    }, [orbitRef]);

    // Listener de Teclado
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignorar si el usuario escribe en un input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch (e.key.toLowerCase()) {
                case 'a': moveCamera('PAN_LEFT'); break;
                case 'd': moveCamera('PAN_RIGHT'); break;
                case 'w': moveCamera('PAN_UP'); break;
                case 's': moveCamera('PAN_DOWN'); break;
                case 'q': moveCamera('ROT_LEFT'); break;
                case 'e': moveCamera('ROT_RIGHT'); break;
                case '+': moveCamera('ZOOM_IN'); break;
                case '-': moveCamera('ZOOM_OUT'); break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [moveCamera]);

    // Estado para posición del panel (Default: Left-Middle area)
    const [panelPos, setPanelPos] = useState({ x: 20, y: window.innerHeight - 300 }); // Default Left
    const isDraggingRef = useRef(false);
    const dragOffsetRef = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e) => {
        e.stopPropagation(); // Stop orbit controls from catching this
        if (e.target.closest('button')) return;
        isDraggingRef.current = true;
        dragOffsetRef.current = {
            x: e.clientX - panelPos.x,
            y: e.clientY - panelPos.y
        };
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDraggingRef.current) {
                setPanelPos({
                    x: e.clientX - dragOffsetRef.current.x,
                    y: e.clientY - dragOffsetRef.current.y
                });
            }
        };
        const handleMouseUp = () => {
            isDraggingRef.current = false;
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    return (
        <Html fullscreen style={{ pointerEvents: 'none' }} zIndexRange={[100, 0]}>
            <div
                className="absolute flex flex-col gap-2 pointer-events-auto items-center p-4 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 cursor-move shadow-2xl"
                style={{ left: panelPos.x, top: panelPos.y }}
                onMouseDown={handleMouseDown}
            >
                <div className="flex items-center gap-2 mb-1">
                    <Move className="w-3 h-3 text-gray-500" />
                    <span className="text-[10px] uppercase font-bold text-neon-cyan tracking-widest select-none">Cam Control</span>
                </div>

                {/* Primera Fila: Zoom & Rotar */}
                <div className="flex gap-2 mb-2">
                    <button onClick={() => moveCamera('ROT_LEFT')} className="w-10 h-10 bg-gray-800 rounded-lg border border-gray-600 hover:bg-neon-cyan/20 hover:border-neon-cyan text-white flex flex-col items-center justify-center transition-all group" title="Rotar Izquierda (Q)">
                        <RotateCcw className="w-4 h-4 mb-[2px]" />
                        <span className="text-[8px] font-mono text-gray-400 group-hover:text-neon-cyan font-bold">Q</span>
                    </button>
                    <div className="flex flex-col gap-1">
                        <button onClick={() => moveCamera('ZOOM_IN')} className="w-10 h-8 bg-gray-800 rounded-t-lg border border-gray-600 hover:bg-neon-cyan/20 hover:border-neon-cyan text-white flex items-center justify-center transition-all group" title="Acercar (+)">
                            <ZoomIn className="w-4 h-4" />
                        </button>
                        <button onClick={() => moveCamera('ZOOM_OUT')} className="w-10 h-8 bg-gray-800 rounded-b-lg border border-gray-600 hover:bg-neon-cyan/20 hover:border-neon-cyan text-white flex items-center justify-center transition-all group" title="Alejar (-)">
                            <ZoomOut className="w-4 h-4" />
                        </button>
                    </div>
                    <button onClick={() => moveCamera('ROT_RIGHT')} className="w-10 h-10 bg-gray-800 rounded-lg border border-gray-600 hover:bg-neon-cyan/20 hover:border-neon-cyan text-white flex flex-col items-center justify-center transition-all group" title="Rotar Derecha (E)">
                        <RotateCw className="w-4 h-4 mb-[2px]" />
                        <span className="text-[8px] font-mono text-gray-400 group-hover:text-neon-cyan font-bold">E</span>
                    </button>
                </div>

                {/* Segunda Fila: Dirección (WASD) */}
                <div className="flex flex-col items-center gap-1">
                    <button onClick={() => moveCamera('PAN_UP')} className="w-10 h-10 bg-gray-800 rounded-lg border border-gray-600 hover:bg-neon-cyan/20 hover:border-neon-cyan text-white flex flex-col items-center justify-center transition-all group" title="Mover Arriba (W)">
                        <ChevronLeft className="w-4 h-4 rotate-90 mb-[2px]" />
                        <span className="text-[8px] font-mono text-gray-400 group-hover:text-neon-cyan font-bold">W</span>
                    </button>
                    <div className="flex gap-1">
                        <button onClick={() => moveCamera('PAN_LEFT')} className="w-10 h-10 bg-gray-800 rounded-lg border border-gray-600 hover:bg-neon-cyan/20 hover:border-neon-cyan text-white flex flex-col items-center justify-center transition-all group" title="Mover Izquierda (A)">
                            <ChevronLeft className="w-4 h-4 mb-[2px]" />
                            <span className="text-[8px] font-mono text-gray-400 group-hover:text-neon-cyan font-bold">A</span>
                        </button>
                        <div className="w-10 h-10"></div> {/* Espacio Central Vacío */}
                        <button onClick={() => moveCamera('PAN_RIGHT')} className="w-10 h-10 bg-gray-800 rounded-lg border border-gray-600 hover:bg-neon-cyan/20 hover:border-neon-cyan text-white flex flex-col items-center justify-center transition-all group" title="Mover Derecha (D)">
                            <ChevronRight className="w-4 h-4 mb-[2px]" />
                            <span className="text-[8px] font-mono text-gray-400 group-hover:text-neon-cyan font-bold">D</span>
                        </button>
                    </div>
                    <button onClick={() => moveCamera('PAN_DOWN')} className="w-10 h-10 bg-gray-800 rounded-lg border border-gray-600 hover:bg-neon-cyan/20 hover:border-neon-cyan text-white flex flex-col items-center justify-center transition-all group" title="Mover Abajo (S)">
                        <ChevronRight className="w-4 h-4 rotate-90 mb-[2px]" />
                        <span className="text-[8px] font-mono text-gray-400 group-hover:text-neon-cyan font-bold">S</span>
                    </button>
                </div>
            </div>
        </Html>
    );
}

// Componente para manejar Joystick dentro del Canvas
function CameraJoystickHandler({ orbitRef }) {
    const movement = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const handleMove = (e) => {
            movement.current = e.detail;
        };
        window.addEventListener('joystick-move', handleMove);
        return () => window.removeEventListener('joystick-move', handleMove);
    }, []);

    useFrame(() => {
        if (!orbitRef.current) return;

        const { x, y } = movement.current;
        if (Math.abs(x) > 0.01 || Math.abs(y) > 0.01) {
            const speed = 0.03;
            orbitRef.current.setAzimuthalAngle(orbitRef.current.getAzimuthalAngle() - x * speed);
            orbitRef.current.setPolarAngle(orbitRef.current.getPolarAngle() - y * speed);
            orbitRef.current.update();
        }
    });
    return null;
}

// Joystick Virtual Simple
const VirtualJoystick = ({ onMove }) => {
    const containerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    const handleStart = (clientX, clientY) => {
        setIsDragging(true);
        updatePosition(clientX, clientY);
    };

    const handleEnd = () => {
        setIsDragging(false);
        setPosition({ x: 0, y: 0 });
        if (onMove) onMove({ x: 0, y: 0 });
    };

    const handleMove = (clientX, clientY) => {
        if (!isDragging) return;
        updatePosition(clientX, clientY);
    };

    const updatePosition = (clientX, clientY) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const maxDist = rect.width / 2 - 20;

        let dx = clientX - centerX;
        let dy = clientY - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > maxDist) {
            const angle = Math.atan2(dy, dx);
            dx = Math.cos(angle) * maxDist;
            dy = Math.sin(angle) * maxDist;
        }

        setPosition({ x: dx, y: dy });
        if (onMove) onMove({ x: dx / maxDist, y: dy / maxDist });
    };

    return (
        <div
            ref={containerRef}
            className="w-32 h-32 bg-black/30 backdrop-blur-md rounded-full border border-white/10 relative touch-none pointer-events-auto shadow-xl"
            onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
            onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
        >
            <div
                className="w-12 h-12 bg-neon-cyan/80 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_15px_rgba(0,240,255,0.5)] cursor-grab active:cursor-grabbing hover:bg-neon-cyan"
                style={{ transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))` }}
            />
            {isDragging && (
                <div
                    className="fixed inset-0 z-50 cursor-grabbing"
                    onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
                    onMouseUp={handleEnd}
                    onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
                    onTouchEnd={handleEnd}
                />
            )}
        </div>
    );
};

// Componente interno para manejar la transformación del layout
function LayoutWrapper({ layout, scale, elevation, fxEnabled, isSelected, onUpdate, mode = 'translate' }) {
    const groupRef = React.useRef();
    const { controls } = useThree();

    React.useLayoutEffect(() => {
        if (groupRef.current && layout) {
            if (layout.position) groupRef.current.position.set(...layout.position);
            if (layout.rotation) groupRef.current.rotation.set(...layout.rotation);
            if (layout.scale) groupRef.current.scale.setScalar(layout.scale);
        }
    }, [layout]);

    if (!layout) return null;

    return (
        <>
            <group ref={groupRef}>
                {/* Grid secundario que se mueve con el modelo */}
                <Grid
                    position={[0, -0.02, 0]}
                    args={[50, 50]}
                    cellSize={1}
                    cellThickness={0.5}
                    cellColor="#1a4d4d"
                    sectionSize={5}
                    sectionThickness={1}
                    sectionColor="#00F0FF"
                    fadeDistance={60}
                    fadeStrength={1}
                />

                {/* Indicador visual de área del layout */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
                    <ringGeometry args={[8, 8.2, 64]} />
                    <meshBasicMaterial color="#00F0FF" transparent opacity={0.3} side={THREE.DoubleSide} />
                </mesh>

                <LayoutModel layout={layout} scale={scale} elevation={elevation} fxEnabled={fxEnabled} />
            </group>

            {isSelected && (
                <TransformControls
                    object={groupRef}
                    mode={mode}
                    onDraggingChanged={(event) => {
                        if (controls) controls.enabled = !event.value;
                    }}
                    onMouseUp={() => {
                        if (onUpdate && groupRef.current) {
                            onUpdate({
                                position: groupRef.current.position.toArray(),
                                rotation: groupRef.current.rotation.toArray(),
                                scale: groupRef.current.scale.x
                            });
                        }
                    }}
                />
            )}
        </>
    );
}

function Flow3DViewer({ nodes = [], edges = [], onNodeClick, onNodeUpdate, fxEnabled: propFxEnabled, onFxChange, isControlsOpen, onControlsOpenChange, onNodeDrop, placingEquipment, onEquipmentPlaced, pickingAnchorNodeId, onPickingAnchorChange, onConnect, resetCameraTrigger, labelsCollapsed = false, labelHeightOffset = 0, layout: propLayout = null, onLayoutChange, isFullScreen = false, onFullScreenChange }) {
    let projectId = null;
    try {
        const projectCtx = useProject();
        projectId = projectCtx?.projectId;
    } catch (e) {
        // Fallback
    }

    // Use prop layout if provided, otherwise internal state
    const [internalLayout, setInternalLayout] = useState(propLayout);
    const layout = propLayout !== undefined ? propLayout : internalLayout;
    const setLayout = onLayoutChange || setInternalLayout;

    const [layoutScale, setLayoutScale] = useState(propLayout?.scale || 1);
    const [layoutElevation, setLayoutElevation] = useState(propLayout?.elevation || 0);
    const [layoutFx, setLayoutFx] = useState(propFxEnabled || false);
    const [cameraMode, setCameraMode] = useState('rotate');

    // Sync propLayout when it changes (e.g., loading a saved design)
    // Sync propLayout when it changes (e.g., loading a saved design)
    React.useEffect(() => {
        if (propLayout !== undefined) {
            setInternalLayout(propLayout);
            if (propLayout?.scale) setLayoutScale(propLayout.scale);
            if (propLayout?.elevation !== undefined) setLayoutElevation(propLayout.elevation);
        }
    }, [propLayout]);


    const [isDraggingFile, setIsDraggingFile] = useState(false);
    const [error, setError] = useState(null);
    const orbitRef = useRef();
    const [pendingDrop, setPendingDrop] = useState(null);

    // Nuevo estado para conexiones
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionSourceId, setConnectionSourceId] = useState(null);
    const [connectionStyle, setConnectionStyle] = useState('curved'); // 'curved' | 'straight'

    // --- GRABACIÓN: CROP BOX STATE ---
    // Inicializar CropBox casi al tamaño completo de la pantalla para evitar "zoom por defecto"
    const [cropBox, setCropBox] = useState({
        x: window.innerWidth * 0.05,
        y: window.innerHeight * 0.05,
        width: window.innerWidth * 0.9,
        height: window.innerHeight * 0.9
    });
    const cropBoxRef = useRef(cropBox);
    const isDraggingBoxRef = useRef(false);
    const isResizingBoxRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0 });

    useEffect(() => { cropBoxRef.current = cropBox; }, [cropBox]);

    useEffect(() => {
        const handleIoTMouseMove = (e) => {
            if (isDraggingBoxRef.current) {
                const dx = e.clientX - dragStartRef.current.x;
                const dy = e.clientY - dragStartRef.current.y;
                setCropBox(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
                dragStartRef.current = { x: e.clientX, y: e.clientY };
            }
            if (isResizingBoxRef.current) {
                const dx = e.clientX - dragStartRef.current.x;
                const dy = e.clientY - dragStartRef.current.y;
                setCropBox(prev => ({
                    ...prev,
                    width: Math.max(200, prev.width + dx),
                    height: Math.max(100, prev.height + dy)
                }));
                dragStartRef.current = { x: e.clientX, y: e.clientY };
            }
        };
        const handleIoTMouseUp = () => {
            isDraggingBoxRef.current = false;
            isResizingBoxRef.current = false;
        };

        window.addEventListener('mousemove', handleIoTMouseMove);
        window.addEventListener('mouseup', handleIoTMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleIoTMouseMove);
            window.removeEventListener('mouseup', handleIoTMouseUp);
        };
    }, []);

    React.useEffect(() => {
        if (propFxEnabled !== undefined) {
            setLayoutFx(propFxEnabled);
        }
    }, [propFxEnabled]);

    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [isLayoutSelected, setIsLayoutSelected] = useState(false);
    const [transformMode, setTransformMode] = useState('translate');
    const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false); // Nueva pestaña para cerrar marco

    const handleLayoutChange = useCallback((newLayout, newScale, newElevation) => {
        setError(null);
        if (newLayout === null) {
            setLayout(null);
            setLayoutScale(1);
            setLayoutElevation(0);
            setLayoutFx(false);
        } else {
            if (newLayout && (!layout || layout.url !== newLayout.url)) {
                setLayout(newLayout);
            }
            if (newScale !== undefined) setLayoutScale(newScale);
            if (newElevation !== undefined) setLayoutElevation(newElevation);
        }
    }, [layout]);

    const handleFxChange = useCallback((newFx) => {
        setLayoutFx(newFx);
        if (onFxChange) onFxChange(newFx);
    }, [onFxChange]);

    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsLayoutSelected(false);
                setSelectedNodeId(null);
                setIsConnecting(false);
                setConnectionSourceId(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleNodeClick = (e, node) => {
        if (placingEquipment) return;

        // Lógica de Conexión 3D
        if (isConnecting) {
            e.stopPropagation();
            if (!connectionSourceId) {
                setConnectionSourceId(node.id);
            } else {
                if (node.id !== connectionSourceId && onConnect) {
                    onConnect({
                        source: connectionSourceId,
                        target: node.id,
                        sourceHandle: null,
                        targetHandle: null,
                    });
                }
                setConnectionSourceId(null);
                setIsConnecting(false); // Salir del modo tras conectar
            }
            return;
        }

        setSelectedNodeId(node.id);
        if (onNodeClick) onNodeClick(e, node);
    };

    const handleNodeUpdate = (nodeId, newData) => {
        if (onNodeUpdate) {
            onNodeUpdate(nodeId, newData);
        }
    };

    React.useEffect(() => {
        const preventDefault = (e) => {
            e.preventDefault();
        };
        window.addEventListener('dragover', preventDefault, { capture: true });
        window.addEventListener('drop', preventDefault, { capture: true });
        return () => {
            window.removeEventListener('dragover', preventDefault, { capture: true });
            window.removeEventListener('drop', preventDefault, { capture: true });
        };
    }, []);

    const handleDragEnter = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingFile(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget.contains(e.relatedTarget)) return;
        setIsDraggingFile(false);
    }, []);

    const handleFileProcess = useCallback(async (file) => {
        if (!file) return;
        try {
            setError(null);

            // First, process the file for immediate preview
            const layoutData = await process3DFile(file);

            // Upload to Supabase Storage for persistence
            const fileName = `layouts/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('assets')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                console.warn('Could not upload to Supabase, using local blob:', uploadError);
                // Still use the local blob for preview
                handleLayoutChange(layoutData, 1, 0);
            } else {
                // Get the public URL for the uploaded file
                const { data: { publicUrl } } = supabase.storage
                    .from('assets')
                    .getPublicUrl(fileName);

                // Create layout data with permanent URL
                const persistentLayout = {
                    ...layoutData,
                    url: publicUrl,
                    storagePath: fileName,
                    fileName: file.name
                };

                // Register layout in project_artifacts_beta library so it is shared!
                const ext = file.name.split('.').pop().toLowerCase();
                const artifactPayload = {
                    project_id: projectId || null,
                    type: 'layout',
                    title: file.name,
                    data: {
                        url: publicUrl,
                        type: ext,
                        name: file.name.replace(/\.[^/.]+$/, ""),
                        scale: 1,
                        elevation: 0,
                        fileName: file.name,
                        storagePath: fileName,
                        uploadedAt: new Date().toISOString()
                    }
                };

                const { error: dbError } = await supabase
                    .from('project_artifacts_beta')
                    .insert([artifactPayload]);

                if (dbError) {
                    console.error('[Flow3DViewer] Failed to register artifact:', dbError);
                }

                handleLayoutChange(persistentLayout, 1, 0);
                console.log('[Flow3D] Layout uploaded to Supabase & registered in library:', publicUrl);
            }
        } catch (err) {
            console.error("Error cargando archivo:", err);
            setError(err.message);
            alert(`Error: ${err.message}`);
        }
    }, [handleLayoutChange, projectId]);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingFile(false);

        const reactFlowData = e.dataTransfer.getData('application/reactflow');
        if (reactFlowData) {
            try {
                const data = JSON.parse(reactFlowData);
                setPendingDrop({
                    x: e.clientX,
                    y: e.clientY,
                    data: data
                });
                return;
            } catch (err) { console.error(err); }
        }

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileProcess(file);
        }
    }, [handleFileProcess]);

    // Video Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isPreparing, setIsPreparing] = useState(false); // Nuevo estado: Preparando
    const [isStabilized, setIsStabilized] = useState(false); // Estabilizador (Cinematic Mode)
    const [recordingTime, setRecordingTime] = useState("00:00");
    const recordingStartRef = useRef(null);
    const accumulatedTimeRef = useRef(0);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    // Timer Logic for Recording
    useEffect(() => {
        let interval;
        if (isRecording && !isPaused) {
            recordingStartRef.current = Date.now();
            interval = setInterval(() => {
                const elapsed = Date.now() - recordingStartRef.current + accumulatedTimeRef.current;
                const seconds = Math.floor(elapsed / 1000);
                const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
                const ss = String(seconds % 60).padStart(2, '0');
                setRecordingTime(`${mm}:${ss}`);
            }, 1000);
        } else if (!isRecording) {
            setRecordingTime("00:00");
            accumulatedTimeRef.current = 0;
        }
        return () => clearInterval(interval);
    }, [isRecording, isPaused]);

    const handlePrepareRecording = useCallback(async () => {
        try {
            // 1. Obtener stream nativo (Pantalla COMPLETA o Pestaña)
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    displaySurface: "browser",
                    width: { ideal: 3840, max: 3840 },
                    height: { ideal: 2160, max: 2160 },
                    frameRate: { ideal: 60 }
                },
                audio: false
            });

            // 2. Preparar motor de CROP (Recorte)
            const video = document.createElement('video');
            video.srcObject = displayStream;
            video.muted = true;
            await video.play();

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Render Loop: Copiar de Video -> Canvas (Solo la región del CropBox)
            const draw = () => {
                if (video.paused || video.ended) return;

                const scaleX = video.videoWidth / window.innerWidth;
                const scaleY = video.videoHeight / window.innerHeight;

                const { x, y, width, height } = cropBoxRef.current;

                // Margen de seguridad para recortar "dentro" del borde rojo y no grabarlo
                // El borde es de aprox 2-4px. Usamos 6px para estar seguros.
                const cropMargin = 6;

                const sourceX = (x + cropMargin) * scaleX;
                const sourceY = (y + cropMargin) * scaleY;
                const sourceW = (width - (cropMargin * 2)) * scaleX;
                const sourceH = (height - (cropMargin * 2)) * scaleY;

                if (canvas.width !== Math.floor(sourceW) || canvas.height !== Math.floor(sourceH)) {
                    canvas.width = Math.floor(sourceW);
                    canvas.height = Math.floor(sourceH);
                }

                ctx.drawImage(
                    video,
                    sourceX, sourceY, sourceW, sourceH,
                    0, 0, canvas.width, canvas.height
                );

                requestAnimationFrame(draw);
            };
            draw();

            // 3. Generar Stream desde el Canvas recortado
            const croppedStream = canvas.captureStream(60);

            const mimeType = MediaRecorder.isTypeSupported('video/mp4; codecs="avc1.42E01E, mp4a.40.2"')
                ? 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'
                : (MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm');

            const recorder = new MediaRecorder(croppedStream, { mimeType, videoBitsPerSecond: 25000000 });

            chunksRef.current = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                if (chunksRef.current.length === 0) return;

                const blob = new Blob(chunksRef.current, { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
                a.download = `pandora_crop_capture_${Date.now()}.${ext}`;
                a.click();
                URL.revokeObjectURL(url);

                // Limpieza Profunda
                displayStream.getTracks().forEach(track => track.stop()); // Detener stream original
                video.pause();
                video.srcObject = null;
                // video.remove(); // No es necesario si no se agregó al DOM
                setIsRecording(false);
                setIsPreparing(false);
                mediaRecorderRef.current = null;
            };

            // Manejar si el usuario deja de compartir desde el navegador
            displayStream.getVideoTracks()[0].onended = () => {
                if (recorder && recorder.state !== 'inactive') recorder.stop();
            };

            mediaRecorderRef.current = recorder;
            setIsPreparing(true);

        } catch (e) {
            console.error("Recording error:", e);
        }
    }, []);

    const handleStartRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
            mediaRecorderRef.current.start();
            setIsRecording(true);
            setIsPaused(false);
            setIsPreparing(false);
            accumulatedTimeRef.current = 0;
            recordingStartRef.current = Date.now();
        }
    }, []);

    const handlePauseRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.pause();
            setIsPaused(true);
            accumulatedTimeRef.current += Date.now() - recordingStartRef.current;
        }
    }, []);

    const handleResumeRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
            mediaRecorderRef.current.resume();
            setIsPaused(false);
            recordingStartRef.current = Date.now();
        }
    }, []);

    const handleStopRecording = useCallback(() => {
        if (mediaRecorderRef.current && (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused')) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsPaused(false);
            setIsPreparing(false);
        }
    }, []);

    // Handle Video Recording
    const handleToggleRecording = useCallback(async () => {
    }, [isRecording]);

    if (!nodes || !Array.isArray(nodes)) {
        return (
            <div className="w-full h-full bg-deep flex items-center justify-center">
                <p className="text-gray-400">No hay equipos para visualizar</p>
            </div>
        );
    }

    return (
        <div
            className={`w-full h-full bg-deep relative transition-all duration-300 ${isRecording ? 'border-[6px] border-red-500 shadow-[inset_0_0_50px_rgba(239,68,68,0.5)]' : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
        >
            <LayoutControls
                onLayoutChange={handleLayoutChange}
                currentLayout={layout}
                currentScale={layoutScale}
                currentElevation={layoutElevation}
                currentFx={layoutFx}
                onFxChange={handleFxChange}
            />

            {!isToolbarCollapsed && (
                <div className="absolute top-4 left-4 z-10 backdrop-blur-xl bg-glass-light border border-glass-border rounded-xl p-3 pointer-events-none">
                    <p className="text-xs text-gray-400">
                        <span className="text-neon-cyan font-bold">Vista 3D</span> • Digital Twin
                    </p>
                </div>
            )}

            {/* 1. Aviso de Pantalla Completa Requerida (Si está preparando pero no en FullScreen) */}
            {isPreparing && !isFullScreen && (
                <div className="absolute inset-0 z-[100] bg-[#070A12]/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-white pointer-events-auto">
                    <div className="max-w-2xl w-full bg-[#0A0D14] border border-white/5 rounded-[40px] p-12 shadow-[0_0_100px_rgba(0,0,0,1)] text-center relative overflow-hidden">
                        {/* Background Decor */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-neon-cyan/5 blur-[100px] -mr-32 -mt-32" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-neon-purple/5 blur-[100px] -ml-32 -mb-32" />

                        <div className="w-24 h-24 bg-neon-cyan/10 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-12">
                            <Camera className="w-12 h-12 text-neon-cyan" />
                        </div>

                        <h2 className="text-4xl font-black mb-6 tracking-tight uppercase bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
                            Configuración de Estudio
                        </h2>

                        <div className="space-y-6 text-left mb-10 bg-white/5 p-6 rounded-2xl border border-white/5">
                            <div className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-neon-cyan/20 text-neon-cyan flex items-center justify-center text-xs font-bold shrink-0">1</div>
                                <p className="text-gray-300 text-sm">Al dar clic en <span className="text-white font-bold">Pantalla Completa</span>, el navegador te preguntará qué compartir.</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-neon-cyan/20 text-neon-cyan flex items-center justify-center text-xs font-bold shrink-0">2</div>
                                <p className="text-gray-300 text-sm">Selecciona <span className="text-white font-bold">"Ventana"</span> o <span className="text-neon-cyan font-bold">"Pestaña de PANDORA"</span> para capturar solo el área 3D sin el resto de tu escritorio.</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-neon-cyan/20 text-neon-cyan flex items-center justify-center text-xs font-bold shrink-0">3</div>
                                <p className="text-gray-300 text-sm">Asegúrate de ocultar la barra de compartir que aparecerá abajo para no estropear tu video.</p>
                            </div>
                        </div>

                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => {
                                    setIsPreparing(false);
                                    if (mediaRecorderRef.current) {
                                        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
                                    }
                                    mediaRecorderRef.current = null;
                                }}
                                className="px-8 py-4 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 hover:text-white font-bold transition-all uppercase text-xs tracking-widest"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => onFullScreenChange(true)}
                                className="px-10 py-4 rounded-2xl bg-neon-cyan text-black font-black hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(0,240,255,0.4)] transition-all flex items-center gap-3 uppercase text-xs tracking-widest"
                            >
                                <Maximize className="w-5 h-5" />
                                Entrar al Estudio
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* UI MASTER: CONTROL DE ESCENA & GRABACIÓN (Unificado Lateral Derecho) */}
            {(isPreparing || isRecording) && (
                <>
                    {/* STUDIO FRAME: EL AREA DE GRABACIÓN REAL */}
                    {/* STUDIO FRAME: INTERACTIVE CROP BOX */}
                    <div
                        className={`absolute z-[150] transition-colors duration-300 group
                            ${isRecording ? 'pointer-events-none' : 'pointer-events-auto cursor-move'}
                        `}
                        style={{
                            left: cropBox.x,
                            top: cropBox.y,
                            width: cropBox.width,
                            height: cropBox.height,
                        }}
                        onMouseDown={(e) => !isRecording && ((e.stopPropagation(), e.preventDefault(), dragStartRef.current = { x: e.clientX, y: e.clientY }, isDraggingBoxRef.current = true))}
                    >
                        {/* BORDES VISUALES */}
                        <div className={`absolute inset-0 border-2 ${isRecording ? 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.5)]' : 'border-neon-cyan/50 border-dashed group-hover:border-neon-cyan'}`} />

                        {/* Esquinas del Marco */}
                        <div className={`absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 ${isRecording ? 'border-red-500' : 'border-neon-cyan'}`} />
                        <div className={`absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 ${isRecording ? 'border-red-500' : 'border-neon-cyan'}`} />
                        <div className={`absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 ${isRecording ? 'border-red-500' : 'border-neon-cyan'}`} />

                        {/* Resize Handle (Solo esquina inferior derecha) */}
                        {!isRecording && (
                            <div
                                className="absolute -bottom-2 -right-2 w-8 h-8 bg-neon-cyan cursor-se-resize flex items-center justify-center rounded-br-lg shadow-lg hover:scale-110 transition-transform z-[160]"
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    dragStartRef.current = { x: e.clientX, y: e.clientY };
                                    isResizingBoxRef.current = true;
                                }}
                            >
                                <Maximize2 className="w-4 h-4 text-black rotate-90" />
                            </div>
                        )}

                        {/* Indicador de "Rec Zone" */}
                        <div className="absolute -top-8 left-0 flex items-center gap-2 bg-black/50 backdrop-blur px-3 py-1 rounded-full border border-white/10">
                            <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-neon-cyan'}`} />
                            <span className="text-[10px] uppercase font-black tracking-widest text-white/80">
                                {Math.round(cropBox.width)} x {Math.round(cropBox.height)}
                            </span>
                        </div>
                    </div>

                    {/* Botón Flotante para Reabrir Panel */}
                    {isToolbarCollapsed && (
                        <button
                            onClick={() => setIsToolbarCollapsed(false)}
                            className="absolute top-1/2 -translate-y-1/2 right-6 z-[210] bg-neon-cyan text-black w-12 h-24 rounded-full font-black flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all hover:scale-110 pointer-events-auto"
                        >
                            <ChevronLeft className="w-6 h-6 animate-pulse" />
                        </button>
                    )}

                    {/* Master Panel (Studio Dock Right) */}
                    <div
                        className={`absolute top-1/2 -translate-y-1/2 z-[200] transition-all duration-500 ease-in-out pointer-events-auto
                            ${isToolbarCollapsed ? 'right-[-200px] opacity-0 pointer-events-none' : 'right-8 opacity-100'}
                        `}
                    >
                        <div className="bg-[#0A0D14]/95 backdrop-blur-3xl border border-white/10 rounded-[40px] p-6 shadow-[-20px_0_80px_rgba(0,0,0,0.8)] flex flex-col items-center gap-8 min-w-[120px]">
                            {/* Mango Lateral para Colapsar */}
                            <button
                                onClick={() => setIsToolbarCollapsed(true)}
                                className="absolute top-1/2 -translate-y-1/2 -left-3 w-6 h-20 bg-[#0A0D14] border-l border-y border-white/10 rounded-l-2xl flex items-center justify-center hover:bg-neon-cyan/20 group transition-colors"
                                title="Ocultar Estudio"
                            >
                                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-neon-cyan transition-colors" />
                            </button>

                            {/* SECCIÓN 1: Grabación & Status */}
                            <div className="flex flex-col items-center gap-6 w-full pb-8 border-b border-white/5">
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-tighter">Live</span>
                                    <span className={`text-2xl font-mono font-black tabular-nums transition-colors ${isRecording && !isPaused ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                                        {recordingTime}
                                    </span>
                                </div>

                                <div className="flex flex-col items-center gap-4">
                                    {!isRecording ? (
                                        <button
                                            onClick={handleStartRecording}
                                            className="group flex flex-col items-center gap-2 p-5 bg-red-600 hover:bg-red-500 text-white rounded-3xl font-black text-[10px] uppercase transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(220,38,38,0.3)]"
                                        >
                                            <div className="w-4 h-4 bg-white rounded-full group-hover:scale-125 transition-transform" />
                                            Record
                                        </button>
                                    ) : (
                                        <>
                                            {isPaused ? (
                                                <button
                                                    onClick={handleResumeRecording}
                                                    className="w-14 h-14 flex items-center justify-center bg-neon-cyan text-black rounded-3xl hover:scale-110 transition-all"
                                                    title="Reanudar"
                                                >
                                                    <Play className="w-6 h-6 fill-black" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={handlePauseRecording}
                                                    className="w-14 h-14 flex items-center justify-center bg-white/10 text-white border border-white/20 rounded-3xl hover:bg-white/20 transition-all"
                                                    title="Pausar"
                                                >
                                                    <Pause className="w-6 h-6 fill-white" />
                                                </button>
                                            )}

                                            <button
                                                onClick={handleStopRecording}
                                                className="w-14 h-14 flex items-center justify-center bg-white text-black rounded-3xl hover:scale-110 transition-all"
                                                title="Detener y Guardar"
                                            >
                                                <Square className="w-6 h-6 fill-black" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* SECCIÓN 2: Cinematics Vertical */}
                            <div className="flex flex-col items-center gap-4 py-4">
                                <span className="text-[9px] uppercase font-black text-gray-600 tracking-widest rotate-[-90deg] h-0 mt-8 mb-8">Studio</span>
                                <button
                                    onClick={() => setIsStabilized(!isStabilized)}
                                    className={`p-4 rounded-2xl border transition-all ${isStabilized ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}
                                    title="Estabilizador Cine"
                                >
                                    <Camera className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => handleFxChange(!layoutFx)}
                                    className={`p-4 rounded-2xl border transition-all ${layoutFx ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}
                                    title="VFX"
                                >
                                    <Scan className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setCameraMode(prev => prev === 'rotate' ? 'pan' : 'rotate')}
                                    className={`p-4 rounded-2xl border transition-all ${cameraMode === 'pan' ? 'bg-neon-purple/20 border-neon-purple text-neon-purple' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}
                                    title="Modo Grúa"
                                >
                                    <Hand className="w-5 h-5" />
                                </button>
                            </div>

                            {/* SECCIÓN 3: Exit */}
                            <div className="mt-auto border-t border-white/5 pt-6 w-full flex justify-center">
                                {!isRecording && (
                                    <button
                                        onClick={() => {
                                            setIsPreparing(false);
                                            if (mediaRecorderRef.current) {
                                                mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
                                            }
                                            mediaRecorderRef.current = null;
                                        }}
                                        className="p-4 text-gray-500 hover:text-red-500 transition-colors group"
                                        title="Salir del Estudio"
                                    >
                                        <RotateCcw className="w-6 h-6 group-hover:rotate-[-90deg] transition-transform" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {isDraggingFile && (
                <div className="absolute inset-0 z-50 bg-neon-cyan/10 backdrop-blur-sm border-2 border-dashed border-neon-cyan flex flex-col items-center justify-center pointer-events-none">
                    <Upload className="w-16 h-16 text-neon-cyan mb-4 animate-bounce" />
                    <h3 className="text-2xl font-bold text-white">Suelta para cargar entorno 3D</h3>
                </div>
            )}

            {/* Aviso de Modo Picking */}
            {pickingAnchorNodeId && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-neon-cyan text-black px-4 py-2 rounded-full font-bold shadow-[0_0_20px_rgba(0,240,255,0.6)] z-50 animate-pulse pointer-events-none flex items-center gap-2">
                    <MousePointer2 className="w-4 h-4" />
                    CLICK EN EL MODELO PARA FIJAR ANCLAJE
                </div>
            )}

            {/* Aviso de Modo Placement */}
            {placingEquipment && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-neon-purple text-white px-4 py-2 rounded-full font-bold shadow-[0_0_20px_rgba(139,92,246,0.6)] z-50 animate-pulse pointer-events-none flex items-center gap-2">
                    <MousePointer2 className="w-4 h-4" />
                    CLICK PARA POSICIONAR {placingEquipment.type?.toUpperCase() || 'EQUIPO'}
                </div>
            )}

            {/* Aviso de Modo Conexión */}
            {isConnecting && (
                <div className="absolute top-32 left-1/2 -translate-x-1/2 bg-neon-cyan/20 backdrop-blur-md border border-neon-cyan text-neon-cyan px-4 py-2 rounded-full font-bold shadow-[0_0_20px_rgba(0,240,255,0.3)] z-50 pointer-events-none flex items-center gap-2">
                    <Link2 className="w-4 h-4" />
                    {connectionSourceId ? 'SELECCIONA DESTINO' : 'SELECCIONA ORIGEN'}
                </div>
            )}

            <Canvas
                shadows
                gl={{
                    preserveDrawingBuffer: true,
                    powerPreference: "high-performance",
                    alpha: false,
                    antialias: true,
                    stencil: false,
                    depth: true
                }}
                dpr={[1, 1.5]}
                camera={{ position: [20, 20, 20], fov: 50 }}
                style={{ background: '#070A12' }}
                onPointerMissed={() => setSelectedNodeId(null)}
            >
                <DropResolver pendingDrop={pendingDrop} onClear={() => setPendingDrop(null)} onDrop3D={onNodeDrop} />
                <PerspectiveCamera makeDefault position={[20, 20, 20]} fov={50} />

                <CameraJoystickHandler orbitRef={orbitRef} />
                <CameraKeyboardControls orbitRef={orbitRef} />

                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 20, 10]} intensity={1} castShadow shadow-mapSize={[2048, 2048]} />
                <pointLight position={[-10, 10, -10]} intensity={0.5} color="#00F0FF" />

                {/* Grid Helper Nativo (Sin parpadeo) */}
                <primitive
                    object={new THREE.GridHelper(300, 300, 0x444444, 0x1a1a1a)}
                    position={[0, -0.01, 0]}
                />

                {/* Marcadores de Origen y Orientación Visual */}
                <group position={[0, 0.01, 0]}>
                    {/* Ejes Principales (5 unidades) */}
                    <primitive object={new THREE.AxesHelper(5)} />

                    {/* Anillo Guía Central */}
                    <mesh rotation={[-Math.PI / 2, 0, 0]}>
                        <ringGeometry args={[0.8, 1, 32]} />
                        <meshBasicMaterial color="#888888" opacity={0.3} transparent side={THREE.DoubleSide} />
                    </mesh>

                    {/* Punto Cero */}
                    <mesh rotation={[-Math.PI / 2, 0, 0]}>
                        <circleGeometry args={[0.2, 32]} />
                        <meshBasicMaterial color="#00F0FF" opacity={0.6} transparent />
                    </mesh>
                </group>

                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} onClick={(e) => {
                    e.stopPropagation();
                    if (placingEquipment && onEquipmentPlaced) {
                        onEquipmentPlaced({ x: e.point.x, y: 0, z: e.point.z });
                        return;
                    }

                    // Lógica de picking de anclaje
                    if (pickingAnchorNodeId) {
                        const point = e.point; // World coords
                        handleNodeUpdate(pickingAnchorNodeId, {
                            anchorPoint: { x: point.x, y: point.y, z: point.z }
                        });
                        onPickingAnchorChange(null);
                        return;
                    }

                    setIsLayoutSelected(true);
                    setSelectedNodeId(null);
                }}>
                    <planeGeometry args={[500, 500]} />
                    <meshStandardMaterial color="#070A12" opacity={0.0} transparent />
                </mesh>

                <LayoutWrapper
                    layout={layout}
                    scale={layoutScale}
                    elevation={layoutElevation}
                    fxEnabled={layoutFx}
                    isSelected={isLayoutSelected}
                    mode={transformMode}
                    onUpdate={(changes) => setLayout(prev => ({ ...prev, ...changes }))}
                />

                <Bounds fit clip observe margin={1.2}>
                    <CameraManager resetTrigger={resetCameraTrigger} />
                    <Suspense fallback={null}>
                        <group onClick={(e) => {
                            e.stopPropagation();

                            if (placingEquipment && onEquipmentPlaced) {
                                onEquipmentPlaced({ x: e.point.x, y: e.point.y, z: e.point.z });
                                return;
                            }

                            // Lógica de picking de anclaje
                            if (pickingAnchorNodeId) {
                                const point = e.point; // World coords
                                handleNodeUpdate(pickingAnchorNodeId, {
                                    anchorPoint: { x: point.x, y: point.y, z: point.z }
                                });
                                onPickingAnchorChange(null);
                                return;
                            }

                            setIsLayoutSelected(true);
                            setSelectedNodeId(null);
                        }}>
                            {nodes.map((node, index) => (
                                <EquipmentWrapper
                                    key={node.id}
                                    node={node}
                                    index={index}
                                    isSelected={selectedNodeId === node.id}
                                    onClick={(e) => handleNodeClick(e, node)}
                                    onUpdate={handleNodeUpdate}
                                    onSetAnchorStart={() => onPickingAnchorChange(node.id)}
                                    isPickingAnchor={pickingAnchorNodeId === node.id}
                                    isCollapsed={labelsCollapsed}
                                    heightOffset={labelHeightOffset}
                                />
                            ))}
                        </group>
                    </Suspense>
                </Bounds>

                {edges.map(conn => <Connection3DArrow key={conn.id} edge={conn} nodes={nodes} connectionStyle={connectionStyle} />)}

                <OrbitControls
                    ref={orbitRef}
                    makeDefault
                    enableDamping={true}
                    dampingFactor={isStabilized ? 0.005 : 0.05}
                    rotateSpeed={isStabilized ? 0.2 : 0.5}
                    zoomSpeed={isStabilized ? 0.2 : 1.0}
                    panSpeed={isStabilized ? 0.2 : 1.0}
                    autoRotate={isStabilized && !isRecording}
                    autoRotateSpeed={0.5}
                    maxPolarAngle={Math.PI / 2 - 0.05}
                    minDistance={5}
                    maxDistance={120}
                    mouseButtons={{
                        LEFT: cameraMode === 'pan' ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
                        MIDDLE: THREE.MOUSE.DOLLY,
                        RIGHT: cameraMode === 'pan' ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN
                    }}
                />

                <ControlLimiter controlsRef={orbitRef} />
            </Canvas>

            {/* 4. TOOLBAR DE EDICIÓN (Oculto en modo grabación para limpieza) */}
            {!isPreparing && !isRecording && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none export-hidden">
                    <div className="bg-glass-light border border-glass-border rounded-xl p-2 pointer-events-auto flex flex-col gap-2 animate-in slide-in-from-top shadow-lg backdrop-blur-md">
                        <div className="flex gap-1">
                            <button onClick={() => setCameraMode(prev => prev === 'rotate' ? 'pan' : 'rotate')} className={`px-3 py-1 text-xs rounded ${cameraMode === 'pan' ? 'bg-neon-purple text-white' : 'text-gray-300 hover:bg-white/10'}`} title={cameraMode === 'rotate' ? "Modo Rotación" : "Modo Pan"}><Hand className="w-3 h-3" /></button>
                            <div className="w-[1px] bg-gray-700 mx-1"></div>
                            <button onClick={() => { setIsConnecting(!isConnecting); setConnectionSourceId(null); onPickingAnchorChange(null); }} className={`px-3 py-1 text-xs rounded ${isConnecting ? 'bg-neon-cyan text-black animate-pulse' : 'text-gray-300 hover:bg-white/10'}`} title="Conectar Equipos"><Link2 className="w-3 h-3" /></button>
                            <div className="w-[1px] bg-gray-700 mx-1"></div>
                            <button onClick={() => setIsStabilized(!isStabilized)} className={`px-3 py-1 text-xs rounded ${isStabilized ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50' : 'text-gray-300 hover:bg-white/10'}`} title={isStabilized ? "Modo Cine: Activado" : "Activar Estabilizador (Cine)"}><Camera className="w-3 h-3" /></button>
                            <div className="w-[1px] bg-gray-700 mx-1"></div>
                            <button onClick={() => handleFxChange(!layoutFx)} className={`px-3 py-1 text-xs rounded ${layoutFx ? 'bg-neon-cyan text-black' : 'text-gray-300 hover:bg-white/10'}`} title="FX Global"><Scan className="w-3 h-3" /></button>
                            <div className="w-[1px] bg-gray-700 mx-1"></div>
                            <button onClick={() => setConnectionStyle(prev => prev === 'curved' ? 'straight' : 'curved')} className={`px-3 py-1 text-xs rounded ${connectionStyle === 'curved' ? 'text-neon-cyan' : 'text-gray-300 hover:bg-white/10'}`} title={connectionStyle === 'curved' ? "Conexiones Curvas" : "Conexiones Rectas"}>
                                {connectionStyle === 'curved' ? <Activity className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                            </button>
                            <div className="w-[1px] bg-gray-700 mx-1"></div>
                            <button
                                onClick={handlePrepareRecording}
                                className="px-3 py-1 text-xs rounded flex items-center gap-2 text-gray-300 hover:bg-white/10"
                                title="Preparar Grabación"
                            >
                                <Circle className="w-3 h-3 fill-red-500 text-red-500" />
                                <span className="font-bold">REC</span>
                            </button>
                        </div>

                        {(isLayoutSelected || selectedNodeId) && (
                            <div className="flex gap-1 border-t border-gray-700 pt-2 mt-1">
                                <button onClick={() => setTransformMode('translate')} className={`px-3 py-1 text-xs rounded ${transformMode === 'translate' ? 'bg-neon-cyan text-black' : 'text-gray-300 hover:bg-white/10'}`}><Move className="w-3 h-3" /></button>
                                <button onClick={() => setTransformMode('rotate')} className={`px-3 py-1 text-xs rounded ${transformMode === 'rotate' ? 'bg-neon-cyan text-black' : 'text-gray-300 hover:bg-white/10'}`}><RotateCw className="w-3 h-3" /></button>
                                {isLayoutSelected && <button onClick={() => setTransformMode('scale')} className={`px-3 py-1 text-xs rounded ${transformMode === 'scale' ? 'bg-neon-cyan text-black' : 'text-gray-300 hover:bg-white/10'}`}><Maximize className="w-3 h-3" /></button>}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {!isToolbarCollapsed && (
                <div className="absolute bottom-20 left-6 pointer-events-none z-20 export-hidden">
                    <VirtualJoystick onMove={(pos) => window.dispatchEvent(new CustomEvent('joystick-move', { detail: pos }))} />
                </div>
            )}
        </div>
    );
}

export default React.memo(Flow3DViewer);
