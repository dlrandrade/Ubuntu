// FIX: Implemented the missing Quiz component to manage the application's core diagnostic flow.
import React, { useState, useEffect } from 'react';
import { AppConfig, Segment, ToastMessage, DiagnosisResult } from '../types';
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
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null);
  const [leadData, setLeadData] = useState({ name: '', email: '', phone: '', company: '' });

  const questions = selectedSegment ? config.questions[selectedSegment] : [];

  useEffect(() => {
    // Reset state if config changes (e.g., via admin panel)
    setStage('welcome');
    setSelectedSegment(null);
    setAnswers([]);
    setCurrentQuestionIndex(0);
    setDiagnosisResult(null);
    setAiErrorMessage(null);
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
        if (finalAnswers[i]) {
            strengths.push(q);
        } else {
            weaknesses.push(q);
        }
    });

    setAiErrorMessage(null);

    // AI-First Path: Always try to get AI diagnosis if enabled.
    const apiKey = config.ai.apiKey.trim();

    if (config.ai.enabled && selectedSegment) {
        setAiErrorMessage(null);
        try {
            const response = await fetch('/api/diagnose', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    segment: selectedSegment,
                    strengths,
                    weaknesses,
                    model: config.ai.model,
                    apiKey: apiKey || undefined,
                }),
            });

            const rawBody = await response.text();
            let parsedBody: unknown = null;
            if (rawBody) {
                try {
                    parsedBody = JSON.parse(rawBody);
                } catch (parseError) {
                    console.warn('Falha ao analisar o corpo retornado pela IA.', parseError);
                }
            }

            if (!response.ok) {
                const serverMessage =
                    parsedBody && typeof parsedBody === 'object' && 'error' in parsedBody && typeof (parsedBody as any).error === 'string'
                        ? (parsedBody as any).error
                        : `A requisição da API falhou com o status ${response.status}`;
                throw new Error(serverMessage);
            }

            const aiResult = parsedBody as Partial<DiagnosisResult> | null;

            // Ensure the AI result is valid before using it
            if (aiResult && aiResult.urgencyLevel && aiResult.urgencyDescription && aiResult.conclusion) {
                 setDiagnosisResult({
                    ...aiResult,
                    urgencyLevel: aiResult.urgencyLevel,
                    urgencyDescription: aiResult.urgencyDescription,
                    conclusion: aiResult.conclusion,
                    strengths,
                    weaknesses,
                    source: 'AI',
                });
                setStage('results');
                return; // Success, exit the function
            }
             // If response is OK but content is malformed, fall through to default
            console.warn("AI response was successful but malformed. Using fallback.");
            const invalidMessage = 'Resposta da IA inválida. Usando análise padrão.';
            setToast({ id: Date.now(), message: invalidMessage, type: 'error' });
            setAiErrorMessage(invalidMessage);

        } catch (error) {
            const fallbackMessage =
                error instanceof Error
                    ? error.message
                    : 'Falha ao obter diagnóstico da IA. Usando análise padrão.';
            console.error("Erro ao chamar a API de diagnóstico:", error);
            setToast({ id: Date.now(), message: fallbackMessage, type: 'error' });
            setAiErrorMessage(fallbackMessage);
            // Let execution continue to the fallback logic below
        }
    }

    // Fallback Path: Executed if AI is disabled or the API call fails.
    const getStandardDiagnosis = (): DiagnosisResult => {
        const score = weaknesses.length;
        let urgencyLevel: string;
        let urgencyDescription: string;

        if (score > 7) {
            urgencyLevel = 'Alta';
            urgencyDescription = config.diagnosisCopy.high;
        } else if (score > 3) {
            urgencyLevel = 'Moderada';
            urgencyDescription = config.diagnosisCopy.medium;
        } else {
            urgencyLevel = 'Baixa';
            urgencyDescription = config.diagnosisCopy.low;
        }

        return {
            urgencyLevel,
            urgencyDescription,
            conclusion: config.diagnosisCopy.conclusionDefault,
            strengths,
            weaknesses,
            source: 'Padrão',
        };
    };

    setDiagnosisResult(getStandardDiagnosis());
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

    const handleExportPdf = () => {
        if (!diagnosisResult || !selectedSegment) return;

        // Use jsPDF from the window object loaded via CDN
        const { jsPDF } = (window as any).jspdf;
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

        const { urgencyLevel, urgencyDescription, strengths, weaknesses, conclusion, source } = diagnosisResult;
        
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        let y = 30;

        const checkPageBreak = (heightNeeded: number) => {
            if (y + heightNeeded > pageHeight - margin) {
                doc.addPage();
                y = margin;
            }
        };

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text('Relatório de Diagnóstico', pageWidth / 2, 20, { align: 'center' });
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.text(`Segmento: ${selectedSegment}`, pageWidth / 2, y, { align: 'center' });
        y += 15;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Nível de Urgência:', margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(urgencyLevel, margin + 45, y);
        y += 10;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Análise:', margin, y);
        y += 7;
        doc.setFont('helvetica', 'normal');
        const descLines = doc.splitTextToSize(urgencyDescription, pageWidth - (margin * 2));
        doc.text(descLines, margin, y);
        y += descLines.length * 5 + 5;

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(34, 139, 34);
        doc.text('Pontos Fortes', margin, y);
        y += 7;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        if (strengths.length > 0) {
            strengths.forEach(strength => {
                const lines = doc.splitTextToSize(`• ${strength}`, pageWidth - (margin * 2) - 5);
                checkPageBreak(lines.length * 5);
                doc.text(lines, margin + 5, y);
                y += lines.length * 5;
            });
        } else {
            doc.text('Nenhum ponto forte identificado.', margin + 5, y); y += 5;
        }
        y += 10;

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 20, 60);
        doc.text('Pontos de Melhoria', margin, y);
        y += 7;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        if (weaknesses.length > 0) {
            weaknesses.forEach(weakness => {
                const lines = doc.splitTextToSize(`• ${weakness}`, pageWidth - (margin * 2) - 5);
                checkPageBreak(lines.length * 5);
                doc.text(lines, margin + 5, y);
                y += lines.length * 5;
            });
        } else {
            doc.text('Nenhuma fragilidade identificada.', margin + 5, y); y += 5;
        }
        y += 10;

        doc.setFont('helvetica', 'bold');
        doc.text('Conclusão e Próximos Passos', margin, y);
        y += 7;
        doc.setFont('helvetica', 'normal');
        const conclusionLines = doc.splitTextToSize(conclusion, pageWidth - (margin * 2));
        checkPageBreak(conclusionLines.length * 5);
        doc.text(conclusionLines, margin, y);
        
        doc.setFontSize(10);
        doc.text(`Análise por: ${source}`, pageWidth / 2, pageHeight - 15, { align: 'center' });

        doc.save(`Diagnostico_DI_${selectedSegment}.pdf`);
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
              {aiErrorMessage && diagnosisResult.source === 'Padrão' && (
                  <div className="mb-6 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm text-yellow-100">
                      {aiErrorMessage}
                  </div>
              )}
              <div className="text-center mb-4">
                <h2 className="text-3xl font-bold inline-flex items-center" style={{color: 'var(--accent-color)'}}>
                    Seu Diagnóstico está Pronto!
                </h2>
                <span className={`ml-3 text-xs font-bold px-2.5 py-1 rounded-full align-middle ${
                    diagnosisResult.source === 'AI' 
                    ? 'bg-green-500/20 text-green-300 border border-green-500' 
                    : 'bg-gray-500/20 text-gray-300 border border-gray-500'
                }`}>
                    {diagnosisResult.source === 'AI' ? 'Análise por IA' : 'Análise Padrão'}
                </span>
              </div>
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
                {config.integrations.showPdfExport && (
                    <div className="mt-6 border-t border-white/20 pt-4">
                        <button
                            onClick={handleExportPdf}
                            className="font-semibold text-sm opacity-80 hover:opacity-100 hover:text-[var(--accent-color)] transition-colors"
                            aria-label="Exportar resultados para PDF"
                        >
                            Exportar para PDF
                        </button>
                    </div>
                )}
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