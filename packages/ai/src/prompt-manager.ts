import fs from 'fs';
import path from 'path';

function resolveDefaultTemplateDir(): string {
  // Development / asar-packed: prompts are next to the compiled index.js
  const local = path.join(__dirname, 'prompts');
  if (fs.existsSync(local)) return local;
  // Packaged app: prompts copied to resources via extraResources
  const resPath = (process as any).resourcesPath;
  if (resPath) {
    const resDir = path.join(resPath, 'prompts');
    if (fs.existsSync(resDir)) return resDir;
  }
  return local; // fallback
}

export class PromptManager {
  private templateDir: string;

  constructor(templateDir?: string) {
    this.templateDir = templateDir ?? resolveDefaultTemplateDir();
  }

  loadTemplate(category: string, name: string): string {
    const filePath = path.join(this.templateDir, category, `${name}.txt`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Template not found: ${category}/${name}`);
    }
    return fs.readFileSync(filePath, 'utf-8');
  }

  render(template: string, variables: Record<string, string | number>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
      const val = variables[key];
      return val !== undefined ? String(val) : '';
    });
  }

  loadAndRender(category: string, name: string, variables: Record<string, string | number>): string {
    const template = this.loadTemplate(category, name);
    return this.render(template, variables);
  }
}
