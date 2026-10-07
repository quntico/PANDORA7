import React from 'react';
import { 
  Activity, 
  FolderOpen, 
  Upload, 
  Sliders, 
  Minimize2, 
  Maximize2, 
  RotateCcw, 
  Check, 
  Anchor, 
  Lock, 
  Unlock, 
  Plus, 
  Link2, 
  Pencil, 
  X, 
  Loader2 
} from 'lucide-react';
import SharedTwinViewer3D from '@/components/flow/SharedTwinViewer3D';
import FlowDesignsLibrary from '@/components/flow/FlowDesignsLibrary';
import { cn } from '@/lib/utils';

export default function TabTwin3D({
  twinBlockRef,
  isTwinBlockFullscreen,
  setIsDesignsLibraryOpen,
  isTwinEditMode,
  setIsTwinEditMode,
  toggleTwinBlockFullscreen,
  handleSyncFromFlowDesigner,
  twinLayout,
  isAnchoring,
  isAnchored,
  setIsAnchored,
  handleAnchorToSimulator,
  twinLabelHeightOffset,
  setTwinLabelHeightOffset,
  twinLabelsCollapsed,
  setTwinLabelsCollapsed,
  twinFloorElevation,
  setTwinFloorElevation,
  twinFloorLocked,
  setTwinFloorLocked,
  twinNodes,
  setTwinNodes,
  twinEdges,
  setTwinEdges,
  selectedTwinNodeId,
  setSelectedTwinNodeId,
  openAddTwinNode,
  openEditTwinNode,
  handleDeleteTwinNode,
  showTwinNodeEditor,
  editingTwinNodeId,
  twinNodeForm,
  setTwinNodeForm,
  TWIN_CATEGORIES,
  COLOR_SWATCHES,
  handleSaveTwinNode,
  resetTwinNodeForm,
  setShowTwinNodeEditor,
  showTwinEdgeEditor,
  setShowTwinEdgeEditor,
  twinEdgeForm,
  setTwinEdgeForm,
  handleAddTwinEdge,
  twinTheme,
  setTwinTheme,
  pendingUpload,
  uploadModelName,
  setUploadModelName,
  isSavingToCloud,
  uploadProgress,
  handleConfirmUploadToLibrary,
  handleCancelUpload,
  isDesignsLibraryOpen,
  currentDesignId,
  setTwinLayout,
  handleLoadDesignFromLibrary,
  processAndSetupTwinModel,
  handleTwinModelUpload,
  handleUpdateTwinNode
}) {
  return (
    <div 
      ref={twinBlockRef}
      className={cn(
        "transition-all duration-300 relative rounded-2xl bg-white border border-slate-205 p-5 shadow-sm text-slate-800",
        isTwinBlockFullscreen && "w-screen h-screen overflow-y-auto bg-slate-50 p-8 rounded-none border-none z-[9999] flex flex-col justify-between"
      )}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b pb-4 border-slate-150">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-yellow-800">
            <Activity className="w-4 h-4 animate-pulse text-yellow-600" />
            Twin Digital 3D de la Línea
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5 font-bold uppercase tracking-wider">
            Gemelo digital interactivo y trayectorias de flujo en tiempo real.
          </p>
        </div>
        
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button 
            onClick={() => setIsDesignsLibraryOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-xl transition-all font-black uppercase tracking-widest text-[9px]"
            title="Abrir librería de twins guardados"
          >
            <FolderOpen className="w-3.5 h-3.5" /> Librería
          </button>

          <label 
            htmlFor="twin-upload-file"
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl cursor-pointer transition-all font-black uppercase tracking-widest text-[9px]"
            title="Subir archivo 3D de la planta (.glb, .gltf o .fbx)"
          >
            <Upload className="w-3.5 h-3.5" /> Subir 3D
          </label>
          <input 
            type="file" 
            id="twin-upload-file" 
            className="hidden" 
            accept=".glb,.gltf,.fbx,.dae" 
            onChange={handleTwinModelUpload} 
          />

          <button 
            onClick={() => setIsTwinEditMode(!isTwinEditMode)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 border rounded-xl transition-all font-black uppercase tracking-widest text-[9px]",
              isTwinEditMode 
                ? 'bg-yellow-50 border-yellow-500 text-yellow-800' 
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800'
            )}
            title="Acomodar fichas de movimiento y máquinas en 3D"
          >
            <Sliders className="w-3.5 h-3.5" /> {isTwinEditMode ? 'Listo' : 'Ajustes'}
          </button>

          <button 
            onClick={toggleTwinBlockFullscreen}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 border rounded-xl transition-all font-black uppercase tracking-widest text-[9px]",
              isTwinBlockFullscreen 
                ? 'bg-yellow-50 border-yellow-500 text-yellow-800 font-extrabold shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-850 hover:border-slate-350'
            )}
            title={isTwinBlockFullscreen ? "Salir de Pantalla Completa" : "Editar en Pantalla Completa"}
          >
            {isTwinBlockFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isTwinBlockFullscreen ? 'Ventana' : 'Pantalla Completa'}</span>
          </button>

          <button 
            onClick={handleSyncFromFlowDesigner}
            className="flex items-center justify-center p-2 border border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-800 rounded-xl transition-all"
            title="Sincronizar con el Flow Designer global"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Anclar modelo */}
          {twinLayout && (
            <button 
              onClick={handleAnchorToSimulator}
              disabled={isAnchoring || isAnchored}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 border rounded-xl transition-all font-black uppercase tracking-widest text-[9px]",
                isAnchoring
                  ? 'bg-green-50 border-green-200 text-green-600 opacity-70 cursor-wait'
                  : isAnchored
                    ? 'bg-green-50 border-green-500 text-green-700 font-extrabold shadow-sm'
                    : 'bg-green-500 hover:bg-green-600 text-white border-green-600 animate-pulse font-extrabold shadow-sm'
              )}
              title={isAnchored ? "El modelo ya está correctamente anclado y guardado" : "Guardar modelo, etiquetas y conectores en la nube para este simulador"}
            >
              {isAnchoring ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando...</>
              ) : isAnchored ? (
                <><Check className="w-3.5 h-3.5" /> Anclado</>
              ) : (
                <><Anchor className="w-3.5 h-3.5" /> Anclar</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Adjustments Panel */}
      {isTwinEditMode && (
        <div className="mb-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
            {/* Height offset slider */}
            <div className="flex-1 space-y-1">
              <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                <span>Altura de Fichas de Movimiento:</span>
                <span className="text-yellow-800 font-black">{twinLabelHeightOffset.toFixed(1)} m</span>
              </div>
              <input 
                type="range" 
                min="-2.0" 
                max="5.0" 
                step="0.1" 
                value={twinLabelHeightOffset} 
                onChange={(e) => setTwinLabelHeightOffset(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-yellow-500"
              />
            </div>

            {/* Collapse toggle */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Modo Compacto:</span>
              <button 
                onClick={() => setTwinLabelsCollapsed(!twinLabelsCollapsed)}
                className={cn(
                  "px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all",
                  twinLabelsCollapsed 
                    ? 'bg-yellow-50 border-yellow-500 text-yellow-800' 
                    : 'bg-white border-slate-200 text-slate-500'
                )}
              >
                {twinLabelsCollapsed ? 'Activado' : 'Desactivado'}
              </button>
            </div>
          </div>

          {/* Floor elevation slider */}
          {twinLayout && (
            <div className="border-t border-slate-200 pt-3 space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                <span className={cn(twinFloorLocked ? 'text-yellow-800' : 'text-slate-500')}>
                  {twinFloorLocked ? '🔒' : '📐'} Elevación del Piso:
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-yellow-850 font-black tabular-nums">{twinFloorElevation.toFixed(1)} m</span>
                  <button
                    onClick={() => setTwinFloorLocked(l => !l)}
                    className={cn(
                      "p-1.5 rounded-lg border text-[10px] transition-all",
                      twinFloorLocked
                        ? 'bg-yellow-50 border-yellow-500/60 text-yellow-800'
                        : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-350'
                    )}
                    title={twinFloorLocked ? 'Desbloquear elevación del piso' : 'Bloquear elevación del piso'}
                  >
                    {twinFloorLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              <input 
                type="range" 
                min="-10.0" 
                max="10.0" 
                step="0.1" 
                value={twinFloorElevation} 
                onChange={(e) => { 
                  if (!twinFloorLocked) { 
                    setTwinFloorElevation(Number(e.target.value)); 
                    setIsAnchored(false); 
                  } 
                }}
                disabled={twinFloorLocked}
                className={cn(
                  "w-full h-1.5 rounded-lg appearance-none transition-opacity",
                  twinFloorLocked 
                    ? 'bg-yellow-100 cursor-not-allowed opacity-50 accent-yellow-500' 
                    : 'bg-slate-200 cursor-pointer accent-yellow-600'
                )}
              />
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                {twinFloorLocked 
                  ? '🔒 Elevación bloqueada. Haz clic en el candado para ajustar de nuevo.' 
                  : '📐 Desliza para encontrar la altura correcta, luego bloquea con el candado.'}
              </p>
            </div>
          )}

          {/* List of custom equipments */}
          <div className="border-t border-slate-200 pt-3 space-y-2">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center justify-between">
              <span>Equipos en el Twin:</span>
              <div className="flex gap-2">
                <button
                  onClick={openAddTwinNode}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-lg text-[9px] font-black uppercase transition-all"
                  title="Agregar nueva ficha / equipo"
                >
                  <Plus className="w-3 h-3" /> Ficha
                </button>
                <button
                  onClick={() => { setShowTwinEdgeEditor(e => !e); setShowTwinNodeEditor(false); }}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-[9px] font-black uppercase transition-all"
                  title="Agregar conector / flujo entre fichas"
                >
                  <Link2 className="w-3 h-3" /> Conector
                </button>
              </div>
            </div>

            {/* Existing nodes list */}
            <div className="flex flex-wrap gap-1.5">
              {twinNodes.map((node) => (
                <div
                  key={node.id}
                  className={cn(
                    "flex items-center rounded-lg border overflow-hidden transition-all text-xs",
                    selectedTwinNodeId === node.id
                      ? 'border-yellow-500 bg-yellow-50'
                      : 'border-slate-200 bg-white hover:border-slate-350'
                  )}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full mx-1.5 flex-shrink-0"
                    style={{ backgroundColor: node.data?.color || '#ffcc00' }}
                  />
                  <button
                    onClick={() => setSelectedTwinNodeId(selectedTwinNodeId === node.id ? null : node.id)}
                    className={cn(
                      "py-1.5 pr-1 text-[10px] font-bold transition-colors uppercase tracking-wider",
                      selectedTwinNodeId === node.id ? 'text-slate-800 font-black' : 'text-slate-500 hover:text-slate-800'
                    )}
                    title="Seleccionar para mover en 3D"
                  >
                    {node.data?.label || node.data?.type || 'Equipo'}
                  </button>
                  <button
                    onClick={() => openEditTwinNode(node)}
                    className="px-1.5 py-1.5 text-slate-400 hover:text-yellow-600 transition-all"
                    title="Editar propiedades"
                  >
                    <Pencil className="w-2.5 h-2.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteTwinNode(node.id)}
                    className="px-1.5 py-1.5 border-l border-slate-100 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                    title="Quitar del Twin"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
              {twinNodes.length === 0 && (
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider italic">Sin equipos. Usa "+ Ficha" para agregar o sincroniza con Flow Designer.</p>
              )}
            </div>

            {/* Form: Add/Edit node */}
            {showTwinNodeEditor && (
              <div className="mt-2 p-3 rounded-xl bg-white border border-slate-200 space-y-3 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-widest text-yellow-800">
                  {editingTwinNodeId ? '✏️ Editar Ficha' : '➕ Nueva Ficha'}
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Nombre / Etiqueta</label>
                  <input
                    value={twinNodeForm.label}
                    onChange={e => setTwinNodeForm(f => ({ ...f, label: e.target.value }))}
                    placeholder="Ej: Bomba Hidráulica"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-yellow-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Tipo / Acción</label>
                  <div className="flex flex-wrap gap-1.5">
                    {TWIN_CATEGORIES.map(cat => (
                      <button
                        key={cat.key}
                        onClick={() => setTwinNodeForm(f => ({ ...f, category: cat.key, type: cat.label, color: twinNodeForm.color === '#ffcc00' ? cat.color : twinNodeForm.color }))}
                        className={cn(
                          "px-2 py-1 rounded-lg text-[9px] font-bold border transition-all",
                          twinNodeForm.category === cat.key
                            ? 'text-slate-800 border-slate-400 bg-slate-100 font-black'
                            : 'text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700'
                        )}
                      >
                        {cat.emoji} {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Color</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {COLOR_SWATCHES.map(c => (
                      <button
                        key={c}
                        onClick={() => setTwinNodeForm(f => ({ ...f, color: c }))}
                        className={cn(
                          "w-5 h-5 rounded-full border-2 transition-transform",
                          twinNodeForm.color === c ? 'border-slate-800 scale-125' : 'border-transparent hover:scale-110'
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <input
                      type="color"
                      value={twinNodeForm.color}
                      onChange={e => setTwinNodeForm(f => ({ ...f, color: e.target.value }))}
                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                      title="Color personalizado"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Capacidad</label>
                    <input
                      type="number"
                      value={twinNodeForm.capacity}
                      onChange={e => setTwinNodeForm(f => ({ ...f, capacity: e.target.value }))}
                      placeholder="0"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-yellow-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Potencia / kW</label>
                    <input
                      type="number"
                      value={twinNodeForm.power}
                      onChange={e => setTwinNodeForm(f => ({ ...f, power: e.target.value }))}
                      placeholder="0"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-yellow-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSaveTwinNode}
                    className="flex-1 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white font-black text-[9px] uppercase tracking-widest rounded-lg transition-all"
                  >
                    {editingTwinNodeId ? 'Guardar Cambios' : 'Agregar al Twin'}
                  </button>
                  <button
                    onClick={() => { setShowTwinNodeEditor(false); resetTwinNodeForm(); }}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 text-[9px] uppercase tracking-widest rounded-lg transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Form: Add connector */}
            {showTwinEdgeEditor && (
              <div className="mt-2 p-3 rounded-xl bg-white border border-slate-200 space-y-3 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-widest text-purple-700">↔ Nuevo Conector / Flujo</div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Desde</label>
                    <select
                      value={twinEdgeForm.source}
                      onChange={e => setTwinEdgeForm(f => ({ ...f, source: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-850 focus:outline-none focus:border-purple-500"
                    >
                      <option value="">Seleccionar...</option>
                      {twinNodes.map(n => <option key={n.id} value={n.id}>{n.data?.label || n.id}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Hasta</label>
                    <select
                      value={twinEdgeForm.target}
                      onChange={e => setTwinEdgeForm(f => ({ ...f, target: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-850 focus:outline-none focus:border-purple-500"
                    >
                      <option value="">Seleccionar...</option>
                      {twinNodes.filter(n => n.id !== twinEdgeForm.source).map(n => <option key={n.id} value={n.id}>{n.data?.label || n.id}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Color del flujo</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {COLOR_SWATCHES.map(c => (
                      <button
                        key={c}
                        onClick={() => setTwinEdgeForm(f => ({ ...f, color: c }))}
                        className={cn(
                          "w-5 h-5 rounded-full border-2 transition-transform",
                          twinEdgeForm.color === c ? 'border-slate-800 scale-125' : 'border-transparent hover:scale-110'
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <input
                      type="color"
                      value={twinEdgeForm.color}
                      onChange={e => setTwinEdgeForm(f => ({ ...f, color: e.target.value }))}
                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleAddTwinEdge}
                    disabled={!twinEdgeForm.source || !twinEdgeForm.target}
                    className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-black text-[9px] uppercase tracking-widest rounded-lg transition-all shadow-sm"
                  >
                    Agregar Conector
                  </button>
                  <button
                    onClick={() => setShowTwinEdgeEditor(false)}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 text-[9px] uppercase tracking-widest rounded-lg transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">
              💡 Clic en nombre → mover en 3D · ✏️ editar · ✕ quitar
            </p>
          </div>
        </div>
      )}

      {/* 3D Viewer Area */}
      <div className={cn(
        "relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50",
        twinTheme === 'toxic' ? 'bg-[#0c0d0e]' : twinTheme === 'blueprint' ? 'bg-[#edf4f9]' : 'bg-[#fafafa]'
      )}>
        <SharedTwinViewer3D 
          height={isTwinBlockFullscreen ? "calc(100vh - 280px)" : "390px"} 
          customNodes={twinNodes}
          customEdges={twinEdges}
          customLayout={pendingUpload ? null : (twinLayout ? { ...twinLayout, elevation: twinFloorElevation } : null)}
          editMode={isTwinEditMode}
          selectedNodeId={selectedTwinNodeId}
          onSelectNode={setSelectedTwinNodeId}
          onUpdateNode={handleUpdateTwinNode}
          labelHeightOffset={twinLabelHeightOffset}
          labelsCollapsed={twinLabelsCollapsed}
          showControls={!isTwinEditMode}
          onFileDrop={processAndSetupTwinModel}
          theme={twinTheme}
          onThemeChange={setTwinTheme}
        />
      </div>

      {/* Library popup */}
      <FlowDesignsLibrary 
        isOpen={isDesignsLibraryOpen}
        onClose={() => setIsDesignsLibraryOpen(false)}
        onLoad={handleLoadDesignFromLibrary}
        onNewDesign={() => {
          alert("Para crear un nuevo diseño desde cero, por favor ingresa a la pestaña del Flow Designer en el menú principal.");
          setIsDesignsLibraryOpen(false);
        }}
        currentDesignId={currentDesignId}
        activeLayout={twinLayout}
        onLayoutChange={setTwinLayout}
      />

      {/* Upload naming modal */}
      {pendingUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden text-slate-800">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-55/10">
              <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center border border-purple-200">
                <Upload className="w-4 h-4 text-purple-650" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Guardar en Librería</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">El modelo se guardará en la nube y quedará disponible desde cualquier simulador.</p>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {/* File details */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-150">
                <div className="text-2xl">
                  {pendingUpload.processedResult?.type === 'fbx' ? '🏭' 
                  : pendingUpload.processedResult?.type === 'glb' || pendingUpload.processedResult?.type === 'gltf' ? '📦'
                  : '🗂️'}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">{pendingUpload.file?.name}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                    {(pendingUpload.file?.size / 1024 / 1024).toFixed(2)} MB · {pendingUpload.processedResult?.type?.toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              {isSavingToCloud && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-yellow-800">
                    <span>Progreso de Subida</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 border border-slate-205 overflow-hidden relative">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-yellow-500 transition-all duration-300 shadow-sm"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Subiendo archivo grande a Supabase... por favor no cierres esta pestaña.</p>
                </div>
              )}

              {/* Naming input */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-yellow-805">
                  Nombre del Modelo / Planta
                </label>
                <input
                  type="text"
                  value={uploadModelName}
                  onChange={e => setUploadModelName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleConfirmUploadToLibrary(); if (e.key === 'Escape') handleCancelUpload(); }}
                  placeholder="Ej: Planta Lavado BWD-200"
                  autoFocus
                  className="w-full bg-white border border-slate-200 focus:border-yellow-500 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition-colors"
                />
                <p className="text-[9px] text-slate-500 font-bold uppercase">Este nombre aparecerá en la Librería de Twins para identificarlo fácilmente.</p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 flex gap-3">
              <button
                onClick={handleConfirmUploadToLibrary}
                disabled={isSavingToCloud || !uploadModelName.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-sm"
              >
                {isSavingToCloud ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Guardando... {uploadProgress}%</>
                ) : (
                  <><Check className="w-4 h-4" /> Guardar en Librería</>
                )}
              </button>
              <button
                onClick={handleCancelUpload}
                disabled={isSavingToCloud}
                className="px-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 text-xs uppercase tracking-widest rounded-xl transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
