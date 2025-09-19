// FIX: Implemented the main App component to structure the application.
import React, { useState, useEffect, useCallback } from 'react';
import { DEFAULT_CONFIG } from './constants';
import { AppConfig, ToastMessage } from './types';
import Header from './components/Header';
import Footer from './components/Footer';
import Quiz from './components/Quiz';
import AdminPanel from './components/AdminPanel';
import Toast from './components/Toast';

const App: React.FC = () => {
  const [config, setConfig] = useState<AppConfig>(() => {
    try {
      const savedConfig = localStorage.getItem('appConfig');
      return savedConfig ? JSON.parse(savedConfig) : DEFAULT_CONFIG;
    } catch (error) {
      console.error("Failed to parse config from localStorage", error);
      return DEFAULT_CONFIG;
    }
  });
  
  const [showAdmin, setShowAdmin] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    const handleHashChange = () => {
      setShowAdmin(window.location.hash === '#admin123');
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Check on initial load
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--bg-gradient-top', config.branding.bgGradientTop);
    document.documentElement.style.setProperty('--bg-gradient-bottom', config.branding.bgGradientBottom);
    document.documentElement.style.setProperty('--text-color', config.branding.textColor);
    document.documentElement.style.setProperty('--accent-color', config.branding.accentColor);
    document.documentElement.style.setProperty('--title-font-size', `${config.branding.titleFontSizePx}px`);
    document.documentElement.style.setProperty('--body-font-size', `${config.branding.bodyFontSizePx}px`);
    
    // Dynamically load Google Font
    const existingLink = document.querySelector(`link[href*="family=${config.branding.googleFontFamily.replace(/ /g, '+')}"]`);
    if (!existingLink) {
      const link = document.createElement('link');
      link.href = `https://fonts.googleapis.com/css2?family=${config.branding.googleFontFamily.replace(/ /g, '+')}:wght@400;700&display=swap`;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }

    document.body.style.fontFamily = `'${config.branding.googleFontFamily}', sans-serif`;

  }, [config.branding]);

  const handleAdminClose = () => {
    window.location.hash = '';
  };

  const handleConfigSave = (newConfig: AppConfig) => {
    try {
      setConfig(newConfig);
      localStorage.setItem('appConfig', JSON.stringify(newConfig));
      setToast({ id: Date.now(), message: 'Configuração salva com sucesso!', type: 'success' });
      handleAdminClose(); // Close admin panel
    } catch (error) {
      console.error("Failed to save config to localStorage", error);
      setToast({ id: Date.now(), message: 'Erro ao salvar configuração.', type: 'error' });
    }
  };

  const restartApp = useCallback(() => {
    window.location.href = window.location.pathname;
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(to bottom, var(--bg-gradient-top), var(--bg-gradient-bottom))`, color: 'var(--text-color)', fontSize: 'var(--body-font-size)' }}>
      <Header onRestart={restartApp} branding={config.branding} />
      <main className="flex-grow container mx-auto px-4 py-12 flex items-center justify-center">
        <Quiz config={config} setToast={setToast} />
      </main>
      <Footer />
      {showAdmin && (
        <AdminPanel
          config={config}
          onSave={handleConfigSave}
          onClose={handleAdminClose}
        />
      )}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default App;