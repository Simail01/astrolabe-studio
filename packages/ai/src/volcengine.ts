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

  async function request(method: string, path: string, body?: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`火山方舟 API 错误 (${response.status}): ${errText.slice(0, 200)}`);
    }

    return response.json();
  }

  return {
    /** 连通性测试：列出可用模型 */
    async ping(): Promise<boolean> {
      try {
        await request('GET', '/models');
        return true;
      } catch {
        return false;
      }
    },

    /** 通过接入点 ID 生成图像 */
    async generateImage(endpointId: string, options: ImageGenerateOptions): Promise<string[]> {
      const body = {
        model: endpointId,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `生成一张图片：${options.prompt}${options.negativePrompt ? `。避免：${options.negativePrompt}` : ''}`,
              },
            ],
          },
        ],
        size: `${options.width ?? 1024}x${options.height ?? 1024}`,
      };

      const data = await request('POST', '/chat/completions', body) as {
        choices?: { message?: { content?: { image_url?: { url?: string } }[] | string } }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (Array.isArray(content)) {
        return content.map((c) => c.image_url?.url ?? '').filter(Boolean);
      }
      return [typeof content === 'string' ? content : ''];
    },

    /** 图生图：基于参考图生成变体 */
    async imageToImage(endpointId: string, sourceImage: string, options: ImageGenerateOptions): Promise<string[]> {
      const body = {
        model: endpointId,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: sourceImage },
              },
              {
                type: 'text',
                text: `基于此参考图，${options.prompt}`,
              },
            ],
          },
        ],
      };

      const data = await request('POST', '/chat/completions', body) as {
        choices?: { message?: { content?: { image_url?: { url?: string } }[] | string } }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (Array.isArray(content)) {
        return content.map((c) => c.image_url?.url ?? '').filter(Boolean);
      }
      return [];
    },

    /** 通用的聊天补全（用于 AI 辅助图像 prompt 优化等） */
    async chat(messages: { role: string; content: string }[]): Promise<string> {
      const data = await request('POST', '/chat/completions', { messages }) as {
        choices?: { message?: { content?: string } }[];
      };
      return data.choices?.[0]?.message?.content ?? '';
    },
  };
}
