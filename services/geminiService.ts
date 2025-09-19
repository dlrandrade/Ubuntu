// FIX: Replaced mock implementation with a direct call to the Gemini API using @google/genai SDK.
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { Segment, DiagnosisResult } from '../types';

// This function is intended to run in an environment where process.env.API_KEY is available.
const getGenAI = () => {
  // The API key MUST be obtained exclusively from the environment variable `process.env.API_KEY`.
  if (!process.env.API_KEY) {
    console.error("API_KEY environment variable not set.");
    throw new Error("API_KEY environment variable not set.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Gets AI-powered diagnosis using the Gemini API.
 *
 * @param segment The user's selected segment.
 * @param strengths List of questions the user did not mark.
 * @param weaknesses List of questions the user marked.
 * @param model The AI model to be used.
 * @returns A promise that resolves to a partial DiagnosisResult from the AI or null on error.
 */
export const getAIDiagnosis = async (
  segment: Segment,
  strengths: string[],
  weaknesses: string[],
  model: string
): Promise<Partial<DiagnosisResult> | null> => {
  try {
    const ai = getGenAI();

    const prompt = `
      Você é um especialista em Diversidade e Inclusão (D&I) da consultoria Ubuntu.
      Analise os resultados de um questionário de autodiagnóstico para o segmento "${segment}".
      
      Pontos Fortes (respostas "Não" para problemas):
      ${strengths.length > 0 ? strengths.map(s => `- ${s}`).join('\n') : 'Nenhum ponto forte explícito foi marcado.'}

      Fragilidades (respostas "Sim" para problemas):
      ${weaknesses.length > 0 ? weaknesses.map(w => `- ${w}`).join('\n') : 'Nenhuma fragilidade explícita foi marcada.'}

      Com base APENAS nas informações fornecidas, gere um diagnóstico conciso e acionável.
      Responda em formato JSON, seguindo estritamente o schema abaixo.

      Seja profissional, encorajador e evite jargões excessivos.
      A conclusão deve sempre sugerir o contato com um especialista para um plano de ação detalhado.

      O JSON deve ter os seguintes campos:
      - "urgencyLevel": Uma única palavra para o nível de urgência (e.g., "Baixa", "Moderada", "Alta").
      - "urgencyDescription": Uma frase curta (máximo 25 palavras) explicando o porquê do nível de urgência, baseado nos pontos fracos.
      - "conclusion": Um parágrafo curto (máximo 50 palavras) resumindo a situação e recomendando o próximo passo (falar com um consultor).
    `;
    
    // As per guidelines, using ai.models.generateContent
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model, // Using model from config
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                urgencyLevel: { type: Type.STRING },
                urgencyDescription: { type: Type.STRING },
                conclusion: { type: Type.STRING }
            },
            required: ["urgencyLevel", "urgencyDescription", "conclusion"]
        }
      }
    });

    // Per guidelines, use response.text
    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);

    return result as Partial<DiagnosisResult>;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    // Fallback to null to indicate failure, allowing the UI to use default copy.
    return null;
  }
};
