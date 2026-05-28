import { create } from 'zustand';
import type { TimelineEvent, TimelineData } from '@astrolabe/shared';

interface TimelineState {
  events: TimelineEvent[];
  loading: boolean;
  extractLoading: boolean;
  setEvents: (events: TimelineEvent[]) => void;
  addEvents: (events: TimelineEvent[]) => void;
  updateEvent: (event: TimelineEvent) => void;
  removeEvent: (id: string) => void;
  addEvent: (event: TimelineEvent) => void;
  setLoading: (loading: boolean) => void;
  setExtractLoading: (loading: boolean) => void;
}

export const useTimelineStore = create<TimelineState>((set) => ({
  events: [],
  loading: false,
  extractLoading: false,

  setEvents: (events) => set({ events }),

  addEvents: (newEvents) =>
    set((state) => ({
      events: [...state.events, ...newEvents],
    })),

  updateEvent: (updated) =>
    set((state) => ({
      events: state.events.map((e) => (e.id === updated.id ? updated : e)),
    })),

  removeEvent: (id) =>
    set((state) => ({
      events: state.events.filter((e) => e.id !== id),
    })),

  addEvent: (event) =>
    set((state) => ({
      events: [...state.events, event],
    })),

  setLoading: (loading) => set({ loading }),
  setExtractLoading: (extractLoading) => set({ extractLoading }),
}));
