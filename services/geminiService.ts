import { GoogleGenAI, Type } from "@google/genai";
import { Segment, DiagnosisResult } from '../types';

/**
 * Gets AI-powered diagnosis using the Google Gemini API.
 *
 * @param segment The user's selected segment.
 * @param strengths List of questions the user answered "Yes" to.
 * @param weaknesses List of questions the user answered "No" to.
 * @param model The AI model to be used (e.g., 'gemini-2.5-flash').
 * @param apiKey Gemini API key provided via the admin panel.
 * @returns A promise that resolves to a partial DiagnosisResult from the AI or null on error.
 */
export const getAIDiagnosis = async (
  segment: Segment,
  strengths: string[],
  weaknesses: string[],
  model: string,
  apiKey: string
): Promise<Partial<DiagnosisResult> | null> => {
    const sanitizedKey = apiKey.trim();
    if (!sanitizedKey) {
        console.error("Google Gemini API key missing from request payload. Falling back to default diagnosis.");
        return null; // Return null to allow fallback to default diagnosis
    }

    try {
        const ai = new GoogleGenAI({ apiKey: sanitizedKey });

        const systemPrompt = `
          Você é um especialista em Diversidade e Inclusão (D&I) da consultoria Ubuntu. Sua missão é analisar as respostas de um questionário de autodiagnóstico e fornecer um retorno claro, preciso e que eleve a consciência do usuário, incentivando-o a buscar ajuda especializada.
          Sua Tarefa é gerar um diagnóstico. O tom deve ser profissional, empático e direto, sem jargões.
          Siga estritamente o schema JSON fornecido. Sua resposta DEVE ser apenas o objeto JSON.
        `.trim();

        const userPrompt = `
          **Contexto do Diagnóstico:**
          - Segmento: "${segment}"
          - Pontos Fortes (onde o usuário respondeu 'Sim' para a afirmação):
          ${strengths.length > 0 ? strengths.map(s => `- ${s}`).join('\n') : 'Nenhum'}
          - Pontos de Melhoria (onde o usuário respondeu 'Não' para a afirmação):
          ${weaknesses.length > 0 ? weaknesses.map(w => `- ${w}`).join('\n') : 'Nenhum'}
        `.trim();

        const response = await ai.models.generateContent({
            model: model,
            contents: userPrompt,
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        urgencyLevel: {
                            type: Type.STRING,
                            description: 'Classifique a urgência em uma única palavra: "Baixa", "Moderada" ou "Alta".'
                        },
                        urgencyDescription: {
                            type: Type.STRING,
                            description: 'Crie uma frase impactante (máximo 25 palavras) que conecte os "Pontos de Melhoria" a uma consequência real para o segmento. Exemplo: "As fragilidades apontadas podem estar impactando a inovação e o sentimento de pertencimento da sua equipe." Seja preciso.'
                        },
                        conclusion: {
                            type: Type.STRING,
                            description: 'Elabore um parágrafo curto e persuasivo (máximo 50 palavras). Valide o passo importante que o usuário deu ao fazer o diagnóstico e explique como a consultoria pode transformar esses dados em um plano de ação estratégico. O objetivo é motivar o contato.'
                        }
                    },
                    required: ["urgencyLevel", "urgencyDescription", "conclusion"]
                }
            }
        });
        
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);

        return result as Partial<DiagnosisResult>;

    } catch (error) {
        console.error("Error calling Google Gemini API:", error);
        // Fallback to null to indicate failure, allowing the UI to use default copy.
        return null;
    }
};