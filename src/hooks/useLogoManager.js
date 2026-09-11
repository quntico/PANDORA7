import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/supabase';

const LOGO_STORAGE_KEY = 'pandora_custom_logo'; // Fallback / Cache local
const LOGO_SIZE_KEY = 'pandora_logo_size';
const EVENT_KEY = 'pandora_logo_update';
const BUCKET_NAME = 'assets'; // Nombre del Bucket en Supabase
const LOGO_FILE_PATH = 'public/logo.png'; // Ruta fija para sobrescribir el logo

export function useLogoManager(simulatorId = null) {
  const simStorageKey = simulatorId ? `sim_${simulatorId}_logo` : null;
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
    // Initial load: Priority order: 1. Simulator specific logo 2. Global custom logo
    const loadLogo = async () => {
      const storedSize = getFromStorage(LOGO_SIZE_KEY);
      if (storedSize) setLogoSize(parseInt(storedSize, 10));

      const simLogo = simStorageKey ? getFromStorage(simStorageKey) : null;
      const globalLogo = getFromStorage(LOGO_STORAGE_KEY);
      const activeLogo = simLogo || globalLogo;
      
      if (activeLogo) {
        setLogo(activeLogo);
      }
    };

    loadLogo();

    // Listen for changes
    const handleStorageChange = (e) => {
      if (e.key === LOGO_SIZE_KEY && e.newValue) setLogoSize(parseInt(e.newValue, 10));
      if (e.key === LOGO_STORAGE_KEY || (simStorageKey && e.key === simStorageKey)) {
        const simLogo = simStorageKey ? getFromStorage(simStorageKey) : null;
        const globalLogo = getFromStorage(LOGO_STORAGE_KEY);
        setLogo(simLogo || globalLogo || null);
      }
    };

    const handleLocalChange = (e) => {
      const storedSize = getFromStorage(LOGO_SIZE_KEY);
      if (storedSize) setLogoSize(parseInt(storedSize, 10));
      
      const simLogo = simStorageKey ? getFromStorage(simStorageKey) : null;
      const globalLogo = getFromStorage(LOGO_STORAGE_KEY);
      setLogo(e?.detail?.base64 || simLogo || globalLogo || null);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(EVENT_KEY, handleLocalChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(EVENT_KEY, handleLocalChange);
    };
  }, [simStorageKey]);

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
    return new Promise(async (resolve, reject) => {
      if (!file) {
        reject(new Error('No file provided'));
        return;
      }

      console.log(`[LogoManager] Processing logo file: ${file.name}`);

      try {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64 = event.target.result;
          
          // Save locally in localStorage for instant rendering & persistent reports
          if (simStorageKey) {
            localStorage.setItem(simStorageKey, base64);
          }
          localStorage.setItem(LOGO_STORAGE_KEY, base64);
          setLogo(base64);

          // Dispatch sync event
          window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: { base64, simulatorId } }));

          // Upload to Supabase as background persistence
          try {
            const filePath = simulatorId ? `public/logos/${simulatorId}.png` : LOGO_FILE_PATH;
            await supabase.storage
              .from(BUCKET_NAME)
              .upload(filePath, file, { cacheControl: '3600', upsert: true });
          } catch (spErr) {
            console.warn('[LogoManager] Supabase storage upload notice:', spErr);
          }

          resolve(base64);
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);

      } catch (err) {
        console.error('[LogoManager] Error uploading logo:', err);
        reject(err);
      }
    });
  };

  const resetLogo = async () => {
    try {
      if (simStorageKey) {
        localStorage.removeItem(simStorageKey);
      }
      localStorage.removeItem(LOGO_STORAGE_KEY);
      localStorage.removeItem(LOGO_SIZE_KEY);
      setLogo(null);
      setLogoSize(48);
      window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: { base64: null, simulatorId } }));
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
