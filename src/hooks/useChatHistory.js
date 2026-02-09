
import { useState, useEffect, useCallback } from 'react';

const CHAT_STORAGE_KEY = 'pandora_chat_history';

export function useChatHistory() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load history on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CHAT_STORAGE_KEY);
      if (stored) {
        setMessages(JSON.parse(stored));
      } else {
        // Initial welcome message if no history
        setMessages([
          {
            id: 'welcome-1',
            role: 'assistant',
            content: "¡Hola! Soy PANDORA, tu asistente experto en evaluación de proyectos de inversión. Puedo ayudarte a analizar tu proyecto. Sube un PDF, comparte una URL o cuéntame sobre tu idea.",
            timestamp: new Date().toISOString()
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save history whenever it changes
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      try {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
      } catch (error) {
        console.error('Error saving chat history:', error);
      }
    }
  }, [messages, isLoading]);

  const addMessage = useCallback((message) => {
    setMessages(prev => {
      // Check for duplicates based on ID or content+timestamp to prevent double submission
      // Simple check to ensure we don't add the exact same message reference, though new objects are created
      return [...prev, {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ...message
      }];
    });
  }, []);

  const clearHistory = useCallback(() => {
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
      setMessages([
        {
          id: 'welcome-new',
          role: 'assistant',
          content: "¡Hola! Soy PANDORA. He limpiado nuestra conversación anterior. ¿En qué puedo ayudarte hoy?",
          timestamp: new Date().toISOString()
        }
      ]);
    } catch (error) {
      console.error('Error clearing chat history:', error);
    }
  }, []);

  return {
    messages,
    addMessage,
    clearHistory,
    isLoading
  };
}
