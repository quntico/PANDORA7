
import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, CheckCircle, AlertTriangle, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useLogoManager } from '@/hooks/useLogoManager';

function LogoUploader() {
  const { logo, logoSize, updateLogoSize, uploadLogo, resetLogo } = useLogoManager();
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Define the max file size
  // Note: LocalStorage limit is usually around 5MB. 
  // We keep the validation high in UI but the hook will catch quota errors.
  const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file) => {
    setIsLoading(true);

    // Validation
    const validTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Tipo de archivo no válido",
        description: "Por favor sube una imagen en formato PNG, JPG o SVG.",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({
        title: "Archivo demasiado grande",
        description: "El tamaño máximo permitido es 50MB.",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    try {
      await uploadLogo(file);
      toast({
        title: "¡Logo actualizado!",
        description: "Tu nuevo logo se ha guardado correctamente.",
        variant: "default",
        className: "bg-green-600 border-green-700 text-white"
      });
    } catch (error) {
      toast({
        title: "Error al subir logo",
        description: error.message || "Ocurrió un error inesperado.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleReset = () => {
    resetLogo();
    toast({
      title: "Logo restaurado",
      description: "Se ha restaurado el logo predeterminado de PANDORA.",
    });
  };

  return (
    <div className="p-6 rounded-2xl backdrop-blur-md bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-700/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-teal-400" />
          Logo Personalizado
        </h3>
        {logo && (
          <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Activo
          </span>
        )}
      </div>

      <div className="space-y-6">
        {/* Preview Area */}
        <div className="flex flex-col items-center justify-center p-6 bg-gray-900/50 rounded-xl border border-dashed border-gray-700 relative group">
          {logo ? (
            <div className="relative">
              <img
                src={logo}
                alt="Custom Logo Preview"
                className="h-20 object-contain mx-auto transition-transform hover:scale-105"
              />
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                Vista previa
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 space-y-2">
              <div className="w-16 h-16 mx-auto rounded-xl bg-gray-800 flex items-center justify-center mb-2">
                <span className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">P</span>
              </div>
              <p className="text-sm">Logo Predeterminado</p>
            </div>
          )}
        </div>

        {/* Logo Size Slider */}
        {logo && (
          <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-neon-cyan" />
                Tamaño del Logo
              </label>
              <span className="text-xs font-mono bg-gray-800 px-2 py-1 rounded text-neon-cyan border border-neon-cyan/20">
                {logoSize}px
              </span>
            </div>
            <input
              type="range"
              min="32"
              max="128"
              step="4"
              value={logoSize}
              onChange={(e) => updateLogoSize(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#00F0FF]"
            />
            <div className="flex justify-between text-[10px] text-gray-500 font-mono">
              <span>32px</span>
              <span>128px</span>
            </div>
          </div>
        )}

        {/* Upload Area */}
        <div
          className={`
            border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer
            ${isDragging ? 'border-teal-500 bg-teal-500/10' : 'border-gray-700 hover:border-teal-500/50 hover:bg-gray-800/50'}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isLoading && fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/png, image/jpeg, image/svg+xml, image/webp"
            disabled={isLoading}
          />

          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-5 h-5 text-teal-400" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                {isLoading ? "Procesando imagen..." : "Haz clic para subir o arrastra tu logo aquí"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PNG, JPG o SVG (Máx. 50MB)
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        {logo && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={handleReset}
              className="text-red-400 hover:text-red-300 hover:bg-red-900/20 border-red-900/30 w-full md:w-auto"
              disabled={isLoading}
            >
              <X className="w-4 h-4 mr-2" />
              Restaurar Logo Predeterminado
            </Button>
          </div>
        )}

        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-900/20 border border-blue-800/30">
          <AlertTriangle className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-300">
            El logo se guardará localmente en tu navegador. <strong>Nota:</strong> Algunos navegadores limitan el almacenamiento a 5MB. Si la imagen es muy grande, podría fallar al guardar.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LogoUploader;
