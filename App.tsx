// FIX: Implemented the main App component to structure the application.
import React, { useState, useEffect, useCallback } from 'react';
import { DEFAULT_CONFIG } from './constants';
import { AppConfig, ToastMessage } from './types';
import Header from './components/Header';
import Footer from './components/Footer';
import Quiz from './components/Quiz';
import AdminPanel from './components/AdminPanel';
import Toast from './components/Toast';

// A simple modal for admin authentication, kept within App.tsx to avoid creating a new file.
const AdminAuthModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (password: string) => void;
}> = ({ isOpen, onClose, onSubmit }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      onSubmit(password);
      setPassword('');
      setError('');
    } else {
      setError('Código de acesso inválido.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm border border-white/20 relative"
           style={{ background: 'var(--bg-gradient-bottom)', color: 'var(--text-color)' }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-3xl font-bold opacity-70 hover:opacity-100">&times;</button>
        <h3 className="text-2xl font-bold mb-6 text-center">Acesso Restrito</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="admin-password" className="block text-sm font-bold mb-2 opacity-90">Código de Acesso</label>
            <input
              type="password"
              id="admin-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-white/10 p-3 rounded-lg border border-transparent focus:border-[var(--accent-color)] focus:outline-none transition-colors"
              required
            />
            {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
          </div>
          <button
            type="submit"
            className="w-full font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105"
            style={{ backgroundColor: 'var(--accent-color)', color: 'var(--bg-gradient-bottom)' }}
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
};


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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [quizKey, setQuizKey] = useState(0); // Key to force re-mounting the Quiz component

  useEffect(() => {
    document.documentElement.style.setProperty('--bg-gradient-top', config.branding.bgGradientTop);
    document.documentElement.style.setProperty('--bg-gradient-bottom', config.branding.bgGradientBottom);
    document.documentElement.style.setProperty('--text-color', config.branding.textColor);
    document.documentElement.style.setProperty('--accent-color', config.branding.accentColor);
    document.documentElement.style.setProperty('--title-font-size', `${config.branding.titleFontSizePx}px`);
    document.documentElement.style.setProperty('--body-font-size', `${config.branding.bodyFontSizePx}px`);
    
    const existingLink = document.querySelector(`link[href*="family=${config.branding.googleFontFamily.replace(/ /g, '+')}"]`);
    if (!existingLink) {
      const link = document.createElement('link');
      link.href = `https://fonts.googleapis.com/css2?family=${config.branding.googleFontFamily.replace(/ /g, '+')}:wght@400;700&display=swap`;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }

    document.body.style.fontFamily = `'${config.branding.googleFontFamily}', sans-serif`;

  }, [config.branding]);

  const handleAdminAuthSubmit = () => {
    setIsAuthModalOpen(false);
    setShowAdmin(true);
  };
  
  const handleAdminClose = () => {
    setShowAdmin(false);
  };

  const handleConfigSave = (newConfig: AppConfig) => {
    try {
      setConfig(newConfig);
      localStorage.setItem('appConfig', JSON.stringify(newConfig));
      setToast({ id: Date.now(), message: 'Configuração salva com sucesso!', type: 'success' });
      handleAdminClose();
    } catch (error) {
      console.error("Failed to save config to localStorage", error);
      setToast({ id: Date.now(), message: 'Erro ao salvar configuração.', type: 'error' });
    }
  };

  const restartQuiz = useCallback(() => {
    setQuizKey(prevKey => prevKey + 1);
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(to bottom, var(--bg-gradient-top), var(--bg-gradient-bottom))`, color: 'var(--text-color)', fontSize: 'var(--body-font-size)' }}>
      <Header onRestart={restartQuiz} branding={config.branding} onAdminClick={() => setIsAuthModalOpen(true)} />
      <main className="flex-grow container mx-auto px-4 py-12 flex items-center justify-center">
        <Quiz key={quizKey} config={config} setToast={setToast} />
      </main>
      {/* FIX: Passed config.content to Footer to make its text dynamic. */}
      <Footer content={config.content} />
      {showAdmin && (
        <AdminPanel
          config={config}
          onSave={handleConfigSave}
          onClose={handleAdminClose}
        />
      )}
      <AdminAuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSubmit={handleAdminAuthSubmit}
      />
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