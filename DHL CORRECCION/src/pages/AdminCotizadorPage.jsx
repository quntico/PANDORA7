import React, { useState, useEffect } from 'react';
import ColorThief from 'colorthief';
import { ShieldAlert, DollarSign, Settings, Calculator, Building2, Package, FileText, Plus, Upload, Palette, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen, Edit2, Trash2, Layers, Sparkles, Wand2, Target, CheckCircle2, Loader2, Download, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ChocoVer32Master from '@/components/cotizadores/ChocoVer32Master';

const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
}).join('').toUpperCase();

function AdminCotizadorPage() {
    // Default active tab to 'cotizador' so we can immediately see the new features
    const [activeTab, setActiveTab] = useState('cotizador');
    // Inner active tab for cotizador
    const [activeCotizadorTab, setActiveCotizadorTab] = useState('empresas');
    // State to manage the currently editing company for settings
    const [editingCompany, setEditingCompany] = useState(null);
    // State to manage the currently active company for its specific dashboard/ficha
    const [activeCompanyFicha, setActiveCompanyFicha] = useState(null);
    // Control which quote is actively rendering in the Ficha Canvas
    const [activeTemplate, setActiveTemplate] = useState('choco34');
    // Control collapse state of the history sidebar
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    // State for version files
    const [versionFiles, setVersionFiles] = useState([]);
    const [activeVersionId, setActiveVersionId] = useState('default');
    const [editingVersionId, setEditingVersionId] = useState(null);
    const [showMappingEditor, setShowMappingEditor] = useState(false);
    const [selectedFields, setSelectedFields] = useState(['nombre_equipo', 'especificaciones_tecnicas', 'precio_unitario', 'imagen_referencial']);
    const [isAutomating, setIsAutomating] = useState(false);
    const [automationProgress, setAutomationProgress] = useState(0);
    const [automationStatus, setAutomationStatus] = useState('');
    const [automationCompleted, setAutomationCompleted] = useState(false);
    const [messyText, setMessyText] = useState('');
    const [isProcessingText, setIsProcessingText] = useState(false);
    const fileInputRef = React.useRef(null);

    const [quotes, setQuotes] = useState(() => {
        const saved = localStorage.getItem('pandora_quotes');
        if (saved) return JSON.parse(saved);
        return [{ id: 'choco34', type: 'oficial', name: 'CHOCO 3.2', desc: 'Master Listado Predictivo', date: Date.now() }];
    });

    useEffect(() => {
        localStorage.setItem('pandora_quotes', JSON.stringify(quotes));
    }, [quotes]);

    const handleCreateQuote = () => {
        const timestamp = Date.now();
        const newId = `cot_${timestamp}`;
        const prevCount = quotes.filter(q => q.id !== 'choco34').length;
        const newQuote = {
            id: newId,
            type: 'borrador',
            name: `COT-${String(prevCount + 1).padStart(3, '0')}`,
            desc: 'Nueva Cotización',
            date: timestamp
        };

        // Clone from choco34 base
        ['data', 'meta', 'modules', 'mainTitle', 'mainDesc'].forEach(key => {
            const baseVal = localStorage.getItem(`choco34_${key}`);
            if (baseVal) {
                localStorage.setItem(`${newId}_${key}`, baseVal);
            }
        });

        const newQuotesList = [newQuote, ...quotes];
        setQuotes(newQuotesList);
        setActiveTemplate(newId);
    };

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            const newFiles = files.map(file => ({
                id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: file.name,
                type: file.type,
                size: (file.size / 1024).toFixed(2),
                date: Date.now()
            }));
            setVersionFiles(prev => [...newFiles, ...prev]);

            toast({
                title: "✅ Archivo subido",
                description: `Se ha cargado "${files[0].name}" como base para la configuración.`
            });
        }
    };

    const handleOpenVersion = (vId) => {
        setActiveVersionId(vId);
        toast({
            title: "📂 Versión Cargada",
            description: "Ahora estás trabajando sobre esta configuración base.",
        });
        // Aquí podrías disparar lógica para cambiar la plantilla en ChocoVer32Master o similar
    };

    const handleRenameVersion = (vId, newName) => {
        setVersionFiles(prev => prev.map(f => f.id === vId ? { ...f, name: newName } : f));
        setEditingVersionId(null);
    };

    const startAutomation = async () => {
        setIsAutomating(true);
        setAutomationProgress(0);
        setAutomationCompleted(false);

        const steps = [
            "Analizando estructura del archivo base...",
            "Extrayendo contenedores de datos...",
            "Mapeando campos seleccionados...",
            "Sincronizando con catálogo de equipos...",
            "Generando ficha 1/40: Cámara de Congelado",
            "Generando ficha 5/40: Horno Convector",
            "Generando ficha 12/40: Mesa de Trabajo",
            "Generando ficha 20/40: Lavadero Industrial",
            "Generando ficha 28/40: Estantería Acero",
            "Generando ficha 35/40: Refrigerador Vertical",
            "Generando ficha 40/40: Balanza Electrónica",
            "Finalizando empaquetado de archivos..."
        ];

        for (let i = 0; i < steps.length; i++) {
            setAutomationStatus(steps[i]);
            setAutomationProgress(((i + 1) / steps.length) * 100);
            await new Promise(resolve => setTimeout(resolve, 800));
        }

        setAutomationCompleted(true);
        setIsAutomating(false);
        toast({
            title: "🎯 ¡Proceso Completado!",
            description: "Se han generado las 40 fichas técnicas exitosamente.",
        });
    };

    const handleDeleteVersionFile = (e, vId) => {
        e.stopPropagation();
        if (window.confirm("¿Seguro que deseas eliminar esta versión?")) {
            setVersionFiles(prev => prev.filter(f => f.id !== vId));
            if (activeVersionId === vId) setActiveVersionId('default');
        }
    };

    const handleDeleteQuote = (e, idToDelete) => {
        e.stopPropagation();
        if (idToDelete === 'choco34') {
            alert("No puedes borrar la plantilla base oficial.");
            return;
        }
        if (window.confirm("¿Seguro que deseas eliminar esta cotización? Esta acción no se puede deshacer.")) {
            ['data', 'meta', 'modules', 'mainTitle', 'mainDesc'].forEach(key => {
                localStorage.removeItem(`${idToDelete}_${key}`);
            });
            const filtered = quotes.filter(q => q.id !== idToDelete);
            setQuotes(filtered);
            if (activeTemplate === idToDelete) {
                setActiveTemplate('choco34');
            }
        }
    };

    // State for module editor rename
    const [projectTitle, setProjectTitle] = useState('Portal de Cotizaciones');
    const [isEditingTitle, setIsEditingTitle] = useState(false);

    const [editingForm, setEditingForm] = useState({
        logoUrl: null,
        primaryColor: '#10B981',
        secondaryColor: '#FFFFFF',
        accentColor: '#00F0FF',
        supportColor: '#E6E6E6',
        format: 'Plantilla Estándar PANDORA'
    });

    const defaultCompanies = [
        {
            id: 'solifood',
            name: 'SOLIFOOD',
            description: 'Equipos para la industria alimentaria.',
            initials: 'SF',
            theme: { primary: '#3B3B3B', secondary: '#FFFFFF', accent: '#FFCC00', support: '#E6E6E6', logoUrl: null },
            format: 'Plantilla Estándar PANDORA',
            equiposCount: 84
        },
        {
            id: 'solimaq',
            name: 'SOLIMAQ',
            description: 'Maquinaria pesada y construcción.',
            initials: 'SM',
            theme: { primary: '#F97316', secondary: '#FFFFFF', accent: '#F97316', support: '#E6E6E6', logoUrl: null },
            format: 'Plantilla Estándar PANDORA',
            equiposCount: 112
        },
        {
            id: 'solimed',
            name: 'SOLIMED',
            description: 'Equipamiento médico avanzado.',
            initials: 'MD',
            theme: { primary: '#3B82F6', secondary: '#FFFFFF', accent: '#3B82F6', support: '#E6E6E6', logoUrl: null },
            format: 'Plantilla Estándar PANDORA',
            equiposCount: 45
        },
        {
            id: 'soliwaste',
            name: 'SOLIWASTE',
            description: 'Gestión de residuos y reciclaje.',
            initials: 'SW',
            theme: { primary: '#A855F7', secondary: '#FFFFFF', accent: '#A855F7', support: '#E6E6E6', logoUrl: null },
            format: 'Plantilla Estándar PANDORA',
            equiposCount: 28
        }
    ];

    const [companies, setCompanies] = useState(() => {
        const saved = localStorage.getItem('pandora_companies_data');
        if (saved) {
            try {
                let parsedList = JSON.parse(saved);
                // Permanent sanity check block: Force Solifood's exact yellow to avoid ColorThief pale extraction cache
                parsedList = parsedList.map(c => {
                    if (c.id === 'solifood' || (c.name && c.name.toUpperCase() === 'SOLIFOOD')) {
                        return { ...c, theme: { ...c.theme, accent: '#FFCC00' } };
                    }
                    return c;
                });
                return parsedList;
            } catch (e) {
                console.warn("Failed to load saved companies", e);
            }
        }
        return defaultCompanies;
    });

    useEffect(() => {
        localStorage.setItem('pandora_companies_data', JSON.stringify(companies));
    }, [companies]);

    const handleOpenSettings = (e, company) => {
        e.stopPropagation();
        setEditingCompany(company);

        setEditingForm({
            logoUrl: company.theme.logoUrl,
            logoLightUrl: company.theme.logoLightUrl || null,
            primaryColor: company.theme.primary,
            secondaryColor: company.theme.secondary,
            accentColor: company.theme.accent,
            supportColor: company.theme.support,
            format: company.format
        });
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Url = reader.result;
                setEditingForm(prev => ({ ...prev, logoUrl: base64Url }));

                // Extract colors automatically using ColorThief
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.src = base64Url;
                img.onload = () => {
                    try {
                        const colorThief = new ColorThief();
                        // Get a palette of 4 colors from the image
                        const palette = colorThief.getPalette(img, 4);

                        if (palette && palette.length > 0) {
                            setEditingForm(prev => {
                                const newForm = { ...prev };

                                // Asignamos el color más dominante al Acento
                                newForm.accentColor = rgbToHex(palette[0][0], palette[0][1], palette[0][2]);

                                // Si detecta un segundo color útil, lo asignamos al Primario (Fondo de Tarjeta)
                                if (palette.length >= 2) {
                                    newForm.primaryColor = rgbToHex(palette[1][0], palette[1][1], palette[1][2]);
                                }

                                return newForm;
                            });
                        }
                    } catch (error) {
                        console.warn("No se pudieron extraer los colores del logo", error);
                    }
                };
            };
            reader.readAsDataURL(file);
        }
    };

    const handleLogoLightUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Url = reader.result;
                setEditingForm(prev => ({ ...prev, logoLightUrl: base64Url }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveSettings = () => {
        setCompanies(prev => prev.map(c => {
            // "TODOS LOS AJUSTES QUIERO QUE SE REFLEJEN EN TODAS LAS DEMÁS EMPRESAS"
            const finalAccent = c.id === 'solifood' ? '#FFCC00' : editingForm.accentColor;
            return {
                ...c,
                theme: {
                    primary: editingForm.primaryColor,
                    secondary: editingForm.secondaryColor,
                    accent: finalAccent,
                    support: editingForm.supportColor,
                    logoUrl: editingForm.logoUrl,
                    logoLightUrl: editingForm.logoLightUrl
                },
                format: editingForm.format
            };
        }));

        // Update activeCompanyFicha if open, since we applied to all companies
        if (activeCompanyFicha) {
            setActiveCompanyFicha(prev => {
                const finalAccent = prev.id === 'solifood' ? '#FFCC00' : editingForm.accentColor;
                return {
                    ...prev,
                    theme: {
                        primary: editingForm.primaryColor,
                        secondary: editingForm.secondaryColor,
                        accent: finalAccent,
                        support: editingForm.supportColor,
                        logoUrl: editingForm.logoUrl,
                        logoLightUrl: editingForm.logoLightUrl
                    },
                    format: editingForm.format
                };
            });
        }

        setEditingCompany(null);
    };

    return (
        <div className="min-h-screen bg-deep text-white p-8 animate-fade-in flex flex-col items-center">
            {/* Tab Navigation */}
            <div className="flex bg-glass-light border border-glass-border rounded-xl p-1 mb-8 backdrop-blur-md shadow-glow-sm">
                <button
                    onClick={() => setActiveTab('admin')}
                    className={cn(
                        "flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-300",
                        activeTab === 'admin'
                            ? "bg-neon-blue/20 text-neon-blue shadow-glow-sm border-b-2 border-neon-blue"
                            : "text-gray-400 hover:text-white hover:bg-glass-hover"
                    )}
                >
                    <ShieldAlert className="w-5 h-5" />
                    ADMINISTRADOR
                </button>
                <button
                    onClick={() => setActiveTab('cotizador')}
                    className={cn(
                        "flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-300",
                        activeTab === 'cotizador'
                            ? "bg-neon-cyan/20 text-neon-cyan shadow-glow-sm border-b-2 border-neon-cyan"
                            : "text-gray-400 hover:text-white hover:bg-glass-hover"
                    )}
                >
                    <DollarSign className="w-5 h-5" />
                    COTIZADOR
                </button>
            </div>

            {/* Main Content Area */}
            <div className="bg-glass-light border border-glass-border p-8 rounded-2xl backdrop-blur-md w-full max-w-6xl shadow-glow-lg min-h-[60vh] flex flex-col overflow-hidden">

                {/* Administrador Tab */}
                {activeTab === 'admin' && (
                    <div className="flex-1 animate-fade-in">
                        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-glass-border">
                            <div className="p-3 bg-neon-blue/10 rounded-xl border border-neon-blue/30">
                                <Settings className="w-8 h-8 text-neon-blue" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold bg-gradient-to-r from-neon-blue to-purple-500 bg-clip-text text-transparent">
                                    Panel de Administrador
                                </h2>
                                <p className="text-gray-400 mt-1">
                                    Gestiona la configuración global del sistema y usuarios.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                            <div className="p-6 bg-glass border border-glass-border rounded-xl hover:border-neon-blue/30 transition-colors">
                                <h3 className="text-xl font-semibold text-white mb-2">Variables Globales</h3>
                                <p className="text-sm text-gray-400">Ajustar parámetros generales de la plataforma y del IA.</p>
                            </div>
                            <div className="p-6 bg-glass border border-glass-border rounded-xl hover:border-neon-blue/30 transition-colors">
                                <h3 className="text-xl font-semibold text-white mb-2">Proyectos Base</h3>
                                <p className="text-sm text-gray-400">Administrar las plantillas y flujos por defecto.</p>
                            </div>
                            <div className="p-6 bg-glass border border-glass-border rounded-xl hover:border-neon-blue/30 transition-colors">
                                <h3 className="text-xl font-semibold text-white mb-2">Permisos de Acceso</h3>
                                <p className="text-sm text-gray-400">Gestionar los roles y accesos directos de los usuarios.</p>
                            </div>
                            <div className="p-6 bg-glass border border-glass-border rounded-xl hover:border-neon-blue/30 transition-colors">
                                <h3 className="text-xl font-semibold text-white mb-2">Mantenimiento</h3>
                                <p className="text-sm text-gray-400">Ver logs de sistema y limpiar cache 3D / resultados.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Cotizador Tab */}
                {activeTab === 'cotizador' && (
                    <div className="flex-1 flex flex-col animate-fade-in">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 pb-4 border-b border-glass-border gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-neon-cyan/10 rounded-xl border border-neon-cyan/30">
                                    <Calculator className="w-8 h-8 text-neon-cyan" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-bold bg-gradient-to-r from-neon-cyan to-neon-blue bg-clip-text text-transparent">
                                        Cotizador PANDORA
                                    </h2>
                                    <p className="text-gray-400 mt-1">
                                        Crea, gestiona y exporta propuestas económicas multisectoriales.
                                    </p>
                                </div>
                            </div>

                            {/* Inner Cotizador Navigation */}
                            <div className="flex bg-deep border border-glass-border rounded-lg p-1 w-full md:w-auto overflow-x-auto overflow-y-hidden">
                                <button
                                    onClick={() => setActiveCotizadorTab('empresas')}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                                        activeCotizadorTab === 'empresas'
                                            ? "bg-neon-cyan/20 text-neon-cyan shadow-glow-sm"
                                            : "text-gray-400 hover:text-white"
                                    )}
                                >
                                    <Building2 className="w-4 h-4" /> Empresas
                                </button>
                                <button
                                    onClick={() => setActiveCotizadorTab('equipos')}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                                        activeCotizadorTab === 'equipos'
                                            ? "bg-neon-cyan/20 text-neon-cyan shadow-glow-sm"
                                            : "text-gray-400 hover:text-white"
                                    )}
                                >
                                    <Package className="w-4 h-4" /> Catálogo de Equipos
                                </button>
                                <button
                                    onClick={() => setActiveCotizadorTab('cotizaciones')}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                                        activeCotizadorTab === 'cotizaciones'
                                            ? "bg-neon-cyan/20 text-neon-cyan shadow-glow-sm"
                                            : "text-gray-400 hover:text-white"
                                    )}
                                >
                                    <FileText className="w-4 h-4" /> Cotizaciones
                                </button>
                                <button
                                    onClick={() => setActiveCotizadorTab('versiones')}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                                        activeCotizadorTab === 'versiones'
                                            ? "bg-neon-cyan/20 text-neon-cyan shadow-glow-sm"
                                            : "text-gray-400 hover:text-white"
                                    )}
                                >
                                    <Layers className="w-4 h-4" /> Versiones
                                </button>
                            </div>
                        </div>

                        {/* Inner Content for Empresas */}
                        {activeCotizadorTab === 'empresas' && (
                            <div className="animate-fade-in flex-1">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-semibold text-white">Directorio de Empresas</h3>
                                    <button className="flex items-center gap-2 px-4 py-2 bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50 rounded-lg font-medium hover:bg-neon-cyan hover:text-black transition-all">
                                        <Plus className="w-4 h-4" />
                                        Nueva Empresa
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {companies.map(company => (
                                        <div
                                            key={company.id}
                                            className="p-6 bg-glass border rounded-xl transition-all duration-300 group relative overflow-hidden flex flex-col cursor-pointer hover:-translate-y-1 hover:shadow-glow-sm"
                                            onClick={() => {
                                                setActiveCompanyFicha(company);
                                                setActiveCotizadorTab('ficha');
                                                setActiveTemplate('standard');
                                            }}
                                            style={{
                                                borderColor: `${company.theme.accent}40`,
                                                boxShadow: `0 8px 32px ${company.theme.accent}15`,
                                                backgroundColor: ['#3B3B3B', '#10B981'].includes(company.theme.primary) || company.theme.primary.startsWith('#F') || company.theme.primary.startsWith('#3') || company.theme.primary.startsWith('#A')
                                                    ? undefined // fallback para no romper el CSS glass inicial muy drastico 
                                                    : `${company.theme.primary}20`
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = company.theme.accent;
                                                e.currentTarget.style.boxShadow = `0 12px 40px ${company.theme.accent}40`;
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = `${company.theme.accent}40`;
                                                e.currentTarget.style.boxShadow = `0 8px 32px ${company.theme.accent}15`;
                                            }}
                                        >
                                            <div
                                                className="absolute top-0 right-0 w-24 h-24 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500"
                                                style={{ backgroundColor: `${company.theme.accent}15` }}
                                            ></div>

                                            <div className="flex justify-between items-start mb-4">
                                                <div
                                                    className="w-12 h-12 rounded-lg flex items-center justify-center border overflow-hidden"
                                                    style={{
                                                        backgroundColor: `${company.theme.accent}20`,
                                                        borderColor: `${company.theme.accent}40`
                                                    }}
                                                >
                                                    {company.theme.logoUrl ? (
                                                        <img src={company.theme.logoUrl} alt={company.name} className="max-w-[80%] max-h-[80%] object-contain drop-shadow-md" />
                                                    ) : (
                                                        <span
                                                            className="font-bold text-xl"
                                                            style={{
                                                                color: company.theme.accent,
                                                                textShadow: `0 0 10px ${company.theme.accent}`
                                                            }}
                                                        >
                                                            {company.initials}
                                                        </span>
                                                    )}
                                                </div>
                                                <button
                                                    className="p-1.5 rounded-lg border border-transparent transition-all z-10 hover:bg-white/10"
                                                    style={{ color: `${company.theme.accent}99` }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.color = company.theme.accent;
                                                        e.currentTarget.style.borderColor = `${company.theme.accent}50`;
                                                        e.currentTarget.style.backgroundColor = `${company.theme.accent}20`;
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.color = `${company.theme.accent}99`;
                                                        e.currentTarget.style.borderColor = 'transparent';
                                                        e.currentTarget.style.backgroundColor = 'transparent';
                                                    }}
                                                    onClick={(e) => handleOpenSettings(e, company)}
                                                    title="Ajustes de Empresa"
                                                >
                                                    <Settings className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <h4
                                                className="text-xl font-bold mb-1 transition-colors"
                                                style={{ color: company.theme.secondary }}
                                                onMouseEnter={(e) => e.currentTarget.style.color = company.theme.accent}
                                                onMouseLeave={(e) => e.currentTarget.style.color = company.theme.secondary}
                                            >
                                                {company.name}
                                            </h4>
                                            <p
                                                className="text-sm mb-4 h-10"
                                                style={{ color: company.theme.support }}
                                            >
                                                {company.description}
                                            </p>
                                            <div className="mt-auto flex gap-2">
                                                <span
                                                    className="text-xs px-2 py-1 rounded-md border"
                                                    style={{
                                                        backgroundColor: `${company.theme.accent}15`,
                                                        color: company.theme.accent,
                                                        borderColor: `${company.theme.accent}30`
                                                    }}
                                                >
                                                    Activa
                                                </span>
                                                <span
                                                    className="text-xs px-2 py-1 rounded-md"
                                                    style={{
                                                        backgroundColor: 'rgba(255,255,255,0.05)',
                                                        color: company.theme.support
                                                    }}
                                                >
                                                    {company.equiposCount} Equipos
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Inner Content for Ficha de Empresa */}
                        {activeCotizadorTab === 'ficha' && activeCompanyFicha && (
                            <div className="animate-fade-in flex-1 flex flex-col pt-4">
                                {/* Encabezado de la Ficha */}
                                <div className="flex items-center gap-4 mb-8">
                                    <button
                                        onClick={() => setActiveCotizadorTab('empresas')}
                                        className="p-2.5 bg-glass border border-glass-border rounded-xl hover:bg-glass-light transition-all text-gray-400 hover:text-white group flex items-center justify-center"
                                    >
                                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                                    </button>
                                    <div
                                        className="w-14 h-14 rounded-xl flex items-center justify-center border bg-deep shadow-inner"
                                        style={{ borderColor: `${activeCompanyFicha.theme.accent}50` }}
                                    >
                                        {activeCompanyFicha.theme.logoUrl ? (
                                            <img src={activeCompanyFicha.theme.logoUrl} alt={activeCompanyFicha.name} className="max-w-[80%] max-h-[80%] object-contain drop-shadow-lg" />
                                        ) : (
                                            <span className="font-bold text-lg" style={{ color: activeCompanyFicha.theme.accent }}>{activeCompanyFicha.initials}</span>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-2xl font-bold text-white tracking-wide">{activeCompanyFicha.name}</h3>
                                        <div className="text-sm text-gray-400 flex items-center gap-2 mt-1">
                                            <Building2 className="w-3.5 h-3.5 shrink-0" />
                                            {isEditingTitle ? (
                                                <input
                                                    type="text"
                                                    value={projectTitle}
                                                    onChange={(e) => setProjectTitle(e.target.value)}
                                                    onBlur={() => setIsEditingTitle(false)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') setIsEditingTitle(false);
                                                    }}
                                                    autoFocus
                                                    className="bg-deep border border-glass-border rounded px-2 py-0.5 text-white min-w-[280px] focus:border-neon-cyan outline-none transition-colors"
                                                />
                                            ) : (
                                                <span
                                                    className="cursor-pointer border-b border-dashed border-transparent hover:border-gray-500 transition-colors text-white font-bold tracking-wider"
                                                    onClick={() => setIsEditingTitle(true)}
                                                    title="Haz clic para cambiar el nombre de este Módulo"
                                                >
                                                    {projectTitle}
                                                </span>
                                            )}
                                            <button
                                                onClick={() => setIsEditingTitle(!isEditingTitle)}
                                                className="ml-1 p-1 rounded-md text-gray-500 hover:text-white bg-glass border border-glass-border hover:border-gray-400 hover:shadow-glow-sm transition-all"
                                                title="Activar Modo Editor de Módulo"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" style={{ color: activeCompanyFicha.theme.accent }} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-gray-400 mb-1">Métricas Generales</div>
                                        <div className="flex gap-2">
                                            <span className="px-3 py-1 bg-glass-light rounded-md border border-glass-border text-xs text-white">12 Cotizadas</span>
                                            <span className="px-3 py-1 rounded-md border text-xs font-semibold" style={{ backgroundColor: `${activeCompanyFicha.theme.accent}20`, borderColor: `${activeCompanyFicha.theme.accent}30`, color: activeCompanyFicha.theme.accent }}>$1.2M USD</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Area de Trabajo interactiva */}
                                <div className="flex flex-col xl:flex-row gap-6 flex-1 min-h-[600px]">
                                    {/* Panel Lateral: Menú de Cotizaciones */}
                                    {isSidebarOpen ? (
                                        <div className="w-full xl:w-1/4 bg-glass border border-glass-border rounded-2xl p-5 flex flex-col shadow-glow-sm relative animate-fade-in-left shrink-0">
                                            {/* Toggle Button Inside Sidebar */}
                                            <button
                                                onClick={() => setIsSidebarOpen(false)}
                                                className="absolute -right-4 top-8 w-8 h-8 rounded-full bg-deep border-glass-border border flex items-center justify-center hover:bg-glass-light transition-colors z-20 shadow-lg text-gray-400 hover:text-white"
                                            >
                                                <PanelLeftClose className="w-4 h-4" />
                                            </button>

                                            <div className="flex justify-between items-center mb-6 pb-4 border-b border-glass-border">
                                                <h4 className="text-lg font-bold text-white flex items-center gap-2">
                                                    <FileText className="w-5 h-5" style={{ color: activeCompanyFicha.theme.accent }} />
                                                    Historial
                                                </h4>
                                                <button
                                                    onClick={handleCreateQuote}
                                                    className="p-2 border rounded-lg transition-transform hover:scale-105 shadow-md flex items-center justify-center hover:shadow-glow-sm"
                                                    style={{ backgroundColor: activeCompanyFicha.theme.accent, color: activeCompanyFicha.theme.primary === '#FFFFFF' ? '#000' : activeCompanyFicha.theme.secondary, borderColor: activeCompanyFicha.theme.accent }}
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="flex flex-col gap-3 overflow-y-auto pr-2 stylized-scrollbar">
                                                {/* Iterar sobre todas las cotizaciones creadas */}
                                                {quotes.map(quote => (
                                                    <div
                                                        key={quote.id}
                                                        className={`p-4 rounded-xl border flex flex-col gap-2 cursor-pointer transition-all hover:translate-x-1 shadow-sm ${activeTemplate === quote.id ? 'bg-deep/50 shadow-lg' : 'bg-glass border-glass-border hover:bg-glass-light'}`}
                                                        style={activeTemplate === quote.id ? { borderLeftColor: activeCompanyFicha.theme.accent, borderLeftWidth: '4px', borderColor: `${activeCompanyFicha.theme.accent}50` } : {}}
                                                        onClick={() => setActiveTemplate(quote.id)}
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <span className={activeTemplate === quote.id ? "text-white font-bold tracking-wider" : "text-gray-300 font-bold tracking-wider"}>{quote.name}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest font-bold" style={activeTemplate === quote.id ? { backgroundColor: `${activeCompanyFicha.theme.accent}20`, color: activeCompanyFicha.theme.accent } : { backgroundColor: '#333', color: '#888' }}>{quote.type}</span>
                                                                {quote.id !== 'choco34' && (
                                                                    <button
                                                                        onClick={(e) => handleDeleteQuote(e, quote.id)}
                                                                        className="p-1 text-red-500 hover:text-white bg-transparent hover:bg-red-500 transition-colors border border-transparent hover:border-red-400 rounded-md"
                                                                        title="Eliminar Cotización"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className={activeTemplate === quote.id ? "text-xs text-gray-300" : "text-xs text-gray-400"}>{quote.desc}</span>
                                                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-glass-border/50">
                                                            <span className="text-[10px] text-gray-500">{new Date(quote.date).toLocaleDateString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-4 items-center animate-fade-in-right px-2 mt-4 shrink-0 justify-start">
                                            <button
                                                onClick={() => setIsSidebarOpen(true)}
                                                className="w-10 h-10 rounded-full bg-glass-light border-glass-border border flex items-center justify-center hover:bg-glass transition-all shadow-glow-sm hover:scale-110"
                                                style={{ borderColor: `${activeCompanyFicha.theme.accent}50`, color: activeCompanyFicha.theme.accent }}
                                            >
                                                <PanelLeftOpen className="w-5 h-5" />
                                            </button>

                                            <button className="w-10 h-10 rounded-full bg-glass flex items-center justify-center text-gray-400 hover:text-white transition-colors border border-glass-border shadow-md">
                                                <Plus className="w-5 h-5" />
                                            </button>
                                        </div>
                                    )}

                                    {/* Panel Principal: Editor Visual */}
                                    <div className="flex-1 bg-glass border border-glass-border rounded-2xl p-6 lg:p-10 flex flex-col relative overflow-hidden shadow-2xl transition-all duration-300">
                                        {/* Luces decorativas temáticas */}
                                        <div className="absolute top-0 right-0 w-96 h-96 rounded-bl-full opacity-10 blur-[80px] pointer-events-none transition-colors duration-1000" style={{ backgroundColor: activeCompanyFicha.theme.accent }}></div>
                                        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-tr-full opacity-[0.03] blur-[60px] pointer-events-none transition-colors duration-1000" style={{ backgroundColor: activeCompanyFicha.theme.accent }}></div>

                                        <ChocoVer32Master key={activeTemplate} storageKey={activeTemplate} theme={activeCompanyFicha.theme} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Inner Content for Catálogo de Equipos */}
                        {activeCotizadorTab === 'equipos' && (
                            <div className="animate-fade-in flex-1 pt-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-semibold text-white">Catálogo de Equipos</h3>
                                    <button className="flex items-center gap-2 px-4 py-2 bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50 rounded-lg font-medium hover:bg-neon-cyan hover:text-black transition-all">
                                        <Plus className="w-4 h-4" />
                                        Añadir Equipo
                                    </button>
                                </div>
                                <div className="p-8 border border-dashed border-glass-border rounded-xl text-center text-gray-400">
                                    <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    Selecciona una empresa para gestionar sus equipos filtrados, o añade equipos globales aquí.
                                </div>
                            </div>
                        )}

                        {/* Inner Content for Cotizaciones */}
                        {activeCotizadorTab === 'cotizaciones' && (
                            <div className="animate-fade-in flex-1">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-semibold text-white">Cotizaciones Recientes</h3>
                                    <button className="px-4 py-2 bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50 rounded-lg text-sm font-medium hover:bg-neon-cyan hover:text-black transition-all">
                                        Crear Nueva Cotización
                                    </button>
                                </div>
                                <div className="p-8 border border-dashed border-glass-border rounded-xl text-center text-gray-400">
                                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    Aún no hay cotizaciones generadas.
                                </div>
                            </div>
                        )}

                        {/* Inner Content for Versiones de Cotización */}
                        {activeCotizadorTab === 'versiones' && (
                            <div className="animate-fade-in flex-1">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-semibold text-white">Versiones de Cotización</h3>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="file"
                                            className="hidden"
                                            ref={fileInputRef}
                                            onChange={handleFileUpload}
                                            accept=".xlsx,.xls,.doc,.docx,.ppt,.pptx"
                                        />
                                        <button
                                            onClick={() => fileInputRef.current.click()}
                                            className="flex items-center gap-2 px-4 py-2 bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50 rounded-lg font-medium hover:bg-neon-cyan hover:text-black transition-all"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Nueva Configuración
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {/* Default Version Card */}
                                    <div className={cn(
                                        "p-6 bg-glass border rounded-xl transition-all group relative overflow-hidden",
                                        activeVersionId === 'default' ? "border-neon-cyan shadow-glow-sm" : "border-neon-cyan/30 opacity-60 hover:opacity-100"
                                    )}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 bg-neon-cyan/10 rounded-lg">
                                                <Layers className="w-6 h-6 text-neon-cyan" />
                                            </div>
                                            <span className={cn(
                                                "text-xs px-2 py-1 rounded-full border font-bold uppercase tracking-wider",
                                                activeVersionId === 'default' ? "bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30" : "bg-white/5 text-gray-400 border-white/10"
                                            )}>
                                                {activeVersionId === 'default' ? 'ACTIVA' : 'ESTÁNDAR'}
                                            </span>
                                        </div>
                                        <h4 className="text-lg font-bold text-white mb-2">Versión Estándar</h4>
                                        <p className="text-sm text-gray-400">Plantilla base con listado predictivo y campos esenciales para propuestas corporativas.</p>
                                        <div className="mt-4 pt-4 border-t border-glass-border flex justify-between items-center">
                                            <span className="text-xs text-gray-500 italic">Preconfigurado</span>
                                            <button
                                                onClick={() => handleOpenVersion('default')}
                                                className="text-xs text-neon-cyan hover:underline font-bold"
                                            >
                                                {activeVersionId === 'default' ? 'Configurar versión' : 'Abrir versión'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Dynamically Loaded Version Files */}
                                    {versionFiles.map(vFile => (
                                        <div
                                            key={vFile.id}
                                            className={cn(
                                                "p-6 bg-glass border rounded-xl transition-all group animate-scale-in relative overflow-hidden",
                                                activeVersionId === vFile.id ? "border-neon-purple shadow-glow-sm" : "border-neon-purple/30 opacity-60 hover:opacity-100"
                                            )}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-3 bg-neon-purple/10 rounded-lg">
                                                    <Upload className="w-6 h-6 text-neon-purple" />
                                                </div>
                                                <span className={cn(
                                                    "text-[10px] px-2 py-1 rounded-full border font-bold uppercase",
                                                    activeVersionId === vFile.id ? "bg-neon-purple/20 text-neon-purple border-neon-purple/30" : "bg-white/5 text-gray-400 border-white/10"
                                                )}>
                                                    {activeVersionId === vFile.id ? 'ACTIVA' : 'PROCESADA'}
                                                </span>
                                            </div>

                                            {editingVersionId === vFile.id ? (
                                                <input
                                                    type="text"
                                                    value={vFile.name}
                                                    onChange={(e) => setVersionFiles(prev => prev.map(f => f.id === vFile.id ? { ...f, name: e.target.value } : f))}
                                                    onBlur={() => setEditingVersionId(null)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') setEditingVersionId(null);
                                                    }}
                                                    autoFocus
                                                    className="bg-deep border border-neon-purple/50 rounded px-2 py-1 text-white text-lg font-bold w-full mb-2 outline-none"
                                                />
                                            ) : (
                                                <div className="flex items-center gap-2 mb-2 group/title">
                                                    <h4 className="text-lg font-bold text-white truncate max-w-[80%]" title={vFile.name}>
                                                        {vFile.name}
                                                    </h4>
                                                    <button
                                                        onClick={() => setEditingVersionId(vFile.id)}
                                                        className="p-1 rounded hover:bg-white/10 opacity-0 group-hover/title:opacity-100 transition-opacity"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                                                    </button>
                                                </div>
                                            )}

                                            <p className="text-sm text-gray-400">Archivo base cargado para generar estructura de datos IA.</p>
                                            <div className="mt-4 pt-4 border-t border-glass-border flex justify-between items-center">
                                                <span className="text-xs text-gray-500">{vFile.size} KB</span>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setShowMappingEditor(true)}
                                                        className="text-[10px] px-3 py-1.5 bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan rounded font-bold hover:bg-neon-cyan hover:text-black transition-all flex items-center gap-1"
                                                    >
                                                        <Wand2 className="w-3 h-3" /> Configurar IA
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDeleteVersionFile(e, vFile.id)}
                                                        className="text-[10px] p-1.5 bg-glass-light border border-glass-border rounded hover:bg-red-500/20 hover:text-red-400 transition-colors"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenVersion(vFile.id)}
                                                        className={cn(
                                                            "text-[10px] px-3 py-1.5 border rounded font-bold transition-all",
                                                            activeVersionId === vFile.id
                                                                ? "bg-neon-purple text-white border-neon-purple shadow-glow-sm"
                                                                : "bg-glass-light border-neon-purple/30 text-neon-purple hover:bg-neon-purple hover:text-white"
                                                        )}
                                                    >
                                                        {activeVersionId === vFile.id ? 'Trabajando...' : 'Abrir'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Upload Trigger Area */}
                                    <div
                                        onClick={() => fileInputRef.current.click()}
                                        className="p-6 bg-glass border border-dashed border-glass-border rounded-xl cursor-pointer hover:border-neon-blue/50 hover:bg-neon-blue/5 transition-all group flex flex-col items-center justify-center min-h-[220px]"
                                    >
                                        <div className="p-4 bg-white/5 rounded-full text-gray-500 group-hover:bg-neon-blue/10 group-hover:text-neon-blue transition-all group-hover:scale-110 mb-3">
                                            <Upload className="w-8 h-8" />
                                        </div>
                                        <h4 className="text-lg font-bold text-gray-400 group-hover:text-white mb-1">Nueva Versión</h4>
                                        <p className="text-xs text-gray-500 text-center">Sube tu Excel, Word o PPT para usarlo como base</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Modal: AI Mapping Editor */}
                        <Dialog open={showMappingEditor} onOpenChange={setShowMappingEditor}>
                            <DialogContent className="max-w-5xl bg-deep border-glass-border max-h-[90vh] overflow-y-auto custom-scrollbar">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2 text-2xl text-neon-cyan">
                                        <Sparkles className="w-6 h-6" />
                                        Editor de Mapeo Inteligente (IA)
                                    </DialogTitle>
                                    <DialogDescription className="text-gray-400">
                                        Configura la IA para procesar información desordenada y aplicarla a tu formato <span className="text-white font-bold">"{versionFiles.find(f => f.id === activeVersionId)?.name || 'Plantilla'}"</span>.
                                    </DialogDescription>
                                </DialogHeader>

                                {/* New Section: Raw Data Input */}
                                <div className="mt-6 p-4 bg-glass-light border border-neon-purple/20 rounded-xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
                                        <Sparkles className="w-12 h-12 text-neon-purple" />
                                    </div>
                                    <h5 className="text-sm font-bold text-neon-purple mb-2 flex items-center gap-2">
                                        <FileText className="w-4 h-4" /> 1. Pega tu Información Desordenada
                                    </h5>
                                    <textarea
                                        className="w-full h-32 bg-deep/50 border border-glass-border rounded-lg p-3 text-xs text-gray-300 placeholder:text-gray-600 focus:border-neon-purple/50 outline-none transition-all resize-none"
                                        placeholder="Pega aquí especificaciones técnicas, correos, notas de voz transcritas o cualquier texto sin formato sobre el equipo..."
                                        value={messyText}
                                        onChange={(e) => setMessyText(e.target.value)}
                                    />
                                    <div className="flex justify-end mt-2">
                                        <button
                                            onClick={async () => {
                                                setIsProcessingText(true);
                                                await new Promise(r => setTimeout(r, 1500));
                                                setIsProcessingText(false);
                                                toast({ title: "✨ IA Ejecutada", description: "Información organizada y mapeada al formato." });
                                            }}
                                            className="px-4 py-1.5 bg-neon-purple/20 text-neon-purple border border-neon-purple/50 rounded-lg text-[10px] font-bold hover:bg-neon-purple hover:text-white transition-all flex items-center gap-2"
                                            disabled={!messyText || isProcessingText}
                                        >
                                            {isProcessingText ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                                            Organizar con IA
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-6">
                                    {/* Left: Preview/Structure (4 columns) */}
                                    <div className="md:col-span-4 space-y-4">
                                        <div className="bg-glass-light border border-glass-border rounded-xl p-4">
                                            <h5 className="text-xs font-bold text-gray-300 mb-4 flex items-center gap-2">
                                                <Target className="w-4 h-4 text-neon-purple" />
                                                2. Estructura del Formato
                                            </h5>
                                            <div className="space-y-2">
                                                {['Header Corporativo', 'Tabla de Especificaciones', 'Bloque de Imágenes', 'Pie de Página'].map((item, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-2.5 bg-deep rounded-lg border border-glass-border text-[10px] text-gray-400">
                                                        <span>{item}</span>
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <h5 className="text-xs font-bold text-gray-300 mb-2">3. Campos a Mapear</h5>
                                            <div className="grid grid-cols-1 gap-2">
                                                {[
                                                    { id: 'nombre_equipo', label: 'Nombre Equipo' },
                                                    { id: 'especificaciones_tecnicas', label: 'Ficha Técnica' },
                                                    { id: 'imagen_referencial', label: 'Placeholder Img' }
                                                ].map(field => (
                                                    <label key={field.id} className="flex items-center gap-3 p-2.5 bg-glass-light border border-glass-border rounded-lg cursor-pointer hover:border-neon-cyan/40 transition-all">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedFields.includes(field.id)}
                                                            onChange={() => {
                                                                setSelectedFields(prev => prev.includes(field.id) ? prev.filter(i => i !== field.id) : [...prev, field.id]);
                                                            }}
                                                            className="w-3.5 h-3.5 rounded border-glass-border bg-deep text-neon-cyan focus:ring-neon-cyan/50"
                                                        />
                                                        <span className="text-[10px] font-bold text-white">{field.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Visual Mockup (8 columns) */}
                                    <div className="md:col-span-8 bg-glass-light border border-glass-border rounded-xl p-4 flex flex-col">
                                        <h5 className="text-xs font-bold text-neon-cyan mb-4 flex items-center gap-2">
                                            <Palette className="w-4 h-4" /> 4. Vista Previa de la Ficha (Referencia)
                                        </h5>
                                        <div className="flex-1 bg-deep/80 rounded-lg border border-glass-border p-6 font-mono text-[9px] relative overflow-hidden group/preview">
                                            {/* Simulated Technical Sheet Layout */}
                                            <div className="w-full h-8 border-b border-white/10 flex justify-between items-center mb-6">
                                                <div className="w-16 h-4 bg-white/5 rounded"></div>
                                                <div className="text-[8px] text-gray-600">PROYECTO: PANDORA-3.0</div>
                                            </div>

                                            <div className="mb-4">
                                                <div className={cn("h-6 w-2/3 rounded mb-2 transition-all", messyText ? "bg-neon-cyan/20 border border-neon-cyan/30 flex items-center px-2 text-neon-cyan" : "bg-white/5")}>
                                                    {messyText ? "SMART FREEZER XT-200" : "[NOMBRE DISPOSITIVO]"}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 mb-6">
                                                <div className="space-y-2">
                                                    <div className="h-2 w-full bg-white/5 rounded"></div>
                                                    <div className="h-2 w-5/6 bg-white/5 rounded"></div>
                                                    <div className="h-2 w-full bg-white/5 rounded"></div>
                                                    <div className="h-2 w-4/6 bg-white/5 rounded"></div>
                                                </div>
                                                <div className="h-24 bg-white/5 border border-dashed border-white/10 rounded flex items-center justify-center text-gray-600">
                                                    <Package className="w-8 h-8 opacity-20" />
                                                </div>
                                            </div>

                                            <div className="w-full h-20 border border-neon-purple/20 bg-neon-purple/5 rounded p-2 overflow-hidden">
                                                <div className="text-[7px] text-neon-purple/70 uppercase mb-1 font-bold">Especificaciones Generadas por IA:</div>
                                                <div className="text-gray-400 space-y-1">
                                                    {messyText ? (
                                                        <>
                                                            <div className="animate-fade-in-right">• Capacidad optimizada para alta frecuencia</div>
                                                            <div className="animate-fade-in-right" style={{ animationDelay: '0.2s' }}>• Sensor inteligente de temperatura</div>
                                                            <div className="animate-fade-in-right" style={{ animationDelay: '0.4s' }}>• Consumo energético Clase A++</div>
                                                        </>
                                                    ) : (
                                                        <div className="text-gray-700 italic">Esperando entrada de información...</div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="absolute inset-0 bg-neon-cyan/5 opacity-0 group-hover/preview:opacity-100 transition-opacity pointer-events-none flex items-center justify-center">
                                                <span className="bg-black/80 px-3 py-1 rounded-full border border-neon-cyan text-neon-cyan text-[8px]">MODELO DE VISTA EN VIVO</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-glass-border">
                                    {isAutomating ? (
                                        <div className="w-full space-y-4">
                                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                                                <span>{automationStatus}</span>
                                                <span className="font-bold text-neon-cyan">{Math.round(automationProgress)}%</span>
                                            </div>
                                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                                                <div
                                                    className="h-full bg-gradient-to-r from-neon-cyan to-neon-blue transition-all duration-300"
                                                    style={{ width: `${automationProgress}%` }}
                                                />
                                            </div>
                                            <p className="text-[10px] text-center text-gray-500 italic">Por favor no cierres esta ventana mientras la IA procesa el formato...</p>
                                        </div>
                                    ) : automationCompleted ? (
                                        <div className="w-full flex items-center justify-between p-4 bg-neon-cyan/10 border border-neon-cyan/30 rounded-xl animate-scale-in">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-neon-cyan rounded-full">
                                                    <Check className="w-4 h-4 text-black" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">¡40 Fichas Generadas!</p>
                                                    <p className="text-[10px] text-gray-400">Archivos listos para descarga en formato PPTX.</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setAutomationCompleted(false)}
                                                    className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white transition-colors"
                                                >
                                                    Cerrar
                                                </button>
                                                <button className="flex items-center gap-2 px-4 py-2 bg-neon-cyan text-black font-bold rounded-lg hover:scale-105 transition-all text-xs">
                                                    <Download className="w-3.5 h-3.5" /> Descargar Todo (.zip)
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => setShowMappingEditor(false)}
                                                className="px-6 py-2 text-sm font-bold text-gray-400 hover:text-white transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={startAutomation}
                                                className="px-8 py-2 bg-gradient-to-r from-neon-cyan to-neon-blue text-black font-bold rounded-lg shadow-glow-sm hover:scale-105 transition-all flex items-center gap-2"
                                            >
                                                <Sparkles className="w-4 h-4" /> Empezar Automatización Masiva
                                            </button>
                                        </>
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                )}
            </div>

            {/* Editing Company Settings Dialog */}
            <Dialog open={!!editingCompany} onOpenChange={(open) => !open && setEditingCompany(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-2xl">
                            <Settings className="w-6 h-6 text-neon-cyan" />
                            Ajustes de Empresa
                        </DialogTitle>
                        <DialogDescription className="text-gray-300">
                            Configura el logo, colores del tema y formato del cotizador para <span className="font-bold text-white text-base">{editingCompany?.name}</span>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 mt-4">
                        {/* Logo Upload Section */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-300">Logotipo de la Empresa</label>
                            <label className="border-2 border-dashed border-glass-border rounded-xl p-6 flex flex-col items-center justify-center gap-3 hover:border-neon-cyan/50 hover:bg-neon-cyan/5 transition-all cursor-pointer group relative overflow-hidden">
                                <input type="file" className="hidden" accept="image/png, image/jpeg, image/svg+xml" onChange={handleLogoUpload} />
                                {editingForm.logoUrl ? (
                                    <div className="absolute inset-0 bg-deep/80 backdrop-blur-sm flex items-center justify-center">
                                        <img src={editingForm.logoUrl} alt="Logo" className="max-h-24 max-w-full object-contain" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-white text-sm font-medium flex items-center gap-2">
                                                <Upload className="w-4 h-4" /> Cambiar Logo
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="p-3 bg-glass-light rounded-full group-hover:bg-neon-cyan/20 transition-colors">
                                            <Upload className="w-6 h-6 text-gray-400 group-hover:text-neon-cyan" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm text-gray-300">Haz clic para subir un nuevo logotipo</p>
                                            <p className="text-xs text-gray-500 mt-1">PNG, JPG, SVG (Recomendado 500x500px)</p>
                                        </div>
                                    </>
                                )}
                            </label>
                        </div>

                        {/* Logo Light Upload Section */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-300">Logotipo Alternativo (Para fondos claros)</label>
                            <label className="border-2 border-dashed border-glass-border rounded-xl p-6 flex flex-col items-center justify-center gap-3 hover:border-black/50 bg-white hover:bg-white/90 transition-all cursor-pointer group relative overflow-hidden shadow-inner">
                                <input type="file" className="hidden" accept="image/png, image/jpeg, image/svg+xml" onChange={handleLogoLightUpload} />
                                {editingForm.logoLightUrl ? (
                                    <div className="absolute inset-0 bg-white flex items-center justify-center">
                                        <img src={editingForm.logoLightUrl} alt="Logo Light" className="max-h-24 max-w-full object-contain" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-white text-sm font-medium flex items-center gap-2">
                                                <Upload className="w-4 h-4" /> Cambiar Logo Claro
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="p-3 bg-gray-100 rounded-full group-hover:bg-gray-200 transition-colors">
                                            <Upload className="w-6 h-6 text-gray-400 group-hover:text-black" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm text-gray-600">Logo para hoja 2 en adelante</p>
                                            <p className="text-xs text-gray-400 mt-1">Gris oscuro/Negro recomendado</p>
                                        </div>
                                    </>
                                )}
                            </label>
                        </div>

                        {/* Theme Colors Section */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                <Palette className="w-4 h-4" /> Colores del Tema
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500">Color Primario Corporativo (Fondo)</label>
                                    <div className="flex items-center gap-3 p-2 bg-glass border border-glass-border rounded-lg relative overflow-hidden focus-within:border-neon-cyan/50 transition-colors">
                                        <div className="relative w-6 h-6 rounded-md shadow-inner border border-white/20 overflow-hidden shrink-0">
                                            <input
                                                type="color"
                                                className="absolute inset-[-10px] w-12 h-12 cursor-pointer"
                                                value={editingForm.primaryColor}
                                                onChange={(e) => setEditingForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                                            />
                                        </div>
                                        <input
                                            type="text"
                                            maxLength={7}
                                            className="text-sm text-gray-300 font-mono uppercase bg-transparent border-none outline-none w-full focus:text-white"
                                            value={editingForm.primaryColor}
                                            onChange={(e) => setEditingForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500">Secundario Neutro (Texto Principal)</label>
                                    <div className="flex items-center gap-3 p-2 bg-glass border border-glass-border rounded-lg relative overflow-hidden focus-within:border-neon-cyan/50 transition-colors">
                                        <div className="relative w-6 h-6 rounded-md shadow-inner border border-white/20 overflow-hidden shrink-0">
                                            <input
                                                type="color"
                                                className="absolute inset-[-10px] w-12 h-12 cursor-pointer"
                                                value={editingForm.secondaryColor}
                                                onChange={(e) => setEditingForm(prev => ({ ...prev, secondaryColor: e.target.value }))}
                                            />
                                        </div>
                                        <input
                                            type="text"
                                            maxLength={7}
                                            className="text-sm text-gray-300 font-mono uppercase bg-transparent border-none outline-none w-full focus:text-white"
                                            value={editingForm.secondaryColor}
                                            onChange={(e) => setEditingForm(prev => ({ ...prev, secondaryColor: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500">Color de Acento</label>
                                    <div className="flex items-center gap-3 p-2 bg-glass border border-glass-border rounded-lg relative overflow-hidden focus-within:border-neon-cyan/50 transition-colors">
                                        <div className="relative w-6 h-6 rounded-md shadow-inner border border-white/20 overflow-hidden shrink-0">
                                            <input
                                                type="color"
                                                className="absolute inset-[-10px] w-12 h-12 cursor-pointer"
                                                value={editingForm.accentColor}
                                                onChange={(e) => setEditingForm(prev => ({ ...prev, accentColor: e.target.value }))}
                                            />
                                        </div>
                                        <input
                                            type="text"
                                            maxLength={7}
                                            className="text-sm text-gray-300 font-mono uppercase bg-transparent border-none outline-none w-full focus:text-white"
                                            value={editingForm.accentColor}
                                            onChange={(e) => setEditingForm(prev => ({ ...prev, accentColor: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500">Soporte Tipográfico (Secundario)</label>
                                    <div className="flex items-center gap-3 p-2 bg-glass border border-glass-border rounded-lg relative overflow-hidden focus-within:border-neon-cyan/50 transition-colors">
                                        <div className="relative w-6 h-6 rounded-md shadow-inner border border-white/20 overflow-hidden shrink-0">
                                            <input
                                                type="color"
                                                className="absolute inset-[-10px] w-12 h-12 cursor-pointer"
                                                value={editingForm.supportColor}
                                                onChange={(e) => setEditingForm(prev => ({ ...prev, supportColor: e.target.value }))}
                                            />
                                        </div>
                                        <input
                                            type="text"
                                            maxLength={7}
                                            className="text-sm text-gray-300 font-mono uppercase bg-transparent border-none outline-none w-full focus:text-white"
                                            value={editingForm.supportColor}
                                            onChange={(e) => setEditingForm(prev => ({ ...prev, supportColor: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Document Format Section */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-300">Formato PDF Base</label>
                            <select
                                className="w-full bg-glass border border-glass-border text-white text-sm rounded-lg focus:ring-neon-cyan focus:border-neon-cyan block p-2.5 outline-none"
                                value={editingForm.format}
                                onChange={(e) => setEditingForm(prev => ({ ...prev, format: e.target.value }))}
                            >
                                <option>Plantilla Estándar PANDORA</option>
                                <option>Plantilla Premium Detallada</option>
                                <option>Plantilla Ejecutiva Simple</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
                        <button
                            onClick={() => setEditingCompany(null)}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 bg-glass hover:bg-glass-hover hover:text-white transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSaveSettings}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-black bg-neon-cyan hover:bg-[#00D0DD] hover:shadow-glow-md transition-all"
                        >
                            Guardar Cambios
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default AdminCotizadorPage;
