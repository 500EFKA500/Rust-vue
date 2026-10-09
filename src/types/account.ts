import type { User } from "./user";
export interface Credentials {
  username: string;
  password: string;
  displayName?: string;
}
export interface AccountSession {
  user: User;
  token: string;
  expiresAt: number;
}
export interface AccountVault {
  server: string;
  activeId: number | null;
  accounts: AccountSession[];
}
