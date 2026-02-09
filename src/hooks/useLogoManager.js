import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/supabase';

const LOGO_STORAGE_KEY = 'pandora_custom_logo'; // Fallback / Cache local
const LOGO_SIZE_KEY = 'pandora_logo_size';
const EVENT_KEY = 'pandora_logo_update';
const BUCKET_NAME = 'assets'; // Nombre del Bucket en Supabase
const LOGO_FILE_PATH = 'public/logo.png'; // Ruta fija para sobrescribir el logo

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
    // Initial load: Try Supabase first, then local cache
    const loadLogo = async () => {
      // 1. Check local size
      const storedSize = getFromStorage(LOGO_SIZE_KEY);
      if (storedSize) setLogoSize(parseInt(storedSize, 10));

      // 2. Build Public URL
      const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(LOGO_FILE_PATH);
      if (data && data.publicUrl) {
        // Check if it actually exists (hacky check usually not needed if we trust it exists, 
        // bu we can just set it. If it 404s, user sees fallback 'P')
        // To avoid caching issues with same URL, append timestamp
        setLogo(`${data.publicUrl}?t=${new Date().getTime()}`);
      } else {
        // Fallback to local
        const storedLogo = getFromStorage(LOGO_STORAGE_KEY);
        if (storedLogo) setLogo(storedLogo);
      }
    };

    loadLogo();

    // Listen for changes
    const handleStorageChange = (e) => {
      if (e.key === LOGO_SIZE_KEY && e.newValue) setLogoSize(parseInt(e.newValue, 10));
    };

    const handleLocalChange = () => {
      const storedSize = getFromStorage(LOGO_SIZE_KEY);
      if (storedSize) setLogoSize(parseInt(storedSize, 10));
      // Logo URL update logic is handled by uploadLogo mostly
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
    return new Promise(async (resolve, reject) => {
      if (!file) {
        reject(new Error('No file provided'));
        return;
      }

      console.log(`[LogoManager] Uploading file to Supabase: ${file.name}`);

      try {
        // 1. Upload to Supabase (Overwrite)
        const { data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(LOGO_FILE_PATH, file, {
            cacheControl: '3600',
            upsert: true
          });

        if (error) throw error;

        // 2. Get Public URL
        const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(LOGO_FILE_PATH);
        const publicUrl = `${urlData.publicUrl}?t=${new Date().getTime()}`; // Bust cache

        // 3. Update State
        setLogo(publicUrl);

        // 4. (Opzional) Cache locally as base64 for offline? No, better relying on URL.
        // But we might want to trigger event for headers
        window.dispatchEvent(new Event(EVENT_KEY));

        resolve(publicUrl);

      } catch (err) {
        console.error('[LogoManager] Error uploading to Supabase:', err);
        reject(err);
      }
    });
  };

  const resetLogo = async () => {
    try {
      // Delete from Supabase
      const { error } = await supabase.storage.from(BUCKET_NAME).remove([LOGO_FILE_PATH]);
      if (error) console.error("Error removing from Supabase", error);

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
