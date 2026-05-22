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
  sequentialImageGeneration?: string;
  responseFormat?: string;
  stream?: boolean;
}

export interface ImageToImageOptions {
  prompt: string;
  model: string;
  referenceImage: string;
  size?: string;
  outputFormat?: string;
  watermark?: boolean;
  sequentialImageGeneration?: string;
  responseFormat?: string;
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

  function buildBody(options: ImageGenerateOptions | ImageToImageOptions): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: options.model,
      prompt: options.prompt,
      size: options.size ?? '2K',
      sequential_image_generation: options.sequentialImageGeneration ?? 'disabled',
      response_format: options.responseFormat ?? 'url',
      stream: false,
      watermark: options.watermark ?? true,
    };

    if ('referenceImage' in options && options.referenceImage) {
      body.image = options.referenceImage;
    }
    if ('seed' in options && options.seed) {
      body.seed = options.seed;
    }

    return body;
  }

  return {
    /** 连通性测试：返回 { ok, error? } */
    async ping(): Promise<{ ok: boolean; error?: string }> {
      try {
        await request('/images/generations', {
          model: 'doubao-seedream-5-0-260128',
          prompt: 'test',
          size: '1024x1024',
          sequential_image_generation: 'disabled',
          response_format: 'url',
          stream: false,
          watermark: false,
        });
        return { ok: true };
      } catch (e) {
        return { ok: false, error: (e as Error).message };
      }
    },

    /** 文生图 */
    async generateImage(options: ImageGenerateOptions): Promise<string[]> {
      const body = buildBody(options);
      const data = await request('/images/generations', body) as ImageGenResponse;
      return data.data.map((img) => img.url);
    },

    /** 图生图 */
    async imageToImage(options: ImageToImageOptions): Promise<string[]> {
      const body = buildBody(options);
      const data = await request('/images/generations', body) as ImageGenResponse;
      return data.data.map((img) => img.url);
    },
  };
}
