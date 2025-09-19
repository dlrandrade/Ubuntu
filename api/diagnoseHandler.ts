import { getAIDiagnosis, GeminiServiceError, GeminiErrorCode } from '../services/geminiService';
import { Segment } from '../types';

type DiagnoseRequestBody = {
  segment?: Segment;
  strengths?: unknown;
  weaknesses?: unknown;
  model?: string;
  apiKey?: string;
};

type DiagnoseResponse = {
  status: number;
  body: Record<string, unknown>;
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(item => typeof item === 'string');

const SEGMENTS: Segment[] = ['Pessoa', 'Empresa', 'Escola'];

const isSegment = (value: unknown): value is Segment =>
  typeof value === 'string' && SEGMENTS.includes(value as Segment);

const GEMINI_ERROR_STATUS: Record<GeminiErrorCode, number> = {
  CONFIGURATION: 500,
  REQUEST: 503,
  TIMEOUT: 504,
  PARSING: 502,
};

const resolveApiKey = (incoming?: string): string | null => {
  if (typeof incoming === 'string' && incoming.trim()) {
    return incoming.trim();
  }

  const envCandidates = [process.env.GEMINI_API_KEY, process.env.API_KEY];
  for (const candidate of envCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
};

export const runDiagnosis = async (payload: DiagnoseRequestBody): Promise<DiagnoseResponse> => {
  const { segment, strengths, weaknesses, model, apiKey } = payload;

  if (!isSegment(segment)) {
    return {
      status: 400,
      body: { error: 'Segmento inválido ou ausente na requisição.' },
    };
  }

  if (!isStringArray(strengths) || !isStringArray(weaknesses)) {
    return {
      status: 400,
      body: { error: 'Pontos fortes ou fragilidades inválidos. Esperado um array de strings.' },
    };
  }

  if (typeof model !== 'string' || model.trim() === '') {
    return {
      status: 400,
      body: { error: 'Modelo de IA inválido ou ausente na requisição.' },
    };
  }

  const resolvedApiKey = resolveApiKey(apiKey);
  if (!resolvedApiKey) {
    console.error('Chave da Gemini ausente. Configure GEMINI_API_KEY nas variáveis de ambiente ou informe pelo painel.');
    return {
      status: 500,
      body: {
        error:
          'Chave da API Gemini não configurada. Configure o segredo no painel administrativo ou como variável de ambiente GEMINI_API_KEY.',
      },
    };
  }

  try {
    const diagnosisResult = await getAIDiagnosis(
      segment,
      strengths,
      weaknesses,
      model.trim(),
      resolvedApiKey
    );

    if (diagnosisResult) {
      return {
        status: 200,
        body: diagnosisResult as Record<string, unknown>,
      };
    }

    return {
      status: 502,
      body: { error: 'O serviço de IA falhou ao gerar um diagnóstico.' },
    };
  } catch (error) {
    const context = {
      segment,
      strengthsCount: Array.isArray(strengths) ? strengths.length : undefined,
      weaknessesCount: Array.isArray(weaknesses) ? weaknesses.length : undefined,
    };

    if (error instanceof GeminiServiceError) {
      console.error('Falha ao gerar diagnóstico inteligente.', {
        ...context,
        code: error.code,
        message: error.message,
        cause: error.cause,
      });

      return {
        status: GEMINI_ERROR_STATUS[error.code] ?? 500,
        body: { error: error.message },
      };
    }

    console.error('Erro inesperado ao processar diagnóstico por IA:', { ...context, error });
    return {
      status: 500,
      body: { error: 'Ocorreu um erro interno ao gerar o diagnóstico por IA.' },
    };
  }
};

export type { DiagnoseRequestBody };
