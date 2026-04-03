export interface Notification {
  id: number;
  title: string;
  body: string;
  received_at: string;
  is_read: number;
}

export interface NotificationPayload {
  title: string;
  body: string;
}
