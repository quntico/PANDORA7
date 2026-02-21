import React, { useState } from 'react';
import { ShieldAlert, DollarSign, Settings, Calculator, Building2, Package, FileText, Plus, Upload, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

function AdminCotizadorPage() {
    // Default active tab to 'cotizador' so we can immediately see the new features
    const [activeTab, setActiveTab] = useState('cotizador');
    // Inner active tab for cotizador
    const [activeCotizadorTab, setActiveCotizadorTab] = useState('empresas');
    // State to manage the currently editing company for settings
    const [editingCompany, setEditingCompany] = useState(null);

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
                                    {/* Company Card: SOLIFOOD */}
                                    <div className="p-6 bg-glass border border-emerald-500/30 rounded-xl hover:border-emerald-500 transition-colors group relative overflow-hidden flex flex-col cursor-pointer hover:shadow-glow-sm shadow-emerald-500/20">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>

                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center border border-emerald-500/30">
                                                <span className="text-emerald-400 font-bold text-xl drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">SF</span>
                                            </div>
                                            <button
                                                className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400/70 hover:text-emerald-400 hover:bg-emerald-500/20 border border-transparent hover:border-emerald-500/30 transition-all z-10"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingCompany({ name: 'SOLIFOOD', color: 'emerald' });
                                                }}
                                                title="Ajustes de Empresa"
                                            >
                                                <Settings className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <h4 className="text-xl font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">SOLIFOOD</h4>
                                        <p className="text-sm text-gray-400 mb-4 h-10">Equipos para la industria alimentaria.</p>
                                        <div className="mt-auto flex gap-2">
                                            <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-md border border-emerald-500/20">Activa</span>
                                            <span className="text-xs bg-glass-light text-gray-300 px-2 py-1 rounded-md">84 Equipos</span>
                                        </div>
                                    </div>

                                    {/* Company Card: SOLIMAQ */}
                                    <div className="p-6 bg-glass border border-orange-500/30 rounded-xl hover:border-orange-500 transition-colors group relative overflow-hidden flex flex-col cursor-pointer hover:shadow-glow-sm shadow-orange-500/20">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>

                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center border border-orange-500/30">
                                                <span className="text-orange-400 font-bold text-xl drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]">SM</span>
                                            </div>
                                            <button
                                                className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400/70 hover:text-orange-400 hover:bg-orange-500/20 border border-transparent hover:border-orange-500/30 transition-all z-10"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingCompany({ name: 'SOLIMAQ', color: 'orange' });
                                                }}
                                                title="Ajustes de Empresa"
                                            >
                                                <Settings className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <h4 className="text-xl font-bold text-white mb-1 group-hover:text-orange-400 transition-colors">SOLIMAQ</h4>
                                        <p className="text-sm text-gray-400 mb-4 h-10">Maquinaria pesada y construcción.</p>
                                        <div className="mt-auto flex gap-2">
                                            <span className="text-xs bg-orange-500/10 text-orange-400 px-2 py-1 rounded-md border border-orange-500/20">Activa</span>
                                            <span className="text-xs bg-glass-light text-gray-300 px-2 py-1 rounded-md">112 Equipos</span>
                                        </div>
                                    </div>

                                    {/* Company Card: SOLIMED */}
                                    <div className="p-6 bg-glass border border-blue-500/30 rounded-xl hover:border-blue-500 transition-colors group relative overflow-hidden flex flex-col cursor-pointer hover:shadow-glow-sm shadow-blue-500/20">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>

                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                                                <span className="text-blue-400 font-bold text-xl drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]">MD</span>
                                            </div>
                                            <button
                                                className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400/70 hover:text-blue-400 hover:bg-blue-500/20 border border-transparent hover:border-blue-500/30 transition-all z-10"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingCompany({ name: 'SOLIMED', color: 'blue' });
                                                }}
                                                title="Ajustes de Empresa"
                                            >
                                                <Settings className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <h4 className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">SOLIMED</h4>
                                        <p className="text-sm text-gray-400 mb-4 h-10">Equipamiento médico avanzado.</p>
                                        <div className="mt-auto flex gap-2">
                                            <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded-md border border-blue-500/20">Activa</span>
                                            <span className="text-xs bg-glass-light text-gray-300 px-2 py-1 rounded-md">45 Equipos</span>
                                        </div>
                                    </div>

                                    {/* Company Card: SOLIWASTE */}
                                    <div className="p-6 bg-glass border border-purple-500/30 rounded-xl hover:border-purple-500 transition-colors group relative overflow-hidden flex flex-col cursor-pointer hover:shadow-glow-sm shadow-purple-500/20">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>

                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center border border-purple-500/30">
                                                <span className="text-purple-400 font-bold text-xl drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]">SW</span>
                                            </div>
                                            <button
                                                className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400/70 hover:text-purple-400 hover:bg-purple-500/20 border border-transparent hover:border-purple-500/30 transition-all z-10"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingCompany({ name: 'SOLIWASTE', color: 'purple' });
                                                }}
                                                title="Ajustes de Empresa"
                                            >
                                                <Settings className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <h4 className="text-xl font-bold text-white mb-1 group-hover:text-purple-400 transition-colors">SOLIWASTE</h4>
                                        <p className="text-sm text-gray-400 mb-4 h-10">Gestión de residuos y reciclaje.</p>
                                        <div className="mt-auto flex gap-2">
                                            <span className="text-xs bg-purple-500/10 text-purple-400 px-2 py-1 rounded-md border border-purple-500/20">Activa</span>
                                            <span className="text-xs bg-glass-light text-gray-300 px-2 py-1 rounded-md">28 Equipos</span>
                                        </div>
                                    </div>
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
                            <div className="border-2 border-dashed border-glass-border rounded-xl p-6 flex flex-col items-center justify-center gap-3 hover:border-neon-cyan/50 hover:bg-neon-cyan/5 transition-all cursor-pointer group">
                                <div className="p-3 bg-glass-light rounded-full group-hover:bg-neon-cyan/20 transition-colors">
                                    <Upload className="w-6 h-6 text-gray-400 group-hover:text-neon-cyan" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-gray-300">Haz clic para subir un nuevo logotipo</p>
                                    <p className="text-xs text-gray-500 mt-1">PNG, JPG, SVG (Recomendado 500x500px)</p>
                                </div>
                            </div>
                        </div>

                        {/* Theme Colors Section */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                <Palette className="w-4 h-4" /> Colores del Tema
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500">Color Primario</label>
                                    <div className="flex items-center gap-3 p-2 bg-glass border border-glass-border rounded-lg">
                                        <div
                                            className="w-6 h-6 rounded-md shadow-inner"
                                            style={{ backgroundColor: editingCompany?.color === 'emerald' ? '#10B981' : editingCompany?.color === 'orange' ? '#F97316' : editingCompany?.color === 'blue' ? '#3B82F6' : '#A855F7' }}
                                        ></div>
                                        <span className="text-sm text-gray-300 font-mono">
                                            {editingCompany?.color === 'emerald' ? '#10B981' : editingCompany?.color === 'orange' ? '#F97316' : editingCompany?.color === 'blue' ? '#3B82F6' : '#A855F7'}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500">Color de Acento</label>
                                    <div className="flex items-center gap-3 p-2 bg-glass border border-glass-border rounded-lg">
                                        <div className="w-6 h-6 rounded-md bg-neon-cyan shadow-inner"></div>
                                        <span className="text-sm text-gray-300 font-mono">#00F0FF</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Document Format Section */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-300">Formato PDF Base</label>
                            <select className="w-full bg-glass border border-glass-border text-white text-sm rounded-lg focus:ring-neon-cyan focus:border-neon-cyan block p-2.5">
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
                            onClick={() => setEditingCompany(null)}
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
