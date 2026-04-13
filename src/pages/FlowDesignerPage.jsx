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
import { Trash2, Plus, Scan, Box, RotateCcw, RotateCw, FolderOpen, Save, Minimize2, ArrowUp, ArrowDown, Maximize2, HardDrive, ChevronLeft, ChevronRight } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import EquipmentLibrary from '@/components/flow/EquipmentLibrary';
import MetricsPanel from '@/components/flow/MetricsPanel';
import CustomNode from '@/components/flow/CustomNode';
import AnimatedEdge from '@/components/flow/AnimatedEdge';
import NodePropertiesModal from '@/components/flow/NodePropertiesModal';
import CreateEquipmentModal from '@/components/flow/CreateEquipmentModal';
import EdgeToolbar from '@/components/flow/EdgeToolbar';
import Flow3DViewer from '@/components/flow/Flow3DViewer';
import FlowDesignsLibrary from '@/components/flow/FlowDesignsLibrary';
import SaveDesignModal from '@/components/flow/SaveDesignModal';
import SimulationSettingsModal from '@/components/flow/SimulationSettingsModal';
import { useFlowSimulation } from '@/hooks/useFlowSimulation';
import { useFlowHistory } from '@/hooks/useFlowHistory';
import { useFlowDesigns } from '@/hooks/useFlowDesigns';
import { useProject } from '@/context/ProjectContext';

const nodeTypes = {
    custom: CustomNode,
};

const edgeTypes = {
    animated: AnimatedEdge,
};

