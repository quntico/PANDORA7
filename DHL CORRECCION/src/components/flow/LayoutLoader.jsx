import React, { useState, useEffect, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import { Upload, X, Box, Trash2, Scan, RefreshCw } from 'lucide-react';
import { Center, Html } from '@react-three/drei';
import { process3DFile } from '@/utils/fileProcessor';
import { supabase } from '@/supabase';
import { useProject } from '@/context/ProjectContext';

import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader';

// Componente interno para renderizar el modelo
function ModelRenderer({ url, type, scale = 1, blobMap, position, rotation, fxEnabled, name, theme = 'dark', customMetalness, customRoughness, customOutlineOpacity }) {
    const [obj, setObj] = useState(null);
    const [error, setError] = useState(null);
    const [isDownloadingZip, setIsDownloadingZip] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);

    // Cargar modelo
    useEffect(() => {
        const loadModel = async () => {
            if (!url) return;

            // Limpiar estados anteriores inmediatamente al cambiar de modelo
            setObj(null);
            setError(null);
            setIsLoading(true);
            setDownloadProgress(0);

            try {
                let targetUrl = url;
                let targetBlobMap = blobMap;

                // 1. Si es un archivo remoto (HTTPS), comprobar la caché del navegador para carga instantánea (<1s)
                if (url.startsWith('http')) {
                    try {
                        const cache = await caches.open('flow-3d-models-cache-v1');
                        const cachedResponse = await cache.match(url);
                        let fileBlob;
                        
                        if (cachedResponse) {
                            console.log("[ModelRenderer] ¡Modelo encontrado en caché local! Carga instantánea.", url);
                            setDownloadProgress(100);
                            fileBlob = await cachedResponse.blob();
                        } else {
                            console.log("[ModelRenderer] Descargando modelo con barra de progreso resiliente...", url);
                            const response = await fetch(url);
                            if (!response.ok) throw new Error("Error en la respuesta del servidor");

                            const contentLength = +response.headers.get('Content-Length') || 0;
                            const reader = response.body.getReader();
                            let receivedLength = 0;
                            const chunks = [];
                            let lastPercent = -1;

                            while(true) {
                                const { done, value } = await reader.read();
                                if (done) break;
                                chunks.push(value);
                                receivedLength += value.length;
                                if (contentLength) {
                                    const percent = Math.round((receivedLength / contentLength) * 100);
                                    if (percent !== lastPercent) {
                                        lastPercent = percent;
                                        setDownloadProgress(percent);
                                    }
                                }
                            }

                            fileBlob = new Blob(chunks);
                            // Guardar en la caché del navegador para futuros accesos instantáneos
                            try {
                                await cache.put(url, new Response(fileBlob.clone()));
                                console.log("[ModelRenderer] Guardado en caché con éxito.");
                            } catch (cacheErr) {
                                console.warn("[ModelRenderer] No se pudo escribir en caché:", cacheErr);
                            }
                        }

                        // Si es un ZIP, debemos procesarlo localmente
                        if (type === 'zip' || url.toLowerCase().includes('.zip')) {
                            setIsDownloadingZip(true);
                            try {
                                const zipFile = new File([fileBlob], url.split('/').pop() || 'model.zip', { type: 'application/zip' });
                                const processed = await process3DFile(zipFile);
                                targetUrl = processed.url;
                                targetBlobMap = processed.blobMap;
                            } finally {
                                setIsDownloadingZip(false);
                            }
                        } else {
                            targetUrl = URL.createObjectURL(fileBlob);
                        }

                    } catch (cacheSystemErr) {
                        console.error("[ModelRenderer] Error en el sistema de caché local o descarga:", cacheSystemErr);
                        // Fallback a URL remota directa en caso de error
                        targetUrl = url;
                    }
                }

                // Configurar LoadingManager
                const manager = new THREE.LoadingManager();
                if (targetBlobMap && targetBlobMap.size > 0) {
                    manager.setURLModifier((u) => {
                        const fileName = u.split('/').pop().replace(/^(\.?\/)/, '');
                        if (targetBlobMap.has(fileName)) {
                            return targetBlobMap.get(fileName);
                        }
                        return u;
                    });
                }

                let loader;
                if (type === 'glb' || type === 'gltf') {
                    loader = new GLTFLoader(manager);
                } else if (type === 'fbx') {
                    loader = new FBXLoader(manager);
                } else if (type === 'dae') {
                    loader = new ColladaLoader(manager);
                } else {
                    loader = new OBJLoader(manager);
                }

                const loadedData = await new Promise(async (resolve, reject) => {
                    if ((type === 'glb' || type === 'gltf') && targetUrl.startsWith('blob:')) {
                        try {
                            const res = await fetch(targetUrl);
                            const arrayBuffer = await res.arrayBuffer();
                            loader.parse(
                                arrayBuffer,
                                '',
                                (gltf) => resolve(gltf),
                                (err) => reject(err)
                            );
                        } catch (err) {
                            reject(err);
                        }
                    } else {
                        loader.load(
                            targetUrl,
                            (data) => resolve(data),
                            undefined,
                            (err) => reject(err)
                        );
                    }
                });

                setObj(loadedData);
                setError(null);
            } catch (err) {
                console.error("Error loading 3D model:", err);
                setError(err);
            } finally {
                setIsLoading(false);
            }
        };
        loadModel();
    }, [url, type, blobMap]);

    // Procesar modelo (Memoizado para no recalcular si no cambia)
    const primitive = useMemo(() => {
        if (!obj) return null;
        let scene;
        if (type === 'glb' || type === 'gltf' || type === 'dae') {
            scene = obj.scene || obj;
        } else {
            scene = obj;
        }
        if (!scene) return null;

        let clone;
        try {
            clone = typeof scene.clone === 'function' ? scene.clone(true) : scene;
        } catch (e) {
            console.warn('scene.clone error:', e);
            clone = scene;
        }

        const isBlueprint = theme === 'blueprint';
        const isToxic = theme === 'toxic';
        const isAluminum = theme === 'aluminum';
        const isCustom = typeof theme === 'object' && theme !== null;

        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: isAluminum ? '#cccccc' : isCustom ? theme.body : isBlueprint ? '#ffffff' : isToxic ? '#6b7280' : '#15191E',
            roughness: customRoughness !== undefined ? customRoughness : (isAluminum ? 0.25 : isBlueprint ? 0.6 : isToxic ? 0.85 : 0.9),
            metalness: customMetalness !== undefined ? customMetalness : (isAluminum ? 0.95 : isBlueprint ? 0.1 : isToxic ? 0.05 : 0.1),
            side: THREE.DoubleSide
        });

        const glassMaterial = new THREE.MeshStandardMaterial({
            color: isAluminum ? '#e2e8f0' : isCustom ? theme.glass : isBlueprint ? '#0d9488' : isToxic ? '#84cc16' : '#00F0FF',
            transparent: true,
            opacity: isAluminum ? 0.2 : isBlueprint ? 0.2 : isToxic ? 0.2 : 0.15,
            roughness: 0.1,
            metalness: isAluminum ? 0.95 : 0.9,
            side: THREE.FrontSide,
            depthWrite: false
        });

        const outlineMaterial = new THREE.LineBasicMaterial({
            color: isAluminum ? '#475569' : isCustom ? theme.wireframe : isBlueprint ? '#0d9488' : isToxic ? '#84cc16' : '#00F0FF',
            transparent: true,
            opacity: customOutlineOpacity !== undefined ? customOutlineOpacity : (isAluminum ? 0.1 : isBlueprint ? 0.8 : 1.0),
            linewidth: 1
        });

        // Configurar materiales
        clone.traverse((child) => {
            // Ocultar siluetas de personas / referencias de escala por defecto (ej. Susan de SketchUp)
            const nameLower = (child.name || '').toLowerCase();
            const parentNameLower = (child.parent?.name || '').toLowerCase();
            const geomNameLower = (child.geometry?.name || '').toLowerCase();
            
            const isScaleHelper = /susan|stacy|steve|chris|derrick|laura|sang|mark|lisanne|temple|katherine|escala|scale|person|human|character|figure|siluet|monigote|mannequin|mannikin|operator|operador|gente|avatar|dummy/i.test(nameLower) ||
                                  /susan|stacy|steve|chris|derrick|laura|sang|mark|lisanne|temple|katherine|escala|scale|person|human|character|figure|siluet|monigote|mannequin|mannikin|operator|operador|gente|avatar|dummy/i.test(parentNameLower) ||
                                  /susan|stacy|steve|chris|derrick|laura|sang|mark|lisanne|temple|katherine|escala|scale|person|human|character|figure|siluet|monigote|mannequin|mannikin|operator|operador|gente|avatar|dummy/i.test(geomNameLower);

            if (isScaleHelper) {
                child.visible = false;
                if (child.isMesh) {
                    child.castShadow = false;
                    child.receiveShadow = false;
                }
                return;
            }

            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                // Forzar cálculo de normales suaves una sola vez (muy común en archivos DAE)
                if (child.geometry && !child.geometry.userData.normalsComputed) {
                    try {
                        child.geometry.computeVertexNormals();
                        child.geometry.userData.normalsComputed = true;
                    } catch (e) {
                        console.warn("No se pudo calcular normales en malla:", child.name, e);
                    }
                }

                if (!child.userData.originalMaterial) {
                    child.userData.originalMaterial = child.material;
                }

                if (fxEnabled || isBlueprint || isAluminum) {
                    const origMat = child.userData.originalMaterial;
                    const nameRegex = /glass|vidrio|cristal|window|screen|transp|panel|cortina|curtain|flap|plastic|plastico|acrilico|acrylic|puerta|door/i;
                    const isTransparent = origMat && (
                        origMat.transparent || 
                        origMat.opacity < 1 || 
                        (origMat.transmission !== undefined && origMat.transmission > 0) ||
                        nameRegex.test(child.name) ||
                        (origMat.name && nameRegex.test(origMat.name))
                    );

                    child.material = isTransparent ? glassMaterial : bodyMaterial;

                    // 2. Crear o mostrar bordes (Outlines) - Caching EdgesGeometry for 100x performance boost
                    let outline = child.children.find(c => c.name === 'outline_fx');
                    if (!outline) {
                        let edges = child.geometry.userData.cachedEdges;
                        if (!edges) {
                            edges = new THREE.EdgesGeometry(child.geometry, 15);
                            child.geometry.userData.cachedEdges = edges;
                        }
                        outline = new THREE.LineSegments(edges, outlineMaterial);
                        outline.name = 'outline_fx';
                        child.add(outline);
                    }
                    outline.material = outlineMaterial;
                    outline.visible = customOutlineOpacity !== undefined ? (customOutlineOpacity > 0.0) : !isAluminum;

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
    }, [obj, type, fxEnabled, theme, customRoughness, customMetalness, customOutlineOpacity]); // Recalcular si cambia fxEnabled o theme

    if (isDownloadingZip) {
        return (
            <Html center>
                <div style={{ background: '#0a0f1d99', backdropFilter: 'blur(8px)', color: '#00F0FF', padding: '1rem 2rem', borderRadius: '16px', border: '1px solid rgba(0,240,255,0.3)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontFamily: 'monospace', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '2px', fontWeight: 'bold', boxShadow: '0 0 30px rgba(0,240,255,0.2)', whiteSpace: 'nowrap' }}>
                    <RefreshCw className="animate-spin w-4 h-4 text-neon-cyan" />
                    Descargando Planta 3D...
                </div>
            </Html>
        );
    }

    if (isLoading && !obj && !error) {
        return (
            <Html center>
                <div style={{ background: '#0a0f1dcc', backdropFilter: 'blur(12px)', color: '#00F0FF', padding: '1.5rem 2.5rem', borderRadius: '24px', border: '1px solid rgba(0,240,255,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', fontFamily: 'sans-serif', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 0 40px rgba(0,240,255,0.3)', minWidth: '240px' }}>
                    <RefreshCw className="animate-spin w-6 h-6 text-[#00F0FF] mb-1" />
                    <span style={{ letterSpacing: '2px', textTransform: 'uppercase', textAlign: 'center' }}>Cargando {name || 'Modelo 3D'}...</span>
                    {downloadProgress > 0 && (
                        <div style={{ width: '100%', marginTop: '0.25rem' }}>
                            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: `${downloadProgress}%`, height: '100%', background: 'linear-gradient(90deg, #00F0FF, #0072FF)', transition: 'width 0.2s ease-out' }} />
                            </div>
                            <div style={{ textAlign: 'center', marginTop: '0.5rem', color: '#00F0FF', fontSize: '10px' }}>
                                {downloadProgress}%
                            </div>
                        </div>
                    )}
                </div>
            </Html>
        );
    }

    if (error) {
        return (
            <Html center>
                <div style={{ background: '#ff000022', color: '#ff4444', padding: '1rem', borderRadius: '8px', border: '1px solid #ff4444', whiteSpace: 'nowrap' }}>
                    Error cargando modelo 3D.<br/>
                    Asegúrate de no haber refrescado la página sin antes volver a subir el archivo.<br/>
                    <strong>Por favor, sube el modelo 3D nuevamente o selecciónalo de la librería.</strong>
                </div>
            </Html>
        );
    }
    
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

export function LayoutModel({ layout, scale = 1, position, rotation, elevation = 0, fxEnabled = false, theme = 'dark', customMetalness, customRoughness, customOutlineOpacity }) {
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
            name={layout.name}
            theme={theme}
            customMetalness={customMetalness}
            customRoughness={customRoughness}
            customOutlineOpacity={customOutlineOpacity}
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

    // Biblioteca de Modelos 3D y Pestañas
    const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'library'
    const [libraryItems, setLibraryItems] = useState([]);
    const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

    let projectId = null;
    try {
        const projectCtx = useProject();
        projectId = projectCtx?.projectId;
    } catch (e) {
        // Fallback si no está dentro de un proveedor de contexto
    }

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

    // Cargar biblioteca desde Supabase
    const loadLibrary = async () => {
        setIsLoadingLibrary(true);
        try {
            const { data, error } = await supabase
                .from('project_artifacts_beta')
                .select('*')
                .eq('type', 'layout')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setLibraryItems(data || []);
        } catch (err) {
            console.error('[LayoutLoader] Error cargando librería:', err);
        } finally {
            setIsLoadingLibrary(false);
        }
    };

    useEffect(() => {
        if (isOpen && activeTab === 'library') {
            loadLibrary();
        }
    }, [isOpen, activeTab]);

    const handleFileProcess = async (file) => {
        if (!file) return;

        setIsProcessing(true);
        try {
            // 1. Procesar archivo localmente para feedback visual rápido
            const layoutData = await process3DFile(file);

            // 2. Subir archivo a Supabase Storage
            const ext = file.name.split('.').pop().toLowerCase();
            const fileName = `layouts/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('assets')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                console.error('[LayoutLoader] Error al subir a storage, usando blob local:', uploadError);
                // Fallback a preview local si falla la subida
                if (onLayoutChange) onLayoutChange(layoutData, scale, elevation);
            } else {
                // Obtener URL pública
                const { data: { publicUrl } } = supabase.storage
                    .from('assets')
                    .getPublicUrl(fileName);

                // 3. Registrar en project_artifacts_beta (Biblioteca Compartida)
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
                    console.error('[LayoutLoader] Error al registrar en base de datos:', dbError);
                }

                // Actualizar diseño con URL de la nube persistente
                const persistentLayout = {
                    ...layoutData,
                    url: publicUrl,
                    storagePath: fileName,
                    fileName: file.name
                };

                if (onLayoutChange) onLayoutChange(persistentLayout, scale, elevation);
                console.log('[LayoutLoader] Layout subido y registrado con éxito:', publicUrl);
                
                // Recargar librería si está en la pestaña adecuada
                if (activeTab === 'library') loadLibrary();
            }

            setIsOpen(true);
        } catch (error) {
            console.error("Error al procesar archivo:", error);
            alert("Error: " + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const loadFromLibrary = async (item) => {
        setIsProcessing(true);
        try {
            const itemData = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
            console.log('[LayoutLoader] Descargando de librería:', itemData.url);
            const response = await fetch(itemData.url);
            if (!response.ok) throw new Error("No se pudo obtener el archivo del servidor cloud");
            const blob = await response.blob();
            const file = new File([blob], itemData.fileName || item.title, { type: blob.type });
            const layoutData = await process3DFile(file);
            
            // Conservar URL y metadatos remotos para guardado futuro
            const cloudLayout = {
                ...layoutData,
                url: itemData.url,
                storagePath: itemData.storagePath,
                fileName: itemData.fileName
            };
            
            if (onLayoutChange) onLayoutChange(cloudLayout, scale, elevation);
        } catch (err) {
            console.error("Error al cargar modelo de la librería:", err);
            alert("Error cargando de la librería: " + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const deleteFromLibrary = async (id, storagePath) => {
        if (!confirm("¿Seguro que deseas eliminar este modelo de la librería?")) return;
        try {
            // Eliminar registro DB
            const { error: dbError } = await supabase
                .from('project_artifacts_beta')
                .delete()
                .eq('id', id);
            if (dbError) throw dbError;

            // Eliminar archivo en storage si existe
            if (storagePath) {
                const { error: storageError } = await supabase.storage
                    .from('assets')
                    .remove([storagePath]);
                if (storageError) {
                    console.warn('[LayoutLoader] No se pudo borrar del storage físico:', storageError);
                }
            }

            loadLibrary();
        } catch (err) {
            console.error('[LayoutLoader] Error eliminando:', err);
            alert("Error al eliminar: " + err.message);
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
                <div className="absolute top-32 left-4 z-10 w-72 bg-deep/90 border border-glass-border rounded-xl p-4 backdrop-blur-xl shadow-2xl pointer-events-auto">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-white font-bold text-sm">Entorno y Maquetas 3D</h3>
                        <button onClick={() => onOpenChangeExternal ? onOpenChangeExternal(false) : setIsOpenLocal(false)} className="text-gray-400 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Menú de pestañas premium */}
                    <div className="flex border-b border-white/10 mb-4">
                        <button
                            onClick={() => setActiveTab('upload')}
                            className={`flex-1 pb-2 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'upload' ? 'text-neon-cyan border-b-2 border-neon-cyan' : 'text-gray-400 hover:text-white'}`}
                        >
                            Subir
                        </button>
                        <button
                            onClick={() => setActiveTab('library')}
                            className={`flex-1 pb-2 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'library' ? 'text-neon-cyan border-b-2 border-neon-cyan' : 'text-gray-400 hover:text-white'}`}
                        >
                            Librería Cloud
                        </button>
                    </div>

                    {/* Contenido Pestaña SUBIR */}
                    {activeTab === 'upload' && (
                        <div className="mb-4">
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
                                <div className="bg-glass-light/10 p-2.5 rounded-lg flex items-center justify-between">
                                    <span className="text-xs text-neon-cyan truncate max-w-[140px]" title={currentLayout.name}>
                                        {currentLayout.name}
                                    </span>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={toggleFx}
                                            className={`p-1 rounded ${fxEnabled ? 'bg-neon-cyan text-black' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                                            title="Modo FX (Holograma)"
                                        >
                                            <Scan className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={clearLayout} className="text-red-400 hover:text-red-300 p-1">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Contenido Pestaña LIBRERÍA CLOUD */}
                    {activeTab === 'library' && (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar mb-4">
                            {isLoadingLibrary ? (
                                <div className="text-center py-4 text-xs text-gray-500 flex justify-center items-center gap-2">
                                    <RefreshCw className="animate-spin w-3 h-3 text-neon-cyan" />
                                    Cargando...
                                </div>
                            ) : libraryItems.length === 0 ? (
                                <div className="text-center py-4 text-xs text-gray-500">No hay modelos en la nube.</div>
                            ) : (
                                libraryItems.map(item => {
                                    let itemData = {};
                                    try {
                                        itemData = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
                                    } catch (e) {}

                                    return (
                                        <div key={item.id} className="p-2 rounded-lg bg-glass-light/5 border border-white/5 hover:border-neon-cyan/20 transition-all flex items-center justify-between gap-2 group">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-white truncate" title={item.title}>
                                                    {item.title}
                                                </p>
                                                <p className="text-[9px] text-gray-500 uppercase">
                                                    {itemData.type || '3D'} • {new Date(item.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="flex gap-1 shrink-0">
                                                <button
                                                    onClick={() => loadFromLibrary(item)}
                                                    className="px-2 py-1 rounded bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan text-[10px] font-bold uppercase hover:bg-neon-cyan/20 transition-all"
                                                >
                                                    Cargar
                                                </button>
                                                <button
                                                    onClick={() => deleteFromLibrary(item.id, itemData.storagePath)}
                                                    className="p-1 rounded bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* Controles de Escala y Elevación (Siempre visibles si hay un modelo cargado) */}
                    {currentLayout && (
                        <div className="space-y-3 pt-3 border-t border-white/10">
                            {/* Control de Escala */}
                            <div className="space-y-1">
                                <label className="text-xs text-gray-400 flex justify-between">
                                    Escala Global
                                    <span className="text-white font-mono">{scale}x</span>
                                </label>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="50"
                                    step="0.1"
                                    value={scale}
                                    onChange={handleScaleChange}
                                    className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-neon-cyan"
                                />
                            </div>

                            {/* Control de Elevación */}
                            <div className="space-y-1">
                                <label className="text-xs text-gray-400 flex justify-between">
                                    Elevación (Y)
                                    <span className="text-white font-mono">{elevation}m</span>
                                </label>
                                <input
                                    type="range"
                                    min="-50"
                                    max="50"
                                    step="0.5"
                                    value={elevation}
                                    onChange={handleElevationChange}
                                    className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-neon-cyan"
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
