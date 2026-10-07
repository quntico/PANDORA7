import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { 
  Download, FileText, Calendar, 
  Building2, Briefcase, Zap, Box,
  ShieldCheck, TrendingUp, HelpCircle,
  Database, CheckSquare, AlertTriangle,
  CheckCircle2, Brain, Target, Search, Factory, Landmark, Scale, Leaf, Link, Star, Settings
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';

import MetricCard from './MetricCard';
import ChartPanel from './ChartPanel';
import ExecutiveTable from './ExecutiveTable';
import RecommendationPanel from './RecommendationPanel';

export default function DashboardRenderer({ data }) {
  const dashboardRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);
  
  if (!data || typeof data !== 'object') return null;
  
  const { 
    templateId, title, subtitle, summary, 
    metrics, charts, tables, alerts, 
    recommendation, confidence, footerNotes,
    projectName, companyName, date 
  } = data;

  const exportPDF = async () => {
    if (!dashboardRef.current) return;
    setIsExporting(true);

    // 1. Apagar temporalmente contentEditable para prevenir loop infinito de html2canvas
    const editables = dashboardRef.current.querySelectorAll('[contenteditable="true"]');
    editables.forEach(el => el.setAttribute('contenteditable', 'false'));

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const chunks = Array.from(dashboardRef.current.querySelectorAll('.pdf-export-chunk'));
      
      const margin = 12; 
      const availableWidth = pdfWidth - (margin * 2);
      const availableHeight = pdfHeight - (margin * 2);
      
      let currentY = margin;
      let currentPage = 1;
      
      // Función helper para pintar la hoja y los márgenes
      const renderPageDecorations = (pageNumber) => {
        pdf.setFillColor(10, 10, 10);
        pdf.rect(0, 0, pdfWidth, margin, 'F');
        pdf.rect(0, pdfHeight - margin, pdfWidth, margin, 'F');
        
        if (pageNumber > 1) {
          pdf.setFontSize(10);
          pdf.setTextColor(179, 0, 255); 
          pdf.setFont("helvetica", "bold");
          pdf.text("PANDORA", margin, margin - 4);
          
          pdf.setFontSize(8);
          pdf.setTextColor(150, 150, 150);
          pdf.setFont("helvetica", "normal");
          pdf.text("EXECUTIVE CONSOLE", margin + 22, margin - 4);
        }
        
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`HOJA ${pageNumber}`, pdfWidth - margin, pdfHeight - 4, { align: 'right' });
      };

      // INIT 1st Page
      pdf.setFillColor(10, 10, 10);
      pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (chunk.clientHeight === 0) continue;
        
        const canvas = await html2canvas(chunk, {
          scale: 2, 
          useCORS: true, 
          backgroundColor: null,
          logging: false,
        });
        
        const imgData = canvas.toDataURL('image/png');
        const imgHeight = (canvas.height * availableWidth) / canvas.width;
        
        if (imgHeight <= availableHeight) {
          // Bloque normal (Gráfico, Portada): Dibujar sin cortar
          if (currentY + imgHeight > pdfHeight - margin && i > 0) {
            currentPage++;
            pdf.addPage();
            pdf.setFillColor(10, 10, 10);
            pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
            currentY = margin + 10;
          }
          pdf.addImage(imgData, 'PNG', margin, currentY, availableWidth, imgHeight);
          currentY += imgHeight + 8;
        } else {
          // Bloque Gigante (Summary) que ocupa múltiples páginas
          if (currentY > pdfHeight * 0.5) {
             currentPage++;
             pdf.addPage();
             pdf.setFillColor(10, 10, 10);
             pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
             currentY = margin + 10;
          }
          
          let printedCurrent = (pdfHeight - margin) - currentY;
          pdf.addImage(imgData, 'PNG', margin, currentY, availableWidth, imgHeight);
          
          let leftHeight = imgHeight - printedCurrent;
          let printedSoFar = printedCurrent;
          
          while (leftHeight > 0) {
             currentPage++;
             pdf.addPage();
             pdf.setFillColor(10, 10, 10);
             pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
             
             let newY = margin - printedSoFar;
             pdf.addImage(imgData, 'PNG', margin, newY, availableWidth, imgHeight);
             
             printedSoFar += availableHeight;
             leftHeight -= availableHeight;
          }
          
          currentY = margin - (printedSoFar - availableHeight) + imgHeight + 8;
        }
      }

      // Final: Agregar encabezados y footers
      const totalPages = pdf.internal.getNumberOfPages();
      for (let j = 1; j <= totalPages; j++) {
        pdf.setPage(j);
        renderPageDecorations(j);
      }

      pdf.save(`Pandora_${templateId || 'Report'}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("Error al exportar PDF:", err);
      alert("Hubo un error al generar el PDF. Verifica la consola.");
    } finally {
      // Restaurar interactividad
      editables.forEach(el => el.setAttribute('contenteditable', 'true'));
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-6 px-4 flex flex-col md:flex-row gap-6 items-start">

      {/* ── Panel principal ────────────────────────────────────────── */}
      <div className="flex-1 w-full min-w-0">
        <div ref={dashboardRef} className="rounded-2xl bg-[#0A0A0A] border border-white/5 overflow-hidden">


        {/* PORTADA (COVER PAGE) */}
        <div className="pdf-export-chunk relative aspect-[186/273] w-full flex flex-col justify-center px-10 md:px-16 py-20 border-b border-white/5 overflow-hidden bg-[#030303]">
           <div className="absolute top-10 right-0 md:-right-10 opacity-[0.10] transform rotate-12 pointer-events-none">
             <Zap className="w-[300px] h-[300px] md:w-[450px] md:h-[450px] text-neon-cyan" strokeWidth={1} />
           </div>
           
           {/* TOP BADGE */}
           <div className="flex items-center gap-2 mb-16 px-4 py-2 rounded-full bg-white/5 border border-white/10 w-fit z-10 shadow-lg">
              <ShieldCheck className="w-4 h-4 text-neon-cyan" />
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[4px] text-gray-400">PANDORA EXECUTIVE INTELLIGENCE • EXECUTIVE_REPORT</span>
           </div>

           {/* MASSIVE TEXT */}
           <div className="w-full md:w-[85%] flex flex-col gap-6 z-10">
             <h1 className="text-[4rem] md:text-[5rem] leading-[0.9] font-black text-white tracking-tighter uppercase break-keep m-0">
               ANÁLISIS<br />ESTRATÉGICO<br />DEL PROYECTO<br />
               <span className="text-white break-keep">{title || projectName || 'GENERA 2000'}</span>
             </h1>
             <p className="text-lg md:text-xl font-medium text-gray-400 italic mt-4 max-w-2xl m-0">
               {subtitle || "Un enfoque sostenible para la gestión de residuos y generación de energía."}
             </p>
           </div>

           {/* METADATA RIGHT ALIGNED LIST */}
           <div className="absolute right-8 md:right-16 top-1/2 -translate-y-1/2 flex flex-col gap-10 text-right z-10 hidden md:flex">
              <div className="flex items-center justify-end gap-4 opacity-80">
                <span className="text-sm font-bold text-white uppercase tracking-widest">{date || new Date().toLocaleDateString()}</span>
                <Calendar className="w-4 h-4 text-neon-cyan" />
              </div>
              <div className="flex items-center justify-end gap-4 opacity-80">
                <span className="text-sm font-bold text-white uppercase tracking-widest leading-tight w-[150px]">{companyName || 'Empresa Default'}</span>
                <Building2 className="w-4 h-4 text-neon-purple" />
              </div>
              <div className="flex items-center justify-end gap-4 opacity-80">
                <span className="text-sm font-bold text-white uppercase tracking-widest leading-tight w-[150px]">Proyecto Pandora Beta</span>
                <Box className="w-4 h-4 text-neon-cyan" />
              </div>
           </div>
        </div>

        <div className="p-6 space-y-6">

          {/* Resumen ejecutivo */}
          {summary && (
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="pdf-export-chunk flex items-center gap-2 mb-2">
                <Brain className="w-5 h-5 text-neon-purple" />
                <span className="text-base font-black text-neon-purple uppercase tracking-[3px]">
                  Resumen Ejecutivo
                </span>
              </div>
              <div className="text-sm text-gray-300 leading-relaxed w-full">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h2: ({ node, ...props }) => {
                      const text = String(props.children || "").toUpperCase();
                      if (text.includes("FASE")) {
                        let Icon = CheckCircle2;
                        if(text.includes("EXPLORACIÓN") || text.includes("1")) Icon = Search;
                        else if(text.includes("MERCADO") || text.includes("2")) Icon = Target;
                        else if(text.includes("TÉCNICA") || text.includes("3")) Icon = Factory;
                        else if(text.includes("FINANCIERA") || text.includes("4")) Icon = Landmark;
                        else if(text.includes("LEGAL") || text.includes("5")) Icon = Scale;
                        else if(text.includes("AMBIENTAL") || text.includes("6")) Icon = Leaf;
                        else if(text.includes("RIESGOS") || text.includes("7")) Icon = AlertTriangle;
                        else if(text.includes("INTEGRACIÓN") || text.includes("8")) Icon = Link;
                        else if(text.includes("ESTRUCTURACIÓN") || text.includes("9")) Icon = Settings;
                        else if(text.includes("DECISIÓN") || text.includes("10")) Icon = Star;
                        
                        return (
                          <div className="pdf-export-chunk flex flex-col gap-2 mt-16 mb-8">
                            <div className="flex items-center gap-3 mb-1">
                              <div className="w-6 h-6 rounded-full bg-neon-purple flex items-center justify-center shadow-[0_0_15px_rgba(179,0,255,0.5)]">
                                <Icon className="w-3 h-3 text-white" />
                              </div>
                              <span className="text-[10px] text-neon-purple font-black uppercase tracking-[5px]">FASE DE AUDITORÍA</span>
                            </div>
                            <h2 {...props} className="text-[2.2rem] md:text-[2.75rem] font-black text-white tracking-tighter uppercase m-0 leading-[1]" />
                          </div>
                        );
                      }
                      return <h2 {...props} className="pdf-export-chunk text-[2rem] font-black text-white tracking-tighter uppercase mt-8 mb-4 border-b border-white/10 pb-4" />;
                    },
                    strong: ({ node, ...props }) => <strong {...props} className="text-white font-bold" />,
                    ul: ({ node, ...props }) => <ul {...props} className="pdf-export-chunk space-y-1.5 my-3 pl-4" />,
                     li: ({ node, ...props }) => {
                       const textObj = React.Children.toArray(props.children);
                       const textContent = textObj.join('').toUpperCase();
                       
                       let ledClasses = "bg-neon-cyan shadow-[0_0_8px_rgba(0,240,255,0.8)]";
                       if (textContent.includes("🔴")) ledClasses = "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,1)] animate-pulse";
                       else if (textContent.includes("🟡")) ledClasses = "bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,1)]";
                       else if (textContent.includes("🟢")) ledClasses = "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,1)]";
                       
                       const cleanedChildren = React.Children.map(props.children, child => {
                         if (typeof child === 'string') {
                           return child.replace(/[🔴🟡🟢]/g, '');
                         }
                         return child;
                       });

                       return (
                         <li {...props} className="flex items-start gap-3 text-sm text-gray-300">
                           <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${ledClasses}`} />
                           <span>{cleanedChildren}</span>
                         </li>
                       );
                     },
                    p: ({ node, ...props }) => <p {...props} className="pdf-export-chunk text-sm text-gray-300 leading-relaxed mb-3" />
                  }}
                >
                  {summary}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Métricas clave */}
          {metrics && metrics.length > 0 && (
            <div className="pdf-export-chunk">
              <h3 className="text-base font-black text-neon-purple uppercase tracking-[3px] mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" /> Métricas Clave
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {metrics.map((m, i) => <MetricCard key={i} {...m} compact />)}
              </div>
            </div>
          )}

          {/* Gráficas y Tablas */}
          {((charts && charts.length > 0) || (tables && tables.length > 0)) && (
            <div className="flex flex-col gap-6">
              {charts && charts.length > 0 && (
                <div className="pdf-export-chunk grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#030303] p-4 rounded-xl border border-white/5">
                  <div className="md:col-span-2 mb-2">
                     <h3 className="text-base font-black text-neon-purple uppercase tracking-[3px] flex items-center gap-2">
                       <Target className="w-5 h-5 text-neon-purple" /> Resultados Visuales
                     </h3>
                  </div>
                  {charts.map((c, i) => (
                    <div key={`c-${i}`} className={`${c.type === 'bar' || c.type === 'line' ? 'md:col-span-2' : 'col-span-1'}`}>
                      <ChartPanel {...c} />
                    </div>
                  ))}
                </div>
              )}
              {tables?.map((t, i) => (
                <div key={`t-${i}`} className="pdf-export-chunk">
                  <ExecutiveTable {...t} />
                </div>
              ))}
            </div>
          )}

          {/* Alertas */}
          {alerts && alerts.length > 0 && (
            <div className="pdf-export-chunk p-4 rounded-xl bg-red-500/5 border border-red-500/10">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-neon-purple" />
                <h4 className="text-base font-black text-neon-purple uppercase tracking-[3px]">
                  Señales de Alerta
                </h4>
              </div>
              <ul className="space-y-2">
                {alerts.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                    <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recomendación */}
          {recommendation && (
            <div className="pdf-export-chunk">
              <h3 className="text-base font-black text-neon-purple uppercase tracking-[3px] mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-neon-purple" /> Recomendación
              </h3>
              <RecommendationPanel {...recommendation} />
            </div>
          )}

          {/* Footer */}
          <div className="pdf-export-chunk pt-4 border-t border-white/5 flex items-center justify-between text-[8px] text-gray-700 font-bold uppercase tracking-wider">
            <span>Pandora Strategic Intelligence V3</span>
            <span className="flex items-center gap-2">
              <HelpCircle className="w-3 h-3 text-neon-cyan" />
              Confianza: {confidence || 'Alta'}
            </span>
          </div>

        </div>
      </div>
    </div>
      
    {/* ── Barra de acciones Lateral ──────────────────────────────── */}
      <div className="flex flex-row md:flex-col justify-end gap-4 sticky top-6 z-50 order-first md:order-last w-full md:w-auto h-fit">
        <motion.button
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          title="Guardar Memoria del Sistema"
          className="flex items-center justify-center p-4 rounded-full bg-black/80 backdrop-blur-xl border border-white/10 hover:border-neon-purple transition-all shadow-xl"
          onClick={() => alert('Información consolidada en Memoria del Sistema')}
        >
          <Database className="w-5 h-5 text-neon-purple" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          title="Crear Tarea en Control de Versiones"
          className="flex items-center justify-center p-4 rounded-full bg-black/80 backdrop-blur-xl border border-white/10 hover:border-yellow-500 transition-all shadow-xl"
          onClick={() => alert('Tarea generada en Control de Versiones')}
        >
          <CheckSquare className="w-5 h-5 text-yellow-500" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          title="Exportar Reporte Ejecutivo a PDF"
          onClick={exportPDF}
          disabled={isExporting}
          className={`flex items-center justify-center p-4 rounded-full transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)]
            ${isExporting 
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
              : 'bg-neon-cyan hover:bg-neon-cyan/80'}`}
        >
          <Download className={`w-5 h-5 ${isExporting ? 'text-gray-400' : 'text-black'}`} />
        </motion.button>
      </div>
      
    </div>
  );
}
