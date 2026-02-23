import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Link, Download, FileSpreadsheet, Zap, DollarSign, ListChecks, CheckCircle2, FileText, ChevronDown, ChevronRight, FoldVertical, UnfoldVertical, Edit2, Plus, Trash2, AlignJustify, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const initialModules = [
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
        name: "3. FIN DE LÍNEA",
        items: [
            "3.1 Detector de metales",
            "3.2 Checkweigher dinámico",
            "3.3 Encajonadora automática",
            "3.4 Paletizador automática",
            "3.5 Envolvedora pallet stretch",
            "3.6 Flejadora automática",
        ],
    },
    {
        name: "4. MANEJO Y LOGÍSTICA",
        items: [
            "4.1 Básculas industriales plataforma",
            "4.2 Montacargas 2.5 ton",
            "4.3 Apilador eléctrico",
            "4.4 Patines hidráulicos",
            "4.5 Estación descarga supersacos",
            "4.6 Racks almacenamiento",
        ],
    },
    {
        name: "5. CALIDAD Y LABORATORIO",
        items: [
            "5.1 Grindómetro micras",
            "5.2 Viscosímetro Brookfield",
            "5.3 Cámara climática de pruebas",
            "5.4 Instrumentación laboratorio completa",
        ],
    },
];

export default function ChocoVer32Master({ theme }) {
    const [data, setData] = useState(() => {
        const saved34 = localStorage.getItem("choco34_data");
        if (saved34) return JSON.parse(saved34);

        const saved32 = localStorage.getItem("choco32_data");
        if (saved32) {
            const oldData = JSON.parse(saved32);
            const migratedData = {};
            for (const key in oldData) {
                let newKey = key;
                if (key.match(/^[456]\./)) {
                    const parts = key.split(" ");
                    const numPart = parts[0];
                    if (numPart.includes(".")) {
                        const [major, minor] = numPart.split(".");
                        const newMajor = parseInt(major) - 1;
                        if (newMajor >= 3) {
                            parts[0] = `${newMajor}.${minor}`;
                            newKey = parts.join(" ");
                        }
                    }
                }
                migratedData[newKey] = oldData[key];
            }
            return migratedData;
        }
        return {};
    });

    const [meta, setMeta] = useState(() => {
        const saved34 = localStorage.getItem("choco34_meta");
        if (saved34) return { client: '', project: '', tc: 18.50, pdfName: '', ...JSON.parse(saved34) };

        const saved32 = localStorage.getItem("choco32_meta");
        if (saved32) {
            return { client: '', project: '', tc: 18.50, pdfName: '', ...JSON.parse(saved32) };
        }
        return { client: '', project: '', tc: 18.50, pdfName: '' };
    });
    const [editingDescItem, setEditingDescItem] = useState(null);
    const [tempDesc, setTempDesc] = useState("");
    const [tempUrl, setTempUrl] = useState("");
    const [editingNameItem, setEditingNameItem] = useState(null);
    const [tempName, setTempName] = useState("");
    const [collapsedModules, setCollapsedModules] = useState({});

    // Nuevos estados para editor persistentes
    const [modules, setModules] = useState(() => {
        const saved34 = localStorage.getItem("choco34_modules");
        if (saved34) return JSON.parse(saved34);

        const saved32 = localStorage.getItem("choco32_modules");
        if (saved32) {
            let oldModules = JSON.parse(saved32);
            oldModules = oldModules.filter(m => !m.name.includes("3. PROCESO CHOCOLATE"));

            oldModules = oldModules.map(m => {
                let newName = m.name;
                const matchName = m.name.match(/^([456])\./);
                if (matchName) {
                    const newMajor = parseInt(matchName[1]) - 1;
                    newName = m.name.replace(/^([456])\./, `${newMajor}.`);
                }

                const newItems = m.items.map(item => {
                    const matchItem = item.match(/^([456])\./);
                    if (matchItem) {
                        const newMajor = parseInt(matchItem[1]) - 1;
                        return item.replace(/^([456])\./, `${newMajor}.`);
                    }
                    return item;
                });

                return { ...m, name: newName, items: newItems };
            });
            return oldModules;
        }

        return initialModules;
    });

    const [mainTitle, setMainTitle] = useState(() => {
        return localStorage.getItem("choco34_mainTitle") || localStorage.getItem("choco32_mainTitle") || "Master Listado: CHOCO VER 3.4";
    });
    const [isEditingMainTitle, setIsEditingMainTitle] = useState(false);
    const [mainDesc, setMainDesc] = useState(() => {
        return localStorage.getItem("choco34_mainDesc") || localStorage.getItem("choco32_mainDesc") || "Matriz de cotización predictiva con módulos enlazados. Ingresa variables, costos y márgenes de utilidad y Pandora calcula automáticamente los subtotales, venta final y consumos en kW totales.";
    });
    const [isEditingMainDesc, setIsEditingMainDesc] = useState(false);

    // Persistencia Automática
    useEffect(() => {
        localStorage.setItem("choco34_data", JSON.stringify(data));
        localStorage.setItem("choco34_meta", JSON.stringify(meta));
        localStorage.setItem("choco34_modules", JSON.stringify(modules));
        localStorage.setItem("choco34_mainTitle", mainTitle);
        localStorage.setItem("choco34_mainDesc", mainDesc);
    }, [data, meta, modules, mainTitle, mainDesc]);

    // Force official #FFCC00 yellow for Solifood to override any pale colors extracted by ColorThief
    const isSolifood = theme?.id === 'solifood' || (theme?.name && theme.name.toLowerCase() === 'solifood');
    const accentColor = isSolifood ? "#FFCC00" : (theme?.accent || "#FFCC00");
    const primaryColor = theme?.primary || "#3B3B3B";
    const isLightText = primaryColor === '#FFFFFF' || primaryColor === '#F8F9FA';
    const headerTextColor = isLightText ? '#000000' : '#FFFFFF';

    const sanitizePDFText = (text) => {
        if (!text) return "";
        return text.toString()
            .replace(/≤/g, "<=")
            .replace(/≥/g, ">=")
            .replace(/µ|μ/g, "u")
            .replace(/[“”]/g, '"')
            .replace(/[‘’]/g, "'")
            .replace(/–|—/g, "-")
            .replace(/[\u00A0\u1680\u180e\u2000-\u200b\u202f\u205f\u3000]/g, " ")
            .replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
    };

    const updateValue = (key, field, value) => {
        setData((prev) => {
            let processedValue = value;
            if (field !== 'desc' && field !== 'enabled' && field !== 'url') {
                processedValue = Number(value);
            }
            return {
                ...prev,
                [key]: { ...prev[key], [field]: processedValue },
            };
        });
    };

    const calculateItem = (itemKey) => {
        const item = data[itemKey] || {};
        if (item.enabled === false) return 0;
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
            .filter(key => data[key]?.enabled !== false)
            .reduce((sum, key) => sum + ((data[key]?.kw || 0) * (data[key]?.qty || 1)), 0);
    };

    const toggleModule = (moduleName) => {
        setCollapsedModules((prev) => ({ ...prev, [moduleName]: !prev[moduleName] }));
    };

    const toggleAllModules = (collapse) => {
        const newState = {};
        modules.forEach(m => newState[m.name] = collapse);
        setCollapsedModules(newState);
    };

    const handleAddModule = () => {
        const newIdx = modules.length + 1;
        setModules([...modules, { name: `${newIdx}. NUEVO MÓDULO PANDORA`, items: [] }]);
    };

    const handleAddItem = (moduleIndex) => {
        const newModules = [...modules];
        const newItemName = `Nuevo Equipo Personalizado ${Math.floor(Math.random() * 1000)}`;
        newModules[moduleIndex].items.push(newItemName);
        setModules(newModules);
    };

    const handleRemoveItem = (moduleIndex, itemIndex) => {
        const newModules = [...modules];
        newModules[moduleIndex].items.splice(itemIndex, 1);
        setModules(newModules);
    };

    const saveItemName = () => {
        if (!editingNameItem) return;
        const { mIndex, itemIndex, itemName } = editingNameItem;
        const finalName = tempName.trim();

        if (!finalName || finalName === itemName) {
            setEditingNameItem(null);
            return;
        }

        const newModules = [...modules];
        newModules[mIndex].items[itemIndex] = finalName;
        setModules(newModules);

        setData(prev => {
            const newData = { ...prev };
            // Transfer properties to the new key
            newData[finalName] = { ...(newData[itemName] || {}) };

            // Check if old name is used in any other module, if not, delete it
            const isUsedElsewhere = newModules.some((mod, idx) =>
                idx !== mIndex && mod.items.includes(itemName)
            );

            if (!isUsedElsewhere) {
                delete newData[itemName];
            }
            return newData;
        });

        setEditingNameItem(null);
    };

    const moduleTotalUSD = (module) => module.items.reduce((sum, item) => sum + calculateItem(item), 0);

    const moduleTotalKW = (module) => module.items.reduce((sum, item) => {
        const itemData = data[item];
        if (itemData?.enabled === false) return sum;
        return sum + ((itemData?.kw || 0) * (itemData?.qty || 1));
    }, 0);

    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [40, 40, 40];
    };

    const exportExcel = () => {
        try {
            let csv = "Módulo,Equipo,Descripción,QTY,Potencia (kW),Costo Unitario USD,Utilidad %,Venta Total USD\n";
            modules.forEach(module => {
                module.items.forEach(itemKey => {
                    const item = data[itemKey] || {};
                    const descSafe = (item.desc || "").replace(/"/g, '""');
                    const modSafe = (module.name || "").replace(/"/g, '""');
                    const keySafe = (itemKey || "").replace(/"/g, '""');
                    const qty = item.qty !== undefined ? item.qty : 1;
                    const kw = item.kw || 0;
                    const cost = item.cost || 0;
                    const margin = item.margin || 0;

                    csv += `"${modSafe}","${keySafe}","${descSafe}",${qty},${kw},${cost},${margin},${calculateItem(itemKey)}\n`;
                });
            });

            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.setAttribute("download", "PLANTILLA_PANDORA_MODULOS.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Error exporting Excel:", error);
            alert("No se pudo exportar el archivo CSV Excel. Revisa tu consola para más detalles.");
        }
    };

    const handleImportCSV = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target.result;
                const lines = text.split('\n').filter(line => line.trim());

                const parseCSVLine = (textLine) => {
                    const result = [];
                    let current = '';
                    let inQuotes = false;
                    for (let i = 0; i < textLine.length; i++) {
                        const char = textLine[i];
                        if (char === '"') {
                            if (inQuotes && textLine[i + 1] === '"') {
                                current += '"';
                                i++;
                            } else {
                                inQuotes = !inQuotes;
                            }
                        } else if (char === ',' && !inQuotes) {
                            result.push(current);
                            current = '';
                        } else {
                            current += char;
                        }
                    }
                    result.push(current);
                    return result;
                };

                const parsedLines = lines.slice(1).map(parseCSVLine);
                const importedModules = [];
                const importedData = { ...data };

                parsedLines.forEach(cols => {
                    if (cols.length < 7) return;
                    const modName = cols[0].trim();
                    const itemName = cols[1].trim();
                    const desc = cols[2].trim();
                    const qty = parseFloat(cols[3]) || 1;
                    const kw = parseFloat(cols[4]) || 0;
                    const cost = parseFloat(cols[5]) || 0;
                    const margin = parseFloat(cols[6]) || 0;

                    let modIndex = importedModules.findIndex(m => m.name === modName);
                    if (modIndex === -1) {
                        importedModules.push({ name: modName, items: [] });
                        modIndex = importedModules.length - 1;
                    }

                    if (!importedModules[modIndex].items.includes(itemName)) {
                        importedModules[modIndex].items.push(itemName);
                    }

                    importedData[itemName] = {
                        ...importedData[itemName], // Mantener otros estados como enabled si existían
                        desc, qty, kw, cost, margin, enabled: true
                    };
                });

                if (importedModules.length > 0) {
                    setModules(importedModules);
                    setData(importedData);
                }

                e.target.value = null; // reset input
            } catch (err) {
                console.error("Error parsing CSV:", err);
                alert("Error al procesar el archivo CSV. Comprueba que el formato sea el correcto exportado por PANDORA.");
            }
        };
        reader.readAsText(file);
    };

    const exportPDF = () => {
        try {
            const doc = new jsPDF();
            const accentRgb = hexToRgb(accentColor);

            // Configuración base PDF - Cabecera Negra (estilo imagen 2)
            doc.setFillColor(0, 0, 0); // Header negro rigido
            doc.rect(0, 0, 210, 28, 'F');

            // Logo o Nombre de empresa
            if (theme?.logoUrl && theme.logoUrl.startsWith('data:image')) {
                try {
                    const imgProps = doc.getImageProperties(theme.logoUrl);
                    const maxLogoWidth = 45;
                    const maxLogoHeight = 18;
                    const ratio = Math.min(maxLogoWidth / imgProps.width, maxLogoHeight / imgProps.height);

                    const finalWidth = imgProps.width * ratio;
                    const finalHeight = imgProps.height * ratio;
                    const yPos = 14 - (finalHeight / 2); // Center vertically in 28mm header

                    doc.addImage(theme.logoUrl, imgProps.fileType || 'PNG', 15, yPos, finalWidth, finalHeight);
                } catch (imgError) {
                    console.error("Error drawing logo in PDF:", imgError);
                    // Fallback to Text
                    doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
                    doc.setFontSize(22);
                    doc.setFont("helvetica", "bold");
                    doc.text((theme?.name || "solifood").toLowerCase(), 15, 18);
                }
            } else {
                doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
                doc.setFontSize(22);
                doc.setFont("helvetica", "bold");
                doc.text((theme?.name || "solifood").toLowerCase(), 15, 18);
            }

            // Título Propuesta
            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
            doc.text(mainTitle.toUpperCase(), 195, 18, { align: 'right' });

            // Metadatos (Cliente, Proyecto, Fecha)
            doc.setTextColor(40, 40, 40);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");

            const formatterDate = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

            doc.text(`CLIENTE: ${meta.client.toUpperCase() || 'POR DEFINIR'}`, 15, 40);
            doc.text(`PROYECTO: ${meta.project.toUpperCase() || 'SIN NOMBRE'}`, 15, 46);
            doc.text(`FECHA: ${formatterDate.format(new Date())}`, 15, 52);

            // Subtítulo / Descripción
            doc.setFontSize(9);
            doc.setTextColor(120, 120, 120);
            doc.setFont("helvetica", "italic");
            const splitDesc = doc.splitTextToSize(sanitizePDFText(mainDesc), 180);
            doc.text(splitDesc, 15, 60);

            const tableStartY = 62 + (splitDesc.length * 4);

            // Preparar Filas agrupadas por módulo
            const rows = [];
            modules.forEach(module => {
                const activeItems = module.items.filter(key => data[key]?.enabled !== false && (data[key]?.cost || 0) > 0);
                if (activeItems.length > 0) {
                    // Header de Módulo
                    rows.push([
                        {
                            content: sanitizePDFText(module.name).toUpperCase(),
                            colSpan: 3,
                            isModuleTitle: true,
                            styles: { fontStyle: 'bold', fillColor: [40, 40, 40], fontSize: 13, textColor: accentRgb, halign: 'center', cellPadding: 4 }
                        }
                    ]);

                    activeItems.forEach((key) => {
                        const qty = data[key].qty || 1;
                        const subtext = qty > 1 ? ` (x${qty})` : '';
                        const safeKeyStr = sanitizePDFText(`${key}${subtext}`);

                        rows.push([
                            { content: safeKeyStr, styles: { fontStyle: 'bold', textColor: [20, 20, 20], halign: 'left', cellPadding: data[key].desc ? { top: 5, right: 5, bottom: 1, left: 5 } : 5 } },
                            { content: `${(data[key]?.kw || 0).toFixed(1)} KW`, rowSpan: data[key].desc ? 2 : 1, styles: { valign: 'middle' } },
                            { content: `$${calculateItem(key).toLocaleString("en-US", { minimumFractionDigits: 2 })}`, rowSpan: data[key].desc ? 2 : 1, styles: { valign: 'middle' } }
                        ]);

                        if (data[key].desc) {
                            const cleanDesc = sanitizePDFText(data[key].desc);
                            rows.push([
                                { content: cleanDesc, isDesc: true, styles: { fontStyle: 'normal', halign: 'justify', textColor: [80, 80, 80], cellPadding: { top: 1, right: 5, bottom: 5, left: 5 } } }
                            ]);
                        }
                    });
                }
            });

            let currentPrintedModule = "";
            let pageModules = {};

            autoTable(doc, {
                head: [["DESCRIPCIÓN", "POTENCIA", "IMPORTE"]],
                body: rows,
                startY: tableStartY,
                theme: 'grid',
                headStyles: { fillColor: accentRgb, textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
                bodyStyles: { textColor: [60, 60, 60] },
                styles: { fontSize: 9, cellPadding: 5, lineColor: [220, 220, 220], lineWidth: 0.1 },
                columnStyles: {
                    0: { halign: 'left', cellWidth: 110 },
                    1: { halign: 'center', cellWidth: 30 },
                    2: { halign: 'right', cellWidth: 40, fontStyle: 'bold' }
                },
                didDrawCell: function (data) {
                    // Borrar el borde superior de la fila de descripción para unificarla visualmente con su título
                    if (data.row.raw[0] && data.row.raw[0].isDesc && data.column.index === 0) {
                        doc.setDrawColor(255, 255, 255);
                        doc.setLineWidth(0.3);
                        doc.line(data.cell.x + 0.2, data.cell.y, data.cell.x + data.cell.width - 0.2, data.cell.y);
                    }
                },
                willDrawCell: function (data) {
                    if (data.row.raw[0] && data.row.raw[0].isModuleTitle) {
                        currentPrintedModule = data.row.raw[0].content;
                        if (data.cursor.y > 250 && typeof data.addPage === 'function') {
                            data.addPage();
                        }
                    }
                    if (!pageModules[data.pageNumber]) {
                        pageModules[data.pageNumber] = currentPrintedModule;
                    }
                },
                didDrawPage: function (data) {
                    if (data.pageNumber > 1) {
                        const doc = data.doc;
                        const targetLogo = theme?.logoLightUrl || theme?.logoUrl;
                        if (targetLogo && targetLogo.startsWith('data:image')) {
                            try {
                                const imgProps = doc.getImageProperties(targetLogo);
                                const ratio = Math.min(130 / imgProps.width, 28 / imgProps.height);
                                doc.addImage(targetLogo, imgProps.fileType || 'PNG', 15, 6, imgProps.width * ratio, imgProps.height * ratio);
                            } catch (e) {
                                doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
                                doc.setFontSize(14);
                                doc.setFont("helvetica", "bold");
                                doc.text((theme?.name || "solifood").toLowerCase(), 15, 24);
                            }
                        } else {
                            doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
                            doc.setFontSize(14);
                            doc.setFont("helvetica", "bold");
                            doc.text((theme?.name || "solifood").toLowerCase(), 15, 24);
                        }

                        doc.setFontSize(9);
                        doc.setTextColor(100, 100, 100);
                        doc.setFont("helvetica", "italic");
                        const modName = pageModules[data.pageNumber] || "";
                        if (modName) {
                            doc.text(modName, 195, 24, { align: 'right' });
                        }

                        doc.setDrawColor(220, 220, 220);
                        doc.setLineWidth(0.5);
                        doc.line(15, 29, 195, 29);
                    }
                },
                margin: { top: 35 }
            });

            // Totales Finales PDF (Cuadro redondeado inferior derecho)
            const finalY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 150) + 5;

            // Check page break for the totals box
            let boxY = finalY;
            if (boxY + 45 > 288) {
                doc.addPage();
                boxY = 20;
            }

            // Draw Totals Box
            const boxBg = [34, 36, 42]; // Solifood Dark Gray Hardcoded
            const textBaseColor = [240, 240, 240];
            const textMutedColor = [160, 160, 160];
            const textStrongColor = [255, 255, 255];

            doc.setDrawColor(boxBg[0], boxBg[1], boxBg[2]);
            doc.setFillColor(boxBg[0], boxBg[1], boxBg[2]);
            doc.roundedRect(100, boxY, 95, 45, 3, 3, 'FD');

            // Text inside box
            const boxRightAlign = 185;
            const boxLeft = 105;
            let currentY = boxY + 8;

            doc.setFontSize(10);
            doc.setTextColor(textBaseColor[0], textBaseColor[1], textBaseColor[2]);
            doc.setFont("helvetica", "normal");
            doc.text("Potencia Total:", boxLeft, currentY);
            doc.text(`${totalKW().toFixed(2)} KW`, boxRightAlign, currentY, { align: 'right' });

            currentY += 7;
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]); // Yellow / Accent
            doc.text("TOTAL (USD):", boxLeft, currentY);
            doc.text(`$${totalUSD().toLocaleString("en-US", { minimumFractionDigits: 2 })}`, boxRightAlign, currentY, { align: 'right' });

            currentY += 5;
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(textMutedColor[0], textMutedColor[1], textMutedColor[2]);
            doc.text("PRECIOS MÁS 16% DE I.V.A", boxRightAlign, currentY, { align: 'right' });

            currentY += 9;
            doc.setFontSize(9);
            doc.setTextColor(textBaseColor[0], textBaseColor[1], textBaseColor[2]);
            doc.text("T.C. estimado:", boxLeft, currentY);
            doc.text(`$${meta.tc.toFixed(2)} MXN`, boxRightAlign, currentY, { align: 'right' });

            currentY += 8;
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(textStrongColor[0], textStrongColor[1], textStrongColor[2]);
            doc.text("TOTAL (MXN):", boxLeft, currentY);
            const totalMXN = totalUSD() * meta.tc;
            doc.text(`MX$${totalMXN.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, boxRightAlign, currentY, { align: 'right' });

            const totalPagesExp = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPagesExp; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.setFont("helvetica", "normal");
                // Footer Content
                doc.text("www.solifood.mx", 105, 290, { align: 'center' });
                doc.text(`Página ${i} de ${totalPagesExp}`, 195, 290, { align: 'right' });
            }

            let finalFileName = meta.pdfName && meta.pdfName.trim() !== '' ? meta.pdfName.trim() : `PROPUESTA_${(meta.client || 'PANDORA').replace(/\s+/g, '_')}_CHOCO`;
            if (!finalFileName.toLowerCase().endsWith('.pdf')) {
                finalFileName += '.pdf';
            }
            doc.save(finalFileName);
        } catch (error) {
            console.error("Error exporting PDF:", error);
            alert("No se pudo exportar el PDF. Revisa tu consola para más detalles.");
        }
    };

    const exportInternalPDF = () => {
        try {
            const doc = new jsPDF();
            const accentRgb = hexToRgb(accentColor);

            doc.setFillColor(0, 0, 0);
            doc.rect(0, 0, 210, 28, 'F');

            if (theme?.logoUrl && theme.logoUrl.startsWith('data:image')) {
                try {
                    const imgProps = doc.getImageProperties(theme.logoUrl);
                    const ratio = Math.min(45 / imgProps.width, 18 / imgProps.height);
                    doc.addImage(theme.logoUrl, imgProps.fileType || 'PNG', 15, 14 - ((imgProps.height * ratio) / 2), imgProps.width * ratio, imgProps.height * ratio);
                } catch (e) {
                    doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
                    doc.setFontSize(22);
                    doc.setFont("helvetica", "bold");
                    doc.text((theme?.name || "solifood").toLowerCase(), 15, 18);
                }
            } else {
                doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
                doc.setFontSize(22);
                doc.setFont("helvetica", "bold");
                doc.text((theme?.name || "solifood").toLowerCase(), 15, 18);
            }

            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
            doc.text(mainTitle.toUpperCase() + " (INTERNO)", 195, 18, { align: 'right' });

            doc.setTextColor(40, 40, 40);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            const formatterDate = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
            doc.text(`CLIENTE: ${meta.client.toUpperCase() || 'POR DEFINIR'}`, 15, 40);
            doc.text(`PROYECTO: ${meta.project.toUpperCase() || 'SIN NOMBRE'}`, 15, 46);
            doc.text(`FECHA: ${formatterDate.format(new Date())}`, 15, 52);

            doc.setFontSize(9);
            doc.setTextColor(120, 120, 120);
            doc.setFont("helvetica", "italic");
            const splitDesc = doc.splitTextToSize(sanitizePDFText(mainDesc), 180);
            doc.text(splitDesc, 15, 60);

            const tableStartY = 62 + (splitDesc.length * 4);

            const rows = [];
            modules.forEach(module => {
                const activeItems = module.items.filter(key => data[key]?.enabled !== false && (data[key]?.cost || 0) > 0);
                if (activeItems.length > 0) {
                    // Header de Módulo Interno
                    rows.push([
                        {
                            content: sanitizePDFText(module.name).toUpperCase(),
                            colSpan: 5,
                            isModuleTitle: true,
                            styles: { fontStyle: 'bold', fillColor: [40, 40, 40], fontSize: 13, textColor: accentRgb, halign: 'center', cellPadding: 4 }
                        }
                    ]);

                    activeItems.forEach(key => {
                        const qty = data[key].qty || 1;
                        const cost = data[key].cost || 0;
                        const margin = data[key].margin || 0;
                        const safeKeyStr = sanitizePDFText(key);

                        rows.push([
                            { content: safeKeyStr, styles: { fontStyle: 'bold', textColor: [20, 20, 20], halign: 'left' } },
                            { content: qty.toString(), styles: { halign: 'center' } },
                            { content: `$${cost.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, styles: { halign: 'right' } },
                            { content: `${margin}%`, styles: { halign: 'center' } },
                            { content: `$${calculateItem(key).toLocaleString("en-US", { minimumFractionDigits: 2 })}`, styles: { halign: 'right', fontStyle: 'bold' } }
                        ]);
                    });
                }
            });

            let currentPrintedModule = "";
            let pageModules = {};

            autoTable(doc, {
                head: [["EQUIPO / CONCEPTO", "QTY", "COSTO BASE", "% UTILIDAD", "VENTA FINAL"]],
                body: rows,
                startY: tableStartY,
                theme: 'grid',
                headStyles: { fillColor: accentRgb, textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
                bodyStyles: { textColor: [60, 60, 60] },
                styles: { fontSize: 9, cellPadding: 5, lineColor: [220, 220, 220], lineWidth: 0.1 },
                columnStyles: {
                    0: { halign: 'left' },
                    1: { halign: 'center', cellWidth: 15 },
                    2: { halign: 'right', cellWidth: 35 },
                    3: { halign: 'center', cellWidth: 25 },
                    4: { halign: 'right', cellWidth: 35, fontStyle: 'bold' }
                },
                willDrawCell: function (data) {
                    if (data.row.raw[0] && data.row.raw[0].isModuleTitle) {
                        currentPrintedModule = data.row.raw[0].content;
                        if (data.cursor.y > 250 && typeof data.addPage === 'function') {
                            data.addPage();
                        }
                    }
                    if (!pageModules[data.pageNumber]) {
                        pageModules[data.pageNumber] = currentPrintedModule;
                    }
                },
                didDrawPage: function (data) {
                    if (data.pageNumber > 1) {
                        const doc = data.doc;
                        const targetLogo = theme?.logoLightUrl || theme?.logoUrl;
                        if (targetLogo && targetLogo.startsWith('data:image')) {
                            try {
                                const imgProps = doc.getImageProperties(targetLogo);
                                const ratio = Math.min(130 / imgProps.width, 28 / imgProps.height);
                                doc.addImage(targetLogo, imgProps.fileType || 'PNG', 15, 6, imgProps.width * ratio, imgProps.height * ratio);
                            } catch (e) {
                                doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
                                doc.setFontSize(14);
                                doc.setFont("helvetica", "bold");
                                doc.text((theme?.name || "solifood").toLowerCase(), 15, 24);
                            }
                        } else {
                            doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
                            doc.setFontSize(14);
                            doc.setFont("helvetica", "bold");
                            doc.text((theme?.name || "solifood").toLowerCase(), 15, 24);
                        }

                        doc.setFontSize(9);
                        doc.setTextColor(100, 100, 100);
                        doc.setFont("helvetica", "italic");
                        const modName = pageModules[data.pageNumber] || "";
                        if (modName) {
                            doc.text(modName, 195, 24, { align: 'right' });
                        }

                        doc.setDrawColor(220, 220, 220);
                        doc.setLineWidth(0.5);
                        doc.line(15, 29, 195, 29);
                    }
                },
                margin: { top: 35 }
            });

            const finalY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 150) + 5;
            let boxY = finalY;
            if (boxY + 45 > 288) {
                doc.addPage();
                boxY = 20;
            }

            const boxBg = [34, 36, 42];
            const textBaseColor = [240, 240, 240];
            const textMutedColor = [160, 160, 160];
            const textStrongColor = [255, 255, 255];

            doc.setDrawColor(boxBg[0], boxBg[1], boxBg[2]);
            doc.setFillColor(boxBg[0], boxBg[1], boxBg[2]);
            doc.roundedRect(100, boxY, 95, 45, 3, 3, 'FD');

            const boxRightAlign = 185;
            const boxLeft = 105;
            let currentY = boxY + 8;

            doc.setFontSize(10);
            doc.setTextColor(textBaseColor[0], textBaseColor[1], textBaseColor[2]);
            doc.setFont("helvetica", "normal");
            doc.text("Potencia Total:", boxLeft, currentY);
            doc.text(`${totalKW().toFixed(2)} KW`, boxRightAlign, currentY, { align: 'right' });

            currentY += 7;
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
            doc.text("TOTAL (USD):", boxLeft, currentY);
            doc.text(`$${totalUSD().toLocaleString("en-US", { minimumFractionDigits: 2 })}`, boxRightAlign, currentY, { align: 'right' });

            currentY += 5;
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(textMutedColor[0], textMutedColor[1], textMutedColor[2]);
            doc.text("PRECIOS MÁS 16% DE I.V.A", boxRightAlign, currentY, { align: 'right' });

            currentY += 9;
            doc.setFontSize(9);
            doc.setTextColor(textBaseColor[0], textBaseColor[1], textBaseColor[2]);
            doc.text("T.C. estimado:", boxLeft, currentY);
            doc.text(`$${meta.tc.toFixed(2)} MXN`, boxRightAlign, currentY, { align: 'right' });

            currentY += 8;
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(textStrongColor[0], textStrongColor[1], textStrongColor[2]);
            doc.text("TOTAL (MXN):", boxLeft, currentY);
            const totalMXN = totalUSD() * meta.tc;
            doc.text(`MX$${totalMXN.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, boxRightAlign, currentY, { align: 'right' });

            const totalPagesInt = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPagesInt; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.setFont("helvetica", "normal");
                // Footer Content
                doc.text("www.solifood.mx", 105, 290, { align: 'center' });
                doc.text(`Página ${i} de ${totalPagesInt}`, 195, 290, { align: 'right' });
            }

            let finalFileName = meta.pdfName && meta.pdfName.trim() !== '' ? meta.pdfName.trim() + "_INTERNO" : `PROPUESTA_${(meta.client || 'PANDORA').replace(/\s+/g, '_')}_CHOCO_INTERNO`;
            if (!finalFileName.toLowerCase().endsWith('.pdf')) {
                finalFileName += '.pdf';
            }
            doc.save(finalFileName);
        } catch (error) {
            console.error("Error exporting internal PDF:", error);
            alert("No se pudo exportar el PDF Interno. Revisa tu consola para más detalles.");
        }
    };

    const exportSimpleListPDF = () => {
        try {
            const doc = new jsPDF();
            const accentRgb = hexToRgb(accentColor);

            doc.setFillColor(0, 0, 0);
            doc.rect(0, 0, 210, 28, 'F');

            if (theme?.logoUrl && theme.logoUrl.startsWith('data:image')) {
                try {
                    const imgProps = doc.getImageProperties(theme.logoUrl);
                    const ratio = Math.min(45 / imgProps.width, 18 / imgProps.height);
                    doc.addImage(theme.logoUrl, imgProps.fileType || 'PNG', 15, 14 - ((imgProps.height * ratio) / 2), imgProps.width * ratio, imgProps.height * ratio);
                } catch (e) {
                    doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
                    doc.setFontSize(22);
                    doc.setFont("helvetica", "bold");
                    doc.text((theme?.name || "solifood").toLowerCase(), 15, 18);
                }
            } else {
                doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
                doc.setFontSize(22);
                doc.setFont("helvetica", "bold");
                doc.text((theme?.name || "solifood").toLowerCase(), 15, 18);
            }

            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
            doc.text(mainTitle.toUpperCase() + " (LISTADO)", 195, 18, { align: 'right' });

            doc.setTextColor(40, 40, 40);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            const formatterDate = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
            doc.text(`CLIENTE: ${meta.client.toUpperCase() || 'POR DEFINIR'}`, 15, 40);
            doc.text(`PROYECTO: ${meta.project.toUpperCase() || 'SIN NOMBRE'}`, 15, 46);
            doc.text(`FECHA: ${formatterDate.format(new Date())}`, 15, 52);

            doc.setFontSize(9);
            doc.setTextColor(120, 120, 120);
            doc.setFont("helvetica", "italic");
            const splitDesc = doc.splitTextToSize(sanitizePDFText(mainDesc), 180);
            doc.text(splitDesc, 15, 60);

            const tableStartY = 62 + (splitDesc.length * 4);

            const rows = [];
            let itemCounter = 1;

            modules.forEach(module => {
                const activeItems = module.items.filter(key => data[key]?.enabled !== false);
                if (activeItems.length > 0) {
                    // Header de Módulo Listado
                    rows.push([
                        {
                            content: sanitizePDFText(module.name).toUpperCase(),
                            colSpan: 3,
                            isModuleTitle: true,
                            styles: { fontStyle: 'bold', fillColor: [40, 40, 40], fontSize: 13, textColor: accentRgb, halign: 'center', cellPadding: 4 }
                        }
                    ]);

                    activeItems.forEach(key => {
                        const qty = data[key]?.qty || 1;
                        const safeKeyStr = sanitizePDFText(key);

                        rows.push([
                            { content: itemCounter.toString(), styles: { fontStyle: 'bold', halign: 'center' } },
                            { content: safeKeyStr, styles: { textColor: [40, 40, 40], halign: 'left' } },
                            { content: qty.toString(), styles: { halign: 'center', fontStyle: 'bold' } }
                        ]);
                        itemCounter++;
                    });
                }
            });

            let currentPrintedModule = "";
            let pageModules = {};

            autoTable(doc, {
                head: [["#", "EQUIPO / CONCEPTO", "CANTIDAD"]],
                body: rows,
                startY: tableStartY,
                theme: 'grid',
                headStyles: { fillColor: accentRgb, textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
                bodyStyles: { textColor: [60, 60, 60] },
                styles: { fontSize: 9, cellPadding: 5, lineColor: [220, 220, 220], lineWidth: 0.1 },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 15 },
                    1: { halign: 'left' },
                    2: { halign: 'center', cellWidth: 35 }
                },
                willDrawCell: function (data) {
                    if (data.row.raw[0] && data.row.raw[0].isModuleTitle) {
                        currentPrintedModule = data.row.raw[0].content;
                        if (data.cursor.y > 250 && typeof data.addPage === 'function') {
                            data.addPage();
                        }
                    }
                    if (!pageModules[data.pageNumber]) {
                        pageModules[data.pageNumber] = currentPrintedModule;
                    }
                },
                didDrawPage: function (data) {
                    if (data.pageNumber > 1) {
                        const doc = data.doc;
                        const targetLogo = theme?.logoLightUrl || theme?.logoUrl;
                        if (targetLogo && targetLogo.startsWith('data:image')) {
                            try {
                                const imgProps = doc.getImageProperties(targetLogo);
                                const ratio = Math.min(130 / imgProps.width, 28 / imgProps.height);
                                doc.addImage(targetLogo, imgProps.fileType || 'PNG', 15, 6, imgProps.width * ratio, imgProps.height * ratio);
                            } catch (e) {
                                doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
                                doc.setFontSize(14);
                                doc.setFont("helvetica", "bold");
                                doc.text((theme?.name || "solifood").toLowerCase(), 15, 24);
                            }
                        } else {
                            doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
                            doc.setFontSize(14);
                            doc.setFont("helvetica", "bold");
                            doc.text((theme?.name || "solifood").toLowerCase(), 15, 24);
                        }

                        doc.setFontSize(9);
                        doc.setTextColor(100, 100, 100);
                        doc.setFont("helvetica", "italic");
                        const modName = pageModules[data.pageNumber] || "";
                        if (modName) {
                            doc.text(modName, 195, 24, { align: 'right' });
                        }

                        doc.setDrawColor(220, 220, 220);
                        doc.setLineWidth(0.5);
                        doc.line(15, 29, 195, 29);
                    }
                },
                margin: { top: 35 }
            });

            const totalPagesList = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPagesList; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.setFont("helvetica", "normal");
                // Footer Content
                doc.text("www.solifood.mx", 105, 290, { align: 'center' });
                doc.text(`Página ${i} de ${totalPagesList}`, 195, 290, { align: 'right' });
            }

            let finalFileName = meta.pdfName && meta.pdfName.trim() !== '' ? meta.pdfName.trim() + "_LISTADO" : `PROPUESTA_${(meta.client || 'PANDORA').replace(/\s+/g, '_')}_CHOCO_LISTADO`;
            if (!finalFileName.toLowerCase().endsWith('.pdf')) {
                finalFileName += '.pdf';
            }
            doc.save(finalFileName);
        } catch (error) {
            console.error("Error exporting simple list PDF:", error);
            alert("No se pudo exportar el PDF del Listado. Revisa tu consola para más detalles.");
        }
    };

    return (
        <div className="flex flex-col h-full animate-fade-in relative z-10 w-full" style={{ paddingRight: '8px' }}>

            {/* HEADER SECTION TIPO PANDORA */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 pb-6 border-b border-glass-border/50 gap-6">
                <div className="w-full xl:w-[60%] pr-4">
                    <h2 className="text-3xl font-black mb-2 flex items-center gap-3 w-full" style={{ color: headerTextColor }}>
                        <span className="p-2.5 rounded-xl border border-glass-border shrink-0" style={{ backgroundColor: `${accentColor}20` }}>
                            <ListChecks className="w-6 h-6 shrink-0" style={{ color: accentColor }} />
                        </span>

                        {isEditingMainTitle ? (
                            <input
                                type="text"
                                autoFocus
                                value={mainTitle}
                                onChange={(e) => setMainTitle(e.target.value)}
                                onBlur={() => setIsEditingMainTitle(false)}
                                onKeyDown={(e) => { if (e.key === 'Enter') setIsEditingMainTitle(false) }}
                                className="bg-deep border border-glass-border rounded-lg px-3 py-1 text-3xl font-black focus:border-neon-cyan outline-none w-full max-w-xl transition-colors"
                            />
                        ) : (
                            <span
                                className="border-b-2 border-dashed border-transparent hover:border-gray-500 cursor-pointer transition-colors"
                                onClick={() => setIsEditingMainTitle(true)}
                                title="Editar Título del Módulo Maestro"
                            >
                                {mainTitle}
                            </span>
                        )}
                        <button
                            onClick={() => setIsEditingMainTitle(!isEditingMainTitle)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-white bg-glass border border-glass-border hover:border-gray-400 hover:shadow-glow-sm transition-all shrink-0"
                            title="Activar Modo Editor de Título"
                        >
                            <Edit2 className="w-5 h-5" style={{ color: accentColor }} />
                        </button>
                    </h2>

                    <div className="flex items-start gap-2 mt-3 w-full">
                        {isEditingMainDesc ? (
                            <textarea
                                autoFocus
                                value={mainDesc}
                                onChange={(e) => setMainDesc(e.target.value)}
                                onBlur={() => setIsEditingMainDesc(false)}
                                className="w-full max-w-2xl bg-deep border border-glass-border rounded-lg px-3 py-2 text-sm text-gray-300 focus:border-neon-cyan outline-none transition-colors resize-none"
                                rows={3}
                            />
                        ) : (
                            <p
                                className="text-sm text-gray-400 w-full px-2 cursor-pointer border-b border-dashed border-transparent hover:border-gray-600 transition-colors"
                                onClick={() => setIsEditingMainDesc(true)}
                                title="Editar Descripción General"
                            >
                                {mainDesc}
                            </p>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row flex-wrap xl:justify-end gap-3 w-full xl:w-[40%] shrink-0 mt-4 xl:mt-0">
                    <label className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-5 py-3 bg-glass border border-glass-border rounded-xl font-bold text-sm tracking-wide transition-all hover:bg-glass-light hover:-translate-y-0.5 cursor-pointer text-gray-300 hover:text-white">
                        <Upload className="w-4 h-4" /> Importar Plantilla
                        <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
                    </label>

                    <button
                        onClick={exportExcel}
                        className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-5 py-3 bg-glass border border-glass-border rounded-xl font-bold text-sm tracking-wide transition-all hover:bg-glass-light hover:-translate-y-0.5"
                        style={{ color: '#10B981' }} // Excel verde clásico
                        title="Exportar Módulos a CSV para usarlos como Plantilla luego"
                    >
                        <FileSpreadsheet className="w-4 h-4" /> Exportar a CSV
                    </button>

                    <button
                        onClick={exportInternalPDF}
                        className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-5 py-3 border rounded-xl font-bold text-sm tracking-wide transition-all shadow-glow-sm hover:scale-105 bg-glass border-glass-border hover:bg-glass-light text-gray-300 hover:text-white"
                        title="Exportar documento en vista interna con detalle de costos y utilidad."
                    >
                        <FileText className="w-4 h-4" style={{ color: accentColor }} /> PDF Interno
                    </button>

                    <button
                        onClick={exportSimpleListPDF}
                        className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-5 py-3 border rounded-xl font-bold text-sm tracking-wide transition-all shadow-glow-sm hover:scale-105 bg-glass border-glass-border hover:bg-glass-light text-gray-300 hover:text-white"
                        title="Exportar un listado numerado de equipos y cantidades sin costos ni descripciones largas."
                    >
                        <ListChecks className="w-4 h-4" style={{ color: accentColor }} /> PDF Listado
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 shrink-0">
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
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Nombre de Exportación (PDF)</label>
                    <input
                        type="text"
                        value={meta.pdfName || ''}
                        onChange={(e) => setMeta({ ...meta, pdfName: e.target.value })}
                        className="w-full bg-deep/50 border border-glass-border/80 p-2 rounded-md text-white text-sm focus:outline-none focus:border-neon-cyan transition-colors placeholder:text-gray-600"
                        placeholder="Ej. Cotizacion_Final"
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
            <div className="w-full flex justify-end gap-3 mb-3">
                <button
                    onClick={() => toggleAllModules(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white bg-deep border border-glass-border hover:border-neon-cyan/50 rounded-lg transition-colors"
                >
                    <UnfoldVertical className="w-4 h-4" />
                    Abrir Todos
                </button>
                <button
                    onClick={() => toggleAllModules(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white bg-deep border border-glass-border hover:border-neon-cyan/50 rounded-lg transition-colors"
                >
                    <FoldVertical className="w-4 h-4" />
                    Contraer Todos
                </button>
            </div>

            <div className="flex-1 w-full flex flex-col gap-6" style={{ minHeight: '600px' }}>
                {modules.map((module, mIndex) => {
                    const isCollapsed = collapsedModules[module.name];
                    return (
                        <div key={mIndex} className="bg-deep/50 border border-glass-border rounded-xl overflow-hidden w-full max-w-full">
                            {/* Cabecera del Módulo Expansible */}
                            <div
                                className="bg-glass px-4 py-3 border-b border-glass-border flex items-center justify-between cursor-pointer hover:bg-glass/80 transition-colors"
                                onClick={() => toggleModule(module.name)}
                            >
                                <div className="flex items-center gap-3">
                                    {isCollapsed ? <ChevronRight className="w-5 h-5 shrink-0" style={{ color: accentColor }} /> : <ChevronDown className="w-5 h-5 shrink-0" style={{ color: accentColor }} />}
                                    <h3 className="font-bold tracking-wider text-sm lg:text-base pr-4" style={{ color: accentColor }}>{module.name}</h3>
                                </div>
                                <div className="flex gap-4 md:gap-8 items-center text-xs md:text-sm">
                                    <span className="font-mono text-gray-400 hidden sm:inline">Energía: <span className="text-white font-bold ml-1">{moduleTotalKW(module).toFixed(2)} kW</span></span>
                                    <span className="font-mono text-gray-400">Total: <span className="text-white font-bold tracking-wider ml-1" style={{ color: accentColor }}>$ {moduleTotalUSD(module).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></span>
                                </div>
                            </div>

                            {!isCollapsed && (
                                <div className="w-full overflow-x-auto stylized-scrollbar pb-2">
                                    {/* Tabla Responsive usando flex/grid y overflow horizontal */}
                                    <div className="min-w-[880px] p-4 flex flex-col gap-2">
                                        {/* Headers Columnas Interiores */}
                                        <div
                                            className="grid gap-3 px-4 py-2 border-b border-glass-border/30 text-xs font-bold uppercase tracking-widest bg-glass/20 rounded-md"
                                            style={{ gridTemplateColumns: "3fr 2fr 1fr 1.5fr 1.8fr 1.5fr 2fr", color: accentColor }}
                                        >
                                            <div>Equipo / Concepto</div>
                                            <div>Descripción</div>
                                            <div className="text-center">QTY</div>
                                            <div className="text-right">Potencia (kW)</div>
                                            <div className="text-right">Costo USD Base</div>
                                            <div className="text-center">% Útil.</div>
                                            <div className="text-right">Venta Final</div>
                                        </div>

                                        {/* Filas */}
                                        {module.items.map((item, itemIndex) => {
                                            const isEnabled = data[item]?.enabled !== false;
                                            return (
                                                <div key={`${mIndex}-${itemIndex}`}
                                                    className={`grid gap-3 items-center px-4 py-3 bg-glass-light hover:bg-glass/80 rounded-lg group transition-colors border border-transparent hover:border-glass-border ${!isEnabled ? 'opacity-40 grayscale' : ''}`}
                                                    style={{ gridTemplateColumns: "3fr 2fr 1fr 1.5fr 1.8fr 1.5fr 2fr" }}
                                                >
                                                    <div className="flex items-center gap-2 overflow-hidden text-sm text-gray-200">
                                                        <input
                                                            type="checkbox"
                                                            checked={isEnabled}
                                                            onChange={(e) => updateValue(item, "enabled", e.target.checked)}
                                                            className="w-4 h-4 shrink-0 rounded border-glass-border bg-deep text-neon-cyan focus:ring-neon-cyan focus:ring-offset-deep cursor-pointer"
                                                            style={{ accentColor: accentColor }}
                                                        />
                                                        <button
                                                            onClick={() => handleRemoveItem(mIndex, itemIndex)}
                                                            className="opacity-20 hover:opacity-100 p-1 text-red-400 hover:text-red-300 transition-opacity shrink-0"
                                                            title="Eliminar Equipo"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        {data[item]?.url && data[item].url.trim() !== "" ? (
                                                            <a href={data[item].url.startsWith('http') ? data[item].url : `https://${data[item].url}`} target="_blank" rel="noopener noreferrer" className="p-1 hover:scale-110 transition-transform shrink-0" title="Abrir Link Guardado de Referencia">
                                                                <Link className="w-3.5 h-3.5" style={{ color: accentColor }} />
                                                            </a>
                                                        ) : (
                                                            <button className="opacity-20 p-1 cursor-default shrink-0" title="Sin Link Guardado. (Admin: edita la descripción para agregar uno)">
                                                                <Link className="w-3.5 h-3.5 text-gray-400" />
                                                            </button>
                                                        )}
                                                        <span
                                                            className="truncate cursor-pointer hover:text-white transition-colors border-b border-dashed border-transparent hover:border-gray-500"
                                                            title="Editar o ver nombre completo del equipo (Click)"
                                                            onClick={() => {
                                                                setEditingNameItem({ mIndex, itemIndex, itemName: item });
                                                                setTempName(item);
                                                            }}
                                                        >
                                                            {item}
                                                        </span>
                                                    </div>

                                                    <div
                                                        className="col-span-1 text-xs text-gray-300 truncate cursor-pointer hover:text-white transition-colors flex items-center h-full bg-deep/30 px-3 py-2 rounded-md border border-glass-border/40 hover:border-neon-cyan/50"
                                                        title={data[item]?.desc || "Haz clic para añadir una descripción técnica detallada..."}
                                                        onClick={() => {
                                                            setEditingDescItem(item);
                                                            setTempDesc(data[item]?.desc || "");
                                                            setTempUrl(data[item]?.url || "");
                                                        }}
                                                    >
                                                        {data[item]?.desc ? data[item].desc : <span className="text-gray-600 italic">Ej. Inox 304, 2HP...</span>}
                                                    </div>

                                                    <div>
                                                        <input
                                                            type="number"
                                                            placeholder="1"
                                                            value={data[item]?.qty ?? ""}
                                                            className="w-full bg-deep border-glass-border border p-2 rounded-md text-white text-center text-sm focus:outline-none focus:border-neon-cyan transition-colors"
                                                            min="0"
                                                            disabled={!isEnabled}
                                                            onChange={(e) => updateValue(item, "qty", e.target.value)}
                                                        />
                                                    </div>

                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs" style={{ color: accentColor }}>kW</span>
                                                        <input
                                                            type="number"
                                                            placeholder="0.0"
                                                            value={data[item]?.kw ?? ""}
                                                            className="w-full bg-deep border-glass-border border p-2 pl-9 rounded-md text-white text-right text-sm focus:outline-none focus:border-neon-cyan transition-colors font-mono"
                                                            min="0" step="0.1"
                                                            disabled={!isEnabled}
                                                            onChange={(e) => updateValue(item, "kw", e.target.value)}
                                                        />
                                                    </div>

                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs" style={{ color: accentColor }}>$</span>
                                                        <input
                                                            type="number"
                                                            placeholder="0.00"
                                                            value={data[item]?.cost ?? ""}
                                                            className="w-full bg-deep border-glass-border border p-2 pl-7 rounded-md text-white text-right text-sm focus:outline-none focus:border-neon-cyan transition-colors font-mono"
                                                            min="0" step="100"
                                                            disabled={!isEnabled}
                                                            onChange={(e) => updateValue(item, "cost", e.target.value)}
                                                        />
                                                    </div>

                                                    <div className="relative">
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-xs" style={{ color: accentColor }}>%</span>
                                                        <input
                                                            type="number"
                                                            placeholder="0"
                                                            value={data[item]?.margin ?? ""}
                                                            className="w-full bg-deep border-glass-border border p-2 pr-7 rounded-md text-white text-center text-sm focus:outline-none focus:border-neon-cyan transition-colors"
                                                            min="0" max="100"
                                                            disabled={!isEnabled}
                                                            onChange={(e) => updateValue(item, "margin", e.target.value)}
                                                        />
                                                    </div>

                                                    <div className="text-right">
                                                        <span className="font-bold text-white font-mono tabular-nums text-sm lg:text-base block truncate pr-2" style={{ color: calculateItem(item) > 0 ? accentColor : '#9CA3AF' }}>
                                                            $ {calculateItem(item).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        <div className="mt-2 px-4">
                                            <button
                                                onClick={() => handleAddItem(mIndex)}
                                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white bg-glass-light border border-glass-border hover:border-neon-cyan/50 rounded-lg transition-colors"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Agregar Equipo al Módulo
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                            }
                        </div>
                    )
                })}

                <div className="flex justify-center mt-2">
                    <button
                        onClick={handleAddModule}
                        className="flex items-center gap-2 px-6 py-3 font-bold text-sm tracking-wide bg-glass border border-glass-border rounded-xl transition-all shadow-glow-sm hover:scale-105"
                        style={{ color: accentColor, borderColor: accentColor }}
                    >
                        <Plus className="w-5 h-5" /> AGREGAR NUEVO MÓDULO
                    </button>
                </div>

                {/* RECUPERACIÓN DE TOTAL AL FINAL DE LA PANTALLA */}
                <div className="bg-glass border border-glass-border rounded-2xl p-6 mt-4 mb-12 flex flex-col md:flex-row items-center justify-between shadow-glow-sm relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-32 h-32 rounded-br-full opacity-10 -z-0 group-hover:scale-110 transition-transform" style={{ backgroundColor: accentColor }}></div>
                    <div className="relative z-10 text-center md:text-left">
                        <h2 className="text-xl md:text-2xl font-black tracking-widest uppercase mb-1" style={{ color: accentColor }}>Resumen Proyecto</h2>
                        <p className="text-xs font-bold text-gray-400 underline decoration-glass-border underline-offset-4">TODOS LOS MÓDULOS</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-6 md:gap-12 items-center mt-6 md:mt-0 relative z-10 text-center sm:text-right">
                        <div>
                            <p className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-1">Impacto Eléctrico (Total)</p>
                            <p className="text-xl font-mono text-blue-400 font-bold">{totalKW().toFixed(2)} <span className="text-sm">kW</span></p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-1">Gran Total Venta USD</p>
                            <p className="text-3xl md:text-4xl font-black font-mono" style={{ color: accentColor }}>
                                $ {totalUSD().toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal para Editar Descripción */}
            <Dialog open={!!editingDescItem} onOpenChange={(open) => !open && setEditingDescItem(null)}>
                <DialogContent className="bg-deep border border-glass-border text-white sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2" style={{ color: accentColor }}>
                            <FileText className="w-5 h-5" />
                            Descripción del Equipo
                        </DialogTitle>
                        <p className="text-sm font-bold text-gray-300 mt-2">{editingDescItem}</p>
                    </DialogHeader>
                    <div className="py-4 flex flex-col gap-4">
                        <textarea
                            value={tempDesc}
                            onChange={(e) => setTempDesc(e.target.value)}
                            className="w-full bg-glass-light border border-glass-border rounded-xl p-4 text-white text-sm focus:outline-none focus:border-neon-cyan transition-colors resize-none text-justify"
                            placeholder="Ej. Fabricado en acero Inoxidable 304, con motor de 2HP y tablero de control integrado..."
                            rows={5}
                        />
                        <div className="flex items-center gap-2">
                            <span className="p-2.5 bg-glass-light border border-glass-border rounded-lg shrink-0">
                                <Link className="w-4 h-4 text-gray-400" />
                            </span>
                            <input
                                type="url"
                                value={tempUrl}
                                onChange={e => setTempUrl(e.target.value)}
                                className="w-full bg-glass-light border border-glass-border rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-neon-cyan transition-colors placeholder:text-gray-600"
                                placeholder="Opcional: Pega el link/URL de referencia de este equipo..."
                            />
                        </div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        <button
                            onClick={() => {
                                // Simple trick to just show it's justified (the PDF already justifies it)
                                const textarea = document.querySelector('textarea');
                                if (textarea) {
                                    textarea.style.textAlign = textarea.style.textAlign === 'justify' ? 'left' : 'justify';
                                }
                            }}
                            className="p-2 rounded-lg bg-glass border border-glass-border text-gray-400 hover:text-white hover:border-gray-400 transition-colors flex items-center gap-2 text-xs"
                            title="Justificar Texto"
                        >
                            <AlignJustify className="w-4 h-4" />
                            Justificar
                        </button>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setEditingDescItem(null)}
                                className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-400 hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    updateValue(editingDescItem, "desc", tempDesc);
                                    updateValue(editingDescItem, "url", tempUrl);
                                    setEditingDescItem(null);
                                }}
                                className="px-5 py-2 rounded-lg font-bold text-sm shadow-glow-sm transition-transform hover:-translate-y-0.5"
                                style={{ backgroundColor: accentColor, color: isLightText || primaryColor === '#3B3B3B' || accentColor.toUpperCase() === '#F2B705' || accentColor.toUpperCase() === '#FFCC00' ? '#000000' : '#FFFFFF' }}
                            >
                                Guardar Texto
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal para Editar Nombre de Equipo */}
            <Dialog open={!!editingNameItem} onOpenChange={(open) => !open && setEditingNameItem(null)}>
                <DialogContent className="bg-deep border border-glass-border text-white sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2" style={{ color: accentColor }}>
                            <Edit2 className="w-5 h-5" />
                            Nombre del Concepto
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <textarea
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    saveItemName();
                                }
                            }}
                            className="w-full bg-glass-light border border-glass-border rounded-xl p-4 text-white font-bold focus:outline-none focus:border-neon-cyan transition-colors resize-none text-justify"
                            placeholder="Ej. 1.1 Bomba de Agua..."
                            rows={3}
                            autoFocus
                        />
                        <p className="text-[10px] text-gray-500 mt-2 text-right uppercase tracking-widest">Presiona ENTER para guardar</p>
                    </div>
                    <div className="flex justify-end gap-3 mt-1">
                        <button
                            onClick={() => setEditingNameItem(null)}
                            className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-400 hover:text-white transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={saveItemName}
                            className="px-5 py-2 rounded-lg font-bold text-sm shadow-glow-sm transition-transform hover:-translate-y-0.5"
                            style={{ backgroundColor: accentColor, color: isLightText || primaryColor === '#3B3B3B' || accentColor.toUpperCase() === '#F2B705' || accentColor.toUpperCase() === '#FFCC00' ? '#000000' : '#FFFFFF' }}
                        >
                            Guardar
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

        </div >
    );
}
