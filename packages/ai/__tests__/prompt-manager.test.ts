import { describe, it, expect } from 'vitest';

describe('PromptManager', () => {
  it('renders template variables', async () => {
    const { PromptManager } = await import('../src/prompt-manager');
    const mgr = new PromptManager();

    const result = mgr.render('Hello {{name}}, you are {{role}}.', {
      name: 'World',
      role: 'writer',
    });

    expect(result).toBe('Hello World, you are writer.');
  });

  it('handles missing variables by leaving empty string', async () => {
    const { PromptManager } = await import('../src/prompt-manager');
    const mgr = new PromptManager();

    const result = mgr.render('Hello {{name}}!', {});
    expect(result).toBe('Hello !');
  });

  it('preserves text without variables', async () => {
    const { PromptManager } = await import('../src/prompt-manager');
    const mgr = new PromptManager();

    const result = mgr.render('Plain text with no template vars.', {});
    expect(result).toBe('Plain text with no template vars.');
  });

  it('handles multiple occurrences of same variable', async () => {
    const { PromptManager } = await import('../src/prompt-manager');
    const mgr = new PromptManager();

    const result = mgr.render('{{x}} + {{x}} = {{y}}', { x: '1', y: '2' });
    expect(result).toBe('1 + 1 = 2');
  });

  it('loads and renders a real template file', async () => {
    const { PromptManager } = await import('../src/prompt-manager');
    const mgr = new PromptManager();

    const result = mgr.loadAndRender('outline', 'generate', {
      genre: '科幻',
      premise: '人类发现外星信号',
    });

    expect(result).toContain('科幻');
    expect(result).toContain('人类发现外星信号');
    expect(result).toContain('大纲');
  });
});
