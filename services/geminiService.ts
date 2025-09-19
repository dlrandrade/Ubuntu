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
      Você é um especialista em Diversidade e Inclusão (D&I) da consultoria Ubuntu. Sua missão é analisar as respostas de um questionário de autodiagnóstico e fornecer um retorno claro, preciso e que eleve a consciência do usuário, incentivando-o a buscar ajuda especializada.

      **Contexto do Diagnóstico:**
      - Segmento: "${segment}"
      - Pontos Fortes (onde o usuário respondeu 'Sim' para a afirmação):
      ${strengths.length > 0 ? strengths.map(s => `- ${s}`).join('\n') : 'Nenhum'}
      - Pontos de Melhoria (onde o usuário respondeu 'Não' para a afirmação):
      ${weaknesses.length > 0 ? weaknesses.map(w => `- ${w}`).join('\n') : 'Nenhum'}

      **Sua Tarefa:**
      Gere um diagnóstico em formato JSON, seguindo estritamente o schema abaixo. O tom deve ser profissional, empático e direto, sem jargões.

      **Instruções para cada campo do JSON:**
      - "urgencyLevel": Classifique a urgência em uma única palavra: "Baixa", "Moderada" ou "Alta".
      - "urgencyDescription": Crie uma frase impactante (máximo 25 palavras) que conecte os "Pontos de Melhoria" a uma consequência real para o segmento. Exemplo: "As fragilidades apontadas podem estar impactando a inovação e o sentimento de pertencimento da sua equipe." Seja preciso.
      - "conclusion": Elabore um parágrafo curto e persuasivo (máximo 50 palavras). Valide o passo importante que o usuário deu ao fazer o diagnóstico e explique como a consultoria pode transformar esses dados em um plano de ação estratégico. O objetivo é motivar o contato.
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