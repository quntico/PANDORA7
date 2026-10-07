
import React, { useState } from 'react';
import { CheckCircle2, XCircle, RefreshCw, Trash2, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import APIKeyModal from './APIKeyModal';

function APIConnectionCard({ provider, icon: Icon, color, connectionHook }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isConnected = connectionHook.getConnectionStatus(provider);
  const maskedKey = connectionHook.getMaskedKey(provider);

  return (
    <>
      <div className="group relative overflow-hidden rounded-xl p-5 bg-gray-900/40 border border-white/10 hover:border-white/20 transition-all duration-300">
        <div className={`absolute top-0 left-0 w-1 h-full ${isConnected ? 'bg-green-500' : 'bg-gray-700'}`} />
        
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg bg-white/5", color)}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-lg">{provider}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <div className={cn("w-2 h-2 rounded-full", isConnected ? "bg-green-500" : "bg-red-500")} />
                <span className="text-xs text-gray-400">
                  {isConnected ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {isConnected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-2 rounded bg-gray-950/50 border border-white/5 font-mono text-sm text-gray-400">
              <Key className="w-4 h-4" />
              <span>{maskedKey}</span>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 text-white"
                onClick={() => setIsModalOpen(true)}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualizar
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                onClick={() => connectionHook.disconnectModel(provider)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <Button 
            className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/10"
            onClick={() => setIsModalOpen(true)}
          >
            Conectar Modelo
          </Button>
        )}
      </div>

      <APIKeyModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        provider={provider}
        connectionHook={connectionHook}
      />
    </>
  );
}

export default APIConnectionCard;
