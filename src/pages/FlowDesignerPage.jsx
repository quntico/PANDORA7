import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Helmet } from 'react-helmet';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    addEdge,
    useNodesState,
    useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Trash2, Plus, Scan, Box, RotateCcw, RotateCw } from 'lucide-react';
import EquipmentLibrary from '@/components/flow/EquipmentLibrary';
import MetricsPanel from '@/components/flow/MetricsPanel';
import CustomNode from '@/components/flow/CustomNode';
import AnimatedEdge from '@/components/flow/AnimatedEdge';
import NodePropertiesModal from '@/components/flow/NodePropertiesModal';
import CreateEquipmentModal from '@/components/flow/CreateEquipmentModal';
import EdgeToolbar from '@/components/flow/EdgeToolbar';
import Flow3DViewer from '@/components/flow/Flow3DViewer';
import { useFlowSimulation } from '@/hooks/useFlowSimulation';
import { useFlowHistory } from '@/hooks/useFlowHistory';

const nodeTypes = {
    custom: CustomNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

function FlowDesignerPage() {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selectedNode, setSelectedNode] = useState(null);
    const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
    const [isCreateEquipmentOpen, setIsCreateEquipmentOpen] = useState(false);
    const [customEquipments, setCustomEquipments] = useState(() => {
        // Cargar equipos personalizados desde localStorage
        const saved = localStorage.getItem('flowDesigner_customEquipments');
        return saved ? JSON.parse(saved) : [];
    });
    const [selectedEdgeType, setSelectedEdgeType] = useState({
        id: 'animated-cyan',
        name: 'Flujo Cyan',
        color: '#00F0FF',
        type: 'animated',
        animated: true,
    });
    const [viewMode, setViewMode] = useState(() => {
        // Cargar modo de vista desde localStorage
        return localStorage.getItem('flowDesigner_viewMode') || '2d';
    });
    const [isFxEnabled, setIsFxEnabled] = useState(false); // Estado FX Global
    const [isLayoutControlsOpen, setIsLayoutControlsOpen] = useState(false); // Panel Entorno
    const [placingEquipment, setPlacingEquipment] = useState(null); // Estado para placement manual

    const [pickingAnchorNodeId, setPickingAnchorNodeId] = useState(null); // Estado para picking de anclaje
    const [resetCameraTrigger, setResetCameraTrigger] = useState(0); // Trigger para reset cámara

    // Historial Undo/Redo
    const { takeSnapshot, undo, redo, canUndo, canRedo } = useFlowHistory();

    const onUndo = useCallback(() => {
        const previous = undo(nodes, edges);
        if (previous) {
            setNodes(previous.nodes);
            setEdges(previous.edges);
        }
    }, [undo, nodes, edges, setNodes, setEdges]);

    const onRedo = useCallback(() => {
        const next = redo(nodes, edges);
        if (next) {
            setNodes(next.nodes);
            setEdges(next.edges);
        }
    }, [redo, nodes, edges, setNodes, setEdges]);

    const handle3DNodeDrop = useCallback((equipmentData, position3D) => {
        takeSnapshot(nodes, edges);
        const newNode = {
            id: `eq_${Date.now()}`,
            type: 'custom',
            position: { x: 0, y: 0 }, // Posición 2D dummy
            data: {
                ...equipmentData,
                label: `${equipmentData.type} ${nodes.length + 1}`,
                position3D
            },
        };
        setNodes((nds) => nds.concat(newNode));
    }, [nodes, setNodes, takeSnapshot, edges]);

    const handleEquipmentPlaced = useCallback((position3D) => {
        if (!placingEquipment) return;
        takeSnapshot(nodes, edges);

        const newNode = {
            id: `eq_${Date.now()}`,
            type: 'custom',
            position: { x: 0, y: 0 },
            data: {
                ...placingEquipment,
                label: `${placingEquipment.type} ${nodes.length + 1}`,
                position3D
            },
        };
        setNodes((nds) => nds.concat(newNode));
        setPlacingEquipment(null);
    }, [placingEquipment, nodes, setNodes]);

    // Calcular métricas en tiempo real
    const metrics = useFlowSimulation(nodes, edges);

    // Manejar conexiones
    const onConnect = useCallback(
        (params) => {
            takeSnapshot(nodes, edges);
            const newEdge = {
                ...params,
                type: selectedEdgeType.type === 'animated' ? 'animated' : selectedEdgeType.type,
                animated: selectedEdgeType.animated,
                style: {
                    stroke: selectedEdgeType.color,
                    strokeWidth: selectedEdgeType.animated ? 3 : 2
                },
            };
            setEdges((eds) => addEdge(newEdge, eds));
        },
        [setEdges, selectedEdgeType]
    );

    // Manejar drop desde librería
    const onDrop = useCallback(
        (event) => {
            takeSnapshot(nodes, edges);
            event.preventDefault();

            const reactFlowBounds = event.target.getBoundingClientRect();
            const equipmentData = JSON.parse(
                event.dataTransfer.getData('application/reactflow')
            );

            const position = {
                x: event.clientX - reactFlowBounds.left - 100,
                y: event.clientY - reactFlowBounds.top - 50,
            };

            const newNode = {
                id: `node-${Date.now()}`,
                type: 'custom',
                position,
                data: {
                    ...equipmentData,
                    name: `${equipmentData.type} ${nodes.length + 1}`,
                },
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [nodes, setNodes]
    );

    const onDragOver = useCallback((event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    // Manejar click en nodo
    const onNodeClick = useCallback((event, node) => {
        setSelectedNode(node);
        setIsPropertiesOpen(true);
    }, []);

    // Actualizar propiedades del nodo
    const updateNodeData = useCallback(
        (nodeId, newData) => {
            takeSnapshot(nodes, edges);
            setNodes((nds) =>
                nds.map((node) => {
                    if (node.id === nodeId) {
                        return {
                            ...node,
                            data: { ...node.data, ...newData },
                        };
                    }
                    return node;
                })
            );
        },
        [setNodes]
    );

    // Eliminar nodos seleccionados
    const deleteSelectedNodes = useCallback(() => {
        setNodes((nds) => nds.filter((node) => !node.selected));
        setEdges((eds) => eds.filter((edge) => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            return sourceNode && !sourceNode.selected && targetNode && !targetNode.selected;
        }));
    }, [setNodes, setEdges, nodes]);

    // Manejar Teclado (Undo/Redo/Delete/Escape)
    useEffect(() => {
        const handleKeyDown = (event) => {
            // Undo: Ctrl+Z
            if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
                event.preventDefault();
                onUndo();
                return;
            }
            // Redo: Ctrl+Y or Ctrl+Shift+Z
            if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.shiftKey && event.key === 'z'))) {
                event.preventDefault();
                onRedo();
                return;
            }

            // Delete
            if (event.key === 'Delete' || event.key === 'Backspace') {
                // Solo borrar si no estamos editando texto (input/textarea)
                // Se podría añadir check de activeElement
                const activeTag = document.activeElement.tagName.toLowerCase();
                if (activeTag !== 'input' && activeTag !== 'textarea') {
                    takeSnapshot(nodes, edges);
                    deleteSelectedNodes();
                }
            }

            // Escape
            if (event.key === 'Escape') {
                setSelectedNode(null);
                setIsPropertiesOpen(false);
                setIsCreateEquipmentOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [deleteSelectedNodes, onUndo, onRedo, takeSnapshot, nodes, edges]);

    // Limpiar canvas
    const clearCanvas = useCallback(() => {
        if (window.confirm('¿Estás seguro de que quieres limpiar todo el canvas?')) {
            takeSnapshot(nodes, edges);
            setNodes([]);
            setEdges([]);
        }
    }, [setNodes, setEdges, takeSnapshot, nodes, edges]);

    // Agregar equipo personalizado
    const addCustomEquipment = useCallback((equipment) => {
        setCustomEquipments((prev) => {
            const updated = [...prev, equipment];
            // Guardar en localStorage
            localStorage.setItem('flowDesigner_customEquipments', JSON.stringify(updated));
            return updated;
        });
        setIsCreateEquipmentOpen(false);
    }, []);

    // Guardar diseño completo
    const saveDesign = useCallback(() => {
        const design = {
            nodes,
            edges,
            customEquipments,
            timestamp: new Date().toISOString(),
        };
        localStorage.setItem('flowDesigner_lastDesign', JSON.stringify(design));
        alert('✅ Diseño guardado exitosamente');
    }, [nodes, edges, customEquipments]);

    // Cargar diseño guardado
    const loadDesign = useCallback(() => {
        const saved = localStorage.getItem('flowDesigner_lastDesign');
        if (saved) {
            const design = JSON.parse(saved);
            setNodes(design.nodes || []);
            setEdges(design.edges || []);
            if (design.customEquipments) {
                setCustomEquipments(design.customEquipments);
                localStorage.setItem('flowDesigner_customEquipments', JSON.stringify(design.customEquipments));
            }
            alert('✅ Diseño cargado exitosamente');
        } else {
            alert('⚠️ No hay diseño guardado');
        }
    }, [setNodes, setEdges]);

    // Actualizar posición 3D de nodos
    const onNodeUpdate3D = useCallback((nodeId, newData) => {
        setNodes((nds) => nds.map((node) => {
            if (node.id === nodeId) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        ...newData
                    }
                };
            }
            return node;
        }));
    }, [setNodes]);

    return (
        <>
            <Helmet>
                <title>Flow Designer - PANDORA</title>
            </Helmet>

            <div className="h-screen bg-deep flex flex-col overflow-hidden">
                {/* Header compacto */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-glass-border backdrop-blur-xl bg-deep/95">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan via-neon-blue to-neon-purple flex items-center justify-center shadow-glow-md">
                            <span className="text-xl font-bold text-white">F</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">Flow Designer</h1>
                            <p className="text-xs text-gray-400">Editor Visual de Procesos</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Toggle 2D/3D */}
                        <div className="flex items-center gap-1 p-1 rounded-lg bg-glass-light border border-glass-border">
                            <button
                                onClick={() => {
                                    setViewMode('2d');
                                    localStorage.setItem('flowDesigner_viewMode', '2d');
                                }}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === '2d'
                                    ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                2D
                            </button>
                            <button
                                onClick={() => {
                                    setViewMode('3d');
                                    localStorage.setItem('flowDesigner_viewMode', '3d');
                                }}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === '3d'
                                    ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                3D
                            </button>
                        </div>

                        {/* Botón Entorno / Layout (Solo visible en 3D) */}
                        {viewMode === '3d' && (
                            <>
                                <button
                                    onClick={() => setIsLayoutControlsOpen(!isLayoutControlsOpen)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-sm font-medium ${isLayoutControlsOpen
                                        ? 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/50 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                                        : 'bg-glass-light border-glass-border text-gray-400 hover:text-white hover:border-gray-500'
                                        }`}
                                    title="Configurar Entorno 3D"
                                >
                                    <Box className="w-4 h-4" />
                                    <span className="hidden sm:inline">Entorno</span>
                                </button>

                                <button
                                    onClick={() => setIsFxEnabled(!isFxEnabled)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-sm font-medium ${isFxEnabled
                                        ? 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/50 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                                        : 'bg-glass-light border-glass-border text-gray-400 hover:text-white hover:border-gray-500'
                                        }`}
                                    title="Activar Modo Holograma (FX)"
                                >
                                    <Scan className="w-4 h-4" />
                                    <span className="hidden sm:inline">FX</span>
                                </button>

                                <div className="w-px h-6 bg-glass-border" />

                                {/* Botón HOME (Reset Camera) */}
                                <button
                                    onClick={() => setResetCameraTrigger(prev => prev + 1)}
                                    className="p-1.5 rounded-lg border bg-glass-light border-glass-border text-gray-300 hover:text-white hover:border-neon-cyan/30 transition-all"
                                    title="Centrar Vista (Home)"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </button>
                            </>
                        )}

                        <div className="w-px h-6 bg-glass-border" />

                        {/* ... (Rest of buttons: Undo, Redo, Delete, etc.) ... */}


                        <button
                            onClick={onUndo}
                            disabled={!canUndo}
                            className={`p-1.5 rounded-lg border transition-all ${canUndo ? 'bg-glass-light border-glass-border text-gray-300 hover:text-white hover:border-neon-cyan/30' : 'opacity-30 cursor-not-allowed border-transparent text-gray-600'}`}
                            title="Deshacer (Ctrl+Z)"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                            onClick={onRedo}
                            disabled={!canRedo}
                            className={`p-1.5 rounded-lg border transition-all ${canRedo ? 'bg-glass-light border-glass-border text-gray-300 hover:text-white hover:border-neon-cyan/30' : 'opacity-30 cursor-not-allowed border-transparent text-gray-600'}`}
                            title="Rehacer (Ctrl+Y)"
                        >
                            <RotateCw className="w-4 h-4" />
                        </button>

                        <button
                            onClick={deleteSelectedNodes}
                            className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-sm font-medium transition-all flex items-center gap-2"
                            title="Eliminar seleccionados (Delete)"
                        >
                            <Trash2 className="w-4 h-4" />
                            Eliminar
                        </button>
                        <button
                            onClick={clearCanvas}
                            className="px-3 py-1.5 rounded-lg bg-glass-light border border-glass-border text-gray-300 hover:text-white hover:border-neon-cyan/30 text-sm transition-all"
                        >
                            Limpiar
                        </button>
                        <button
                            onClick={saveDesign}
                            className="px-3 py-1.5 rounded-lg bg-glass-light border border-glass-border text-gray-300 hover:text-white hover:border-neon-cyan/30 text-sm transition-all"
                        >
                            Guardar
                        </button>
                        <button
                            onClick={loadDesign}
                            className="px-3 py-1.5 rounded-lg bg-glass-light border border-glass-border text-gray-300 hover:text-white hover:border-neon-cyan/30 text-sm transition-all"
                        >
                            Cargar
                        </button>
                        <button className="px-3 py-1.5 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/20 text-sm font-medium transition-all">
                            Exportar
                        </button>
                    </div>
                </div>

                {/* Layout principal */}
                <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
                    {/* Librería de equipos - Izquierda */}
                    <div className="col-span-2 border-r border-glass-border bg-deep/50 backdrop-blur-xl overflow-y-auto">
                        <EquipmentLibrary
                            customEquipments={customEquipments}
                            onCreateEquipment={() => setIsCreateEquipmentOpen(true)}
                            onSelectEquipment={setPlacingEquipment}
                            selectedEquipmentType={placingEquipment}
                        />
                    </div>

                    {/* Canvas - Centro */}
                    <div className="col-span-7 relative">
                        {viewMode === '2d' ? (
                            <>
                                <ReactFlow
                                    nodes={nodes}
                                    edges={edges}
                                    onNodesChange={onNodesChange}
                                    onEdgesChange={onEdgesChange}
                                    onConnect={onConnect}
                                    onDrop={onDrop}
                                    onDragOver={onDragOver}
                                    onNodeClick={onNodeClick}
                                    onNodeDragStart={() => takeSnapshot(nodes, edges)}
                                    nodeTypes={nodeTypes}
                                    edgeTypes={edgeTypes}
                                    fitView
                                    className="bg-deep"
                                >
                                    <Background
                                        variant="dots"
                                        gap={20}
                                        size={1}
                                        color="rgba(255,255,255,0.08)"
                                        className="bg-deep"
                                    />
                                    <Controls className="bg-glass-light border border-glass-border rounded-xl overflow-hidden" />
                                    <MiniMap
                                        className="bg-glass-light border border-glass-border rounded-xl"
                                        nodeColor={(node) => {
                                            switch (node.data.type) {
                                                case 'Mezcladora':
                                                    return '#00F0FF';
                                                case 'Extrusora':
                                                    return '#8B5CF6';
                                                case 'Molino':
                                                    return '#10b981';
                                                default:
                                                    return '#6b7280';
                                            }
                                        }}
                                    />
                                </ReactFlow>

                                {/* Barra de conectores solo en 2D */}
                                <EdgeToolbar
                                    selectedEdgeType={selectedEdgeType}
                                    onSelectEdgeType={setSelectedEdgeType}
                                />
                            </>
                        ) : (
                            /* Vista 3D */
                            <Flow3DViewer
                                nodes={nodes}
                                edges={edges}
                                onNodeClick={onNodeClick}
                                fxEnabled={isFxEnabled} // Control desde el padre
                                onFxChange={setIsFxEnabled} // Sincronizar cambios desde el hijo
                                isControlsOpen={isLayoutControlsOpen}
                                onControlsOpenChange={setIsLayoutControlsOpen}
                                onNodeDrop={handle3DNodeDrop}
                                placingEquipment={placingEquipment}
                                onEquipmentPlaced={handleEquipmentPlaced}
                                pickingAnchorNodeId={pickingAnchorNodeId}
                                onPickingAnchorChange={setPickingAnchorNodeId}
                                onConnect={onConnect}
                                resetCameraTrigger={resetCameraTrigger}
                            />
                        )}
                    </div>

                    {/* Panel de métricas - Derecha */}
                    <div className="col-span-3 border-l border-glass-border bg-deep/50 backdrop-blur-xl overflow-y-auto">
                        <MetricsPanel metrics={metrics} nodes={nodes} />
                    </div>
                </div>
            </div>

            {/* Modales fuera del contenedor principal usando Portal */}
            {isPropertiesOpen && selectedNode && createPortal(
                <NodePropertiesModal
                    node={selectedNode}
                    onClose={() => setIsPropertiesOpen(false)}
                    onUpdate={updateNodeData}
                    onSetAnchor={() => {
                        setIsPropertiesOpen(false);
                        setPickingAnchorNodeId(selectedNode.id);
                        if (viewMode !== '3d') {
                            setViewMode('3d');
                            localStorage.setItem('flowDesigner_viewMode', '3d');
                        }
                    }}
                />,
                document.body
            )}

            {isCreateEquipmentOpen && createPortal(
                <CreateEquipmentModal
                    onClose={() => setIsCreateEquipmentOpen(false)}
                    onSave={addCustomEquipment}
                />,
                document.body
            )}
        </>
    );
}

export default FlowDesignerPage;
