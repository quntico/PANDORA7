
import { useState, useEffect } from 'react';

export function useAPIConnections() {
  const [connections, setConnections] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('pandora-api-connections');
    if (stored) {
      try {
        setConnections(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse connections', e);
      }
    }
  }, []);

  const saveConnections = (newConnections) => {
    setConnections(newConnections);
    localStorage.setItem('pandora-api-connections', JSON.stringify(newConnections));
  };

  const addConnection = async (provider, apiKey) => {
    setIsLoading(true);
    setError(null);

    // Simulate API verification
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Basic validation simulation
      if (!apiKey || apiKey.length < 5) {
        throw new Error('Clave API inválida');
      }

      const newConnections = {
        ...connections,
        [provider]: {
          key: apiKey,
          connected: true,
          lastChecked: new Date().toISOString()
        }
      };
      
      saveConnections(newConnections);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectModel = (provider) => {
    const newConnections = { ...connections };
    delete newConnections[provider];
    saveConnections(newConnections);
  };

  const getConnectionStatus = (provider) => {
    return connections[provider]?.connected || false;
  };

  const getMaskedKey = (provider) => {
    const key = connections[provider]?.key;
    if (!key) return '';
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };

  return {
    connections,
    addConnection,
    disconnectModel,
    getConnectionStatus,
    getMaskedKey,
    isLoading,
    error
  };
}
