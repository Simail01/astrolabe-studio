import { create } from 'zustand';
import type { Chapter } from '@astrolabe/shared';

interface ChapterState {
  currentChapter: Chapter | null;
  content: string;
  wordCount: number;
  isDirty: boolean;
  isSaving: boolean;
  setChapter: (chapter: Chapter | null) => void;
  setContent: (content: string) => void;
  markClean: () => void;
}

function countWords(text: string): number {
  // Chinese character counting: each CJK char = 1 word, Latin words split by spaces
  const cjk = (text.match(/[一-鿿㐀-䶿]/g) || []).length;
  const latin = text.replace(/[一-鿿㐀-䶿]/g, ' ').split(/\s+/).filter(Boolean).length;
  return cjk + latin;
}

export const useChapterStore = create<ChapterState>((set) => ({
  currentChapter: null,
  content: '',
  wordCount: 0,
  isDirty: false,
  isSaving: false,

  setChapter: (chapter) => set({
    currentChapter: chapter,
    content: chapter?.content ?? '',
    wordCount: chapter ? countWords(chapter.content) : 0,
    isDirty: false,
  }),

  setContent: (content) => set({
    content,
    wordCount: countWords(content),
    isDirty: true,
  }),

  markClean: () => set({ isDirty: false }),
}));
