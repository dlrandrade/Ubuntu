import React, { useState, useCallback, useMemo } from 'react';
import { AppConfig, DiagnosisResult, Segment, ToastMessage } from '../types';
import { getAIDiagnosis } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';

// SVG Icon Components for titles
const SegmentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 8a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const QuestionIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ResultIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const StrengthsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 inline-block text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.085a2 2 0 00-1.736.99l-1.7 3.4M7 20h2.857a2 2 0 001.993-1.839l.5-2.5A2 2 0 0010.857 13H7M7 20V5" /></svg>;
const WeaknessesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 inline-block text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.738 3h4.017c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.085a2 2 0 001.736-.99l1.7-3.4M17 4h-2.857a2 2 0 00-1.993 1.839l-.5 2.5A2 2 0 0011.143 11H17M17 4v5" /></svg>;

// Lead Capture Modal Component defined within Quiz.tsx for simplicity
interface LeadCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (leadData: { name: string; email: string; phone: string }) => void;
  config: AppConfig;
}

const LeadCaptureModal: React.FC<LeadCaptureModalProps> = ({ isOpen, onClose, onSubmit, config }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; phone?: string }>({});

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: { name?: string; email?: string; phone?: string } = {};
    if (!name.trim()) newErrors.name = 'Nome é obrigatório.';
    if (!email.trim()) {
      newErrors.email = 'Email é obrigatório.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email inválido.';
    }
    if (!phone.trim()) newErrors.phone = 'Telefone é obrigatório.';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({ name, email, phone });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4 animate-fade-in">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/20 relative"
           style={{ background: `var(--bg-gradient-bottom)`, color: 'var(--text-color)' }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-3xl font-bold opacity-70 hover:opacity-100">&times;</button>
        <h3 className="text-2xl font-bold mb-6 text-center">Fale com um Consultor</h3>
        <p className="text-center mb-6 opacity-80">Preencha seus dados para enviarmos um resumo do seu diagnóstico via WhatsApp.</p>
        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-bold mb-2 opacity-90">Nome Completo</label>
            <input 
              type="text" 
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-white/10 p-3 rounded-lg border border-transparent focus:border-[var(--accent-color)] focus:outline-none transition-colors"
              required
            />
            {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
          </div>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-bold mb-2 opacity-90">Melhor Email</label>
            <input 
              type="email" 
              id="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-white/10 p-3 rounded-lg border border-transparent focus:border-[var(--accent-color)] focus:outline-none transition-colors"
              required
            />
            {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
          </div>
          <div className="mb-6">
            <label htmlFor="phone" className="block text-sm font-bold mb-2 opacity-90">Telefone (com DDD)</label>
            <input 
              type="tel" 
              id="phone"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full bg-white/10 p-3 rounded-lg border border-transparent focus:border-[var(--accent-color)] focus:outline-none transition-colors"
              required
            />
            {errors.phone && <p className="text-red-400 text-sm mt-1">{errors.phone}</p>}
          </div>
          <button 
            type="submit"
            className="w-full font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105"
            style={{ backgroundColor: 'var(--accent-color)', color: 'var(--bg-gradient-bottom)' }}
          >
            {config.buttons.submitLead}
          </button>
        </form>
      </div>
    </div>
  );
};


interface QuizProps {
  config: AppConfig;
  setToast: (toast: ToastMessage | null) => void;
}

const Quiz: React.FC<QuizProps> = ({ config, setToast }) => {
  const [step, setStep] = useState<'segment' | 'questions' | 'results'>('segment');
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);

  const questions = useMemo(() => selectedSegment ? config.questions[selectedSegment] : [], [selectedSegment, config.questions]);

  const calculateScore = useCallback(() => {
    const totalQuestions = questions.length;
    if (totalQuestions === 0) return 0;
    const weaknessCount = Object.values(answers).filter(Boolean).length;
    return (weaknessCount / totalQuestions) * 100;
  }, [answers, questions]);

  const getDiagnosisCopy = useCallback((score: number): Pick<DiagnosisResult, 'urgencyLevel' | 'urgencyDescription' | 'conclusion'> => {
    let urgencyLevel: string;
    let urgencyDescription: string;
    if (score < 33) {
      urgencyLevel = 'Baixa';
      urgencyDescription = config.diagnosisCopy.low;
    } else if (score < 66) {
      urgencyLevel = 'Moderada';
      urgencyDescription = config.diagnosisCopy.medium;
    } else {
      urgencyLevel = 'Alta';
      urgencyDescription = config.diagnosisCopy.high;
    }
    return {
      urgencyLevel,
      urgencyDescription,
      conclusion: config.diagnosisCopy.conclusionDefault,
    };
  }, [config.diagnosisCopy]);

  const handleSegmentSelect = useCallback((segment: Segment) => {
    setSelectedSegment(segment);
    setStep('questions');
  }, []);

  const handleAnswer = useCallback((answer: boolean) => {
    const newAnswers = { ...answers, [currentQuestionIndex]: answer };
    setAnswers(newAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      handleShowResults(newAnswers);
    }
  }, [answers, currentQuestionIndex, questions]);
  
  const handleShowResults = useCallback(async (finalAnswers: Record<number, boolean>) => {
      setIsLoading(true);
      setStep('results');

      const strengths = questions.filter((_, index) => !finalAnswers[index]);
      const weaknesses = questions.filter((_, index) => finalAnswers[index]);
      const score = calculateScore();
      const defaultDiagnosis = getDiagnosisCopy(score);

      let finalDiagnosis: DiagnosisResult = {
        ...defaultDiagnosis,
        strengths,
        weaknesses,
      };

      if (config.ai.enabled && selectedSegment) {
          const aiResult = await getAIDiagnosis(selectedSegment, strengths, weaknesses, config.ai.model);
          if (aiResult) {
              finalDiagnosis = { ...finalDiagnosis, ...aiResult };
          }
      }
      
      setDiagnosis(finalDiagnosis);
      setIsLoading(false);

  }, [questions, config.ai.enabled, config.ai.model, selectedSegment, calculateScore, getDiagnosisCopy]);

  const handleLeadSubmit = useCallback((leadData: { name: string; email: string; phone: string }) => {
    if (!diagnosis || !selectedSegment) return;

    const { name, email, phone } = leadData;

    const strengthsText = diagnosis.strengths.length > 0 
      ? diagnosis.strengths.map(s => `- ${s}`).join('\n')
      : 'Nenhum ponto forte explícito foi marcado.';
      
    const weaknessesText = diagnosis.weaknesses.length > 0
      ? diagnosis.weaknesses.map(w => `- ${w}`).join('\n')
      : 'Nenhuma fragilidade explícita foi marcada.';

    const message = `
Olá! Gostaria de falar com um consultor da Ubuntu.

*Resumo do Diagnóstico:*
*Nome:* ${name}
*Email:* ${email}
*Telefone:* ${phone}

*Segmento:* ${selectedSegment}
*Nível de Urgência:* ${diagnosis.urgencyLevel}

*Pontos Fortes:*
${strengthsText}

*Pontos de Atenção:*
${weaknessesText}
    `.trim().replace(/^ +/gm, '');

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${config.integrations.whatsappNumber.replace(/\D/g, '')}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    
    setIsLeadModalOpen(false);
    setToast({ id: Date.now(), message: 'Redirecionando para o WhatsApp!', type: 'success' });

  }, [diagnosis, selectedSegment, config.integrations.whatsappNumber, setToast]);


  const renderSegmentSelection = () => (
    <>
      <h2 className="text-center font-bold mb-4" style={{ fontSize: 'var(--title-font-size)' }}>
        {config.content.headerTitle}
      </h2>
      <p className="text-center mb-8 opacity-80">{config.content.headerSubtitle}</p>
      <div className="flex flex-col md:flex-row gap-4 justify-center">
        {(Object.keys(config.questions) as Segment[]).map(segment => (
          <button
            key={segment}
            onClick={() => handleSegmentSelect(segment)}
            className="font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105"
            style={{ backgroundColor: 'var(--accent-color)', color: 'var(--bg-gradient-bottom)' }}
          >
            {segment}
          </button>
        ))}
      </div>
    </>
  );

  const renderQuestions = () => {
    const progress = ((currentQuestionIndex) / questions.length) * 100;
    return (
      <div className="text-center">
        <h3 className="font-bold text-2xl mb-6 flex items-center justify-center">
            <QuestionIcon />
            Pergunta {currentQuestionIndex + 1} de {questions.length}
        </h3>
        <div className="w-full bg-white/20 rounded-full h-2.5 mb-6">
          <div className="h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: 'var(--accent-color)' }}></div>
        </div>
        <p className="text-xl md:text-2xl mb-8 min-h-[100px] flex items-center justify-center">{questions[currentQuestionIndex]}</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => handleAnswer(false)}
            className="font-bold py-3 px-8 rounded-lg bg-white/10 hover:bg-white/20 transition-colors w-32"
          >
            Não
          </button>
          <button
            onClick={() => handleAnswer(true)}
            className="font-bold py-3 px-8 rounded-lg transition-transform transform hover:scale-105 w-32"
            style={{ backgroundColor: 'var(--accent-color)', color: 'var(--bg-gradient-bottom)' }}
          >
            Sim
          </button>
        </div>
      </div>
    );
  };

  const renderResults = () => {
    if (!diagnosis) return <p>Ocorreu um erro ao gerar o diagnóstico.</p>;
    return (
      <div className="animate-fade-in">
        <h2 className="text-center font-bold mb-6 flex items-center justify-center" style={{ fontSize: 'var(--title-font-size)' }}>
            <ResultIcon />
            Seu Diagnóstico
        </h2>
        
        <div className="bg-white/10 p-6 rounded-lg mb-6 text-center">
            <h3 className="text-lg font-bold" style={{color: 'var(--accent-color)'}}>NÍVEL DE URGÊNCIA: {diagnosis.urgencyLevel.toUpperCase()}</h3>
            <p className="mt-2 opacity-90">{diagnosis.urgencyDescription}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white/5 p-4 rounded-lg">
                <h4 className="font-bold text-lg mb-3 flex items-center"><StrengthsIcon />Pontos Fortes</h4>
                <ul className="list-disc list-inside space-y-2 opacity-80">
                    {diagnosis.strengths.length > 0 ? diagnosis.strengths.map((s, i) => <li key={i}>{s}</li>) : <li>Nenhum ponto forte identificado.</li>}
                </ul>
            </div>
            <div className="bg-white/5 p-4 rounded-lg">
                <h4 className="font-bold text-lg mb-3 flex items-center"><WeaknessesIcon />Pontos de Atenção</h4>
                <ul className="list-disc list-inside space-y-2 opacity-80">
                     {diagnosis.weaknesses.length > 0 ? diagnosis.weaknesses.map((w, i) => <li key={i}>{w}</li>) : <li>Nenhuma fragilidade identificada.</li>}
                </ul>
            </div>
        </div>
        
        <div className="bg-black/20 p-6 rounded-lg text-center">
            <h3 className="font-bold text-xl mb-2">Próximos Passos</h3>
            <p className="opacity-90 mb-4">{diagnosis.conclusion}</p>
            <button
              onClick={() => setIsLeadModalOpen(true)}
              className="inline-block font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105"
              style={{ backgroundColor: 'var(--accent-color)', color: 'var(--bg-gradient-bottom)' }}
            >
              Falar com um Consultor
            </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-3xl bg-black/20 p-6 md:p-10 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-md">
      {isLoading && <div className="flex justify-center items-center min-h-[400px]"><LoadingSpinner /></div>}
      {!isLoading && step === 'segment' && renderSegmentSelection()}
      {!isLoading && step === 'questions' && renderQuestions()}
      {!isLoading && step === 'results' && renderResults()}
      <LeadCaptureModal 
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        onSubmit={handleLeadSubmit}
        config={config}
      />
    </div>
  );
};

export default Quiz;