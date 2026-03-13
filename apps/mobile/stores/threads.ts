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
  setActiveThread: (id) => set({ activeThreadId: id }),
  setLoading: (loading) => set({ isLoading: loading }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  filteredThreads: () => {
    const { threads, searchQuery } = get();
    if (!searchQuery) return threads;
    const q = searchQuery.toLowerCase();
    return threads.filter(
      (t) => t.title.toLowerCase().includes(q) || t.preview.toLowerCase().includes(q),
    );
  },
}));
