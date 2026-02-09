import React, { useState, useEffect, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import { Upload, X, Box, Trash2, Scan } from 'lucide-react';
import { Center } from '@react-three/drei';
import { process3DFile } from '@/utils/fileProcessor';

// Componente interno para renderizar el modelo
function ModelRenderer({ url, type, scale = 1, blobMap, position, rotation, fxEnabled }) {
    const [obj, setObj] = useState(null);
    const [error, setError] = useState(null);

    // Cargar modelo
    useEffect(() => {
        const loadModel = async () => {
            if (!url) return;

            try {
                // Configurar LoadingManager
                const manager = new THREE.LoadingManager();
                if (blobMap && blobMap.size > 0) {
                    manager.setURLModifier((url) => {
                        const fileName = url.split('/').pop().replace(/^(\.?\/)/, '');
                        if (blobMap.has(fileName)) {
                            return blobMap.get(fileName);
                        }
                        return url;
                    });
                }

                const loader = type === 'glb' || type === 'gltf'
                    ? new GLTFLoader(manager)
                    : new OBJLoader(manager);

                const loadedData = await new Promise((resolve, reject) => {
                    loader.load(url, resolve, undefined, reject);
                });

                setObj(loadedData);
                setError(null);
            } catch (err) {
                console.error("Error loading 3D model:", err);
                setError(err);
            }
        };
        loadModel();
    }, [url, type, blobMap]);

    // Procesar modelo (Memoizado para no recalcular si no cambia)
    const primitive = useMemo(() => {
        if (!obj) return null;
        const scene = type === 'glb' || type === 'gltf' ? obj.scene : obj;
        const clone = scene.clone(true);

        const darkMaterial = new THREE.MeshStandardMaterial({
            color: '#15191E', // Gris oscuro azulado (Blueprint background)
            roughness: 0.9,
            metalness: 0.1,
            side: THREE.DoubleSide
        });

        const outlineMaterial = new THREE.LineBasicMaterial({
            color: '#00F0FF', // Cyan Neón (Coincide con botones/Joystick)
            transparent: true,
            opacity: 1.0,  // Opacidad completa
            linewidth: 2   // (Nota: WebGL ignora linewidth en windows a veces, pero no daña)
        });

        // Configurar materiales
        clone.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                // Guardar material original en userData si es la primera vez (en el clon)
                if (!child.userData.originalMaterial) {
                    child.userData.originalMaterial = child.material;
                }

                if (fxEnabled) {
                    // Modo Holograma / Blueprint

                    // 1. Aplicar material base oscuro
                    child.material = darkMaterial;

                    // 2. Crear o mostrar bordes (Outlines)
                    let outline = child.children.find(c => c.name === 'outline_fx');
                    if (!outline) {
                        // Crear geometría de bordes (solo bordes duros > 15 grados)
                        const edges = new THREE.EdgesGeometry(child.geometry, 15);
                        outline = new THREE.LineSegments(edges, outlineMaterial);
                        outline.name = 'outline_fx';
                        child.add(outline);
                    }
                    outline.visible = true;

                } else {
                    // Modo Normal (Restaurar)
                    if (child.userData.originalMaterial) {
                        child.material = child.userData.originalMaterial;
                    } else {
                        child.material = new THREE.MeshStandardMaterial({ color: 0x808080 });
                    }

                    // Ocultar outline
                    const outline = child.children.find(c => c.name === 'outline_fx');
                    if (outline) outline.visible = false;
                }
            }
        });
        return clone;
    }, [obj, type, fxEnabled]); // Recalcular si cambia fxEnabled

    if (error) return null;
    if (!primitive) return null;

    return (
        <group position={position} rotation={rotation} scale={scale}>
            <Center
                onCentered={({ container, width, height, depth }) => {
                    let finalScale = 1;
                    // Auto-escalado si scale es 1 (default)
                    if (Math.abs(scale - 1) < 0.01) {
                        const maxDim = Math.max(width, height, depth);
                        if (maxDim > 0) {
                            const targetSize = 50;
                            finalScale = targetSize / maxDim;
                            container.scale.setScalar(finalScale);
                        }
                    }

                    // Ajuste de piso MANUAL
                    container.position.y = (height * finalScale) / 2;
                }}
            >
                <primitive object={primitive} />
            </Center>
        </group>
    );
}

export function LayoutModel({ layout, scale = 1, position, rotation, elevation = 0, fxEnabled = false }) {
    if (!layout) return null;
    const finalPosition = position ? [position[0], position[1] + elevation, position[2]] : [0, elevation, 0];

    return (
        <ModelRenderer
            url={layout.url}
            type={layout.type}
            scale={scale}
            blobMap={layout.blobMap}
            position={finalPosition}
            rotation={rotation}
            fxEnabled={fxEnabled}
        />
    );
}

