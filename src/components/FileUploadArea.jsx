
import React, { useRef, useState } from 'react';
import { Paperclip, X, File, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

function FileUploadArea({ onFileSelect, isProcessing }) {
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFile = (file) => {
    // Limits: 10MB for PDF, 5MB for Image
    const isPDF = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');
    
    if (!isPDF && !isImage) {
      toast({
        title: "Tipo de archivo no soportado",
        description: "Solo se permiten archivos PDF o Imágenes.",
        variant: "destructive"
      });
      return false;
    }

    if (isPDF && file.size > 10 * 1024 * 1024) {
      toast({
        title: "Archivo demasiado grande",
        description: "El límite para PDF es 10MB.",
        variant: "destructive"
      });
      return false;
    }

    if (isImage && file.size > 5 * 1024 * 1024) {
      toast({
        title: "Archivo demasiado grande",
        description: "El límite para imágenes es 5MB.",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        handleNewFile(file);
      }
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        handleNewFile(file);
      }
    }
  };

  const handleNewFile = (file) => {
    setSelectedFile(file);
    onFileSelect(file); // Pass to parent immediately or wait for send? 
    // We'll pass it to parent but keep local preview
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onFileSelect(null);
  };

  return (
    <div 
      className={`relative transition-all duration-200 ${dragActive ? 'bg-blue-500/10 rounded-lg' : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileInput}
        accept=".pdf,image/*"
      />

      {selectedFile ? (
        <div className="flex items-center gap-2 p-2 bg-gray-800 rounded-lg border border-gray-700 max-w-fit mb-2">
          {selectedFile.type.includes('pdf') ? (
            <File className="w-4 h-4 text-red-400" />
          ) : (
            <ImageIcon className="w-4 h-4 text-purple-400" />
          )}
          <span className="text-xs text-gray-300 truncate max-w-[150px]">
            {selectedFile.name}
          </span>
          <span className="text-[10px] text-gray-500">
            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
          </span>
          <button 
            onClick={clearFile}
            className="p-1 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="text-gray-400 hover:text-white hover:bg-gray-800"
          title="Adjuntar archivo (PDF o Imagen)"
        >
          {isProcessing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Paperclip className="w-5 h-5" />
          )}
        </Button>
      )}
    </div>
  );
}

export default FileUploadArea;
