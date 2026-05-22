import fs from 'fs';
import path from 'path';

export class PromptManager {
  private templateDir: string;

  constructor(templateDir?: string) {
    this.templateDir = templateDir ?? path.join(__dirname, 'prompts');
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
