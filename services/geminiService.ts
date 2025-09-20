import { GoogleGenAI, Type } from "@google/genai";
import { Segment, DiagnosisResult, AIConfig } from '../types';

/**
 * Gets AI-powered diagnosis using the Google Gemini API.
 *
 * @param segment The user's selected segment.
 * @param strengths List of questions the user answered "Yes" to.
 * @param weaknesses List of questions the user answered "No" to.
 * @param aiConfig The AI configuration, including model and optional API key.
 * @returns A promise that resolves to a partial DiagnosisResult from the AI or null on error.
 */
export const getAIDiagnosis = async (
  segment: Segment,
  strengths: string[],
  weaknesses: string[],
  aiConfig: AIConfig,
): Promise<Partial<DiagnosisResult> | null> => {
    // Prioritize API key from config, but fall back to environment variable for security.
    const apiKey = aiConfig.apiKey || process.env.API_KEY;

    if (!apiKey) {
        console.error("API_KEY not found in config or environment variables for Google Gemini API.");
        return null; // Return null to allow fallback to default diagnosis
    }

    try {
        const ai = new GoogleGenAI({ apiKey });

        const systemPrompt = `
          Você é um especialista sênior em Diversidade e Inclusão (D&I) da consultoria Ubuntu, com vasta experiência em diagnósticos organizacionais.
          Sua tarefa é analisar as respostas de um questionário de autodiagnóstico e gerar um JSON com um parecer técnico, porém acessível.
          O tom deve ser profissional, empático e direto, evitando jargões corporativos.
          O objetivo principal é elevar a consciência do usuário sobre a importância dos pontos levantados e motivá-lo a buscar ajuda especializada para criar um plano de ação.
          Siga estritamente o schema JSON fornecido. Sua resposta DEVE ser apenas o objeto JSON, sem nenhum texto ou formatação adicional como \`\`\`json.
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
            model: aiConfig.model,
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