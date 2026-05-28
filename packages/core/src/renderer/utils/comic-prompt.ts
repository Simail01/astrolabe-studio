import type { Shot, ShotCharacter, CharacterDesign } from '@astrolabe/shared';
import { bridge } from '../services/bridge';

/**
 * Build an image generation prompt from shot metadata.
 */
export function buildShotPrompt(shot: Shot): string {
  const charDesc = (shot.characters || [])
    .map((c) => `${c.characterId}(${c.expression || ''} ${c.pose || ''})`)
    .join(',');
  return `漫画风格，${shot.framing || 'medium'}，${shot.angle || 'eye-level'}。场景：${shot.scene || ''}。${charDesc}。氛围：${shot.mood || ''}。道具：${(shot.props || []).join('，')}`;
}

/**
 * Look up character designs for the shot's characters and return the first
 * confirmed design's base image as a base64 string.
 * Returns undefined if no confirmed design is found.
 */
export async function findReferenceImage(
  projectPath: string,
  characters: ShotCharacter[],
): Promise<string | undefined> {
  for (const c of characters || []) {
    try {
      const design = (await bridge.designGet(projectPath, c.characterId)) as CharacterDesign | null;
      if (design?.confirmed && design.baseImage) {
        try {
          const base64 = await bridge.readFileBase64(design.baseImage);
          return base64;
        } catch {
          // baseImage path unreadable, skip
        }
      }
    } catch {
      // design not found for this character, skip
    }
  }
  return undefined;
}
