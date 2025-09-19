// FIX: Switched AI provider from Google Gemini to OpenRouter for broader model compatibility.
import { Segment, DiagnosisResult } from '../types';

/**
 * Gets AI-powered diagnosis using the OpenRouter API (OpenAI compatible).
 *
 * @param segment The user's selected segment.
 * @param strengths List of questions the user did not mark.
 * @param weaknesses List of questions the user marked.
 * @param model The AI model to be used (e.g., 'openai/gpt-oss-120b:free').
 * @returns A promise that resolves to a partial DiagnosisResult from the AI or null on error.
 */
export const getAIDiagnosis = async (
  segment: Segment,
  strengths: string[],
  weaknesses: string[],
  model: string
): Promise<Partial<DiagnosisResult> | null> => {
  // The API key MUST be obtained exclusively from the environment variable `process.env.API_KEY`.
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY environment variable not set for OpenRouter.");
    return null; // Return null instead of throwing to allow fallback
  }

  const systemPrompt = `
    Você é um especialista em Diversidade e Inclusão (D&I) da consultoria Ubuntu. Sua missão é analisar as respostas de um questionário de autodiagnóstico e fornecer um retorno claro, preciso e que eleve a consciência do usuário, incentivando-o a buscar ajuda especializada.
    Sua Tarefa é gerar um diagnóstico em formato JSON. O tom deve ser profissional, empático e direto, sem jargões.
    O JSON deve conter os seguintes campos:
    - "urgencyLevel": Classifique a urgência em uma única palavra: "Baixa", "Moderada" ou "Alta".
    - "urgencyDescription": Crie uma frase impactante (máximo 25 palavras) que conecte os "Pontos de Melhoria" a uma consequência real para o segmento. Exemplo: "As fragilidades apontadas podem estar impactando a inovação e o sentimento de pertencimento da sua equipe." Seja preciso.
    - "conclusion": Elabore um parágrafo curto e persuasivo (máximo 50 palavras). Valide o passo importante que o usuário deu ao fazer o diagnóstico e explique como a consultoria pode transformar esses dados em um plano de ação estratégico. O objetivo é motivar o contato.
    Responda APENAS com o objeto JSON. Não inclua markdown, texto extra ou explicações.
  `.trim();

  const userPrompt = `
    **Contexto do Diagnóstico:**
    - Segmento: "${segment}"
    - Pontos Fortes (onde o usuário respondeu 'Sim' para a afirmação):
    ${strengths.length > 0 ? strengths.map(s => `- ${s}`).join('\n') : 'Nenhum'}
    - Pontos de Melhoria (onde o usuário respondeu 'Não' para a afirmação):
    ${weaknesses.length > 0 ? weaknesses.map(w => `- ${w}`).join('\n') : 'Nenhum'}
  `.trim();

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        // It's good practice to identify your app to OpenRouter
        'HTTP-Referer': 'https://ubuntu-quest-di.vercel.app', // Replace with your actual site URL
        'X-Title': 'Ubuntu Quest D&I',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        // Ask for a JSON response, compatible with many models
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`OpenRouter API error: ${response.status} ${response.statusText}`, errorBody);
        throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!data.choices || data.choices.length === 0 || !data.choices[0].message?.content) {
        console.error("Invalid response structure from OpenRouter API:", data);
        throw new Error("Invalid response structure from API.");
    }

    const jsonText = data.choices[0].message.content;
    const result = JSON.parse(jsonText);

    return result as Partial<DiagnosisResult>;

  } catch (error) {
    console.error("Error calling OpenRouter API:", error);
    // Fallback to null to indicate failure, allowing the UI to use default copy.
    return null;
  }
};