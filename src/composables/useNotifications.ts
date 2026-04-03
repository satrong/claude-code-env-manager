import { ref, onUnmounted } from 'vue';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import Database from '@tauri-apps/plugin-sql';
import { sendNotification, isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification';
import type { Notification, NotificationPayload } from '../types/notification';

const notifications = ref<Notification[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const httpPort = ref<number | null>(null);

let dbInstance: Database | null = null;

async function getDb(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await Database.load('sqlite:app.db');
    await dbInstance.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        received_at TEXT NOT NULL,
        is_read INTEGER NOT NULL DEFAULT 0
      )
    `);
  }
  return dbInstance;
}

async function loadNotifications(): Promise<void> {
  isLoading.value = true;
  error.value = null;
  try {
    const db = await getDb();
    const rows = await db.select<Notification[]>(
      'SELECT id, title, body, received_at, is_read FROM notifications ORDER BY received_at DESC'
    );
    notifications.value = rows;
  } catch (e) {
    error.value = String(e);
  } finally {
    isLoading.value = false;
  }
}

async function insertNotification(payload: NotificationPayload): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.execute(
    'INSERT INTO notifications (title, body, received_at, is_read) VALUES ($1, $2, $3, 0)',
    [payload.title, payload.body, now]
  );
  await loadNotifications();
}

async function markAsRead(id: number): Promise<void> {
  const db = await getDb();
  await db.execute('UPDATE notifications SET is_read = 1 WHERE id = $1', [id]);
  const idx = notifications.value.findIndex((n) => n.id === id);
  if (idx !== -1) {
    notifications.value[idx] = { ...notifications.value[idx], is_read: 1 };
  }
}

async function markAllAsRead(): Promise<void> {
  const db = await getDb();
  await db.execute('UPDATE notifications SET is_read = 1 WHERE is_read = 0');
  notifications.value = notifications.value.map((n) => ({ ...n, is_read: 1 }));
}

async function deleteNotification(id: number): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM notifications WHERE id = $1', [id]);
  notifications.value = notifications.value.filter((n) => n.id !== id);
}

async function clearAllNotifications(): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM notifications');
  notifications.value = [];
}

async function fetchHttpPort(): Promise<void> {
  try {
    httpPort.value = await invoke<number>('get_http_server_port');
  } catch (e) {
    console.error('Failed to get HTTP port:', e);
  }
}

async function ensureNotificationPermission(): Promise<boolean> {
  try {
    let permitted = await isPermissionGranted();
    if (!permitted) {
      const permission = await requestPermission();
      permitted = permission === 'granted';
    }
    return permitted;
  } catch {
    return false;
  }
}

async function showDesktopNotification(title: string, body: string): Promise<void> {
  const permitted = await ensureNotificationPermission();
  if (permitted) {
    sendNotification({ title, body });
  }
}

const unreadCount = () => notifications.value.filter((n) => n.is_read === 0).length;

export function useNotifications() {
  let unlisten: UnlistenFn | null = null;

  async function initialize(): Promise<void> {
    await loadNotifications();
    await fetchHttpPort();

    unlisten = await listen<NotificationPayload>('notification-received', async (event) => {
      await insertNotification(event.payload);
      await showDesktopNotification(event.payload.title, event.payload.body);
    });
  }

  onUnmounted(() => {
    if (unlisten) {
      unlisten();
      unlisten = null;
    }
  });

  return {
    notifications,
    isLoading,
    error,
    httpPort,
    unreadCount,
    initialize,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    fetchHttpPort,
  };
}
