export interface VolcEngineConfig {
  accessKey: string;
  secretKey: string;
  region?: string;
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

const DEFAULT_REGION = 'cn-north-1';

export function createVolcEngineClient(config: VolcEngineConfig) {
  const region = config.region ?? DEFAULT_REGION;

  return {
    async generateImage(options: ImageGenerateOptions): Promise<string[]> {
      const endpoint = `https://visual.volcengineapi.com/${region}/cv/process`;
      const body = {
        req_key: 'high_aes_general_v20_L',
        prompt: options.prompt,
        negative_prompt: options.negativePrompt ?? '',
        width: options.width ?? 1024,
        height: options.height ?? 1024,
        seed: options.seed ?? -1,
        return_url: true,
      };
      return [endpoint];
    },

    async generateVideo(options: VideoGenerateOptions): Promise<string> {
      const endpoint = `https://visual.volcengineapi.com/${region}/cv/process`;
      return endpoint;
    },

    async imageToImage(sourceImage: string, options: ImageGenerateOptions): Promise<string[]> {
      return [sourceImage];
    },
  };
}
