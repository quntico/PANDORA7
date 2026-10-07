
import React, { useState } from 'react';
import { X, Eye, EyeOff, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

function APIKeyModal({ isOpen, onClose, provider, connectionHook }) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const { toast } = useToast();
  const { addConnection, isLoading } = connectionHook;

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await addConnection(provider, apiKey);
    
    if (success) {
      toast({
        title: "Conexión Exitosa",
        description: `Se ha conectado correctamente con ${provider}.`,
        variant: "default",
        className: "bg-green-900 border-green-800 text-white"
      });
      setApiKey('');
      onClose();
    } else {
      toast({
        title: "Error de Conexión",
        description: "No se pudo validar la clave API. Por favor verifíquela.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#1a1f2e] border border-gray-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Configurar {provider}</h3>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-3 flex gap-3 items-start">
            <ShieldAlert className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-200/80 leading-relaxed">
              Las claves API se almacenan localmente en su navegador. Nunca las compartas con nadie.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">API Key</label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`sk-...`}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                required
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-300"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Obtén tu clave en el panel de desarrolladores de {provider}.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !apiKey}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Probando...
                </>
              ) : (
                'Guardar y Probar'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default APIKeyModal;
