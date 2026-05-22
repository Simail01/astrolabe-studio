export interface VolcEngineConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface ImageGenerateOptions {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  seed?: number;
  referenceImage?: string;
  style?: string;
}

export interface VideoGenerateOptions {
  prompt: string;
  duration?: number;
  fps?: number;
  referenceImages?: string[];
}

const DEFAULT_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';

export function createVolcEngineClient(config: VolcEngineConfig) {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;

  async function request(endpoint: string, body: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`火山方舟 API 错误 (${response.status}): ${errText}`);
    }

    return response.json();
  }

  return {
    async generateImage(options: ImageGenerateOptions): Promise<string[]> {
      const body: Record<string, unknown> = {
        model: 'doubao-seedream-1-0',
        prompt: options.prompt,
        size: `${options.width ?? 1024}x${options.height ?? 1024}`,
        n: 1,
      };

      if (options.seed && options.seed > 0) {
        body.seed = options.seed;
      }

      try {
        const data = await request('/images/generations', body) as {
          data?: { url?: string }[];
        };
        return (data.data ?? []).map((img) => img.url ?? '');
      } catch {
        // Fallback: try chat completions with a vision-capable model
        const chatBody = {
          model: 'doubao-vision-pro-32k',
          messages: [
            {
              role: 'user',
              content: `请根据以下描述生成一张图片：${options.prompt}。${options.negativePrompt ? `避免：${options.negativePrompt}` : ''}`,
            },
          ],
        };
        const chatData = await request('/chat/completions', chatBody) as {
          choices?: { message?: { content?: string } }[];
        };
        return [chatData.choices?.[0]?.message?.content ?? ''];
      }
    },

    async generateVideo(options: VideoGenerateOptions): Promise<string> {
      const body = {
        model: 'doubao-video-pro',
        prompt: options.prompt,
        duration: options.duration ?? 5,
        fps: options.fps ?? 24,
      };

      const data = await request('/videos/generations', body) as {
        id?: string;
      };
      return data.id ?? '';
    },

    async imageToImage(sourceImage: string, options: ImageGenerateOptions): Promise<string[]> {
      const body: Record<string, unknown> = {
        model: 'doubao-seedream-1-0',
        prompt: options.prompt,
        image: sourceImage,
        size: `${options.width ?? 1024}x${options.height ?? 1024}`,
      };

      if (options.seed && options.seed > 0) {
        body.seed = options.seed;
      }

      const data = await request('/images/generations', body) as {
        data?: { url?: string }[];
      };
      return (data.data ?? []).map((img) => img.url ?? '');
    },
  };
}
