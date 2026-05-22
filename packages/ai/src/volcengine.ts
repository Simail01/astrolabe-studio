export interface VolcEngineConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface ImageGenerateOptions {
  prompt: string;
  model: string;
  size?: string;
  seed?: number;
  outputFormat?: string;
  watermark?: boolean;
}

export interface ImageToImageOptions {
  prompt: string;
  model: string;
  referenceImage: string;
  size?: string;
  outputFormat?: string;
  watermark?: boolean;
}

const DEFAULT_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';

interface ImageGenResponse {
  model: string;
  created: number;
  data: { url: string; size: string }[];
  usage: { generated_images: number; output_tokens: number; total_tokens: number };
}

export function createVolcEngineClient(config: VolcEngineConfig) {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;

  async function request(path: string, body: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`火山方舟 API 错误 (${response.status}): ${errText.slice(0, 200)}`);
    }

    return response.json();
  }

  return {
    /** 连通性测试 */
    async ping(): Promise<boolean> {
      try {
        await request('/images/generations', {
          model: 'doubao-seedream-5-0-260128',
          prompt: 'test',
          size: '1024x1024',
          output_format: 'png',
          watermark: false,
        });
        return true;
      } catch {
        return false;
      }
    },

    /** 文生图 */
    async generateImage(options: ImageGenerateOptions): Promise<string[]> {
      const body: Record<string, unknown> = {
        model: options.model,
        prompt: options.prompt,
        size: options.size ?? '1024x1024',
        output_format: options.outputFormat ?? 'png',
        watermark: options.watermark ?? false,
      };

      if (options.seed) body.seed = options.seed;

      const data = await request('/images/generations', body) as ImageGenResponse;
      return data.data.map((img) => img.url);
    },

    /** 图生图 */
    async imageToImage(options: ImageToImageOptions): Promise<string[]> {
      const body: Record<string, unknown> = {
        model: options.model,
        prompt: options.prompt,
        image: options.referenceImage,
        size: options.size ?? '1024x1024',
        output_format: options.outputFormat ?? 'png',
        watermark: options.watermark ?? false,
      };

      const data = await request('/images/generations', body) as ImageGenResponse;
      return data.data.map((img) => img.url);
    },
  };
}
