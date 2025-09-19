import { GoogleGenAI, Type } from '@google/genai';
import { Segment, DiagnosisResult } from '../types';

const REQUEST_TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;

export type GeminiErrorCode = 'CONFIGURATION' | 'REQUEST' | 'TIMEOUT' | 'PARSING';

export class GeminiServiceError extends Error {
  public readonly code: GeminiErrorCode;

  constructor(message: string, code: GeminiErrorCode, options?: { cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = 'GeminiServiceError';
    this.code = code;
  }
}

const runWithTimeout = async <T>(promise: Promise<T>): Promise<T> => {
  let timeoutHandle: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(
        new GeminiServiceError(
          'Tempo limite excedido ao tentar gerar o diagnóstico com a IA. Tente novamente em instantes.',
          'TIMEOUT'
        )
      );
    }, REQUEST_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeoutPromise]) as T;
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const buildPrompt = (segment: Segment, strengths: string[], weaknesses: string[]) => {
  const systemPrompt = `
Você é um especialista em Diversidade e Inclusão (D&I) da consultoria Ubuntu. Sua missão é analisar as respostas de um questionário de autodiagnóstico e fornecer um retorno claro, preciso e que eleve a consciência do usuário, incentivando-o a buscar ajuda especializada.
Sua tarefa é gerar um diagnóstico. O tom deve ser profissional, empático e direto, sem jargões.
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

  return { systemPrompt, userPrompt };
};

const parseGeminiResponse = (raw: string): Partial<DiagnosisResult> => {
  try {
    const parsed = JSON.parse(raw) as Partial<DiagnosisResult>;

    if (
      typeof parsed.urgencyLevel !== 'string' ||
      typeof parsed.urgencyDescription !== 'string' ||
      typeof parsed.conclusion !== 'string'
    ) {
      throw new GeminiServiceError(
        'A resposta da IA não retornou os campos obrigatórios (urgencyLevel, urgencyDescription, conclusion).',
        'PARSING'
      );
    }

    return parsed;
  } catch (error) {
    if (error instanceof GeminiServiceError) {
      throw error;
    }

    throw new GeminiServiceError(
      'Falha ao interpretar a resposta JSON enviada pela IA.',
      'PARSING',
      { cause: error }
    );
  }
};

export const getAIDiagnosis = async (
  segment: Segment,
  strengths: string[],
  weaknesses: string[],
  model: string,
  apiKey: string
): Promise<Partial<DiagnosisResult>> => {
  const sanitizedKey = apiKey.trim();
  if (!sanitizedKey) {
    throw new GeminiServiceError(
      'Chave da API Google Gemini ausente. Configure o segredo para liberar o diagnóstico inteligente.',
      'CONFIGURATION'
    );
  }

  const sanitizedModel = model.trim();
  if (!sanitizedModel) {
    throw new GeminiServiceError(
      'Modelo da IA não informado. Verifique as configurações administrativas.',
      'CONFIGURATION'
    );
  }

  const { systemPrompt, userPrompt } = buildPrompt(segment, strengths, weaknesses);
  const ai = new GoogleGenAI({ apiKey: sanitizedKey });

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await runWithTimeout(
        ai.models.generateContent({
          model: sanitizedModel,
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }],
            },
          ],
          config: {
            systemInstruction: [{ text: systemPrompt }],
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                urgencyLevel: {
                  type: Type.STRING,
                  description:
                    'Classifique a urgência em uma única palavra: "Baixa", "Moderada" ou "Alta".',
                },
                urgencyDescription: {
                  type: Type.STRING,
                  description:
                    'Crie uma frase impactante (máximo 25 palavras) que conecte os "Pontos de Melhoria" a uma consequência real para o segmento.',
                },
                conclusion: {
                  type: Type.STRING,
                  description:
                    'Elabore um parágrafo curto (máximo 50 palavras) validando o diagnóstico e convidando para um plano de ação estratégico.',
                },
              },
              required: ['urgencyLevel', 'urgencyDescription', 'conclusion'],
            },
          },
        })
      );

      const jsonText = response.text?.trim();
      if (!jsonText) {
        throw new GeminiServiceError(
          'A IA respondeu sem conteúdo utilizável. Tente novamente em instantes.',
          'PARSING'
        );
      }

      return parseGeminiResponse(jsonText);
    } catch (error) {
      lastError = error;

      if (error instanceof GeminiServiceError) {
        // Não repetir tentativas para erros de configuração ou parsing.
        if (error.code === 'CONFIGURATION' || error.code === 'PARSING') {
          throw error;
        }

        if (attempt === MAX_RETRIES) {
          throw error;
        }
      } else if (attempt === MAX_RETRIES) {
        throw new GeminiServiceError(
          'Falha inesperada ao acionar o serviço de IA.',
          'REQUEST',
          { cause: error }
        );
      }

      // Pequeno atraso exponencial para dar tempo em casos de limite ou instabilidade momentânea.
      await wait(300 * attempt);
    }
  }

  throw new GeminiServiceError(
    'Não foi possível gerar o diagnóstico inteligente após múltiplas tentativas.',
    'REQUEST',
    { cause: lastError }
  );
};