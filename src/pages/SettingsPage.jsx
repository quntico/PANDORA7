
import React from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Database, Code, Palette, Shield, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import APIConnectionCard from '@/components/APIConnectionCard';
import ThemeSelector from '@/components/ThemeSelector';
import ExportButton from '@/components/ExportButton';
import LogoUploader from '@/components/LogoUploader';
import { useAPIConnections } from '@/hooks/useAPIConnections';

function SettingsPage() {
  const navigate = useNavigate();
  const connectionHook = useAPIConnections();

  const providers = [
    { id: 'OpenAI', icon: Sparkles, color: 'text-green-400 bg-green-400/10' },
    { id: 'Anthropic', icon: Database, color: 'text-orange-400 bg-orange-400/10' },
    { id: 'Google', icon: Code, color: 'text-blue-400 bg-blue-400/10' },
    { id: 'Cohere', icon: Shield, color: 'text-purple-400 bg-purple-400/10' },
  ];

  return (
    <>
      <Helmet>
        <title>Configuración - PANDORA</title>
      </Helmet>

      <div className="min-h-screen bg-[#0F172A] text-white">
        <main className="max-w-5xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="flex items-center gap-4 mb-10">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="text-gray-400 hover:text-white hover:bg-white/5 -ml-2 rounded-xl"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Volver
            </Button>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Configuración
            </h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - AI Connections */}
            <div className="lg:col-span-2 space-y-8">
              <section className="p-6 rounded-2xl backdrop-blur-xl bg-gray-900/40 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-900/20 text-cyan-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  Conexiones de IA
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {providers.map((provider) => (
                    <APIConnectionCard
                      key={provider.id}
                      provider={provider.id}
                      icon={provider.icon}
                      color={provider.color}
                      connectionHook={connectionHook}
                    />
                  ))}
                </div>
              </section>

              <section className="p-6 rounded-2xl backdrop-blur-xl bg-gray-900/40 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-900/20 text-blue-400">
                    <Code className="w-5 h-5" />
                  </div>
                  Exportar Código
                </h2>
                <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
                  <p className="text-sm text-gray-400 mb-4">Descarga el código fuente completo del proyecto para uso local o despliegue.</p>
                  <ExportButton />
                </div>
              </section>
            </div>

            {/* Right Column - Appearance & Customization */}
            <div className="space-y-8">
              <section className="p-6 rounded-2xl backdrop-blur-xl bg-gray-900/40 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-900/20 text-purple-400">
                    <Palette className="w-5 h-5" />
                  </div>
                  Tema
                </h2>
                <ThemeSelector />
              </section>

              <section className="p-6 rounded-2xl backdrop-blur-xl bg-gray-900/40 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                 <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-pink-900/20 text-pink-400">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  Personalización
                </h2>
                <LogoUploader />
              </section>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-500/20">
                <h3 className="font-semibold text-cyan-400 mb-2">PANDORA v1.0.0</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Plataforma avanzada de análisis financiero. 
                  Privacidad y seguridad garantizadas.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

export default SettingsPage;
