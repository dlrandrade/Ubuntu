// FIX: Implemented the missing Header component.
import React from 'react';
import { BrandingConfig } from '../types';

interface HeaderProps {
  branding: BrandingConfig;
  onRestart: () => void;
  onAdminClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ branding, onRestart, onAdminClick }) => {
  return (
    <header className="container mx-auto px-4 py-6">
      <nav className="flex flex-wrap justify-center md:justify-between items-center gap-4">
        {/* Logo: Centered on mobile (due to flex-wrap and full width), middle on desktop */}
        <div className="w-full md:w-auto md:flex-grow-0 md:flex-shrink-0 md:order-2">
           <div className="flex justify-center">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="Logo" className="h-12 w-auto object-contain" />
            ) : (
              <span className="text-2xl font-bold">Diagnóstico D&I</span>
            )}
          </div>
        </div>

        {/* Left Menu Item */}
        <div className="md:flex-grow md:order-1">
          <button
            onClick={onRestart}
            className="font-bold opacity-80 hover:opacity-100 hover:text-[var(--accent-color)] transition-all"
            aria-label="Reiniciar diagnóstico"
          >
            Início
          </button>
        </div>

        {/* Right Menu Item */}
        <div className="md:flex-grow md:text-right md:order-3">
          <button
            onClick={onAdminClick}
            className="font-bold opacity-80 hover:opacity-100 hover:text-[var(--accent-color)] transition-all"
            aria-label="Painel de Administração"
          >
            Admin
          </button>
        </div>
      </nav>
    </header>
  );
};

export default Header;