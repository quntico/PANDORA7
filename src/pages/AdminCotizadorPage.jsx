import React, { useState } from 'react';
import ColorThief from 'colorthief';
import { ShieldAlert, DollarSign, Settings, Calculator, Building2, Package, FileText, Plus, Upload, Palette } from 'lucide-react';
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
    const [editingForm, setEditingForm] = useState({
        logoUrl: null,
        primaryColor: '#10B981',
        secondaryColor: '#FFFFFF',
        accentColor: '#00F0FF',
        supportColor: '#E6E6E6',
        format: 'Plantilla Estándar PANDORA'
    });

    const [companies, setCompanies] = useState([
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
    ]);

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
            const url = URL.createObjectURL(file);
            setEditingForm(prev => ({ ...prev, logoUrl: url }));

            // Extract colors automatically using ColorThief
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.src = url;
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
                                            className="p-6 bg-glass border rounded-xl transition-all duration-300 group relative overflow-hidden flex flex-col cursor-pointer hover:-translate-y-1"
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

                        {/* Inner Content for Catálogo de Equipos */}
                        {activeCotizadorTab === 'equipos' && (
                            <div className="animate-fade-in flex-1">
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
