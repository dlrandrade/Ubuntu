// FIX: Added complete type definitions for the application.
export type Segment = 'Pessoa' | 'Empresa' | 'Escola';

export interface BrandingConfig {
  logoUrl: string;
  bgGradientTop: string;
  bgGradientBottom: string;
  textColor: string;
  accentColor: string;
  googleFontFamily: string;
  titleFontSizePx: number;
  bodyFontSizePx: number;
}

export interface ContentConfig {
  headerTitle: string;
  headerSubtitle: string;
  footerContent: string;
}

export interface ButtonsConfig {
  start: string;
  next: string;
  results: string;
  no: string;
  yes: string;
  submitLead: string;
}

export interface IntegrationsConfig {
  whatsappNumber: string;
  webhookUrl: string;
  showPdfExport: boolean;
}

export type QuestionsConfig = Record<Segment, string[]>;

export interface DiagnosisCopyConfig {
  low: string;
  medium: string;
  high: string;
  conclusionDefault: string;
}

export interface AIConfig {
  enabled: boolean;
  model: string;
  openRouterApiKey: string;
}

export interface AppConfig {
  branding: BrandingConfig;
  content: ContentConfig;
  buttons: ButtonsConfig;
  integrations: IntegrationsConfig;
  questions: QuestionsConfig;
  diagnosisCopy: DiagnosisCopyConfig;
  ai: AIConfig;
  version: string;
}

export interface DiagnosisResult {
  urgencyLevel: string;
  urgencyDescription: string;
  conclusion: string;
  strengths: string[];
  weaknesses: string[];
  source: 'AI' | 'Padrão';
}

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error';
}
