export interface Channel {
  id: number;
  title: string;
  description: string;
  username: string;
  avatar_path: string | null;
  comments_enabled: number;
  owner_id: number;
  subscriber_count: number;
  subscribed: number;
  can_post: number;
}
export interface ChannelUpdate {
  title: string;
  description: string;
  username: string;
  commentsEnabled: boolean;
  avatar?: string | null;
}
export interface ChannelComment {
  id: number;
  post_id: number;
  author_id: number;
  author_name: string;
  author_avatar: string | null;
  body: string;
  created_at: string;
}
