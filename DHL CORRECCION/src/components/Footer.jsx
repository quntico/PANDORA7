import React from 'react';
import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="mt-auto relative z-10">
      <div className="max-w-[1600px] mx-auto px-6 py-1.5 border-t border-cyan-500/20 bg-[#0F172A]/90 backdrop-blur-xl relative z-10 w-full">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2.5 mb-0.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
                <span className="text-base font-bold text-white">P</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                PANDORA
              </span>
            </div>
            <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
              Plataforma avanzada de análisis financiero y toma de decisiones para evaluación de proyectos.
              Potenciada por inteligencia artificial para resultados precisos.
            </p>
          </div>

          <div>
            <h3 className="text-[11px] font-bold text-white uppercase tracking-wider mb-1">Enlaces Rápidos</h3>
            <div className="space-y-0.5">
              <Link to="/" className="block text-sm text-gray-400 hover:text-cyan-400 transition-colors">
                Acerca de
              </Link>
              <Link to="/analysis" className="block text-sm text-gray-400 hover:text-cyan-400 transition-colors">
                Documentación
              </Link>
              <Link to="/dashboard" className="block text-sm text-gray-400 hover:text-cyan-400 transition-colors">
                Contacto
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-[11px] font-bold text-white uppercase tracking-wider mb-1">Legal</h3>
            <div className="space-y-0.5">
              <Link to="/" className="block text-sm text-gray-400 hover:text-cyan-400 transition-colors">
                Política de Privacidad
              </Link>
              <Link to="/" className="block text-sm text-gray-400 hover:text-cyan-400 transition-colors">
                Términos de Servicio
              </Link>
              <Link to="/" className="block text-sm text-gray-400 hover:text-cyan-400 transition-colors">
                Seguridad
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-1">
          <p className="text-xs text-gray-500">
            © 2026 PANDORA. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span>v1.0.0</span>
            <span>•</span>
            <span>Modo Seguro</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
