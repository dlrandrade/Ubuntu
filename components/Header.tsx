import React from 'react';
import { AppConfig } from '../types';

interface HeaderProps {
    onRestart: () => void;
    branding: AppConfig['branding'];
}

const Header: React.FC<HeaderProps> = ({ onRestart, branding }) => {
    return (
        <header className="w-full" style={{ background: 'var(--bg-gradient-top)' }}>
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                <img 
                    src={branding.logoUrl} 
                    alt="Ubuntu Consultoria Logo" 
                    className="h-10 w-auto cursor-pointer"
                    onClick={onRestart}
                />
                <nav className="flex items-center gap-4">
                    <button 
                        onClick={onRestart}
                        className="font-bold px-4 py-2 rounded-md hover:bg-white/10 transition-colors"
                        style={{ color: 'var(--text-color)'}}
                    >
                        Início
                    </button>
                    <a 
                        href="#admin123"
                        className="font-bold px-4 py-2 rounded-md transition-colors"
                        style={{ backgroundColor: 'var(--accent-color)', color: 'var(--bg-gradient-bottom)' }}
                    >
                        Admin
                    </a>
                </nav>
            </div>
        </header>
    );
};

export default Header;