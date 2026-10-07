
import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Send, PlusCircle, ArrowRight, Loader2, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import ChatMessage from '@/components/ChatMessage';
import FileUploadArea from '@/components/FileUploadArea';
import { useChatHistory } from '@/hooks/useChatHistory';
import { useDocumentParser } from '@/hooks/useDocumentParser';
import { useProject } from '@/context/ProjectContext';

function ChatPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { messages, addMessage, clearHistory } = useChatHistory();
  const { parsePdf, parseImage, isParsing } = useDocumentParser();
  const { updateProjectData } = useProject();

  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSending, setIsSending] = useState(false);
  
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  const handleFileSelect = (file) => {
    setSelectedFile(file);
  };

  const processFile = async (file) => {
    if (!file) return null;
    try {
      if (file.type === 'application/pdf') {
        return await parsePdf(file);
      } else if (file.type.startsWith('image/')) {
        return await parseImage(file);
      }
    } catch (error) {
      toast({
        title: "Error al procesar archivo",
        description: error.message || "No se pudo leer el archivo.",
        variant: "destructive"
      });
      return null;
    }
    return null;
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedFile) || isSending || isParsing) return;

    setIsSending(true);
    let fileData = null;
    let extractedText = "";

    if (selectedFile) {
      fileData = await processFile(selectedFile);
      if (fileData) {
        extractedText = fileData.content;
      }
    }

    const userMessage = {
      role: 'user',
      content: input,
      attachments: fileData ? [{ 
        type: fileData.type, 
        name: fileData.meta.filename || 'Archivo' 
      }] : []
    };
    addMessage(userMessage);

    setInput('');
    setSelectedFile(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    setTimeout(() => {
      let botResponse = "Entendido. ";
      
      if (extractedText) {
        botResponse += `He analizado el archivo "${fileData.meta.filename}". Contiene información relevante. `;
        if (extractedText.toLowerCase().includes('budget') || extractedText.toLowerCase().includes('presupuesto')) {
           botResponse += "He detectado datos financieros. ¿Deseas actualizar el presupuesto en la sección de Análisis? ";
           updateProjectData({ description: extractedText.substring(0, 500) + "..." });
        } else {
           botResponse += "¿Qué aspecto específico deseas analizar? ";
        }
      } else {
        botResponse += "Estoy procesando tu solicitud. Simularé que analizo tu consulta para darte recomendaciones de inversión.";
      }

      addMessage({
        role: 'assistant',
        content: botResponse
      });
      
      setIsSending(false);
    }, 1500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <Helmet>
        <title>Chat IA - PANDORA</title>
      </Helmet>
      
      <div className="flex flex-col h-[calc(100vh-64px)] bg-[#0F172A]">
        {/* Header / Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0F172A]/90 border-b border-cyan-500/20 backdrop-blur-xl z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
              <MessageSquare className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Asistente PANDORA</h1>
              <p className="text-xs text-cyan-400 flex items-center gap-2 font-medium">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.5)]"></span>
                En línea
              </p>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearHistory}
            className="border-gray-700 bg-gray-800/50 text-gray-300 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/10 rounded-xl transition-all"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Nuevo Chat
          </Button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-20 lg:px-40 space-y-8 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          
          {(isSending || isParsing) && (
            <div className="flex items-center gap-3 text-cyan-400 text-sm ml-4 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-cyan-900/30 border border-cyan-500/20 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
              {isParsing ? "Analizando documento..." : "PANDORA está escribiendo..."}
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-[#0F172A] border-t border-cyan-500/10">
          <div className="max-w-4xl mx-auto relative bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-cyan-500/20 focus-within:border-cyan-500/50 focus-within:shadow-[0_0_20px_rgba(6,182,212,0.1)] transition-all shadow-lg">
            
            <div className="flex items-end gap-3 p-4">
              <FileUploadArea 
                onFileSelect={handleFileSelect} 
                isProcessing={isSending || isParsing}
              />

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pregunta sobre tu proyecto o sube un documento..."
                rows={1}
                maxLength={10000}
                className="flex-1 max-h-[200px] bg-transparent text-white placeholder-gray-500 resize-none focus:outline-none py-2 text-base scrollbar-hide"
                disabled={isSending || isParsing}
              />

              <Button
                onClick={handleSend}
                disabled={(!input.trim() && !selectedFile) || isSending || isParsing}
                size="icon"
                className={`
                  mb-0.5 w-10 h-10 rounded-xl transition-all duration-300
                  ${(!input.trim() && !selectedFile) ? 'bg-gray-800 text-gray-600' : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20'}
                `}
              >
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>

            <div className="px-5 pb-3 flex justify-between items-center">
              <span className="text-[10px] text-gray-500">
                PANDORA puede cometer errores. Verifica la información financiera.
              </span>
              <span className="text-[10px] text-gray-600 font-mono">
                {input.length} / 10000
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ChatPage;
