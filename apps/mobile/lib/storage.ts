import { getDatabase } from "./database";
import type { Thread } from "../stores/threads";
import type { ConversationMessage } from "../stores/conversation";

export async function saveThread(thread: Thread): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO threads (id, title, preview, model, created_at, updated_at, archived)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [thread.id, thread.title, thread.preview, thread.model, thread.createdAt, thread.updatedAt, thread.archived ? 1 : 0],
  );
}

export async function saveThreads(threads: Thread[]): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    for (const thread of threads) {
      await db.runAsync(
        `INSERT OR REPLACE INTO threads (id, title, preview, model, created_at, updated_at, archived)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [thread.id, thread.title, thread.preview, thread.model, thread.createdAt, thread.updatedAt, thread.archived ? 1 : 0],
      );
    }
  });
}

export async function loadThreads(): Promise<Thread[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    "SELECT * FROM threads WHERE archived = 0 ORDER BY updated_at DESC"
  );
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    preview: row.preview || "",
    model: row.model,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archived: row.archived === 1,
  }));
}

export async function archiveThread(threadId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("UPDATE threads SET archived = 1 WHERE id = ?", [threadId]);
}

export async function deleteThread(threadId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM threads WHERE id = ?", [threadId]);
}

export async function saveMessage(message: ConversationMessage & { threadId: string }): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO messages (id, thread_id, role, content, timestamp)
     VALUES (?, ?, ?, ?, ?)`,
    [message.id, message.threadId, message.role, message.content, message.timestamp],
  );
}

export async function loadMessages(threadId: string): Promise<ConversationMessage[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    "SELECT * FROM messages WHERE thread_id = ? ORDER BY timestamp ASC",
    [threadId],
  );
  return rows.map((row) => ({
    id: row.id,
    threadId: row.thread_id,
    role: row.role,
    content: row.content,
    timestamp: row.timestamp,
  }));
}

export async function clearMessages(threadId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM messages WHERE thread_id = ?", [threadId]);
}
