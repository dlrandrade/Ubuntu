import { GoogleGenAI } from "@google/genai";
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

        // A robust, single-prompt approach that combines system instructions and user data.
        // This method avoids potential issues with newer, more complex config parameters like `systemInstruction` and `responseSchema`.
        const combinedPrompt = `
          Você é um especialista sênior em Diversidade e Inclusão (D&I) da consultoria Ubuntu. Sua tarefa é analisar as respostas de um questionário e gerar um objeto JSON.

          **Regras Estritas de Saída:**
          - Sua resposta DEVE ser APENAS o objeto JSON, sem formatação markdown como \`\`\`json.
          - Não inclua comentários ou qualquer texto antes ou depois do JSON.
          - O JSON deve ter EXATAMENTE as seguintes chaves: "urgencyLevel", "urgencyDescription", "conclusion".

          **Definições das Chaves JSON:**
          1. "urgencyLevel": Classifique a urgência em uma única palavra: "Baixa", "Moderada" ou "Alta".
          2. "urgencyDescription": Crie uma frase impactante (máximo 25 palavras) que conecte os "Pontos de Melhoria" a uma consequência real para o segmento. Exemplo: "As fragilidades apontadas podem estar impactando a inovação e o sentimento de pertencimento da sua equipe." Seja preciso.
          3. "conclusion": Elabore um parágrafo curto e persuasivo (máximo 50 palavras). Valide o passo importante que o usuário deu e explique como a consultoria pode transformar esses dados em um plano de ação estratégico.

          **Dados para Análise:**
          - Segmento: "${segment}"
          - Pontos Fortes (Respostas 'Sim'):
          ${strengths.length > 0 ? strengths.map(s => `- ${s}`).join('\n') : 'Nenhum'}
          - Pontos de Melhoria (Respostas 'Não'):
          ${weaknesses.length > 0 ? weaknesses.map(w => `- ${w}`).join('\n') : 'Nenhum'}

          Agora, gere o objeto JSON com base nos dados fornecidos.
        `.trim();

        const response = await ai.models.generateContent({
            model: aiConfig.model,
            contents: combinedPrompt,
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