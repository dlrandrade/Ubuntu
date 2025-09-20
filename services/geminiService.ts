import { GoogleGenAI } from "@google/genai";
import { Segment, DiagnosisResult, AIConfig } from '../types';

/**
 * Gets AI-powered diagnosis using the Google Gemini API. This function now runs in the browser.
 *
 * @param segment The user's selected segment.
 * @param strengths List of questions the user answered "Yes" to.
 * @param weaknesses List of questions the user answered "No" to.
 * @param aiConfig The AI configuration, including model and API key from the admin panel.
 * @returns A promise that resolves to a partial DiagnosisResult from the AI or null on error.
 */
export const getAIDiagnosis = async (
  segment: Segment,
  strengths: string[],
  weaknesses: string[],
  aiConfig: AIConfig,
): Promise<Partial<DiagnosisResult> | null> => {
    // This function now runs in the browser. The API key MUST be provided via the admin panel config.
    const apiKey = aiConfig.apiKey;

    if (!apiKey) {
        console.error("Gemini API key is missing. Please add it in the Admin Panel under 'Integrações & IA'.");
        return null; // Return null to allow fallback to default diagnosis
    }

    try {
        const ai = new GoogleGenAI({ apiKey });

        // A robust, single-prompt approach that combines system instructions and user data.
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
        
        // Robust JSON parsing to handle cases where the AI returns extra text or markdown.
        const textResponse = response.text;
        const startIndex = textResponse.indexOf('{');
        const endIndex = textResponse.lastIndexOf('}');

        if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
            console.error("AI response did not contain a valid JSON object.", { response: textResponse });
            return null;
        }

        const jsonString = textResponse.substring(startIndex, endIndex + 1);
        const result = JSON.parse(jsonString);

        return result as Partial<DiagnosisResult>;

    } catch (error) {
        console.error("Error calling Google Gemini API directly from client:", error);
        // Fallback to null to indicate failure, allowing the UI to use default copy.
        return null;
    }
};