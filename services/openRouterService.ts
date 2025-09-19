import { Segment, DiagnosisResult } from '../types';

const REQUEST_TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;
const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

export type OpenRouterErrorCode = 'CONFIGURATION' | 'REQUEST' | 'TIMEOUT' | 'PARSING';

export class OpenRouterServiceError extends Error {
  public readonly code: OpenRouterErrorCode;

  constructor(message: string, code: OpenRouterErrorCode, options?: { cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = 'OpenRouterServiceError';
    this.code = code;
  }
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithTimeout = async (
  input: Parameters<typeof fetch>[0],
  init: Parameters<typeof fetch>[1] = {}
) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new OpenRouterServiceError(
        'Tempo limite excedido ao tentar gerar o diagnóstico com a IA. Tente novamente em instantes.',
        'TIMEOUT',
        { cause: error }
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

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

const extractMessageContent = (payload: unknown): string => {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  const maybeChoices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(maybeChoices) || maybeChoices.length === 0) {
    return '';
  }

  const [firstChoice] = maybeChoices;
  if (!firstChoice || typeof firstChoice !== 'object') {
    return '';
  }

  const message = (firstChoice as { message?: unknown }).message;
  if (!message || typeof message !== 'object') {
    return '';
  }

  const content = (message as { content?: unknown }).content;

  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const combined = content
      .map(part => {
        if (typeof part === 'string') {
          return part;
        }
        if (part && typeof part === 'object' && 'text' in part) {
          const value = (part as { text?: unknown }).text;
          return typeof value === 'string' ? value : '';
        }
        return '';
      })
      .filter(Boolean)
      .join('\n')
      .trim();

    if (combined) {
      return combined;
    }
  }

  if (content && typeof content === 'object' && 'text' in content) {
    const value = (content as { text?: unknown }).text;
    if (typeof value === 'string') {
      return value.trim();
    }
  }

  return '';
};

const parseOpenRouterResponse = (payload: unknown): Partial<DiagnosisResult> => {
  const rawContent = extractMessageContent(payload);

  if (!rawContent) {
    throw new OpenRouterServiceError(
      'A IA respondeu sem conteúdo utilizável. Tente novamente em instantes.',
      'PARSING'
    );
  }

  try {
    const parsed = JSON.parse(rawContent) as Partial<DiagnosisResult>;

    if (
      typeof parsed.urgencyLevel !== 'string' ||
      typeof parsed.urgencyDescription !== 'string' ||
      typeof parsed.conclusion !== 'string'
    ) {
      throw new OpenRouterServiceError(
        'A resposta da IA não retornou os campos obrigatórios (urgencyLevel, urgencyDescription, conclusion).',
        'PARSING'
      );
    }

    return parsed;
  } catch (error) {
    if (error instanceof OpenRouterServiceError) {
      throw error;
    }

    throw new OpenRouterServiceError(
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
    throw new OpenRouterServiceError(
      'Chave da API OpenRouter ausente. Configure o segredo para liberar o diagnóstico inteligente.',
      'CONFIGURATION'
    );
  }

  const sanitizedModel = model.trim();
  if (!sanitizedModel) {
    throw new OpenRouterServiceError(
      'Modelo da IA não informado. Verifique as configurações administrativas.',
      'CONFIGURATION'
    );
  }

  const { systemPrompt, userPrompt } = buildPrompt(segment, strengths, weaknesses);

  const requestBody = {
    model: sanitizedModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'diagnosis_response',
        schema: {
          type: 'object',
          properties: {
            urgencyLevel: {
              type: 'string',
              description: 'Classifique a urgência em uma única palavra: "Baixa", "Moderada" ou "Alta".',
            },
            urgencyDescription: {
              type: 'string',
              description:
                'Crie uma frase impactante (máximo 25 palavras) que conecte os "Pontos de Melhoria" a uma consequência real para o segmento.',
            },
            conclusion: {
              type: 'string',
              description:
                'Elabore um parágrafo curto (máximo 50 palavras) validando o diagnóstico e convidando para um plano de ação estratégico.',
            },
          },
          required: ['urgencyLevel', 'urgencyDescription', 'conclusion'],
          additionalProperties: false,
        },
      },
    },
  };

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(OPENROUTER_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sanitizedKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://ubuntu-diagnostico.vercel.app',
          'X-Title': 'Ubuntu Diagnóstico IA',
        },
        body: JSON.stringify(requestBody),
      });

      const rawBody = await response.text();

      let parsedBody: unknown;
      try {
        parsedBody = rawBody ? JSON.parse(rawBody) : null;
      } catch (parseError) {
        throw new OpenRouterServiceError(
          'Falha ao interpretar a resposta enviada pela OpenRouter.',
          'PARSING',
          { cause: rawBody || parseError }
        );
      }

      if (!response.ok) {
        const parsedObject = parsedBody && typeof parsedBody === 'object' ? (parsedBody as Record<string, unknown>) : null;
        const errorMessage =
          (parsedObject?.error && typeof parsedObject.error === 'string' && parsedObject.error) ||
          (parsedObject?.message && typeof parsedObject.message === 'string' && parsedObject.message) ||
          (rawBody ? rawBody : `A OpenRouter retornou o status ${response.status}.`);

        throw new OpenRouterServiceError(errorMessage, 'REQUEST', { cause: parsedBody ?? rawBody });
      }

      return parseOpenRouterResponse(parsedBody);
    } catch (error) {
      lastError = error;

      if (error instanceof OpenRouterServiceError) {
        if (error.code === 'CONFIGURATION' || error.code === 'PARSING') {
          throw error;
        }

        if (attempt === MAX_RETRIES) {
          throw error;
        }
      } else if (error instanceof Error && error.name === 'AbortError') {
        if (attempt === MAX_RETRIES) {
          throw new OpenRouterServiceError(
            'Tempo limite excedido ao tentar gerar o diagnóstico com a IA. Tente novamente em instantes.',
            'TIMEOUT',
            { cause: error }
          );
        }
      } else if (attempt === MAX_RETRIES) {
        throw new OpenRouterServiceError(
          'Falha inesperada ao acionar o serviço de IA.',
          'REQUEST',
          { cause: error }
        );
      }

      await wait(300 * attempt);
    }
  }

  throw new OpenRouterServiceError(
    'Não foi possível gerar o diagnóstico inteligente após múltiplas tentativas.',
    'REQUEST',
    { cause: lastError }
  );
};
