import React, { useState, useEffect } from 'react';
import ColorThief from 'colorthief';
import { ShieldAlert, DollarSign, Settings, Calculator, Building2, Package, FileText, Plus, Upload, Palette, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
            theme: { primary: '#3B3B3B', secondary: '#FFFFFF', accent: '#F2B705', support: '#E6E6E6', logoUrl: null },
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
                return JSON.parse(saved);
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

    const handleSaveSettings = () => {
        setCompanies(prev => prev.map(c => {
            if (c.id === editingCompany.id) {
                return {
                    ...c,
                    theme: {
                        primary: editingForm.primaryColor,
                        secondary: editingForm.secondaryColor,
                        accent: editingForm.accentColor,
                        support: editingForm.supportColor,
                        logoUrl: editingForm.logoUrl
                    },
                    format: editingForm.format
                };
            }
            return c;
        }));
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
                                        <p className="text-sm text-gray-400 flex items-center gap-2 mt-1">
                                            <Building2 className="w-3.5 h-3.5" /> Portal de Cotizaciones
                                        </p>
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
                                    <div className="w-full xl:w-1/4 bg-glass border border-glass-border rounded-2xl p-5 flex flex-col shadow-glow-sm">
                                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-glass-border">
                                            <h4 className="text-lg font-bold text-white flex items-center gap-2">
                                                <FileText className="w-5 h-5" style={{ color: activeCompanyFicha.theme.accent }} />
                                                Historial
                                            </h4>
                                            <button
                                                className="p-2 border rounded-lg transition-transform hover:scale-105 shadow-md flex items-center justify-center"
                                                style={{ backgroundColor: activeCompanyFicha.theme.accent, color: activeCompanyFicha.theme.primary === '#FFFFFF' ? '#000' : activeCompanyFicha.theme.secondary, borderColor: activeCompanyFicha.theme.accent }}
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="flex flex-col gap-3 overflow-y-auto pr-2 stylized-scrollbar">
                                            {/* Cotización Activa */}
                                            <div
                                                className="p-4 rounded-xl border flex flex-col gap-2 cursor-pointer transition-all hover:translate-x-1 shadow-lg bg-deep/50"
                                                style={{ borderLeftColor: activeCompanyFicha.theme.accent, borderLeftWidth: '4px', borderColor: `${activeCompanyFicha.theme.accent}50` }}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <span className="text-white font-bold tracking-wider">COT-003</span>
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest font-bold" style={{ backgroundColor: `${activeCompanyFicha.theme.accent}20`, color: activeCompanyFicha.theme.accent }}>Borrador</span>
                                                </div>
                                                <span className="text-xs text-gray-300">Expansión Planta Tratamiento Sur</span>
                                                <div className="flex justify-between items-center mt-2 pt-2 border-t border-glass-border/50">
                                                    <span className="text-[10px] text-gray-500">Hoy, 10:45 AM</span>
                                                    <span className="text-sm font-mono font-bold" style={{ color: activeCompanyFicha.theme.accent }}>$18,212.00</span>
                                                </div>
                                            </div>

                                            {/* Cotizaciones de Historial */}
                                            {[2, 1].map(item => (
                                                <div
                                                    key={item}
                                                    className="p-4 rounded-xl border border-glass-border bg-glass hover:bg-glass-light flex flex-col gap-2 cursor-pointer transition-all hover:translate-x-1"
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <span className="text-gray-300 font-bold tracking-wider">COT-00{item}</span>
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full uppercase border border-glass-border text-gray-400 bg-glass-dark">Enviada</span>
                                                    </div>
                                                    <span className="text-xs text-gray-400">Proyecto Modelo Industrial {item}</span>
                                                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-glass-border/30">
                                                        <span className="text-[10px] text-gray-500">hace {item * 3} días</span>
                                                        <span className="text-sm font-mono text-gray-400">${item * 12},500.00</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Panel Principal: Editor Visual */}
                                    <div className="flex-1 bg-glass border border-glass-border rounded-2xl p-6 lg:p-10 flex flex-col relative overflow-hidden shadow-2xl">
                                        {/* Luces decorativas temáticas */}
                                        <div className="absolute top-0 right-0 w-96 h-96 rounded-bl-full opacity-10 blur-[80px] pointer-events-none transition-colors duration-1000" style={{ backgroundColor: activeCompanyFicha.theme.accent }}></div>
                                        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-tr-full opacity-[0.03] blur-[60px] pointer-events-none transition-colors duration-1000" style={{ backgroundColor: activeCompanyFicha.theme.accent }}></div>

                                        <div className="border-b border-glass-border pb-6 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center relative z-10 gap-4">
                                            <div>
                                                <h4 className="text-3xl font-black text-white mb-2 tracking-tight" style={{ textShadow: `0 0 30px ${activeCompanyFicha.theme.accent}40` }}>#COT-003</h4>
                                                <p className="text-sm text-gray-400 flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: activeCompanyFicha.theme.accent }}></span>
                                                    Editando archivo vivo
                                                </p>
                                            </div>
                                            <div className="flex gap-3">
                                                <button className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-glow-sm hover:scale-105" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                    Previsualizar
                                                </button>
                                                <button className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-xl hover:scale-105 hover:brightness-110 flex items-center gap-2" style={{ backgroundColor: activeCompanyFicha.theme.accent, color: activeCompanyFicha.theme.primary === '#3B3B3B' || activeCompanyFicha.theme.primary === '#FFFFFF' ? '#000' : activeCompanyFicha.theme.secondary }}>
                                                    <Upload className="w-4 h-4" /> Exportar PDF
                                                </button>
                                            </div>
                                        </div>

                                        {/* Canvas EditorScroll */}
                                        <div className="flex-1 overflow-y-auto space-y-8 relative z-10 pr-4 stylized-scrollbar">

                                            {/* Metadatos Documento */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-xl border border-glass-border bg-deep/40 backdrop-blur-sm">
                                                <div className="space-y-3">
                                                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Cliente / Proyecto</label>
                                                    <input
                                                        type="text"
                                                        className="w-full bg-glass border border-glass-border p-3.5 rounded-lg text-white font-medium outline-none transition-all focus:shadow-glow-sm"
                                                        style={{ focusBorderColor: activeCompanyFicha.theme.accent }}
                                                        defaultValue="Expansión Planta Tratamiento Sur"
                                                    />
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Fecha y Validez</label>
                                                    <div className="flex gap-3">
                                                        <input
                                                            type="date"
                                                            className="w-full bg-glass border border-glass-border p-3.5 rounded-lg text-white font-medium outline-none transition-all"
                                                        />
                                                        <select className="bg-glass border border-glass-border p-3.5 rounded-lg text-white outline-none w-32">
                                                            <option>15 Días</option>
                                                            <option>30 Días</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Construccion de Partidas */}
                                            <div className="space-y-6">
                                                <div className="flex justify-between items-end border-b border-glass-border pb-3">
                                                    <div>
                                                        <h5 className="text-xl font-bold text-white tracking-wide">Partidas y Equipos</h5>
                                                        <p className="text-xs text-gray-400 mt-1">Añade equipos del catálogo de la empresa o crea conceptos libres.</p>
                                                    </div>
                                                    <button
                                                        className="cursor-pointer font-bold text-sm flex items-center gap-2 bg-glass-light px-4 py-2 rounded-xl border border-glass-border transition-transform hover:scale-105 shadow-sm"
                                                        style={{ color: activeCompanyFicha.theme.accent }}
                                                    >
                                                        <Plus className="w-4 h-4" /> Nva. Partida
                                                    </button>
                                                </div>

                                                {/* Tabla Estilizada */}
                                                <div className="border border-glass-border bg-deep/80 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
                                                    <table className="w-full text-sm text-left border-collapse">
                                                        <thead className="text-xs text-gray-400 uppercase tracking-wider bg-glass border-b border-glass-border">
                                                            <tr>
                                                                <th className="px-6 py-5 font-bold">Concepto Requerido</th>
                                                                <th className="px-6 py-5 w-24 text-center font-bold">Cant.</th>
                                                                <th className="px-6 py-5 w-48 text-right font-bold">Precio Unitario</th>
                                                                <th className="px-6 py-5 w-48 text-right font-bold">Total Partida</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-glass-border/50">
                                                            <tr className="hover:bg-glass-light/50 transition-colors group">
                                                                <td className="px-6 py-5 text-white">
                                                                    <div className="font-bold mb-1">Cámara de Refrigeración Modular</div>
                                                                    <div className="text-xs text-gray-400 line-clamp-1">Dimensiones 5x5m, panel de poliuretano, equipo tipo Walk-in freezer.</div>
                                                                </td>
                                                                <td className="px-6 py-5 text-gray-300 text-center font-bold">1</td>
                                                                <td className="px-6 py-5 text-gray-400 text-right font-mono">$12,500.00</td>
                                                                <td className="px-6 py-5 font-bold text-right font-mono text-lg transition-all group-hover:scale-110 origin-right" style={{ color: activeCompanyFicha.theme.accent }}>$12,500.00</td>
                                                            </tr>
                                                            <tr className="hover:bg-glass-light/50 transition-colors group">
                                                                <td className="px-6 py-5 text-white">
                                                                    <div className="font-bold mb-1">Sistema de Control y Automatización</div>
                                                                    <div className="text-xs text-gray-400 line-clamp-1">Sensores de temperatura IoT, tablero armado, contactores Schneider.</div>
                                                                </td>
                                                                <td className="px-6 py-5 text-gray-300 text-center font-bold">1</td>
                                                                <td className="px-6 py-5 text-gray-400 text-right font-mono">$3,200.00</td>
                                                                <td className="px-6 py-5 font-bold text-right font-mono text-lg transition-all group-hover:scale-110 origin-right" style={{ color: activeCompanyFicha.theme.accent }}>$3,200.00</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>

                                                    {/* Total Catcher */}
                                                    <div className="p-8 flex justify-end bg-gradient-to-l from-glass to-transparent border-t border-glass-border">
                                                        <div className="text-right w-80">
                                                            <div className="flex justify-between items-center text-sm text-gray-400 mb-3">
                                                                <span className="tracking-wider">Subtotal:</span>
                                                                <span className="font-mono text-white">$15,700.00</span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-sm text-gray-400 mb-6 border-b border-glass-border/50 pb-6">
                                                                <span className="tracking-wider">I.V.A Estimado (16%):</span>
                                                                <span className="font-mono text-white">$2,512.00</span>
                                                            </div>
                                                            <div className="flex justify-between items-center bg-deep/50 p-4 rounded-xl border border-glass-border/50">
                                                                <span className="text-xl font-black text-white tracking-widest">TOTAL</span>
                                                                <span
                                                                    className="text-3xl font-black shrink-0 font-mono transition-all hover:scale-105 cursor-default"
                                                                    style={{ color: activeCompanyFicha.theme.accent, textShadow: `0 0 30px ${activeCompanyFicha.theme.accent}80` }}
                                                                >
                                                                    $18,212.00
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
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
