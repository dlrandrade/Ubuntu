import { getAIDiagnosis } from '../services/geminiService';
import { Segment, AIConfig } from '../types';

// Usando tipos genéricos, pois os tipos específicos da Vercel podem não estar disponíveis neste ambiente.
// O tempo de execução da Vercel fornecerá objetos de requisição e resposta devidamente tipados.
export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const { segment, strengths, weaknesses, aiConfig } = req.body;

        // Validação básica
        if (!segment || !Array.isArray(strengths) || !Array.isArray(weaknesses) || !aiConfig) {
            return res.status(400).json({ error: 'Parâmetros ausentes ou inválidos no corpo da requisição.' });
        }

        const diagnosisResult = await getAIDiagnosis(
            segment as Segment,
            strengths as string[],
            weaknesses as string[],
            aiConfig as AIConfig
        );

        if (diagnosisResult) {
            return res.status(200).json(diagnosisResult);
        } else {
            return res.status(500).json({ error: 'O serviço de IA falhou ao gerar um diagnóstico.' });
        }

    } catch (error) {
        console.error('Erro no manipulador /api/diagnose:', error);
        return res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
    }
}