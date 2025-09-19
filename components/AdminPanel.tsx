// FIX: Implemented the missing AdminPanel component for configuration management.
import React, { useState } from 'react';
import { AppConfig, Segment } from '../types';
import Accordion from './Accordion';

interface AdminPanelProps {
  config: AppConfig;
  onSave: (newConfig: AppConfig) => void;
  onClose: () => void;
}

// Helper type to get keys of T whose values are objects, to ensure type safety.
type ObjectConfigKeys<T> = {
  [K in keyof T]: T[K] extends object ? K : never;
}[keyof T];

const AdminPanel: React.FC<AdminPanelProps> = ({ config, onSave, onClose }) => {
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);

  // FIX: Made this function type-safe to prevent runtime errors when spreading config sections.
  // It now only accepts keys that correspond to object values in the AppConfig.
  const handleInputChange = <S extends ObjectConfigKeys<AppConfig>>(
    section: S,
    key: keyof AppConfig[S],
    value: AppConfig[S][keyof AppConfig[S]]
  ) => {
    setLocalConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };
  
  const handleQuestionChange = (segment: Segment, index: number, value: string) => {
    const newQuestions = [...localConfig.questions[segment]];
    newQuestions[index] = value;
    setLocalConfig(prev => ({
      ...prev,
      questions: {
        ...prev.questions,
        [segment]: newQuestions,
      },
    }));
  };

  // FIX: Refactored to use the type-safe handleInputChange, removing @ts-ignore comments.
  const renderInput = <S extends ObjectConfigKeys<AppConfig>>(
    section: S,
    key: keyof AppConfig[S],
    label: string,
    type = 'text'
  ) => (
    <div key={String(key)} className="mb-4">
      <label className="block text-gray-700 text-sm font-bold mb-2">{label}</label>
      <input
        type={type}
        value={localConfig[section][key] as string | number}
        onChange={e => {
            const val = type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
            handleInputChange(section, key, val as any);
        }}
        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
      />
    </div>
  );

  return (
    <div className="fixed top-0 left-0 w-full h-full bg-gray-900 bg-opacity-75 z-40 flex justify-center items-start pt-16 pb-16 overflow-y-auto">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-4xl text-black relative">
        <h2 className="text-3xl font-bold mb-6 text-gray-800">Painel de Administração</h2>
        <button onClick={onClose} className="absolute top-4 right-4 text-3xl font-bold text-gray-500 hover:text-gray-800">&times;</button>

        <Accordion title="1. Branding & Estilo">
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderInput('branding', 'logoUrl', 'URL do Logo')}
            {renderInput('branding', 'bgGradientTop', 'Cor Superior do Gradiente', 'color')}
            {renderInput('branding', 'bgGradientBottom', 'Cor Inferior do Gradiente', 'color')}
            {renderInput('branding', 'textColor', 'Cor do Texto', 'color')}
            {renderInput('branding', 'accentColor', 'Cor de Destaque', 'color')}
            {renderInput('branding', 'googleFontFamily', 'Fonte do Google Fonts')}
            {renderInput('branding', 'titleFontSizePx', 'Tamanho Fonte Título (px)', 'number')}
            {renderInput('branding', 'bodyFontSizePx', 'Tamanho Fonte Corpo (px)', 'number')}
          </div>
        </Accordion>

        <Accordion title="2. Conteúdo & Textos">
            <div className="p-4">
                {renderInput('content', 'headerTitle', 'Título Principal')}
                {renderInput('content', 'headerSubtitle', 'Subtítulo')}
                {renderInput('content', 'footerContent', 'Conteúdo do Rodapé')}
                <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-700">Textos dos Botões</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {renderInput('buttons', 'start', 'Começar')}
                    {renderInput('buttons', 'next', 'Avançar')}
                    {renderInput('buttons', 'results', 'Ver Resultados')}
                    {renderInput('buttons', 'no', 'Não')}
                    {renderInput('buttons', 'yes', 'Sim')}
                    {renderInput('buttons', 'submitLead', 'Enviar Lead')}
                </div>
            </div>
        </Accordion>
        
        <Accordion title="3. Perguntas do Quiz">
            <div className="p-4">
                {Object.keys(localConfig.questions).map(segment => (
                    <div key={segment} className="mb-6">
                        <h4 className="text-xl font-bold mb-2 text-gray-800">{segment}</h4>
                        {localConfig.questions[segment as Segment].map((q, index) => (
                            <input
                                key={index}
                                type="text"
                                value={q}
                                onChange={e => handleQuestionChange(segment as Segment, index, e.target.value)}
                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 mb-2"
                            />
                        ))}
                    </div>
                ))}
            </div>
        </Accordion>

        <Accordion title="4. Textos do Diagnóstico">
          <div className="p-4">
            {renderInput('diagnosisCopy', 'low', 'Diagnóstico - Urgência Baixa')}
            {renderInput('diagnosisCopy', 'medium', 'Diagnóstico - Urgência Moderada')}
            {renderInput('diagnosisCopy', 'high', 'Diagnóstico - Urgência Alta')}
            {renderInput('diagnosisCopy', 'conclusionDefault', 'Conclusão Padrão')}
          </div>
        </Accordion>

        <Accordion title="5. Integrações & IA">
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderInput('integrations', 'whatsappNumber', 'Número do WhatsApp')}
                {renderInput('integrations', 'webhookUrl', 'URL do Webhook (opcional)')}
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">Modelo de IA</label>
                    <input
                        type="text"
                        value={localConfig.ai.model}
                        onChange={e => handleInputChange('ai', 'model', e.target.value)}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    />
                </div>
                <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
                    <div className="flex items-center">
                        <input
                            id="aiEnabled"
                            type="checkbox"
                            checked={localConfig.ai.enabled}
                            onChange={e => handleInputChange('ai', 'enabled', e.target.checked)}
                            className="mr-2 h-5 w-5"
                        />
                        <label htmlFor="aiEnabled" className="text-gray-700 text-sm font-bold">Habilitar Análise por IA</label>
                    </div>
                     <div className="flex items-center">
                        <input
                            id="showPdfExport"
                            type="checkbox"
                            checked={localConfig.integrations.showPdfExport}
                            onChange={e => handleInputChange('integrations', 'showPdfExport', e.target.checked)}
                            className="mr-2 h-5 w-5"
                        />
                        <label htmlFor="showPdfExport" className="text-gray-700 text-sm font-bold">Mostrar Botão de Exportar PDF</label>
                    </div>
                </div>
            </div>
        </Accordion>
        
        <div className="mt-8 flex justify-end">
          <button onClick={onClose} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg mr-4 transition-colors">
            Cancelar
          </button>
          <button onClick={() => onSave(localConfig)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;