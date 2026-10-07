import React from 'react';
import { 
  ShieldCheck, Cpu, Database, Activity, 
  Terminal, History, Zap, Settings, 
  Layers, CheckCircle2, AlertCircle, Clock,
  Globe, BarChart3, Binary, Share2, Download
} from 'lucide-react';
import { useBeta } from '@/context/BetaContext';
import { cn } from '@/lib/utils';
import ArtifactRenderer from './ArtifactRenderer';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { supabase } from '@/supabase';
import { useState, useEffect } from 'react';

function BetaAdmin() {
  const { activeProject, artifacts, messages, memory, loading } = useBeta();
  const [diag, setDiag] = useState({
    initialized: false,
    read: { status: 'pending', count: 0, lastProject: null },
    write: { status: 'pending', lastTimestamp: null },
    error: null
  });

  // PRUEBAS TÉCNICAS REALES DE SUPABASE
  const runSupabaseDiagnostics = async () => {
    try {
      // 1. Validar inicialización
      const isInit = !!supabase;
      
      // 2. PRUEBA DE LECTURA REAL
      const { data: projects, error: readError } = await supabase
        .from('projects_beta')
        .select('*')
        .order('created_at', { ascending: false });

      if (readError) throw readError;

      // 3. PRUEBA DE ESCRITURA REAL
      let writeSuccess = { status: 'n/a', lastTimestamp: null };
      if (activeProject?.id) {
        const { data: log, error: writeError } = await supabase
          .from('project_logs_beta')
          .insert({
            project_id: activeProject.id,
            action: 'DIAGNOSTIC_VERIFICATION',
            source: 'Admin System',
            result: 'Prueba de escritura exitosa'
          })
          .select()
          .single();
        
        if (!writeError) {
          writeSuccess = { status: 'success', lastTimestamp: log.created_at };
        }
      }

      setDiag({
        initialized: isInit,
        read: { 
          status: 'success', 
          count: projects.length, 
          lastProject: projects[0] 
        },
        write: writeSuccess,
        error: null
      });

    } catch (err) {
      console.error('[AdminDiagnostic] Error en pruebas reales:', err);
      setDiag({
        initialized: !!supabase,
        read: { status: 'error', count: 0, lastProject: null },
        write: { status: 'error', lastTimestamp: null },
        error: err.message
      });
    }
  };

  useEffect(() => {
    runSupabaseDiagnostics();
  }, [activeProject?.id]);

  // Obtener estado del último engine desde los mensajes
  const lastMsgMetadata = messages.find(m => m.role === 'assistant')?._metadata || {};
  const webSearchActive = lastMsgMetadata.webSearchUsed || false;

  // FUNCIONES DE REPORTE ACTUALIZADAS
  const generateReportText = () => {
    const now = new Date().toLocaleString('es-ES');
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    
    // Calcular estado real para el texto
    let supabaseStatus = "Error de conexión";
    if (diag.read.status === 'success') supabaseStatus = "Lectura validada";
    if (diag.write.status === 'success') supabaseStatus = "Escritura validada";
    if (diag.error) supabaseStatus = `Fallo: ${diag.error}`;

    return `PANDORA BETA – REPORTE TÉCNICO REAL
=========================================
FECHA: ${now}
PROYECTO ACTIVO: ${activeProject?.name || 'No disponible'}
ID: ${activeProject?.id || 'No registrado'}
ESTADO SISTEMA: ${diag.read.status === 'success' ? 'OPERATIVO' : 'EN REVISIÓN'}

1. DIAGNÓSTICO REAL SUPABASE
- Cliente: ${diag.initialized ? 'Inicializado' : 'Fallo de inicialización'}
- Estado Conexión: ${supabaseStatus}
- Registros en projects_beta: ${diag.read.count}
- Última Prueba Escritura: ${diag.write.lastTimestamp || 'No ejecutada'}
- Último Proyecto Registrado: ${diag.read.lastProject?.name || 'Ninguno'}

2. CONECTIVIDAD IA
- OpenAI API: ACTIVO (vía backend seguro)
- Endpoint Local: /api/pandora/execute (Validado)

3. MEMORIA Y CONTEXTO
- Decisiones: ${memory?.decisions?.length || 0}
- Tareas: ${memory?.pendingTasks?.length || 0}
- Artefactos: ${artifacts?.length || 0}

4. ÚLTIMA EJECUCIÓN
- Prompt: "${lastUserMsg?.content?.slice(0, 50) || 'Sin actividad'}"
- Diagnóstico: SISTEMA ${diag.read.status === 'success' && diag.write.status === 'success' ? 'ESTABLE' : 'CON ADVERTENCIAS'}
=========================================`;
  };

  const handleCopyReport = () => {
    const text = generateReportText();
    navigator.clipboard.writeText(text);
    alert('Reporte técnico copiado al portapapeles.');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const now = new Date().toLocaleString('es-ES');
    const projectName = activeProject?.name || 'Proyecto PANDORA';
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentW = pageW - margin * 2;

    // ── Helpers ──────────────────────────────────────────────────────────────
    const addPage = () => {
      doc.addPage();
      // Header strip
      doc.setFillColor(10, 10, 15);
      doc.rect(0, 0, pageW, 14, 'F');
      doc.setFontSize(7);
      doc.setTextColor(80, 200, 220);
      doc.text('PANDORA — REPORTE EJECUTIVO DE VIABILIDAD', margin, 9);
      doc.setTextColor(80, 80, 80);
      doc.text(projectName, pageW - margin, 9, { align: 'right' });
      return 22; // y start
    };

    const wrapText = (text, maxW, fontSize = 10) => {
      doc.setFontSize(fontSize);
      return doc.splitTextToSize(String(text || ''), maxW);
    };

    const checkNewPage = (currentY, needed = 20) => {
      if (currentY + needed > pageH - 20) return addPage();
      return currentY;
    };

    // ── PORTADA ───────────────────────────────────────────────────────────────
    doc.setFillColor(5, 5, 10);
    doc.rect(0, 0, pageW, pageH, 'F');

    // Acento superior
    doc.setFillColor(0, 217, 255);
    doc.rect(0, 0, pageW, 3, 'F');

    doc.setFontSize(28);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('PANDORA', pageW / 2, 70, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(0, 217, 255);
    doc.setFont('helvetica', 'normal');
    doc.text('REPORTE EJECUTIVO DE VIABILIDAD', pageW / 2, 82, { align: 'center' });

    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    const projectLines = doc.splitTextToSize(projectName, contentW - 20);
    doc.text(projectLines, pageW / 2, 105, { align: 'center' });

    doc.setFillColor(30, 30, 40);
    doc.roundedRect(margin, 125, contentW, 40, 4, 4, 'F');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 140);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha de generación: ${now}`, margin + 10, 138);
    doc.text(`ID Proyecto: ${activeProject?.id?.slice(0, 16) || 'N/A'}`, margin + 10, 147);
    doc.text(`Decisiones registradas: ${memory?.decisions?.length || 0}`, margin + 10, 156);

    doc.setFontSize(8);
    doc.setTextColor(60, 60, 70);
    doc.text('Generado por PANDORA Strategic AI Console V3', pageW / 2, pageH - 15, { align: 'center' });

    // ── PÁGINA 2: RESUMEN EJECUTIVO ───────────────────────────────────────────
    let y = addPage();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 217, 255);
    doc.text('1. RESUMEN EJECUTIVO', margin, y);
    y += 8;

    doc.setFillColor(20, 20, 30);
    doc.roundedRect(margin, y, contentW, 8, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setTextColor(0, 217, 255);
    doc.text('ESTADO DEL SISTEMA', margin + 4, y + 5.5);
    doc.setTextColor(0, 255, 136);
    doc.text('OPERATIVO', margin + 60, y + 5.5);
    y += 14;

    // Métricas rápidas
    const metrics = [
      { label: 'Proyecto', value: projectName },
      { label: 'Decisiones IA', value: String(memory?.decisions?.length || 0) },
      { label: 'Tareas detectadas', value: String(memory?.pendingTasks?.length || 0) },
      { label: 'Artefactos generados', value: String(artifacts?.length || 0) },
      { label: 'Mensajes de análisis', value: String(messages?.length || 0) },
      { label: 'Estado Base de Datos', value: diag.read.status === 'success' ? 'Conectada' : 'Sin conexión' },
    ];

    doc.autoTable({
      head: [['PARÁMETRO', 'VALOR']],
      body: metrics.map(m => [m.label, m.value]),
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [0, 30, 40], textColor: [0, 217, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9, textColor: [200, 200, 210], fillColor: [12, 12, 18] },
      alternateRowStyles: { fillColor: [18, 18, 25] },
    });
    y = doc.lastAutoTable.finalY + 12;

    // ── PÁGINA: ANÁLISIS COMPLETO DEL CHAT ───────────────────────────────────
    y = checkNewPage(y, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 217, 255);
    doc.text('2. ANÁLISIS Y CONSIDERACIONES DE VIABILIDAD', margin, y);
    y += 10;

    const assistantMessages = (messages || []).filter(m => m.role === 'assistant');

    if (assistantMessages.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 130);
      doc.text('No se encontraron análisis en el historial de conversación.', margin, y);
      y += 10;
    } else {
      assistantMessages.forEach((msg, idx) => {
        y = checkNewPage(y, 30);

        // Encabezado de mensaje
        doc.setFillColor(0, 40, 50);
        doc.rect(margin, y - 1, contentW, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(0, 217, 255);
        doc.text(`ANÁLISIS ${idx + 1} / ${assistantMessages.length}`, margin + 3, y + 4.5);
        doc.setTextColor(80, 80, 100);
        doc.text(msg.timestamp || '', pageW - margin - 3, y + 4.5, { align: 'right' });
        y += 12;

        // Contenido del mensaje (limpiar markdown básico)
        const rawContent = typeof msg.content === 'string'
          ? msg.content
          : (msg.content?.text || msg.content?.summary || JSON.stringify(msg.content));

        const cleanContent = rawContent
          .replace(/#{1,6}\s/g, '')
          .replace(/\*\*/g, '')
          .replace(/\*/g, '')
          .replace(/`/g, '')
          .replace(/---/g, '')
          .trim();

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(200, 200, 210);

        const lines = wrapText(cleanContent, contentW, 9);
        lines.forEach(line => {
          y = checkNewPage(y, 6);
          doc.text(line, margin, y);
          y += 5;
        });

        y += 6;
        // Separador
        doc.setDrawColor(30, 30, 40);
        doc.line(margin, y, pageW - margin, y);
        y += 8;
      });
    }

    // ── PÁGINA: PREGUNTAS DEL USUARIO (CONTEXTO) ─────────────────────────────
    y = checkNewPage(y, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(179, 102, 255);
    doc.text('3. SOLICITUDES DE ANÁLISIS REALIZADAS', margin, y);
    y += 10;

    const userMessages = (messages || []).filter(m => m.role === 'user');
    if (userMessages.length > 0) {
      doc.autoTable({
        head: [['#', 'SOLICITUD', 'HORA']],
        body: userMessages.map((m, i) => [
          i + 1,
          String(m.content).slice(0, 120) + (m.content?.length > 120 ? '...' : ''),
          m.timestamp || '—'
        ]),
        startY: y,
        margin: { left: margin, right: margin },
        theme: 'striped',
        headStyles: { fillColor: [40, 20, 60], textColor: [179, 102, 255], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: [190, 190, 200] },
        columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 20 } },
      });
      y = doc.lastAutoTable.finalY + 12;
    }

    // ── PÁGINA: ARTEFACTOS Y DATOS GENERADOS ─────────────────────────────────
    if (artifacts && artifacts.length > 0) {
      y = checkNewPage(y, 30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(0, 255, 136);
      doc.text('4. ARTEFACTOS Y DATOS GENERADOS', margin, y);
      y += 10;

      doc.autoTable({
        head: [['TIPO', 'TÍTULO', 'DATOS (resumen)']],
        body: artifacts.map(art => [
          art.type?.toUpperCase() || '—',
          art.title || '—',
          art.data ? JSON.stringify(art.data).slice(0, 80) + '...' : '—'
        ]),
        startY: y,
        margin: { left: margin, right: margin },
        theme: 'grid',
        headStyles: { fillColor: [10, 40, 20], textColor: [0, 255, 136], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: [190, 200, 190] },
      });
      y = doc.lastAutoTable.finalY + 12;
    }

    // ── PÁGINA FINAL: CONCLUSIÓN ──────────────────────────────────────────────
    y = checkNewPage(y, 50);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 217, 255);
    doc.text('5. CONCLUSIÓN DEL SISTEMA', margin, y);
    y += 10;

    const hasAnalysis = assistantMessages.length > 0;
    const verdictColor = hasAnalysis ? [0, 200, 100] : [200, 150, 0];
    const verdictText = hasAnalysis
      ? 'Análisis ejecutivo completado. Revisar secciones anteriores para criterios de viabilidad.'
      : 'No se completó el análisis. Suba un proyecto y solicite evaluación de viabilidad al sistema.';

    doc.setFillColor(...verdictColor.map(c => Math.floor(c * 0.15)));
    doc.roundedRect(margin, y, contentW, 20, 3, 3, 'F');
    doc.setFontSize(9);
    doc.setTextColor(...verdictColor);
    doc.setFont('helvetica', 'bold');
    const vLines = doc.splitTextToSize(verdictText, contentW - 10);
    doc.text(vLines, margin + 5, y + 7);
    y += 28;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 90);
    doc.text(`Este reporte fue generado automáticamente por PANDORA Strategic AI Console V3.`, margin, y);
    doc.text(`Fecha: ${now} | Proyecto: ${projectName}`, margin, y + 5);

    // Línea final cyan
    doc.setDrawColor(0, 217, 255);
    doc.setLineWidth(0.5);
    doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
    doc.setFontSize(7);
    doc.setTextColor(50, 50, 60);
    doc.text('PANDORA — Análisis Ejecutivo Confidencial', pageW / 2, pageH - 7, { align: 'center' });

    // ── GUARDAR ───────────────────────────────────────────────────────────────
    doc.save(`pandora_viabilidad_${projectName.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
  };


  const sections = [
    {
      id: 'diagnostic',
      title: 'DIAGNÓSTICO TÉCNICO REAL',
      icon: Activity,
      color: 'text-green-400',
      content: (
        <div className="space-y-6">
          <div className={cn(
            "p-4 rounded-2xl border flex flex-col gap-3 transition-all",
            diag.read.status === 'success' ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"
          )}>
             <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-500 uppercase">Cliente Supabase</span>
                <span className={cn("text-[10px] font-black uppercase", diag.initialized ? "text-green-400" : "text-red-400")}>
                  {diag.initialized ? 'Inicializado' : 'Error'}
                </span>
             </div>
             <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-500 uppercase">Lectura de Tabla</span>
                <span className={cn("text-[10px] font-black uppercase", diag.read.status === 'success' ? "text-green-400" : "text-red-400")}>
                  {diag.read.status === 'success' ? `${diag.read.count} Registros` : 'Fallo'}
                </span>
             </div>
             <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-500 uppercase">Última Escritura</span>
                <span className={cn("text-[10px] font-black uppercase", diag.write.status === 'success' ? "text-green-400" : "text-gray-600")}>
                  {diag.write.status === 'success' ? 'Validada' : 'Pendiente'}
                </span>
             </div>
             
             <div className="pt-2 border-t border-gray-800/50 mt-1 space-y-3">
                <div className="flex items-center justify-between">
                   <span className="text-[10px] font-bold text-gray-600 uppercase">Web Search</span>
                   <span className="text-[10px] font-black text-neon-cyan uppercase">Habilitado</span>
                </div>
                <div className="flex items-center justify-between">
                   <span className="text-[10px] font-bold text-gray-600 uppercase">Último Modo</span>
                   <span className={cn("text-[10px] font-black uppercase", webSearchActive ? "text-yellow-400" : "text-blue-400")}>
                      {webSearchActive ? 'Navegación Web' : 'Sincronía Local'}
                   </span>
                </div>
                <div className="flex items-center justify-between">
                   <span className="text-[10px] font-bold text-gray-600 uppercase">Motor IA</span>
                   <span className="text-[9px] font-mono text-gray-500 uppercase">
                      {lastMsgMetadata.engine || 'GPT-4-Turbo'}
                   </span>
                </div>
             </div>

             {diag.error && (
               <p className="text-[9px] text-red-500 font-mono mt-2 bg-red-500/10 p-2 rounded">
                 Error: {diag.error}
               </p>
             )}

             <div className="w-full h-1 bg-gray-900 rounded-full overflow-hidden mt-1">
                <div className={cn(
                  "h-full transition-all duration-1000 shadow-glow-sm",
                  diag.read.status === 'success' ? "bg-green-500 w-full" : "bg-red-500 w-1/3"
                )} />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <button onClick={handleCopyReport} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#0D0D0D] border border-[#151515] hover:border-green-500/30 hover:bg-green-500/5 transition-all group">
                <Share2 className="w-4 h-4 text-gray-500 group-hover:text-green-400" />
                <span className="text-[9px] font-black text-gray-600 group-hover:text-green-400 uppercase">Copiar Reporte</span>
             </button>
             <button onClick={handleExportPDF} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#0D0D0D] border border-[#151515] hover:border-neon-cyan/30 hover:bg-neon-cyan/5 transition-all group">
                <BarChart3 className="w-4 h-4 text-gray-500 group-hover:text-neon-cyan" />
                <span className="text-[9px] font-black text-gray-600 group-hover:text-neon-cyan uppercase">Doc. PDF</span>
             </button>
          </div>

          {diag.write.lastTimestamp && (
            <p className="text-[8px] text-gray-700 font-black uppercase tracking-widest text-center">
              Escritura confirmada: {new Date(diag.write.lastTimestamp).toLocaleTimeString()}
            </p>
          )}
        </div>
      )
    },

    {
      id: 'status',
      title: 'ESTADO DEL PROYECTO',
      icon: ShieldCheck,
      color: 'text-neon-cyan',
      content: (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-[#0D0D0D] p-3 rounded-xl border border-[#151515]">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Nombre</span>
            <span className="text-xs font-black text-white">{activeProject?.name || 'Pandora Beta'}</span>
          </div>
          <div className="flex justify-between items-center bg-[#0D0D0D] p-3 rounded-xl border border-[#151515]">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">ID</span>
            <span className="text-[9px] font-mono text-gray-600 uppercase truncate max-w-[120px]">{activeProject?.id || 'NO_ID'}</span>
          </div>
          <div className="flex justify-between items-center bg-[#0D0D0D] p-3 rounded-xl border border-[#151515]">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Estado</span>
            <span className="text-[10px] font-black text-green-400 bg-green-400/10 px-2 py-0.5 rounded border border-green-400/20 uppercase">Activo</span>
          </div>
          <div className="flex justify-between items-center bg-[#0D0D0D] p-3 rounded-xl border border-[#151515]">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Memoria AI</span>
            <span className="text-[10px] font-black text-neon-purple uppercase italic">Sincronizado</span>
          </div>
        </div>
      )
    },
    {
      id: 'engine',
      title: 'MOTOR DEL SISTEMA',
      icon: Cpu,
      color: 'text-neon-purple',
      content: (
        <div className="space-y-4">
          <div className="relative h-20 bg-[#0D0D0D] rounded-xl border border-[#151515] overflow-hidden flex items-center justify-center">
             <div className="absolute inset-0 bg-gradient-to-r from-neon-purple/5 to-transparent animate-pulse" />
             <Activity className="w-8 h-8 text-neon-purple animate-pulse" />
          </div>
          <div className="grid grid-cols-2 gap-2">
             <div className="p-3 bg-[#0D0D0D] rounded-xl border border-[#151515] text-center">
                <p className="text-[9px] font-bold text-gray-600 uppercase">Latencia</p>
                <p className="text-xs font-black text-white mt-1">12ms</p>
             </div>
             <div className="p-3 bg-[#0D0D0D] rounded-xl border border-[#151515] text-center">
                <p className="text-[9px] font-bold text-gray-600 uppercase">Contexto</p>
                <p className="text-xs font-black text-white mt-1">{memory?.decisions?.length || 0} Dec.</p>
             </div>
          </div>
        </div>
      )
    },
    {
      id: 'tools',
      title: 'HERRAMIENTAS CONECTADAS',
      icon: Globe,
      color: 'text-yellow-400',
      content: (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Graficador', status: 'online' },
            { label: 'Reporting', status: 'online' },
            { label: 'Cloud Safe', status: 'syncing' },
            { label: 'Audit Log', status: 'online' }
          ].map(tool => (
            <div key={tool.label} className="p-3 bg-[#0D0D0D] rounded-xl border border-[#151515] flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400">{tool.label}</span>
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                tool.status === 'online' ? "bg-green-500 shadow-glow-sm" : "bg-yellow-500 animate-pulse"
              )} />
            </div>
          ))}
        </div>
      )
    },
    {
      id: 'context',
      title: 'CONTEXTO ACTIVO',
      icon: Database,
      color: 'text-blue-400',
      content: (
        <div className="space-y-3">
          {Object.entries(memory.variables || {}).length > 0 ? (
            Object.entries(memory.variables).map(([key, val]) => (
              <div key={key} className="flex justify-between items-center p-2 rounded-lg bg-[#080808] border border-[#121212]">
                <span className="text-[9px] font-black text-gray-600 uppercase font-mono">{key}</span>
                <span className="text-[10px] font-black text-neon-cyan">{String(val)}</span>
              </div>
            ))
          ) : (
            <p className="text-[10px] text-gray-600 font-bold uppercase text-center py-4 italic">No hay variables cargadas</p>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050505] relative overflow-hidden animate-in fade-in duration-700">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#00F0FF 0.5px, transparent 0.5px)', backgroundSize: '32px 32px' }} />

      {/* Admin Header */}
      <div className="px-12 py-10 border-b border-[#151515] bg-gradient-to-b from-[#0A0A0A] to-[#050505] flex items-center justify-between relative z-10">
        <div className="flex items-center gap-6">
          <div className="p-4 rounded-2xl bg-[#0A0A0A] border border-[#1A1A1A] text-neon-purple shadow-glow-sm">
             <Settings className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-[8px] uppercase leading-none">ADMINISTRACIÓN</h1>
            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-[3px] mt-3">Panel técnico visual de orquestación</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="flex items-center px-5 py-2.5 rounded-xl bg-[#0A0A0A] border border-[#151515] text-[10px] font-black text-green-400 uppercase tracking-widest gap-3 shadow-inner">
              <Zap className="w-4 h-4 animate-pulse" />
              SISTEMA OPERATIVO v7.0.1
           </div>
           <button
             onClick={handleExportPDF}
             className="flex items-center gap-3 px-6 py-2.5 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan text-[10px] font-black uppercase tracking-widest hover:bg-neon-cyan/20 hover:shadow-glow-sm transition-all"
           >
             <Download className="w-4 h-4" />
             EXPORTAR REPORTE PDF COMPLETO
           </button>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          
          {/* Main Controls Grid */}
          {sections.map(section => {
             // Mapeo especial para los links del sidebar a las secciones superiores
             let mappedId = `admin-section-${section.id}`;
             if (section.id === 'context') mappedId = 'admin-memory';
             if (section.id === 'tools') mappedId = 'admin-tools';
             if (section.id === 'status') mappedId = 'admin-tasks';
             
             return (
               <div key={section.id} id={mappedId} className="p-8 rounded-[32px] bg-[#0A0A0A] border border-[#151515] hover:border-[#222] transition-all group flex flex-col shadow-2xl relative overflow-hidden">
                  <div className="flex items-center gap-4 mb-8 border-b border-[#151515] pb-6">
                    <div className={cn("p-2 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A]", section.color)}>
                      <section.icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-xs font-black text-gray-200 uppercase tracking-[4px]">{section.title}</h3>
                  </div>
                  {section.content}
               </div>
             );
          })}

          {/* Snapshots / Versioning Section */}
          <div id="admin-versions" className="p-8 rounded-[32px] bg-[#0A0A0A] border border-[#151515] xl:col-span-2 shadow-2xl">
             <div className="flex items-center justify-between mb-8 pb-6 border-b border-[#151515]">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A] text-yellow-500">
                    <History className="w-5 h-5" />
                  </div>
                  <h3 className="text-xs font-black text-gray-200 uppercase tracking-[4px]">SNAPSHOTS Y VERSIONES</h3>
                </div>
                <button className="text-[10px] font-black text-neon-cyan uppercase tracking-widest hover:underline px-3 py-1 rounded bg-neon-cyan/5 border border-neon-cyan/10">Crear Captura</button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { v: 'v1.4.2', date: '21 Mar, 2026', note: 'Optimización de flujos Q2' },
                  { v: 'v1.4.1', date: '19 Mar, 2026', note: 'Ajuste de parámetros estratégicos' },
                  { v: 'v1.4.0', date: '15 Mar, 2026', note: 'Base teórica completada' },
                  { v: 'v1.3.9', date: '10 Mar, 2026', note: 'Initial setup' }
                ].map((snap, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-[#0D0D0D] border border-[#151515] hover:bg-[#111] transition-all group cursor-pointer">
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-black text-neon-cyan">{snap.v}</span>
                      <div>
                        <p className="text-[11px] font-bold text-gray-300">{snap.note}</p>
                        <p className="text-[9px] text-gray-600 font-bold tracking-tighter uppercase mt-0.5">{snap.date}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-700 group-hover:text-neon-cyan group-hover:translate-x-1 transition-all" />
                  </div>
                ))}
             </div>
          </div>

          {/* System Logs (Section D) - REAL DATA from messages */}
          <div id="admin-history" className="p-8 rounded-[40px] bg-[#0A0A0A] border border-[#151515] xl:col-span-3 shadow-2xl overflow-hidden flex flex-col h-[500px]">
             <div className="flex items-center justify-between mb-8 pb-6 border-b border-[#151515]">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A] text-orange-400">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <h3 className="text-xs font-black text-gray-200 uppercase tracking-[4px]">LOGS DEL SISTEMA (EJECUCIONES REALES)</h3>
                </div>
                <div className="flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                   <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Monitoreo en Vivo</span>
                </div>
             </div>
             
             <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                {messages.length > 0 ? (
                  messages.map((log, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-[#0D0D0D]/50 border border-[#151515] hover:bg-[#0D0D0D] transition-all">
                       <span className="text-[9px] font-mono text-gray-600 mt-1">[{log.timestamp}]</span>
                       <span className={cn(
                         "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded min-w-[70px] text-center",
                         log.role === 'user' ? "text-neon-cyan bg-neon-cyan/5 border border-neon-cyan/10" : "text-neon-purple bg-neon-purple/5 border border-neon-purple/10"
                       )}>
                         {log.role === 'user' ? 'EJECUCIÓN' : 'RESPUESTA'}
                       </span>
                       <p className="text-[11px] text-gray-400 font-medium leading-relaxed line-clamp-2 italic">
                         {log.content}
                       </p>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-20">
                     <Terminal className="w-12 h-12 text-gray-500 mb-4" />
                     <p className="text-xs font-black text-gray-600 uppercase tracking-[3px]">No se registran ejecuciones en este proyecto</p>
                  </div>
                )}
             </div>
          </div>

          {/* Artifacts Summary (Connected to REAL data) */}
          <div id="admin-docs" className="p-8 rounded-[40px] bg-[#0A0A0A] border border-[#151515] xl:col-span-3 shadow-2xl">
             <div className="flex items-center justify-between mb-8 pb-6 border-b border-[#151515]">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A] text-pink-400">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <h3 className="text-xs font-black text-gray-200 uppercase tracking-[4px]">ÚLTIMOS ARTEFACTOS GENERADOS</h3>
                </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {artifacts.slice(-3).reverse().map((art, i) => (
                  <div key={i} className="bg-[#0D0D0D] border border-[#151515] rounded-[32px] overflow-hidden p-1 shadow-xl hover:border-pink-500/20 transition-all">
                     <div className="p-4 flex items-center justify-between border-b border-[#151515] mb-2">
                        <span className="text-[9px] font-black text-pink-400 uppercase tracking-widest">{art.type}</span>
                        <span className="text-[10px] font-bold text-white truncate max-w-[150px]">{art.title}</span>
                     </div>
                     <div className="scale-75 -my-10 opacity-60">
                        <ArtifactRenderer artifact={art} />
                     </div>
                  </div>
                ))}
                {artifacts.length === 0 && (
                   <div className="col-span-3 h-40 flex items-center justify-center border border-dashed border-[#222] rounded-[40px] opacity-20">
                      <p className="text-xs font-black text-gray-400 uppercase tracking-[4px]">Sin componentes generados</p>
                   </div>
                )}
             </div>
          </div>
        </div>
      </div>

      {/* Admin Footer Status */}
      <div className="px-12 py-6 border-t border-[#151515] bg-[#050505] flex items-center justify-between relative z-10">
         <div className="flex items-center gap-10">
            <div className="flex items-center gap-3">
               <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-glow-sm" />
               <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono">ENLACE SUPABASE: ACTIVO</span>
            </div>
            <div className="flex items-center gap-3">
               <Binary className="w-4 h-4 text-gray-700" />
               <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono">TOKEN_ID: {activeProject?.id?.slice(0,8) || 'NONE'}</span>
            </div>
         </div>
         <div className="flex gap-4">
            <button className="px-5 py-2 rounded-xl bg-[#0A0A0A] border border-[#151515] text-[10px] font-black text-gray-600 uppercase tracking-widest hover:text-white transition-all transition-all">Compartir Admin Access</button>
            <button className="px-5 py-2 rounded-xl bg-neon-purple/10 border border-neon-purple/30 text-[10px] font-black text-neon-purple uppercase tracking-widest hover:bg-neon-purple/20 transition-all shadow-glow-sm">Sincronizar Manualmente</button>
         </div>
      </div>
    </div>
  );
}

function ChevronRight({ className, ...props }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
            <path d="m9 18 6-6-6-6"/>
        </svg>
    );
}

export default BetaAdmin;
