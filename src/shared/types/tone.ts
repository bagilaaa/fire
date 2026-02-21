/** Результат AI-анализа тональности */
export interface ToneResult {
  sentiment: string;
  priority: number;
  language: string;
  type?: string;
  summary?: string;
  recommendation?: string;
}
