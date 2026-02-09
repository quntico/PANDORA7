
import { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import axios from 'axios';

// Configure PDF.js worker
// We use a CDN to avoid complex build configuration for the worker in a pure frontend environment
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

export function useDocumentParser() {
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState(null);

  const parsePdf = async (file) => {
    setIsParsing(true);
    setError(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n\n';
      }

      return {
        type: 'pdf',
        content: fullText,
        meta: {
          filename: file.name,
          pages: pdf.numPages
        }
      };
    } catch (err) {
      console.error('PDF parsing error:', err);
      setError('Error al leer el archivo PDF. Asegúrate de que no esté corrupto o protegido con contraseña.');
      throw err;
    } finally {
      setIsParsing(false);
    }
  };

  const parseImage = async (file) => {
    setIsParsing(true);
    setError(null);
    try {
      const result = await Tesseract.recognize(file, 'eng+spa', {
        logger: m => console.log(m) // Optional: log progress
      });
      
      return {
        type: 'image',
        content: result.data.text,
        meta: {
          filename: file.name,
          confidence: result.data.confidence
        }
      };
    } catch (err) {
      console.error('OCR error:', err);
      setError('Error al procesar la imagen. Intenta con una imagen más clara.');
      throw err;
    } finally {
      setIsParsing(false);
    }
  };

  const parseUrl = async (url) => {
    setIsParsing(true);
    setError(null);
    try {
      // NOTE: Direct URL fetching often fails due to CORS in frontend-only apps.
      // In a real production app, this would go through a proxy server.
      // We will attempt a fetch, but handle the likely failure gracefully.
      const response = await axios.get(url);
      
      // Basic HTML stripping (very naive)
      const text = response.data.replace(/<[^>]*>?/gm, '');

      return {
        type: 'url',
        content: text.substring(0, 5000), // Limit content length
        meta: {
          url: url
        }
      };
    } catch (err) {
      console.error('URL parsing error:', err);
      setError('No se pudo acceder a la URL (posible bloqueo CORS). Intenta copiar y pegar el texto manualmente.');
      throw err;
    } finally {
      setIsParsing(false);
    }
  };

  return {
    parsePdf,
    parseImage,
    parseUrl,
    isParsing,
    error
  };
}
