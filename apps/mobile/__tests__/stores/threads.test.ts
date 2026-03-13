import { useThreadsStore, type Thread } from "@/stores/threads";
import { act } from "@testing-library/react-native";

const mockThread: Thread = {
  id: "thread-1",
  title: "Fix auth bug",
  preview: "Working on the login flow...",
  model: "codex-4o",
  createdAt: Date.now() - 3600000,
  updatedAt: Date.now(),
  archived: false,
};

const mockThread2: Thread = {
  id: "thread-2",
  title: "Add dark mode",
  preview: "Implementing theme toggle...",
  model: "codex-4o",
  createdAt: Date.now() - 7200000,
  updatedAt: Date.now() - 1800000,
  archived: false,
};

beforeEach(() => {
  useThreadsStore.setState({
    threads: [],
    activeThreadId: null,
    isLoading: false,
    searchQuery: "",
  });
});

describe("useThreadsStore", () => {
  it("starts with empty threads list", () => {
    const state = useThreadsStore.getState();
    expect(state.threads).toEqual([]);
    expect(state.activeThreadId).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.searchQuery).toBe("");
  });

  it("setThreads replaces the entire threads list", () => {
    act(() => {
      useThreadsStore.getState().setThreads([mockThread, mockThread2]);
    });

    expect(useThreadsStore.getState().threads).toHaveLength(2);
  });

  it("addThread prepends to the list", () => {
    act(() => {
      useThreadsStore.getState().setThreads([mockThread2]);
    });
    act(() => {
      useThreadsStore.getState().addThread(mockThread);
    });

    const threads = useThreadsStore.getState().threads;
    expect(threads).toHaveLength(2);
    // New thread is prepended (most recent first)
    expect(threads[0].id).toBe("thread-1");
    expect(threads[1].id).toBe("thread-2");
  });

  it("updateThread merges updates into matching thread", () => {
    act(() => {
      useThreadsStore.getState().setThreads([mockThread]);
    });

    act(() => {
      useThreadsStore
        .getState()
        .updateThread("thread-1", { title: "Updated title", archived: true });
    });

    const thread = useThreadsStore.getState().threads[0];
    expect(thread.title).toBe("Updated title");
    expect(thread.archived).toBe(true);
    // Other fields unchanged
    expect(thread.preview).toBe("Working on the login flow...");
  });

  it("updateThread does not modify non-matching threads", () => {
    act(() => {
      useThreadsStore.getState().setThreads([mockThread, mockThread2]);
    });

    act(() => {
      useThreadsStore
        .getState()
        .updateThread("nonexistent", { title: "Changed" });
    });

    const threads = useThreadsStore.getState().threads;
    expect(threads).toHaveLength(2);
    expect(threads[0].title).toBe("Fix auth bug");
    expect(threads[1].title).toBe("Add dark mode");
  });

  it("removeThread filters out the specified thread", () => {
    act(() => {
      useThreadsStore.getState().setThreads([mockThread, mockThread2]);
    });

    act(() => {
      useThreadsStore.getState().removeThread("thread-1");
    });

    const threads = useThreadsStore.getState().threads;
    expect(threads).toHaveLength(1);
    expect(threads[0].id).toBe("thread-2");
  });

  it("setActiveThread sets the active thread ID", () => {
    act(() => {
      useThreadsStore.getState().setActiveThread("thread-1");
    });

    expect(useThreadsStore.getState().activeThreadId).toBe("thread-1");

    act(() => {
      useThreadsStore.getState().setActiveThread(null);
    });

    expect(useThreadsStore.getState().activeThreadId).toBeNull();
  });

  it("setLoading toggles loading state", () => {
    act(() => {
      useThreadsStore.getState().setLoading(true);
    });
    expect(useThreadsStore.getState().isLoading).toBe(true);

    act(() => {
      useThreadsStore.getState().setLoading(false);
    });
    expect(useThreadsStore.getState().isLoading).toBe(false);
  });

  it("setSearchQuery updates the search query", () => {
    act(() => {
      useThreadsStore.getState().setSearchQuery("dark");
    });
    expect(useThreadsStore.getState().searchQuery).toBe("dark");
  });

  it("filteredThreads returns all threads when no search query", () => {
    act(() => {
      useThreadsStore.getState().setThreads([mockThread, mockThread2]);
    });

    const filtered = useThreadsStore.getState().filteredThreads();
    expect(filtered).toHaveLength(2);
  });

  it("filteredThreads filters by title (case-insensitive)", () => {
    act(() => {
      useThreadsStore.getState().setThreads([mockThread, mockThread2]);
    });
    act(() => {
      useThreadsStore.getState().setSearchQuery("dark");
    });

    const filtered = useThreadsStore.getState().filteredThreads();
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("thread-2");
  });

  it("filteredThreads filters by preview text", () => {
    act(() => {
      useThreadsStore.getState().setThreads([mockThread, mockThread2]);
    });
    act(() => {
      useThreadsStore.getState().setSearchQuery("login");
    });

    const filtered = useThreadsStore.getState().filteredThreads();
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("thread-1");
  });

  it("filteredThreads returns empty when no match", () => {
    act(() => {
      useThreadsStore.getState().setThreads([mockThread, mockThread2]);
    });
    act(() => {
      useThreadsStore.getState().setSearchQuery("nonexistent");
    });

    const filtered = useThreadsStore.getState().filteredThreads();
    expect(filtered).toHaveLength(0);
  });
});
