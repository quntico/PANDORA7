import React, { useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Download, FileSpreadsheet, Zap, DollarSign, ListChecks, CheckCircle2 } from "lucide-react";

const modules = [
    {
        name: "1. UTILIDADES Y SERVICIOS",
        items: [
            "1.1 Generador agua caliente / caldera",
            "1.2 Bomba recirculación térmica",
            "1.3 Tanque buffer térmico",
            "1.4 Chiller industrial",
            "1.5 Bombas glicol",
            "1.6 HVAC industrial",
            "1.7 Deshumidificador industrial",
            "1.8 Sistema CIP completo",
            "1.9 Colector de polvo",
            "1.10 Sistema anti-explosión ATEX",
            "1.11 Compresor aire principal",
            "1.12 Secador aire + filtrado",
            "1.13 Compresor respaldo",
            "1.14 Sistema presurización agua",
            "1.15 Banco capacitores automático",
            "1.16 UPS PLC y control",
            "1.17 Ventilación tablero general",
            "1.18 Sistema contra incendio",
        ],
    },
    {
        name: "2. PREPARACIÓN FÓRMULA",
        items: [
            "2.1 Tolvas azúcar con pesaje",
            "2.2 Tolvas leche en polvo",
            "2.3 Tanque manteca fundida",
            "2.4 Tanque pasta cacao",
            "2.5 Mezclador horizontal intensivo",
            "2.6 Sistema dosificación gravimétrica",
            "2.7 Dosificador lecitina",
            "2.8 Dosificador vainilla",
            "2.9 Tamiz vibratorio sanitario",
            "2.10 Imán trampa sanitario",
            "2.11 Transporte tornillo flexible inoxidable",
        ],
    },
    {
        name: "3. PROCESO CHOCOLATE",
        items: [
            "3.1 Refinador 5 rodillos",
            "3.2 Conchadora industrial",
            "3.3 Tanques pulmón",
            "3.4 Templadora automática",
            "3.5 Moldeadora automática",
            "3.6 Túnel enfriamiento 12 m",
            "3.7 Desmoldador automático",
            "3.8 Empacadora flowpack primaria",
        ],
    },
    {
        name: "4. FIN DE LÍNEA",
        items: [
            "4.1 Detector de metales",
            "4.2 Checkweigher dinámico",
            "4.3 Encajonadora automática",
            "4.4 Paletizador automático",
            "4.5 Envolvedora pallet stretch",
            "4.6 Flejadora automática",
        ],
    },
    {
        name: "5. MANEJO Y LOGÍSTICA",
        items: [
            "5.1 Básculas industriales plataforma",
            "5.2 Montacargas 2.5 ton",
            "5.3 Apilador eléctrico",
            "5.4 Patines hidráulicos",
            "5.5 Estación descarga supersacos",
            "5.6 Racks almacenamiento",
        ],
    },
    {
        name: "6. CALIDAD Y LABORATORIO",
        items: [
            "6.1 Grindómetro micras",
            "6.2 Viscosímetro Brookfield",
            "6.3 Cámara climática de pruebas",
            "6.4 Instrumentación laboratorio completa",
        ],
    },
];

