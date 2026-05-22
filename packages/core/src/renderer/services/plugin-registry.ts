import type { ViewContribution, PluginManifest } from '@astrolabe/shared';

class PluginRegistry {
  private views: Map<string, ViewContribution[]> = new Map();

  registerPlugin(manifest: PluginManifest): void {
    for (const view of manifest.views) {
      const existing = this.views.get(view.location) ?? [];
      existing.push(view);
      existing.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      this.views.set(view.location, existing);
    }
  }

  getViews(location: string): ViewContribution[] {
    return this.views.get(location) ?? [];
  }

  getAllViews(): ViewContribution[] {
    return Array.from(this.views.values()).flat();
  }
}

export const pluginRegistry = new PluginRegistry();
