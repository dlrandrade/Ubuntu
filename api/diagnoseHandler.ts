import { getAIDiagnosis } from '../services/geminiService';
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

  if (typeof apiKey !== 'string' || apiKey.trim() === '') {
    return {
      status: 400,
      body: { error: 'Chave da API Gemini não fornecida. Configure no painel administrativo.' },
    };
  }

  try {
    const diagnosisResult = await getAIDiagnosis(
      segment,
      strengths,
      weaknesses,
      model.trim(),
      apiKey.trim()
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
    console.error('Erro ao processar diagnóstico por IA:', error);
    return {
      status: 500,
      body: { error: 'Ocorreu um erro interno ao gerar o diagnóstico por IA.' },
    };
  }
};

export type { DiagnoseRequestBody };
