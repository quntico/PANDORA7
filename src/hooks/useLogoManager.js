
import { useState, useEffect, useCallback } from 'react';

const LOGO_STORAGE_KEY = 'pandora_custom_logo';
const LOGO_SIZE_KEY = 'pandora_logo_size';
const EVENT_KEY = 'pandora_logo_update';

export function useLogoManager() {
  const [logo, setLogo] = useState(null);
  const [logoSize, setLogoSize] = useState(48); // Default 48px

  // Helper to safely get from storage
  const getFromStorage = (key) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`[LogoManager] Error reading ${key}:`, error);
    }
    return null;
  };

  useEffect(() => {
    // Initial load
    const storedLogo = getFromStorage(LOGO_STORAGE_KEY);
    const storedSize = getFromStorage(LOGO_SIZE_KEY);

    if (storedLogo) setLogo(storedLogo);
    if (storedSize) setLogoSize(parseInt(storedSize, 10));

    // Listen for changes
    const handleStorageChange = (e) => {
      if (e.key === LOGO_STORAGE_KEY) setLogo(e.newValue);
      if (e.key === LOGO_SIZE_KEY && e.newValue) setLogoSize(parseInt(e.newValue, 10));
    };

    const handleLocalChange = () => {
      const storedLogo = getFromStorage(LOGO_STORAGE_KEY);
      const storedSize = getFromStorage(LOGO_SIZE_KEY);
      if (storedLogo !== logo) setLogo(storedLogo);
      if (storedSize) setLogoSize(parseInt(storedSize, 10));
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(EVENT_KEY, handleLocalChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(EVENT_KEY, handleLocalChange);
    };
  }, []);

  const updateLogoSize = (newSize) => {
    try {
      localStorage.setItem(LOGO_SIZE_KEY, newSize.toString());
      setLogoSize(newSize);
      window.dispatchEvent(new Event(EVENT_KEY));
    } catch (e) {
      console.error("Error saving size", e);
    }
  };

  const uploadLogo = async (file) => {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('No file provided'));
        return;
      }

      console.log(`[LogoManager] Processing file: ${file.name}, Size: ${file.size} bytes`);

      const reader = new FileReader();

      reader.onloadend = () => {
        const base64String = reader.result;

        if (!base64String || !base64String.startsWith('data:image')) {
          console.error('[LogoManager] Invalid base64 result');
          reject(new Error('Failed to process image data'));
          return;
        }

        try {
          localStorage.setItem(LOGO_STORAGE_KEY, base64String);
          setLogo(base64String);
          window.dispatchEvent(new Event(EVENT_KEY));
          resolve(base64String);
        } catch (error) {
          console.error('[LogoManager] Error saving to storage:', error);
          if (error.name === 'QuotaExceededError' || error.message.includes('Quota')) {
            reject(new Error('Imagen demasiado grande.'));
          } else {
            reject(new Error('Error al guardar.'));
          }
        }
      };

      reader.readAsDataURL(file);
    });
  };

  const resetLogo = () => {
    try {
      localStorage.removeItem(LOGO_STORAGE_KEY);
      localStorage.removeItem(LOGO_SIZE_KEY);
      setLogo(null);
      setLogoSize(48);
      window.dispatchEvent(new Event(EVENT_KEY));
    } catch (error) {
      console.error('[LogoManager] Error resetting logo:', error);
    }
  };

  const getLogoUrl = useCallback(() => logo, [logo]);

  return {
    logo,
    logoSize,
    getLogoUrl,
    uploadLogo,
    updateLogoSize,
    resetLogo
  };
}