export default function LayoutControls({ onLayoutChange, currentLayout, currentScale, onFileDrop, currentElevation, onElevationChange, currentFx, onFxChange, isOpenExternal, onOpenChangeExternal }) {
    const [isOpenLocal, setIsOpenLocal] = useState(false);

    // Usar prop externa si existe, sino local
    const isOpen = isOpenExternal !== undefined ? isOpenExternal : isOpenLocal;

    const toggleOpen = () => {
        const newState = !isOpen;
        if (onOpenChangeExternal) {
            onOpenChangeExternal(newState);
        } else {
            setIsOpenLocal(newState);
        }
    };

    // Estado local para UI inmediata
    const [scale, setScale] = useState(currentScale || 1);
    const [elevation, setElevation] = useState(currentElevation || 0);
    const [fxEnabled, setFxEnabled] = useState(currentFx || false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Efecto para sincronizar escala externa
    useEffect(() => {
        if (currentScale) setScale(currentScale);
    }, [currentScale]);

    // Efecto para sincronizar elevación externa
    useEffect(() => {
        if (currentElevation !== undefined) setElevation(currentElevation);
    }, [currentElevation]);

    useEffect(() => {
        if (currentFx !== undefined) setFxEnabled(currentFx);
    }, [currentFx]);

    const toggleFx = () => {
        const newVal = !fxEnabled;
        setFxEnabled(newVal);
        if (onFxChange) onFxChange(newVal);
    };

    const handleFileProcess = async (file) => {
        if (!file) return;

        setIsProcessing(true);
        try {
            const layoutData = await process3DFile(file);
            // Resetear valores al cargar nuevo
            if (onLayoutChange) onLayoutChange(layoutData, scale, 0);
            setIsOpen(true);
        } catch (error) {
            console.error("Error al procesar archivo:", error);
            alert(error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFileUpload = (event) => {
        handleFileProcess(event.target.files[0]);
    };

    const handleScaleChange = (e) => {
        const val = parseFloat(e.target.value);
        setScale(val);
        if (onLayoutChange && currentLayout) onLayoutChange(currentLayout, val, elevation);
    };

    const handleElevationChange = (e) => {
        const val = parseFloat(e.target.value);
        setElevation(val);
        if (onLayoutChange && currentLayout) onLayoutChange(currentLayout, scale, val);
    };

    const clearLayout = () => {
        if (onLayoutChange) onLayoutChange(null, 1, 0);
    };

    return (
        <>
            {/* Botón flotante para panel (Solo si no está controlado externamente o queremos redundancia) */}
            {!isOpenExternal && (
                <div className="absolute top-20 left-4 z-10 pointer-events-auto">
                    <button
                        onClick={toggleOpen}
                        className="flex items-center gap-2 px-3 py-2 bg-glass-light border border-glass-border rounded-lg text-white hover:bg-white/10 transition-all backdrop-blur-xl shadow-lg"
                    >
                        <Box className="w-4 h-4 text-neon-cyan" />
                        <span className="text-sm font-medium">Entorno 3D (Layout)</span>
                    </button>
                </div>
            )}

            {/* Panel de control de entorno */}
            {isOpen && (
                <div className="absolute top-32 left-4 z-10 w-64 bg-deep/90 border border-glass-border rounded-xl p-4 backdrop-blur-xl shadow-2xl pointer-events-auto">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white font-bold text-sm">Cargar Planta / Nave</h3>
                        <button onClick={() => onOpenChangeExternal ? onOpenChangeExternal(false) : setIsOpenLocal(false)} className="text-gray-400 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {!currentLayout ? (
                        <div className={`border-2 border-dashed ${isProcessing ? 'border-neon-cyan opacity-50' : 'border-gray-600'} rounded-lg p-6 text-center hover:border-neon-cyan/50 transition-colors cursor-pointer relative`}>
                            {isProcessing ? (
                                <div className="text-white text-xs">Procesando...</div>
                            ) : (
                                <>
                                    <input
                                        type="file"
                                        accept=".obj,.glb,.gltf,.zip"
                                        onChange={handleFileUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-xs text-gray-400">
                                        Click o Arrastrar aquí<br />
                                        <span className="text-[10px] text-gray-500">(.obj, .glb, .gltf, .zip)</span>
                                    </p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-glass-light/10 p-2 rounded-lg flex items-center justify-between">
                                <span className="text-xs text-neon-cyan truncate max-w-[100px]" title={currentLayout.name}>
                                    {currentLayout.name}
                                </span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={toggleFx}
                                        className={`p-1 rounded ${fxEnabled ? 'bg-neon-cyan text-black' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                                        title="Modo FX (Holograma)"
                                    >
                                        <Scan className="w-3 h-3" />
                                    </button>
                                    <button onClick={clearLayout} className="text-red-400 hover:text-red-300 p-1">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>

                            {/* Control de Escala */}
                            <div className="space-y-2">
                                <label className="text-xs text-gray-400 flex justify-between">
                                    Escala Global
                                    <span className="text-white">{scale}x</span>
                                </label>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="50"
                                    step="0.1"
                                    value={scale}
                                    onChange={handleScaleChange}
                                    className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                            {/* Control de Elevación */}
                            <div className="space-y-2">
                                <label className="text-xs text-gray-400 flex justify-between">
                                    Elevación (Y)
                                    <span className="text-white">{elevation}m</span>
                                </label>
                                <input
                                    type="range"
                                    min="-50"
                                    max="50"
                                    step="0.5"
                                    value={elevation}
                                    onChange={handleElevationChange}
                                    className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