function FlowDesignerPage() {
    const { updateCalculatorMetrics, setAnalysisResults, saveProjectToSupabase, projectData } = useProject();
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
        return localStorage.getItem('flowDesigner_viewMode') || '2d';
    });
    const [isFxEnabled, setIsFxEnabled] = useState(false); // Estado FX Global
    const [isLayoutControlsOpen, setIsLayoutControlsOpen] = useState(false); // Panel Entorno
    const [placingEquipment, setPlacingEquipment] = useState(null); // Estado para placement manual
    const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Estado para colapsar barra lateral

    const [pickingAnchorNodeId, setPickingAnchorNodeId] = useState(null); // Estado para picking de anclaje
    const [resetCameraTrigger, setResetCameraTrigger] = useState(0); // Trigger para reset cámara

    // Estados para librería de diseños
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [currentDesignId, setCurrentDesignId] = useState(null);
    const [currentDesignName, setCurrentDesignName] = useState('');
    const { loadDesign: loadDesignFromDb, saveDesign: saveDesignToDb, updateDesign: updateDesignInDb } = useFlowDesigns();
    const [labelsCollapsed, setLabelsCollapsed] = useState(false); // Estado para colapsar fichas
    const [currentLayout, setCurrentLayout] = useState(null); // Estado para el layout 3D (GLB)
    const [labelHeightOffset, setLabelHeightOffset] = useState(() => {
        const saved = localStorage.getItem('flowDesigner_labelHeightOffset');
        return saved ? Number(saved) : 0;
    }); // Offset global de altura de fichas
    const [isFullScreen, setIsFullScreen] = useState(false); // Estado para pantalla completa 3D

    // Estados para Configuración de Simulación
    const [simulationConfig, setSimulationConfig] = useState({});
    const [isSimulationSettingsOpen, setIsSimulationSettingsOpen] = useState(false);

    // PERSISTENCIA AUTOMÁTICA (Auto-Save)
    // Cargar estado al iniciar
    useEffect(() => {
        try {
            const savedNodes = localStorage.getItem('flowDesigner_nodes');
            const savedEdges = localStorage.getItem('flowDesigner_edges');
            const savedDesignId = localStorage.getItem('flowDesigner_currentDesignId');
            const savedDesignName = localStorage.getItem('flowDesigner_currentDesignName');
            const savedConfig = localStorage.getItem('flowDesigner_simulationConfig');
            const savedLayout = localStorage.getItem('flowDesigner_currentLayout');
            const savedLabelOffset = localStorage.getItem('flowDesigner_labelHeightOffset');

            if (savedNodes) {
                const parsedNodes = JSON.parse(savedNodes);
                if (parsedNodes.length > 0) setNodes(parsedNodes);
            }
            if (savedEdges) {
                const parsedEdges = JSON.parse(savedEdges);
                if (parsedEdges.length > 0) setEdges(parsedEdges);
            }
            if (savedDesignId) setCurrentDesignId(savedDesignId);
            if (savedDesignName) setCurrentDesignName(savedDesignName);
            if (savedConfig) setSimulationConfig(JSON.parse(savedConfig));
            if (savedLayout) setCurrentLayout(JSON.parse(savedLayout));
            if (savedLabelOffset) setLabelHeightOffset(Number(savedLabelOffset));
        } catch (e) {
            console.error("Error loading saved state", e);
        }
    }, [setNodes, setEdges]); // Escalar dependence array

    // Guardar estado al cambiar (con debounce implícito por render o efecto)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (nodes.length > 0) localStorage.setItem('flowDesigner_nodes', JSON.stringify(nodes));
            if (edges.length > 0) localStorage.setItem('flowDesigner_edges', JSON.stringify(edges));
            localStorage.setItem('flowDesigner_simulationConfig', JSON.stringify(simulationConfig));
            if (currentLayout) localStorage.setItem('flowDesigner_currentLayout', JSON.stringify(currentLayout));
            localStorage.setItem('flowDesigner_labelHeightOffset', String(labelHeightOffset));

            if (currentDesignId) localStorage.setItem('flowDesigner_currentDesignId', currentDesignId);
            if (currentDesignName) localStorage.setItem('flowDesigner_currentDesignName', currentDesignName);
        }, 1000); // Guardar 1 segundo después del último cambio para no saturar

        return () => clearTimeout(timeoutId);
    }, [nodes, edges, currentDesignId, currentDesignName, simulationConfig, currentLayout, labelHeightOffset]);

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

        // Convert 3D position (meters) to 2D ReactFlow position (pixels)
        // Scale factor: 50 pixels per meter
        // 3D X -> 2D X
        // 3D Z -> 2D Y
        const scale = 80;
        const x2d = position3D.x * scale;
        const y2d = position3D.z * scale;

        const newNode = {
            id: `eq_${Date.now()}`,
            type: 'custom',
            position: { x: x2d, y: y2d },
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

        const scale = 80;
        const x2d = position3D.x * scale;
        const y2d = position3D.z * scale;

        const newNode = {
            id: `eq_${Date.now()}`,
            type: 'custom',
            position: { x: x2d, y: y2d },
            data: {
                ...placingEquipment,
                label: `${placingEquipment.type} ${nodes.length + 1}`,
                position3D
            },
        };
        setNodes((nds) => nds.concat(newNode));
        setPlacingEquipment(null);
    }, [placingEquipment, nodes, setNodes]);

    // Calcular métricas en tiempo real con configuración dinámica
    const metrics = useFlowSimulation(nodes, edges, simulationConfig);

    // Helper para determinar color del flujo según origen
    const getFlowColor = useCallback((sourceId) => {
        const sourceNode = nodes.find(n => n.id === sourceId);
        if (!sourceNode) return '#00F0FF';

        const colorMap = {
            'Mezcladora': '#00F0FF', // Cyan
            'Extrusora': '#8B5CF6', // Purple
            'Molino': '#10b981',    // Emerald
            'Secadora': '#f59e0b',  // Amber
            'Empacadora': '#ec4899',// Pink
            'Transportador': '#06b6d4', // Cyan dark
        };

        const type = sourceNode.data?.type || '';
        const typeKey = Object.keys(colorMap).find(k => k.toLowerCase() === type.toLowerCase());

        return sourceNode.data?.color || (typeKey ? colorMap[typeKey] : '#00F0FF');
    }, [nodes]);

    // Manejar conexiones
    const onConnect = useCallback(
        (params) => {
            takeSnapshot(nodes, edges);
            const flowColor = getFlowColor(params.source);

            const newEdge = {
                ...params,
                type: selectedEdgeType.type === 'animated' ? 'animated' : selectedEdgeType.type,
                animated: selectedEdgeType.animated,
                style: {
                    stroke: flowColor,
                    strokeWidth: selectedEdgeType.animated ? 3 : 2
                },
            };
            setEdges((eds) => addEdge(newEdge, eds));
        },
        [setEdges, selectedEdgeType, getFlowColor, nodes, takeSnapshot, edges]
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

    // Sincronizar con Panel de Análisis
    const handleSyncToAnalysis = useCallback(async () => {
        // Calcular inversión total si no viene en métricas
        const totalInvestment = nodes.reduce((acc, n) => acc + (n.data.cost || 0), 0);

        // Preparar datos para el Dashboard
        const analysisData = {
            monthlyRevenue: metrics.revenuePerMonth || 0,
            monthlyCost: metrics.costPerMonth || 0,
            investment: totalInvestment,
            netProfitMonthly: metrics.netProfitPerMonth || 0,
            roi: metrics.roi || 0,
            // Estimaciones simples para completar el dashboard
            paybackYears: metrics.netProfitPerMonth > 0 ? (totalInvestment / (metrics.netProfitPerMonth * 12)) : 0,
            irr: metrics.roi > 0 ? (metrics.roi / 100) : 0,
            notes: `Simulación Flow Designer: ${currentDesignName || 'Sin Nombre'}`
        };

        // Actualizar Contexto Global
        // Mapeamos a las estructuras que espera el Dashboard (si es necesario ajustar nombres)
        updateCalculatorMetrics({
            ...analysisData,
            revenue: analysisData.monthlyRevenue,
            expenses: analysisData.monthlyCost,
            investment_amount: analysisData.investment
        });

        setAnalysisResults(analysisData);

        // Persistir
        await saveProjectToSupabase();

        alert("✅ Datos sincronizados correctamente. Ahora están disponibles en el Panel de Análisis.");
    }, [metrics, nodes, updateCalculatorMetrics, setAnalysisResults, saveProjectToSupabase, currentDesignName]);

    // Exportar Diseño y Métricas a PDF Profesional
    const handleExport = async () => {
        try {
            const canvasElement = document.getElementById('flow-designer-canvas');
            if (!canvasElement) return;

            // 0. Simulation Defaults
            const config = {
                electricityRate: simulationConfig.electricityRate ?? 0.15,
                pricePerKg: simulationConfig.pricePerKg ?? 2.5,
                daysPerMonth: simulationConfig.daysPerMonth ?? 30,
                hoursPerShift: simulationConfig.hoursPerShift ?? 8,
                shiftsPerDay: simulationConfig.shiftsPerDay ?? 3,
                rawMaterialCost: simulationConfig.rawMaterialCost ?? 0,
                operatorCount: simulationConfig.operatorCount ?? 0,
                operatorCost: simulationConfig.operatorCost ?? 0
            };

            // 1. Prepare UI for Capture (Hide Overlays)
            document.body.classList.add('exporting-mode');

            // Add style to hide elements
            const style = document.createElement('style');
            style.id = 'export-styles';
            // Added .react-flow__handle to hide connection handles
            style.innerHTML = `
                .exporting-mode .export-hidden { display: none !important; }
                .exporting-mode .react-flow__controls { display: none !important; }
                .exporting-mode .react-flow__attribution { display: none !important; }
                .exporting-mode .react-flow__handle { display: none !important; opacity: 0 !important; visibility: hidden !important; }
                .exporting-mode .react-flow__panel { display: none !important; }
            `;
            document.head.appendChild(style);

            // Wait for render update
            await new Promise(resolve => setTimeout(resolve, 800));

            // 2. Capture Canvas
            const canvas = await html2canvas(canvasElement, {
                useCORS: true,
                allowTaint: true,
                scale: 2, // High resolution
                backgroundColor: '#070A12',
                ignoreElements: (element) => {
                    return element.classList.contains('export-hidden');
                }
            });

            // 3. Restore UI
            document.body.classList.remove('exporting-mode');
            document.head.removeChild(style);

            const imgData = canvas.toDataURL('image/png');

            // 4. Generate PDF
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 15;

            // --- Background & Branding ---
            // Dark Header Bar
            pdf.setFillColor(7, 10, 18); // #070A12
            pdf.rect(0, 0, pageWidth, 25, 'F');

            // Logo Text
            pdf.setTextColor(0, 240, 255); // Neon Cyan
            pdf.setFontSize(22);
            pdf.setFont('helvetica', 'bold');
            pdf.text('PANDORA', margin, 17);

            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'normal');

            // Client Name & Report Title
            const clientName = projectData?.name || currentDesignName || 'Cliente';
            pdf.text(`|  Reporte de Simulación - ${clientName}`, margin + 45, 17);

            // Date
            pdf.setFontSize(10);
            pdf.setTextColor(150, 150, 150);
            pdf.text(`${new Date().toLocaleString()}`, pageWidth - margin, 17, { align: 'right' });

            // --- Main Content Grid ---
            let currentY = 35;

            // --- Section 1: Key Metrics Cards (Top Row) ---
            const drawMetricCard = (x, y, label, value, unit, color = [0, 240, 255]) => {
                // Card Background
                pdf.setFillColor(245, 247, 250);
                pdf.setDrawColor(220, 220, 220);
                pdf.roundedRect(x, y, 60, 25, 3, 3, 'FD'); // Increased width slightly

                // Accent Line
                pdf.setDrawColor(color[0], color[1], color[2]);
                pdf.setLineWidth(1);
                pdf.line(x, y + 25, x + 60, y + 25); // Bottom accent

                // Label
                pdf.setTextColor(100, 100, 100);
                pdf.setFontSize(8);
                pdf.setFont('helvetica', 'bold');
                pdf.text(label.toUpperCase(), x + 4, y + 8);

                // Value and Unit Logic
                pdf.setTextColor(30, 30, 30);
                pdf.setFontSize(12); // Slightly smaller value font to avoid overlap
                pdf.setFont('helvetica', 'bold');

                // Draw Value
                pdf.text(value, x + 4, y + 18);

                // Draw Unit (Next to it but with space, or below if needed)
                if (unit) {
                    const valueWidth = pdf.getTextWidth(value);
                    pdf.setFontSize(8);
                    pdf.setTextColor(150, 150, 150);
                    // Place unit slightly offset Y to align baseline
                    pdf.text(unit, x + 4 + valueWidth + 2, y + 18);
                }
            };

            // Metrics Data
            drawMetricCard(margin, currentY, 'Capacidad Total', `${metrics.bottleneck || 0}`, 'kg/h', [0, 240, 255]);
            drawMetricCard(margin + 65, currentY, 'Producción Mensual', `${metrics.productionPerMonth?.toLocaleString() || 0}`, 'kg', [16, 185, 129]);
            drawMetricCard(margin + 130, currentY, 'Utilidad Neta', `$${metrics.netProfitPerMonth?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || 0}`, '/ mes', [132, 204, 22]);
            drawMetricCard(margin + 195, currentY, 'ROI Estimado', `${metrics.roi || 0}`, '%', [236, 72, 153]);

            currentY += 35;

            // --- Section 2: 3D Visualization (Large Image) ---
            // Calculate Aspect Ratio correctly
            const imgProps = pdf.getImageProperties(imgData);
            const contentWidth = pageWidth - (margin * 2);
            const maxContentHeight = 100; // Limit height to leave room for footer

            let imgWidth = contentWidth;
            let imgHeight = (imgProps.height * imgWidth) / imgProps.width;

            // If height exceeds max, scale down width
            if (imgHeight > maxContentHeight) {
                imgHeight = maxContentHeight;
                imgWidth = (imgProps.width * imgHeight) / imgProps.height;
            }

            // Centering image if scaled down width
            const xOffset = margin + (contentWidth - imgWidth) / 2;

            // Image Frame
            pdf.setDrawColor(230, 230, 230);
            pdf.rect(xOffset - 1, currentY - 1, imgWidth + 2, imgHeight + 2);

            // Add Image
            pdf.addImage(imgData, 'PNG', xOffset, currentY, imgWidth, imgHeight);

            // Watermark overlay on image
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(10);
            pdf.text('Modelo 3D - Vista de Planta', xOffset + 5, currentY + imgHeight - 5);

            currentY += imgHeight + 10;

            // --- Section 3: Financial & Operational Breakdown (Bottom Row) ---

            // 3.1 Cost Breakdown Header
            pdf.setFontSize(10);
            pdf.setTextColor(0, 0, 0);
            pdf.text('Desglose de Costos Operativos Mensuales y Parámetros:', margin, currentY);
            currentY += 7;

            // Parameters Grid
            pdf.setFontSize(9);
            pdf.setTextColor(80, 80, 80);

            const paramList = [
                { l: 'Tarifa Eléctrica', v: `$${config.electricityRate}/kWh` },
                { l: 'Horas Operativas', v: `${config.hoursPerShift}h x ${config.shiftsPerDay} turnos` },
                { l: 'Días Operativos', v: `${config.daysPerMonth} días/mes` },
                { l: 'Materia Prima', v: `$${config.rawMaterialCost}/kg` },
                { l: 'Fuerza Laboral', v: `${config.operatorCount} ops @ $${config.operatorCost}` },
                { l: 'Consumo Energía', v: `${metrics.totalPower} kW` },
                { l: 'Costo Operativo', v: `$${metrics.costPerMonth?.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
            ];

            const boxHeight = 16;
            const boxGap = 4;
            // Calculate width based on 4 columns with gaps
            const paramBoxWidth = (pageWidth - (margin * 2) - (boxGap * 3)) / 4;

            let pX = margin;
            let pY = currentY + 2; // Start a bit lower

            paramList.forEach((p, i) => {
                // Background Box
                pdf.setFillColor(248, 250, 252);
                pdf.setDrawColor(226, 232, 240);
                pdf.roundedRect(pX, pY, paramBoxWidth, boxHeight, 2, 2, 'FD');

                // Label (Top)
                pdf.setFontSize(7);
                pdf.setTextColor(100, 116, 139); // Slate 500
                pdf.setFont('helvetica', 'bold');
                pdf.text(p.l.toUpperCase(), pX + 3, pY + 6);

                // Value (Bottom)
                pdf.setFontSize(9);
                pdf.setTextColor(15, 23, 42); // Slate 900
                pdf.setFont('helvetica', 'normal');
                pdf.text(p.v, pX + 3, pY + 13);

                // Move Position
                pX += paramBoxWidth + boxGap;

                // Row Check (4 cols)
                if ((i + 1) % 4 === 0) {
                    pX = margin;
                    pY += boxHeight + boxGap;
                }
            });

            // Footer (Fixed at bottom)
            pdf.setFontSize(8);
            pdf.setTextColor(180, 180, 180);
            pdf.text('Reporte generado automáticamente por PANDORA Platform. Los valores son estimaciones basadas en parámetros de simulación.', pageWidth / 2, pageHeight - 10, { align: 'center' });

            // Save
            pdf.save(`PANDORA_Report_${currentDesignName || 'Project'}.pdf`);

        } catch (error) {
            console.error('Error exporting PDF:', error);
            alert('Hubo un error al generar el reporte PDF. Por favor intenta de nuevo.');
            document.body.classList.remove('exporting-mode');
        }
    };

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
                if (isFullScreen) {
                    setIsFullScreen(false);
                } else {
                    setSelectedNode(null);
                    setIsPropertiesOpen(false);
                    setIsCreateEquipmentOpen(false);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [deleteSelectedNodes, onUndo, onRedo, takeSnapshot, nodes, edges, isFullScreen]);

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

    // Guardar diseño a Supabase
    const handleSaveDesign = useCallback(async (name, description) => {
        // Empaquetar configuraciones de vista junto con el layout o como parte del layout
        const viewSettings = {
            viewMode,
            isFxEnabled,
            labelsCollapsed,
            labelHeightOffset,
            simulationConfig // Guardar config de simulación
        };

        // Construct layout payload, merging currentLayout (if any) with viewSettings
        const layoutPayload = {
            ...(currentLayout || {}),
            settings: viewSettings
        };

        if (currentDesignId) {
            // Actualizar existente
            const result = await updateDesignInDb(currentDesignId, { 
                name, 
                nodes, 
                edges, 
                customEquipments, 
                description, 
                layout: layoutPayload 
            });
            if (result) {
                setCurrentDesignName(name);
                alert('✅ Diseño actualizado con éxito');
            }
        } else {
            // Crear nuevo
            const result = await saveDesignToDb({ 
                name, 
                nodes, 
                edges, 
                customEquipments, 
                description, 
                layout: layoutPayload 
            });
            if (result) {
                setCurrentDesignId(result.id);
                setCurrentDesignName(name);
                alert('✅ Diseño guardado con éxito');
            }
        }
    }, [currentDesignId, nodes, edges, customEquipments, currentLayout, saveDesignToDb, updateDesignInDb, viewMode, isFxEnabled, labelsCollapsed, labelHeightOffset, simulationConfig]);

    // Cargar diseño desde librería
    const handleLoadDesign = useCallback(async (designId) => {
        const design = await loadDesignFromDb(designId);
        if (design) {
            setNodes(design.nodes || []);
            setEdges(design.edges || []);
            setCustomEquipments(design.custom_equipments || []);

            // Restaurar layout y configuraciones
            if (design.layout) {
                setCurrentLayout(design.layout);
                if (design.layout.settings) {
                    const s = design.layout.settings;
                    if (s.viewMode) setViewMode(s.viewMode);
                    if (s.isFxEnabled !== undefined) setIsFxEnabled(s.isFxEnabled);
                    if (s.labelsCollapsed !== undefined) setLabelsCollapsed(s.labelsCollapsed);
                    if (s.labelHeightOffset !== undefined) setLabelHeightOffset(s.labelHeightOffset);
                    if (s.simulationConfig) setSimulationConfig(s.simulationConfig);
                }
            } else {
                setCurrentLayout(null);
            }

            setCurrentDesignId(design.id);
            setCurrentDesignName(design.name);
            setIsLibraryOpen(false);
            alert(`✅ Diseño "${design.name}" cargado`);
        }
    }, [loadDesignFromDb, setNodes, setEdges]);

    // Nuevo diseño (limpiar canvas)
    const handleNewDesign = useCallback(() => {
        if (nodes.length > 0 && !window.confirm('¿Descartar el diseño actual y crear uno nuevo?')) return;
        setNodes([]);
        setEdges([]);
        setCurrentLayout(null); // Limpiar layout
        setCurrentDesignId(null);
        setCurrentDesignName('');
        setIsLibraryOpen(false);
    }, [nodes, setNodes, setEdges]);

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

    // Guardar TODO (Local + Nube si existe)
    const handleQuickSave = useCallback(async () => {
        if (nodes.length === 0) return;

        // 1. Guardado Local (Inmediato/Seguro)
        localStorage.setItem('flowDesigner_nodes', JSON.stringify(nodes));
        localStorage.setItem('flowDesigner_edges', JSON.stringify(edges));
        localStorage.setItem('flowDesigner_simulationConfig', JSON.stringify(simulationConfig));
        if (currentLayout) localStorage.setItem('flowDesigner_currentLayout', JSON.stringify(currentLayout));
        localStorage.setItem('flowDesigner_viewMode', viewMode);
        localStorage.setItem('flowDesigner_labelHeightOffset', String(labelHeightOffset));

        if (currentDesignId) localStorage.setItem('flowDesigner_currentDesignId', currentDesignId);
        if (currentDesignName) localStorage.setItem('flowDesigner_currentDesignName', currentDesignName);

        // 2. Guardado en Nube (Si es un diseño ya guardado)
        if (currentDesignId) {
            const designData = {
                name: currentDesignName,
                nodes,
                edges,
                layout: {
                    viewMode,
                    simulationConfig,
                    currentLayout, // Entorno 3D
                    labelHeightOffset
                },
                updated_at: new Date()
            };

            try {
                // Actualizar en segundo plano sin bloquear (usando objeto de parámetros)
                updateDesignInDb(currentDesignId, {
                    name: currentDesignName,
                    nodes,
                    edges,
                    layout: {
                        viewMode,
                        simulationConfig,
                        currentLayout, 
                        labelHeightOffset
                    }
                }).then(() => {
                    console.log("☁️ Diseño actualizado en nube");
                });
            } catch (e) {
                console.error("Error guardando en nube:", e);
            }
        }

        // Feedback visual
        const btn = document.getElementById('btn-quick-save');
        if (btn) {
            const originalContent = btn.innerHTML;
            btn.classList.remove('bg-glass-light', 'border-glass-border', 'text-gray-300');
            btn.classList.add('bg-neon-green', 'border-neon-green', 'text-black', 'font-bold');
            btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><polyline points="20 6 9 17 4 12"></polyline></svg> Guardado!`;

            setTimeout(() => {
                btn.classList.remove('bg-neon-green', 'border-neon-green', 'text-black', 'font-bold');
                btn.classList.add('bg-glass-light', 'border-glass-border', 'text-gray-300');
                btn.innerHTML = originalContent;
            }, 1500);
        }
    }, [nodes, edges, simulationConfig, currentDesignId, currentDesignName, currentLayout, viewMode, updateDesignInDb]);

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

                                <button
                                    onClick={() => setLabelsCollapsed(!labelsCollapsed)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-sm font-medium ${labelsCollapsed
                                        ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.3)]'
                                        : 'bg-glass-light border-glass-border text-gray-400 hover:text-white hover:border-gray-500'
                                        }`}
                                    title={labelsCollapsed ? 'Mostrar Fichas Completas' : 'Minimizar Fichas'}
                                >
                                    <Minimize2 className="w-4 h-4" />
                                    <span className="hidden sm:inline">{labelsCollapsed ? 'Fichas' : 'Mini'}</span>
                                </button>

                                {/* Control de altura de fichas */}
                                <div className="flex items-center gap-1 bg-glass-light border border-glass-border rounded-lg px-2 py-1">
                                    <button
                                        onClick={() => setLabelHeightOffset(prev => prev + 1)}
                                        className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-green-400 transition-colors"
                                        title="Subir Fichas"
                                    >
                                        <ArrowUp className="w-3 h-3" />
                                    </button>
                                    <span className="text-xs text-gray-400 min-w-[24px] text-center">{labelHeightOffset}</span>
                                    <button
                                        onClick={() => setLabelHeightOffset(prev => prev - 1)}
                                        className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors"
                                        title="Bajar Fichas"
                                    >
                                        <ArrowDown className="w-3 h-3" />
                                    </button>
                                </div>

                                <button
                                    onClick={() => setIsFullScreen(!isFullScreen)}
                                    className={`p-1.5 rounded-lg border transition-all ${isFullScreen
                                        ? 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/50 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                                        : 'bg-glass-light border-glass-border text-gray-300 hover:text-white hover:border-gray-500'
                                        }`}
                                    title={isFullScreen ? "Salir de Pantalla Completa (ESC)" : "Pantalla Completa"}
                                >
                                    {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
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
                            id="btn-quick-save"
                            onClick={handleQuickSave}
                            className="px-3 py-1.5 rounded-lg bg-glass-light border border-glass-border text-gray-300 hover:text-white hover:border-neon-cyan/30 text-sm transition-all flex items-center gap-2"
                            title="Guardar TODO (Local y Nube)"
                        >
                            <Save className="w-4 h-4" />
                            Guardar Todo
                        </button>

                        <button
                            onClick={() => setIsSaveModalOpen(true)}
                            className="px-3 py-1.5 rounded-lg bg-glass-light border border-glass-border text-gray-300 hover:text-white hover:border-neon-cyan/30 text-sm transition-all flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {currentDesignName || 'Guardar Proyecto'}
                        </button>
                        <button
                            onClick={() => setIsLibraryOpen(true)}
                            className="px-3 py-1.5 rounded-lg bg-neon-purple/10 border border-neon-purple/30 text-neon-purple hover:bg-neon-purple/20 text-sm font-medium transition-all flex items-center gap-2"
                        >
                            <FolderOpen className="w-4 h-4" />
                            Librería
                        </button>
                        <button
                            onClick={handleExport}
                            className="px-3 py-1.5 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/20 text-sm font-medium transition-all"
                        >
                            Exportar
                        </button>
                        <button
                            onClick={handleSyncToAnalysis}
                            className="px-3 py-1.5 rounded-lg bg-neon-blue/10 border border-neon-blue/30 text-neon-blue hover:bg-neon-blue/20 text-sm font-medium transition-all flex items-center gap-2"
                            title="Enviar datos al Panel Financiero"
                        >
                            <Box className="w-4 h-4" />
                            Sincronizar Panel
                        </button>
                    </div>
                </div>

                {/* Layout principal */}
                <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden relative">
                    {/* Librería de equipos - Izquierda */}
                    {isSidebarOpen && (
                        <div className="col-span-2 border-r border-glass-border bg-deep/50 backdrop-blur-xl overflow-y-auto transition-all duration-300">
                            <EquipmentLibrary
                                customEquipments={customEquipments}
                                onCreateEquipment={() => setIsCreateEquipmentOpen(true)}
                                onSelectEquipment={setPlacingEquipment}
                                selectedEquipmentType={placingEquipment}
                            />
                        </div>
                    )}

                    {/* Canvas - Centro */}
                    <div id="flow-designer-canvas" className={isFullScreen && viewMode === '3d' ? "fixed inset-0 z-[100] bg-deep" : (isSidebarOpen ? "col-span-8 relative transition-all duration-300" : "col-span-10 relative transition-all duration-300")}>
                        {/* Botón Flotante para Colapsar/Expandir Panel Izquierdo */}
                        {!isFullScreen && (
                            <button
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className="absolute top-1/2 -translate-y-1/2 left-0 z-50 w-5 h-16 bg-black/50 border-y border-r border-neon-cyan/30 rounded-r-xl flex items-center justify-center text-neon-cyan hover:bg-neon-cyan/20 hover:w-6 transition-all backdrop-blur-md shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                                title={isSidebarOpen ? "Ocultar Equipos" : "Mostrar Equipos"}
                            >
                                {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                            </button>
                        )}
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
                                labelsCollapsed={labelsCollapsed}
                                labelHeightOffset={labelHeightOffset}
                                layout={currentLayout}
                                onLayoutChange={setCurrentLayout}
                                isFullScreen={isFullScreen}
                                onFullScreenChange={setIsFullScreen}
                            />
                        )}
                    </div>

                    {/* Panel Derecho - Métricas */}
                    <div className="col-span-2 overflow-y-auto pr-2 custom-scrollbar">
                        <MetricsPanel
                            metrics={metrics}
                            nodes={nodes}
                            onOpenSettings={() => setIsSimulationSettingsOpen(true)}
                        />
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

            {isLibraryOpen && createPortal(
                <FlowDesignsLibrary
                    isOpen={isLibraryOpen}
                    onClose={() => setIsLibraryOpen(false)}
                    onLoad={handleLoadDesign}
                    onNewDesign={handleNewDesign}
                    currentDesignId={currentDesignId}
                />,
                document.body
            )}

            {/* Modal de Configuración de Simulación */}
            {createPortal(
                <SimulationSettingsModal
                    isOpen={isSimulationSettingsOpen}
                    onClose={() => setIsSimulationSettingsOpen(false)}
                    config={simulationConfig}
                    onSave={setSimulationConfig}
                />,
                document.body
            )}

            {/* Modal Guardar */}
            {isSaveModalOpen && createPortal(
                <SaveDesignModal
                    isOpen={isSaveModalOpen}
                    onClose={() => setIsSaveModalOpen(false)}
                    onSave={handleSaveDesign}
                    defaultName={currentDesignName}
                    isUpdate={!!currentDesignId}
                />,
                document.body
            )}
        </>
    );
}

export default FlowDesignerPage;
