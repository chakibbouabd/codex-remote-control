import { create } from "zustand";

export interface Thread {
  id: string;
  title: string;
  preview: string;
  model: string;
  createdAt: number;
  updatedAt: number;
  archived: boolean;
}

interface ThreadsState {
  threads: Thread[];
  activeThreadId: string | null;
  isLoading: boolean;
  searchQuery: string;
  setThreads: (threads: Thread[]) => void;
  addThread: (thread: Thread) => void;
  updateThread: (id: string, updates: Partial<Thread>) => void;
  removeThread: (id: string) => void;
  setActiveThread: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setSearchQuery: (query: string) => void;
  filteredThreads: () => Thread[];
}

export const useThreadsStore = create<ThreadsState>((set, get) => ({
  threads: [],
  activeThreadId: null,
  isLoading: false,
  searchQuery: "",
  setThreads: (threads) => set({ threads }),
  addThread: (thread) =>
    set((state) => ({ threads: [thread, ...state.threads] })),
  updateThread: (id, updates) =>
    set((state) => ({
      threads: state.threads.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
  removeThread: (id) =>
    set((state) => ({ threads: state.threads.filter((t) => t.id !== id) })),
  setActiveThread: (id) => set({ activeThreadId: id }),
  setLoading: (loading) => set({ isLoading: loading }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  filteredThreads: () => {
    const { threads, searchQuery } = get();
    if (!searchQuery) return threads;
    const q = searchQuery.toLowerCase();
    return threads.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.preview.toLowerCase().includes(q),
    );
  },
}));
