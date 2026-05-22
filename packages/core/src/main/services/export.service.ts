export const exportService = {
  async exportNovel(projectPath: string, format: string): Promise<string> {
    // TODO: implement actual novel export logic
    return `${projectPath}/export/novel.${format}`;
  },

  async exportCard(cardPath: string, format: string): Promise<string> {
    // TODO: implement actual card export logic
    return `${cardPath}/export/card.${format}`;
  },

  async exportComic(projectPath: string, format: string): Promise<string> {
    // TODO: implement actual comic export logic
    return `${projectPath}/export/comic.${format}`;
  },
};
