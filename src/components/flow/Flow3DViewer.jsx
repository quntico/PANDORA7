import React, { useState, useRef, Suspense, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { TransformControls, OrbitControls, PerspectiveCamera, Bounds, useBounds, Grid, Html } from '@react-three/drei';
import { Upload, FileUp, Move, RotateCw, Trash2, Maximize2, ZoomIn, ZoomOut, MousePointer2, Grip, Scan, Hand, Lock, Home, Maximize, Box, Layers, Tv, Link2, Activity, Minus, Video, Square, Camera, Circle } from 'lucide-react';
import EquipmentWrapper from './Equipment3DModel';
import Connection3DArrow from './Connection3DArrow';
import LayoutControls, { LayoutModel } from './LayoutLoader';
import * as THREE from 'three';
import { process3DFile } from '@/utils/fileProcessor';
import { supabase } from '@/supabase';

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

function Flow3DViewer({ nodes = [], edges = [], onNodeClick, onNodeUpdate, fxEnabled: propFxEnabled, onFxChange, isControlsOpen, onControlsOpenChange, onNodeDrop, placingEquipment, onEquipmentPlaced, pickingAnchorNodeId, onPickingAnchorChange, onConnect, resetCameraTrigger, labelsCollapsed = false, labelHeightOffset = 0, layout: propLayout = null, onLayoutChange }) {
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

    React.useEffect(() => {
        if (propFxEnabled !== undefined) {
            setLayoutFx(propFxEnabled);
        }
    }, [propFxEnabled]);

    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [isLayoutSelected, setIsLayoutSelected] = useState(false);
    const [transformMode, setTransformMode] = useState('translate');

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

                handleLayoutChange(persistentLayout, 1, 0);
                console.log('[Flow3D] Layout uploaded to Supabase:', publicUrl);
            }
        } catch (err) {
            console.error("Error cargando archivo:", err);
            setError(err.message);
            alert(`Error: ${err.message}`);
        }
    }, [handleLayoutChange]);

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
    const [isPreparing, setIsPreparing] = useState(false); // Nuevo estado: Preparando
    const [isStabilized, setIsStabilized] = useState(false); // Estabilizador (Cinematic Mode)
    const [recordingTime, setRecordingTime] = useState("00:00");
    const recordingStartRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    // Timer Logic for Recording
    useEffect(() => {
        let interval;
        if (isRecording) {
            recordingStartRef.current = Date.now();
            interval = setInterval(() => {
                const elapsed = Date.now() - recordingStartRef.current;
                const seconds = Math.floor(elapsed / 1000);
                const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
                const ss = String(seconds % 60).padStart(2, '0');
                setRecordingTime(`${mm}:${ss}`);
            }, 1000);
        } else {
            setRecordingTime("00:00");
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    const handlePrepareRecording = useCallback(async () => {
        try {
            // Usar getDisplayMedia para grabar TODO (Canvas + UI HTML Overlays)
            // Permitir elegir pantalla/ventana para resolución nativa y captura de tarjetas
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    displaySurface: "browser", // Preferir pestaña actual
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 60 }
                },
                audio: false // Opcional
            });

            const mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';

            let recorder;
            try {
                // Try high quality first
                recorder = new MediaRecorder(stream, {
                    mimeType,
                    videoBitsPerSecond: 8000000 // 8 Mbps
                });
            } catch (err) {
                console.warn("High quality recording failed, falling back to default:", err);
                recorder = new MediaRecorder(stream, { mimeType });
            }

            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                if (chunksRef.current.length === 0) return; // Evitar descargas vacías

                const blob = new Blob(chunksRef.current, { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
                a.download = `pandora_simulation_${Date.now()}.${ext}`;
                a.click();
                URL.revokeObjectURL(url);

                // Detener todos los tracks
                stream.getTracks().forEach(track => track.stop());
                setIsRecording(false);
                setIsPreparing(false);
                mediaRecorderRef.current = null;
            };

            // Watch for user manually stopping sharing via browser UI
            stream.getVideoTracks()[0].onended = () => {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                    mediaRecorderRef.current.stop();
                }
                setIsRecording(false);
                setIsPreparing(false);
                mediaRecorderRef.current = null;
            };

            mediaRecorderRef.current = recorder;
            setIsPreparing(true); // Entrar modo "Listo para grabar"

        } catch (e) {
            console.error("Recording error:", e);
        }
    }, []);

    const handleStartRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
            mediaRecorderRef.current.start();
            setIsPreparing(false);
            setIsRecording(true);
        }
    }, []);

    const handleStopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
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

            <div className="absolute top-4 left-4 z-10 backdrop-blur-xl bg-glass-light border border-glass-border rounded-xl p-3 pointer-events-none">
                <p className="text-xs text-gray-400">
                    <span className="text-neon-cyan font-bold">Vista 3D</span> • Digital Twin
                </p>
            </div>

            {/* Recording Indicator & Timer with Stop Control */}
            {isRecording && (
                <div className="absolute top-4 right-1/2 translate-x-1/2 z-50 flex items-center gap-3 pointer-events-auto mt-16 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-red-500/50 shadow-lg cursor-pointer hover:bg-black/80 transition-colors" onClick={handleStopRecording} title="Click para detener">
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                    <span className="text-red-500 font-bold text-xs tracking-widest shadow-black drop-shadow-md">GRABANDO</span>
                    <span className="text-white font-mono text-xs border-l border-white/20 pl-3 pr-2">{recordingTime}</span>
                    <div className="w-px h-3 bg-white/20"></div>
                    <Square className="w-3 h-3 text-white fill-current hover:text-red-400" />
                </div>
            )}

            {/* PREPARING RECORDING OVERLAY */}
            {isPreparing && (
                <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 pointer-events-auto animate-in fade-in duration-300">
                    <div className="bg-glass-light border border-neon-cyan/50 rounded-2xl p-8 max-w-md w-full text-center shadow-[0_0_50px_rgba(0,240,255,0.2)]">
                        <div className="w-16 h-16 rounded-full bg-neon-cyan/20 flex items-center justify-center mx-auto mb-6 animate-pulse">
                            <Video className="w-8 h-8 text-neon-cyan" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Listo para Grabar</h2>
                        <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                            La pantalla está seleccionada. Ajusta tu cámara o posición si es necesario.
                            <br />
                            <span className="text-neon-cyan font-bold block mt-2">¿Empezar ahora?</span>
                        </p>

                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => {
                                    setIsPreparing(false);
                                    if (mediaRecorderRef.current) mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
                                    mediaRecorderRef.current = null;
                                }}
                                className="px-6 py-3 rounded-xl border border-gray-600 text-gray-300 hover:bg-white/10 hover:text-white font-medium transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleStartRecording}
                                className="px-8 py-3 rounded-xl bg-neon-cyan text-black font-bold hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all flex items-center gap-2"
                            >
                                <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
                                COMENZAR VIDEO
                            </button>
                        </div>
                    </div>
                    <p className="mt-8 text-gray-500 text-xs max-w-lg text-center">
                        Tip: Para mejor calidad y limitar el área, asegúrate de haber seleccionado
                        <span className="text-gray-300 font-bold"> "Pestaña actual" </span>
                        en el selector del navegador.
                    </p>
                </div>
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
                                    heightOffset={labelHeightOffset} // <<< HEIGHT OFFSET PROP
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
                    dampingFactor={isStabilized ? 0.005 : 0.05} // Ultra smooth if stabilized
                    rotateSpeed={isStabilized ? 0.2 : 0.5} // Slower rotation
                    zoomSpeed={isStabilized ? 0.2 : 1.0}
                    panSpeed={isStabilized ? 0.2 : 1.0}
                    autoRotate={isStabilized && !isRecording} // Auto rotate preview if stabilized but not recording (optional, removed for now to just be manual smooth)
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
                            onClick={isRecording ? handleStopRecording : handlePrepareRecording}
                            className={`px-3 py-1 text-xs rounded flex items-center gap-2 ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-gray-300 hover:bg-white/10'}`}
                            title={isRecording ? "Detener Grabación" : "Grabar Video 3D"}
                        >
                            {isRecording ? <Square className="w-3 h-3 fill-current" /> : <Circle className="w-3 h-3 fill-red-500 text-red-500" />}
                            {isRecording && <span className="font-bold">PARAR</span>}
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

            <div className="absolute bottom-20 left-6 pointer-events-none z-20 export-hidden">
                <VirtualJoystick onMove={(pos) => window.dispatchEvent(new CustomEvent('joystick-move', { detail: pos }))} />
            </div>
        </div >
    );
}

export default React.memo(Flow3DViewer);
