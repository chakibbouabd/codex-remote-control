/**
 * Thread store managing conversation threads, active selection, and search filtering.
 */
import { create } from "zustand";

/**
 * Represents a single conversation thread.
 * @property id - Unique thread identifier.
 * @property title - Display title of the thread.
 * @property preview - Short preview text of the latest message.
 * @property model - AI model used in this thread.
 * @property createdAt - Unix timestamp (ms) when the thread was created.
 * @property updatedAt - Unix timestamp (ms) when the thread was last updated.
 * @property archived - Whether the thread has been archived.
 */
export interface Thread {
  id: string;
  title: string;
  preview: string;
  model: string;
  createdAt: number;
  updatedAt: number;
  archived: boolean;
}

/** Internal state and actions for the threads store. */
interface ThreadsState {
  threads: Thread[];
  activeThreadId: string | null;
  isLoading: boolean;
  searchQuery: string;
  /** Replace all threads with the given array. */
  setThreads: (threads: Thread[]) => void;
  /** Prepend a new thread to the list. */
  addThread: (thread: Thread) => void;
  /** Update a thread by merging partial updates. */
  updateThread: (id: string, updates: Partial<Thread>) => void;
  /** Remove a thread by its ID. */
  removeThread: (id: string) => void;
  /** Set the currently active thread, or null to clear. */
  setActiveThread: (id: string | null) => void;
  /** Toggle the loading state. */
  setLoading: (loading: boolean) => void;
  /** Set the search query used for filtering. */
  setSearchQuery: (query: string) => void;
  /** Return threads filtered by the current search query. */
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
