export interface PromptLogEntry {
  id: string;
  timestamp: string;
  type: 'text' | 'stream' | 'image';
  model: string;
  prompt: string;
  systemPrompt: string;
  result: string;
  duration: number;
  success: boolean;
  error?: string;
  stage?: string;
}
