
import React from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CheckCircle2, AlertTriangle, Lightbulb, Target, Brain, Factory, Landmark, Settings, Search, Scale, Leaf, Link, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

// Renderer V3 Sub-components
import DashboardRenderer from './DashboardRenderer';
import MetricCard from './MetricCard';
import TableBlock from './TableBlock';
import ChartBlock from './ChartBlock';
import ExecutiveTable from './ExecutiveTable';
import GeneratedImageViewer from './GeneratedImageViewer';

export default function ResponseRenderer({ data }) {
  if (!data) return null;

  // 1. MODO DASHBOARD EJECUTIVO (V3.0)
  if (typeof data === 'object' && data.templateId) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full"
      >
        <DashboardRenderer data={data} />
      </motion.div>
    );
  }

  // 2. MODO HÍBRIDO (V2.4 / V2.5)
  const isObject = typeof data === 'object' && data !== null;
  const content = isObject ? (data.text || data.summary || "") : data;
  const sections = isObject && data.sections ? data.sections : [];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-12"
    >
      {content && (
        <div className="w-full">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ node, ...props }) => (
                <h1 {...props} className="text-lg font-black text-white uppercase tracking-[4px] mt-6 mb-3 border-b border-white/10 pb-2" />
              ),
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
                    <div className="flex items-center gap-4 mt-8 mb-4 p-4 rounded-xl bg-neon-purple/5 border border-neon-purple/20 shadow-glow-sm transition-all hover:bg-neon-purple/10">
                      <div className="w-10 h-10 rounded-full bg-neon-purple flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(179,0,255,0.5)]">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <h2 {...props} className="text-base font-black text-neon-purple uppercase tracking-[4px] m-0" />
                    </div>
                  );
                }
                return <h2 {...props} className="text-base font-black text-neon-cyan uppercase tracking-[3px] mt-5 mb-2" />;
              },
              h3: ({ node, ...props }) => (
                <div className="flex items-center gap-3 mt-4 mb-2">
                  <div className="w-1 h-4 bg-neon-cyan/70 rounded-full" />
                  <h3 {...props} className="text-sm font-bold text-white uppercase tracking-widest m-0" />
                </div>
              ),
              p: ({ node, ...props }) => (
                <p {...props} className="text-sm text-gray-300 leading-relaxed mb-3" />
              ),
              strong: ({ node, ...props }) => (
                <strong {...props} className="text-white font-bold" />
              ),
              ul: ({ node, ...props }) => (
                <ul {...props} className="space-y-1.5 my-3 pl-4" />
              ),
              li: ({ node, ...props }) => (
                <li {...props} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-neon-cyan flex-shrink-0" />
                  <span>{props.children}</span>
                </li>
              ),
              blockquote: ({ node, ...props }) => (
                <blockquote {...props} className="border-l-2 border-neon-purple bg-neon-purple/5 px-4 py-3 rounded-r-xl italic text-gray-400 text-sm my-3" />
              ),
              table: ({ node, ...props }) => (
                <div className="overflow-x-auto my-4 rounded-xl border border-white/10">
                  <table {...props} className="w-full text-sm text-left" />
                </div>
              ),
              th: ({ node, ...props }) => (
                <th {...props} className="px-4 py-2 text-[10px] font-black text-neon-cyan uppercase tracking-widest bg-white/5 border-b border-white/10" />
              ),
              td: ({ node, ...props }) => (
                <td {...props} className="px-4 py-2 text-gray-300 border-b border-white/5" />
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      )}

      {data.generatedImages && data.generatedImages.length > 0 && (
        <div className="flex flex-wrap gap-6 mt-8">
          {data.generatedImages.map((img, i) => (
             <GeneratedImageViewer key={i} src={img} />
          ))}
        </div>
      )}

      {sections.length > 0 && (
        <div className="space-y-16">
          {sections.map((section, idx) => {
            const { type, title, data: cdata, chartType, headers, rows, metrics, items } = section;
            
            return (
              <div key={idx} className="group/section">
                {title && (
                  <div className="flex items-center gap-4 mb-8">
                     <div className={cn(
                       "w-2 h-2 rounded-full animate-pulse",
                       type === 'chart' ? "bg-neon-purple" : "bg-neon-cyan"
                     )} />
                     <h4 className="text-[10px] font-black uppercase tracking-[5px] text-gray-500 group-hover:text-white transition-colors">
                       {title}
                     </h4>
                  </div>
                )}

                {type === 'chart' && <ChartBlock data={cdata} type={chartType || 'bar'} title={title} />}
                {type === 'table' && <ExecutiveTable columns={headers || section.columns} rows={rows} title={title} />}
                {type === 'metric_cards' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {(metrics || items).map((m, midx) => (
                      <MetricCard key={midx} {...m} />
                    ))}
                  </div>
                )}
                {type === 'bullet_list' && (
                  <ul className="space-y-4">
                    {items.map((item, i) => (
                      <li key={i} className="flex items-center gap-4 text-gray-400 p-4 rounded-3xl bg-white/[0.02] border border-white/5">
                        <CheckCircle2 className="w-4 h-4 text-neon-cyan" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
