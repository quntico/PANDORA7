
import React from 'react';
import { cn } from '@/lib/utils';
import { Bot, User, FileText, Image, Link as LinkIcon, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

function ChatMessage({ message }) {
  const isUser = message.role === 'user';

  // Format timestamp to readable time
  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex w-full gap-4 p-4 md:p-6",
        isUser ? "flex-row-reverse bg-transparent" : "flex-row bg-white/5 border-b border-white/5"
      )}
    >
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
        isUser ? "bg-blue-600" : "bg-teal-600"
      )}>
        {isUser ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
      </div>

      {/* Content Container */}
      <div className={cn(
        "flex flex-col max-w-[85%] md:max-w-[75%]",
        isUser ? "items-end" : "items-start"
      )}>
        {/* Author Name */}
        <span className="text-xs font-semibold text-gray-400 mb-1">
          {isUser ? 'Tú' : 'PANDORA'}
        </span>

        {/* Message Bubble/Text */}
        <div className={cn(
          "relative text-sm md:text-base leading-relaxed whitespace-pre-wrap",
          isUser 
            ? "bg-blue-600 text-white rounded-2xl rounded-tr-none px-5 py-3 shadow-md" 
            : "text-gray-100"
        )}>
          {message.content}
        </div>

        {/* Attachments if any */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.attachments.map((att, idx) => (
              <div 
                key={idx}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700 text-xs text-gray-300 max-w-[200px]"
              >
                {att.type === 'pdf' && <FileText className="w-4 h-4 text-red-400" />}
                {att.type === 'image' && <Image className="w-4 h-4 text-purple-400" />}
                {att.type === 'url' && <LinkIcon className="w-4 h-4 text-blue-400" />}
                <span className="truncate">{att.name || 'Archivo adjunto'}</span>
              </div>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <div className="mt-1 flex items-center gap-1 opacity-50">
          <Clock className="w-3 h-3 text-gray-500" />
          <span className="text-[10px] text-gray-500">{formatTime(message.timestamp)}</span>
        </div>
      </div>
    </motion.div>
  );
}

export default ChatMessage;