export default function ChocoVer32Master({ theme }) {
    const [data, setData] = useState({});
    const [meta, setMeta] = useState({ client: '', project: '', tc: 18.50 });

    // Use the provided theme accent color or default to #FFD400
    const accentColor = theme?.accent || "#FFD400";
    const primaryColor = theme?.primary || "#3B3B3B";
    const isLightText = primaryColor === '#FFFFFF' || primaryColor === '#F8F9FA';
    const headerTextColor = isLightText ? '#000000' : '#FFFFFF';

    const updateValue = (key, field, value) => {
        setData((prev) => ({
            ...prev,
            [key]: { ...prev[key], [field]: Number(value) },
        }));
    };

    const calculateItem = (itemKey) => {
        const item = data[itemKey] || {};
        const qty = item.qty || 1;
        const cost = item.cost || 0;
        const margin = item.margin || 0;
        return (cost + cost * (margin / 100)) * qty;
    };

    const totalUSD = () => {
        return Object.keys(data)
            .reduce((sum, key) => sum + calculateItem(key), 0);
    };

    const totalKW = () => {
        return Object.keys(data)
            .reduce((sum, key) => sum + ((data[key]?.kw || 0) * (data[key]?.qty || 1)), 0);
    };

    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [40, 40, 40];
    };

    const exportExcel = () => {
        try {
            let csv = "Equipo,QTY,Potencia (kW),Costo Unitario USD,Utilidad %,Venta Total USD\n";
            Object.keys(data).forEach((key) => {
                const item = data[key];
                if ((item.qty || 0) > 0 || (item.cost || 0) > 0) {
                    csv += `"${key}",${item.qty || 1},${item.kw || 0},${item.cost || 0},${item.margin || 0},${calculateItem(key)}\n`;
                }
            });

            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.setAttribute("download", "COTIZACION_CHOCO_VER_3_2.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Error exporting Excel:", error);
            alert("No se pudo exportar el archivo CSV Excel. Revisa tu consola para más detalles.");
        }
    };

    const exportPDF = () => {
        try {
            const doc = new jsPDF();
            const accentRgb = hexToRgb(accentColor);

            // Configuración base PDF - Cabecera Negra (estilo imagen 2)
            doc.setFillColor(0, 0, 0); // Header negro rigido
            doc.rect(0, 0, 210, 28, 'F');

            // Logo o Nombre de empresa
            doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            doc.text((theme?.name || "solifood").toLowerCase(), 15, 18);

            // Título Propuesta
            doc.setFontSize(18);
            doc.text("PROPUESTA ECONÓMICA", 195, 18, { align: 'right' });

            // Metadatos (Cliente, Proyecto, Fecha)
            doc.setTextColor(40, 40, 40);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");

            const formatterDate = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

            doc.text(`CLIENTE: ${meta.client.toUpperCase() || 'POR DEFINIR'}`, 15, 40);
            doc.text(`PROYECTO: ${meta.project.toUpperCase() || 'SIN NOMBRE'}`, 15, 46);
            doc.text(`FECHA: ${formatterDate.format(new Date())}`, 15, 52);

            // Preparar Filas
            const rows = Object.keys(data).filter(key => (data[key]?.cost || 0) > 0).map((key) => {
                const subtext = (data[key].qty || 1) > 1 ? `\n(Cantidad: ${data[key].qty} unidades)` : '';
                return [
                    `${key}${subtext}`,
                    `${(data[key]?.kw || 0).toFixed(1)} KW`,
                    `$${calculateItem(key).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                ];
            });

            autoTable(doc, {
                head: [["Descripción", "Potencia", "Importe"]],
                body: rows,
                startY: 65,
                theme: 'grid',
                headStyles: { fillColor: accentRgb, textColor: [0, 0, 0], fontStyle: 'bold' },
                bodyStyles: { textColor: [60, 60, 60] },
                styles: { fontSize: 9, cellPadding: 5, lineColor: [220, 220, 220], lineWidth: 0.1 },
                columnStyles: {
                    0: { halign: 'left' },
                    1: { halign: 'center', cellWidth: 30 },
                    2: { halign: 'right', cellWidth: 40, fontStyle: 'bold' }
                },
            });

            // Totales Finales PDF (Cuadro redondeado inferior derecho)
            const finalY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 150) + 15;

            // Check page break for the totals box (needs approx 60 units of space)
            let boxY = finalY;
            if (boxY + 60 > 280) {
                doc.addPage();
                boxY = 20;
            }

            // Draw Totals Box
            doc.setDrawColor(200, 200, 200);
            doc.setFillColor(252, 252, 252);
            doc.roundedRect(100, boxY, 95, 60, 3, 3, 'FD');

            // Text inside box
            const boxRightAlign = 185;
            const boxLeft = 105;
            let currentY = boxY + 12;

            doc.setFontSize(10);
            doc.setTextColor(40, 40, 40);
            doc.setFont("helvetica", "normal");
            doc.text("Potencia Total:", boxLeft, currentY);
            doc.text(`${totalKW().toFixed(2)} KW`, boxRightAlign, currentY, { align: 'right' });

            currentY += 10;
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]); // Yellow
            doc.text("TOTAL (USD):", boxLeft, currentY);
            doc.text(`$${totalUSD().toLocaleString("en-US", { minimumFractionDigits: 2 })}`, boxRightAlign, currentY, { align: 'right' });

            currentY += 8;
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(120, 120, 120);
            doc.text("PRECIOS MÁS 16% DE I.V.A", boxRightAlign, currentY, { align: 'right' });

            currentY += 12;
            doc.setFontSize(9);
            doc.text("T.C. estimado:", boxLeft, currentY);
            doc.text(`$${meta.tc.toFixed(2)} MXN`, boxRightAlign, currentY, { align: 'right' });

            currentY += 10;
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(0, 0, 0);
            doc.text("TOTAL (MXN):", boxLeft, currentY);
            const totalMXN = totalUSD() * meta.tc;
            doc.text(`MX$${totalMXN.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, boxRightAlign, currentY, { align: 'right' });

            doc.save(`PROPUESTA_${(meta.client || 'PANDORA').replace(/\s+/g, '_')}_CHOCO.pdf`);
        } catch (error) {
            console.error("Error exporting PDF:", error);
            alert("No se pudo exportar el PDF. Revisa tu consola para más detalles.");
        }
    };

    return (
        <div className="flex flex-col h-full animate-fade-in relative z-10 w-full" style={{ paddingRight: '8px' }}>

            {/* HEADER SECTION TIPO PANDORA */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 pb-6 border-b border-glass-border/50 gap-6">
                <div>
                    <h2 className="text-3xl font-black mb-2 flex items-center gap-3 w-full" style={{ color: headerTextColor }}>
                        <span className="p-2.5 rounded-xl border border-glass-border shrink-0" style={{ backgroundColor: `${accentColor}20` }}>
                            <ListChecks className="w-6 h-6" style={{ color: accentColor }} />
                        </span>
                        <span className="break-words">Master Listado: CHOCO VER 3.2</span>
                    </h2>
                    <p className="text-sm text-gray-400 max-w-2xl px-2">
                        Matriz de cotización predictiva con módulos enlazados. Ingresa variables, costos y márgenes de utilidad y Pandora calcula automáticamente los subtotales, venta final y consumos en kW totales.
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto shrink-0 mt-4 xl:mt-0">
                    <button
                        onClick={exportExcel}
                        className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-5 py-3 bg-glass border border-glass-border rounded-xl font-bold text-sm tracking-wide transition-all hover:bg-glass-light hover:-translate-y-0.5"
                        style={{ color: '#10B981' }} // Excel verde clásico
                    >
                        <FileSpreadsheet className="w-4 h-4" /> CSV Excel
                    </button>

                    <button
                        onClick={exportPDF}
                        className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm tracking-wide transition-all shadow-glow-sm hover:scale-105"
                        style={{ backgroundColor: accentColor, color: isLightText || primaryColor === '#3B3B3B' || accentColor.toUpperCase() === '#F2B705' ? '#000000' : '#FFFFFF', border: `1px solid ${accentColor}` }}
                    >
                        <Download className="w-4 h-4" /> PDF Formal
                    </button>
                </div>
            </div>

            {/* METADATA INPUTS SECTION */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 shrink-0">
                <div className="bg-glass-light border border-glass-border/50 p-4 rounded-xl flex flex-col justify-center">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Empresa / Cliente</label>
                    <input
                        type="text"
                        value={meta.client}
                        onChange={(e) => setMeta({ ...meta, client: e.target.value })}
                        className="w-full bg-deep/50 border border-glass-border/80 p-2 rounded-md text-white text-sm focus:outline-none focus:border-neon-cyan transition-colors placeholder:text-gray-600"
                        placeholder="Ej. Cristina Delfín"
                    />
                </div>
                <div className="bg-glass-light border border-glass-border/50 p-4 rounded-xl flex flex-col justify-center">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Nombre de Proyecto</label>
                    <input
                        type="text"
                        value={meta.project}
                        onChange={(e) => setMeta({ ...meta, project: e.target.value })}
                        className="w-full bg-deep/50 border border-glass-border/80 p-2 rounded-md text-white text-sm focus:outline-none focus:border-neon-cyan transition-colors placeholder:text-gray-600"
                        placeholder="Ej. Barra Manicero"
                    />
                </div>
                <div className="bg-glass-light border border-glass-border/50 p-4 rounded-xl flex flex-col justify-center">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">TC Proyectado (MXN)</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-xs">$</span>
                        <input
                            type="number"
                            step="0.01"
                            value={meta.tc}
                            onChange={(e) => setMeta({ ...meta, tc: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-deep/50 border border-glass-border/80 p-2 pl-7 rounded-md text-white font-mono text-sm focus:outline-none focus:border-neon-cyan transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* TABS METRICS RESUMEN */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 shrink-0">
                <div className="bg-glass-light border border-glass-border/50 p-6 rounded-2xl flex items-center justify-between transition-colors shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-full bg-emerald-500/10 -z-0 group-hover:scale-110 transition-transform"></div>
                    <div className="relative z-10 w-full min-w-0">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 flex justify-between w-full">Venta Total Calculada <DollarSign className="w-4 h-4 text-emerald-400" /></div>
                        <div className="text-3xl font-black text-white font-mono break-words w-full truncate" style={{ textShadow: '0 0 20px rgba(16,185,129,0.3)' }}>
                            $ {totalUSD().toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>

                <div className="bg-glass-light border border-glass-border/50 p-6 rounded-2xl flex items-center justify-between transition-colors shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-full bg-blue-500/10 -z-0 group-hover:scale-110 transition-transform"></div>
                    <div className="relative z-10 w-full min-w-0">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 flex justify-between w-full">Impacto Energético (kW) <Zap className="w-4 h-4 text-blue-400" /></div>
                        <div className="text-3xl font-black text-white font-mono break-words w-full truncate" style={{ textShadow: '0 0 20px rgba(59,130,246,0.3)' }}>
                            {totalKW().toFixed(2)}
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT BUILDER MODULES - SCROLLABLE Y RESPONSIVO */}
            <div className="flex-1 w-full flex flex-col gap-6" style={{ minHeight: '600px' }}>
                {modules.map((module) => (
                    <div key={module.name} className="bg-deep/50 border border-glass-border rounded-xl mb-4 overflow-hidden w-full max-w-full">
                        {/* Cabecera del Módulo */}
                        <div className="bg-glass px-4 py-3 border-b border-glass-border flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: accentColor }} />
                            <h3 className="font-bold tracking-wider text-sm lg:text-base pr-4" style={{ color: accentColor }}>{module.name}</h3>
                        </div>

                        {/* Tabla Responsive usando flex/grid y overflow horizontal */}
                        <div className="w-full overflow-x-auto stylized-scrollbar pb-2">
                            <div className="min-w-[850px] p-4 flex flex-col gap-2">
                                {/* Headers Columnas Interiores */}
                                <div className="grid grid-cols-12 gap-3 px-4 py-2 border-b border-glass-border/30 text-xs font-bold text-gray-400 uppercase tracking-widest bg-glass/20 rounded-md">
                                    <div className="col-span-4">Equipo / Concepto</div>
                                    <div className="col-span-1 text-center">QTY</div>
                                    <div className="col-span-2 text-right">Potencia (kW)</div>
                                    <div className="col-span-2 text-right">Costo USD Base</div>
                                    <div className="col-span-1 text-center">% Útil.</div>
                                    <div className="col-span-2 text-right text-white">Venta Final</div>
                                </div>

                                {/* Filas */}
                                {module.items.map((item) => (
                                    <div key={item} className="grid grid-cols-12 gap-3 items-center px-4 py-3 bg-glass-light hover:bg-glass/80 rounded-lg group transition-colors border border-transparent hover:border-glass-border">
                                        <div className="col-span-4 text-sm text-gray-200 truncate pr-2" title={item}>{item}</div>

                                        <div className="col-span-1">
                                            <input
                                                type="number"
                                                placeholder="1"
                                                className="w-full bg-deep border-glass-border border p-2 rounded-md text-white text-center text-sm focus:outline-none focus:border-neon-cyan transition-colors"
                                                min="0"
                                                onChange={(e) => updateValue(item, "qty", e.target.value)}
                                            />
                                        </div>

                                        <div className="col-span-2 relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">kW</span>
                                            <input
                                                type="number"
                                                placeholder="0.0"
                                                className="w-full bg-deep border-glass-border border p-2 pl-9 rounded-md text-white text-right text-sm focus:outline-none focus:border-neon-cyan transition-colors font-mono"
                                                min="0" step="0.1"
                                                onChange={(e) => updateValue(item, "kw", e.target.value)}
                                            />
                                        </div>

                                        <div className="col-span-2 relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">$</span>
                                            <input
                                                type="number"
                                                placeholder="0.00"
                                                className="w-full bg-deep border-glass-border border p-2 pl-7 rounded-md text-white text-right text-sm focus:outline-none focus:border-neon-cyan transition-colors font-mono"
                                                min="0" step="100"
                                                onChange={(e) => updateValue(item, "cost", e.target.value)}
                                            />
                                        </div>

                                        <div className="col-span-1 relative">
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%</span>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                className="w-full bg-deep border-glass-border border p-2 pr-7 rounded-md text-white text-center text-sm focus:outline-none focus:border-neon-cyan transition-colors"
                                                min="0" max="100"
                                                onChange={(e) => updateValue(item, "margin", e.target.value)}
                                            />
                                        </div>

                                        <div className="col-span-2 text-right">
                                            <span className="font-bold text-white font-mono tabular-nums text-sm lg:text-base block truncate pr-2" style={{ color: calculateItem(item) > 0 ? accentColor : '#9CA3AF' }}>
                                                $ {calculateItem(item).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
}
