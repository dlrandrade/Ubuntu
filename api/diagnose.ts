import { runDiagnosis } from './diagnoseHandler';

// Usando tipos genéricos, pois os tipos específicos da Vercel podem não estar disponíveis neste ambiente.
// O tempo de execução da Vercel fornecerá objetos de requisição e resposta devidamente tipados.
export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const { status, body } = await runDiagnosis(req.body ?? {});
        return res.status(status).json(body);

    } catch (error) {
        console.error('Erro no manipulador /api/diagnose:', error);
        return res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
    }
}
