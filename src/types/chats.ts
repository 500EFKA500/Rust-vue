export interface Chat {
  kind: "direct" | "group" | "channel";
  can_post: number;
  comments_enabled: number;
  owner_id: number | null;
  member_count: number;
  id: number;
  title: string;
  subtitle: string;
  unread_count: number;
  peer_id: number;
  peer_username: string;
  avatar_path: string | null;
  muted: number;
  pinned_at: number;
  last_message: string | null;
  last_message_at: string | null;
  last_message_id: number;
}
