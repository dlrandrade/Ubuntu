<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1aGPGKItYdhXQZ8fiM-qJqPzGE_LMSdor

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Ajuste as credenciais de IA se desejar: o projeto já vem pré-configurado com o modelo gratuito da DeepSeek (`deepseek/deepseek-chat`) e com a chave OpenRouter `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` preenchida no painel administrativo. Substitua pelos seus valores antes de publicar em produção ou defina `OPENROUTER_API_KEY` em [.env.local](.env.local).
3. Run the app:
   `npm run dev`
