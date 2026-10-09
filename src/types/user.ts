import type { Appearance } from "./appearance";
export interface User {
  appearance?: Appearance;
  id: number;
  username: string;
  display_name: string;
  avatar_path: string | null;
  status: string;
  created_at: string;
}

export interface ProfileUpdate {
  avatar?: string | null;
  displayName: string;
  status: string;
}
