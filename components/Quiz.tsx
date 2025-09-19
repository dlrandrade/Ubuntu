// FIX: Implemented the missing Quiz component to manage the application's core diagnostic flow.
import React, { useState, useEffect } from 'react';
import { AppConfig, Segment, ToastMessage, DiagnosisResult } from '../types';
import { getAIDiagnosis } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';

interface QuizProps {
  config: AppConfig;
  setToast: (toast: ToastMessage | null) => void;
}

type QuizStage = 'welcome' | 'segment' | 'questioning' | 'loading' | 'results' | 'lead' | 'thanks';

const Quiz: React.FC<QuizProps> = ({ config, setToast }) => {
  const [stage, setStage] = useState<QuizStage>('welcome');
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
  const [leadData, setLeadData] = useState({ name: '', email: '', phone: '', company: '' });

  const questions = selectedSegment ? config.questions[selectedSegment] : [];

  useEffect(() => {
    // Reset state if config changes (e.g., via admin panel)
    setStage('welcome');
    setSelectedSegment(null);
    setAnswers([]);
    setCurrentQuestionIndex(0);
    setDiagnosisResult(null);
  }, [config]);

  const handleStart = () => setStage('segment');

  const handleSegmentSelect = (segment: Segment) => {
    setSelectedSegment(segment);
    setStage('questioning');
  };

  const handleAnswer = (answer: boolean) => {
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setStage('loading');
      processResults(newAnswers);
    }
  };

  const processResults = async (finalAnswers: boolean[]) => {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    questions.forEach((q, i) => {
        // Assuming 'Yes' (true) is a strength and 'No' (false) is a weakness for positively framed questions.
        if (finalAnswers[i]) {
            strengths.push(q);
        } else {
            weaknesses.push(q);
        }
    });

    let aiResult: Partial<DiagnosisResult> | null = null;
    if (config.ai.enabled && selectedSegment) {
        try {
            aiResult = await getAIDiagnosis(selectedSegment, strengths, weaknesses, config.ai.model);
        } catch (error) {
            console.error("AI Diagnosis failed:", error);
            setToast({ id: Date.now(), message: 'Falha ao obter diagnóstico da IA. Usando valores padrão.', type: 'error' });
        }
    }
    
    const score = weaknesses.length;
    let urgencyDescription = config.diagnosisCopy.low;
    if (score > 3 && score <= 7) {
      urgencyDescription = config.diagnosisCopy.medium;
    } else if (score > 7) {
      urgencyDescription = config.diagnosisCopy.high;
    }

    setDiagnosisResult({
        urgencyLevel: aiResult?.urgencyLevel || (score > 7 ? 'Alta' : score > 3 ? 'Moderada' : 'Baixa'),
        urgencyDescription: aiResult?.urgencyDescription || urgencyDescription,
        conclusion: aiResult?.conclusion || config.diagnosisCopy.conclusionDefault,
        strengths,
        weaknesses,
    });

    setStage('results');
  };

  const handleLeadFormToggle = (show: boolean) => {
    if (show) {
      setStage('lead');
    } else {
      setStage('thanks');
    }
  };
  
  const handleLeadSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const payload = {
          ...leadData,
          segment: selectedSegment,
          ...diagnosisResult,
      };
      
      if (config.integrations.webhookUrl) {
          try {
              const response = await fetch(config.integrations.webhookUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
              });
              if (!response.ok) throw new Error('Network response was not ok.');
              setToast({ id: Date.now(), message: 'Informações enviadas com sucesso!', type: 'success' });
          } catch (error) {
              console.error("Webhook failed:", error);
              setToast({ id: Date.now(), message: 'Falha ao enviar informações. Tente novamente.', type: 'error' });
              return; // Don't proceed to next stage if webhook fails
          }
      }
      
      const strengthsText = diagnosisResult?.strengths.length > 0 
          ? diagnosisResult.strengths.map(s => `- ${s}`).join('\n') 
          : 'Nenhum';
      
      const weaknessesText = diagnosisResult?.weaknesses.length > 0
          ? diagnosisResult.weaknesses.map(w => `- ${w}`).join('\n')
          : 'Nenhum';

      const whatsappMessage = `Olá! Gostaria de saber mais sobre a consultoria de D&I.

*Meu Diagnóstico (${selectedSegment}):*
- Nível de Urgência: ${diagnosisResult?.urgencyLevel}

*Contato:*
- Nome: ${leadData.name}
- E-mail: ${leadData.email}
- Telefone: ${leadData.phone || 'Não informado'}
- Empresa: ${leadData.company || 'Não informada'}

*Resumo das minhas respostas:*

*Pontos Fortes (Respondi 'Sim'):*
${strengthsText}

*Pontos de Melhoria (Respondi 'Não'):*
${weaknessesText}
`;

      window.open(`https://wa.me/${config.integrations.whatsappNumber}?text=${encodeURIComponent(whatsappMessage.trim())}`, '_blank');
      setStage('thanks');
  };

  const renderWelcome = () => (
    <div className="text-center max-w-3xl">
      <h1 style={{ fontSize: 'var(--title-font-size)' }} className="font-bold mb-4">{config.content.headerTitle}</h1>
      <p className="mx-auto mb-8 opacity-90">{config.content.headerSubtitle}</p>
      <button onClick={handleStart} className="font-bold py-3 px-8 rounded-lg transition-transform transform hover:scale-105" style={{ backgroundColor: 'var(--accent-color)', color: 'var(--bg-gradient-bottom)' }}>
        {config.buttons.start}
      </button>
    </div>
  );
  
  const renderSegmentSelection = () => (
    <div className="text-center">
      <h2 className="text-2xl font-bold mb-6">Para quem é este diagnóstico?</h2>
      <div className="flex flex-col md:flex-row gap-4">
        {(Object.keys(config.questions) as Segment[]).map(seg => (
          <button key={seg} onClick={() => handleSegmentSelect(seg)} className="font-bold py-3 px-8 rounded-lg transition-transform transform hover:scale-105 border-2 border-[var(--accent-color)] hover:bg-[var(--accent-color)] hover:text-[var(--bg-gradient-bottom)]">
            {seg}
          </button>
        ))}
      </div>
    </div>
  );
  
  const renderQuestioning = () => {
    const progress = ((currentQuestionIndex) / questions.length) * 100;
    return (
      <div className="w-full max-w-2xl text-center">
         <div className="w-full bg-white/20 rounded-full h-2.5 mb-6">
            <div className="bg-[var(--accent-color)] h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
        </div>
        <p className="mb-2 text-sm opacity-80">Pergunta {currentQuestionIndex + 1} de {questions.length}</p>
        <h2 className="text-2xl font-bold mb-8 min-h-[6rem] flex items-center justify-center">{questions[currentQuestionIndex]}</h2>
        <div className="flex justify-center gap-4">
          <button onClick={() => handleAnswer(true)} className="font-bold py-3 px-8 rounded-lg transition-transform transform hover:scale-105 border-2 border-[var(--accent-color)] hover:bg-green-500 hover:border-green-500">Sim</button>
          <button onClick={() => handleAnswer(false)} className="font-bold py-3 px-8 rounded-lg transition-transform transform hover:scale-105 border-2 border-[var(--accent-color)] hover:bg-red-500 hover:border-red-500">Não</button>
        </div>
      </div>
    );
  };

  const renderLoading = () => (
    <div className="text-center">
      <LoadingSpinner />
      <p className="mt-4 animate-pulse">Analisando suas respostas...</p>
    </div>
  );

  const renderResults = () => {
      if (!diagnosisResult) return null;
      return (
          <div className="w-full max-w-3xl bg-white/5 p-8 rounded-lg animate-fade-in">
              <h2 className="text-3xl font-bold mb-2 text-center" style={{color: 'var(--accent-color)'}}>Seu Diagnóstico está Pronto!</h2>
              <p className="text-center text-xl mb-6"><strong className="font-bold">Nível de Urgência:</strong> {diagnosisResult.urgencyLevel}</p>
              <p className="text-center mb-8">{diagnosisResult.urgencyDescription}</p>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div>
                      <h3 className="text-xl font-bold mb-3 text-green-400">Pontos Fortes</h3>
                      <ul className="list-disc list-inside space-y-1">
                          {diagnosisResult.strengths.length > 0 ? diagnosisResult.strengths.map((s, i) => <li key={i}>{s}</li>) : <li>Nenhum ponto forte identificado.</li>}
                      </ul>
                  </div>
                  <div>
                      <h3 className="text-xl font-bold mb-3 text-red-400">Pontos de Melhoria</h3>
                      <ul className="list-disc list-inside space-y-1">
                          {diagnosisResult.weaknesses.length > 0 ? diagnosisResult.weaknesses.map((w, i) => <li key={i}>{w}</li>) : <li>Nenhuma fragilidade identificada.</li>}
                      </ul>
                  </div>
              </div>
              
              <div className="bg-white/10 p-4 rounded-md text-center">
                <p className="font-semibold mb-4">{diagnosisResult.conclusion}</p>
                <p>Podemos ajudar a traçar os próximos passos. Deseja falar com um especialista?</p>
                <div className="flex justify-center gap-4 mt-4">
                    <button onClick={() => handleLeadFormToggle(true)} className="font-bold py-2 px-6 rounded-lg transition-transform transform hover:scale-105" style={{ backgroundColor: 'var(--accent-color)', color: 'var(--bg-gradient-bottom)' }}>{config.buttons.yes}</button>
                    <button onClick={() => handleLeadFormToggle(false)} className="font-bold py-2 px-6 rounded-lg transition-transform transform hover:scale-105 border-2 border-white/50">{config.buttons.no}</button>
                </div>
              </div>
          </div>
      );
  };

  const renderLeadForm = () => (
      <div className="w-full max-w-md bg-white/5 p-8 rounded-lg animate-fade-in">
          <h2 className="text-2xl font-bold mb-6 text-center">Fale com um Consultor</h2>
          <form onSubmit={handleLeadSubmit}>
              <div className="mb-4">
                  <input type="text" placeholder="Seu Nome" value={leadData.name} onChange={e => setLeadData({...leadData, name: e.target.value})} className="w-full bg-white/10 p-3 rounded-lg border border-transparent focus:border-[var(--accent-color)] focus:outline-none transition-colors" required />
              </div>
              <div className="mb-4">
                  <input type="email" placeholder="Seu E-mail" value={leadData.email} onChange={e => setLeadData({...leadData, email: e.target.value})} className="w-full bg-white/10 p-3 rounded-lg border border-transparent focus:border-[var(--accent-color)] focus:outline-none transition-colors" required />
              </div>
               <div className="mb-4">
                  <input type="tel" placeholder="Seu Telefone (opcional)" value={leadData.phone} onChange={e => setLeadData({...leadData, phone: e.target.value})} className="w-full bg-white/10 p-3 rounded-lg border border-transparent focus:border-[var(--accent-color)] focus:outline-none transition-colors" />
              </div>
              <div className="mb-6">
                  <input type="text" placeholder="Sua Empresa (opcional)" value={leadData.company} onChange={e => setLeadData({...leadData, company: e.target.value})} className="w-full bg-white/10 p-3 rounded-lg border border-transparent focus:border-[var(--accent-color)] focus:outline-none transition-colors" />
              </div>
              <button type="submit" className="w-full font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105" style={{ backgroundColor: 'var(--accent-color)', color: 'var(--bg-gradient-bottom)' }}>
                  {config.buttons.submitLead}
              </button>
          </form>
      </div>
  );

  const renderThanks = () => (
      <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Obrigado!</h2>
          <p>Agradecemos seu interesse. Seus dados foram enviados.</p>
      </div>
  );


  switch (stage) {
    case 'welcome':
      return renderWelcome();
    case 'segment':
      return renderSegmentSelection();
    case 'questioning':
      return renderQuestioning();
    case 'loading':
      return renderLoading();
    case 'results':
      return renderResults();
    case 'lead':
        return renderLeadForm();
    case 'thanks':
        return renderThanks();
    default:
      return renderWelcome();
  }
};

export default Quiz;