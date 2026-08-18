import { pool } from "../db/pool";

export interface AdminUser {
  id: number;
  username: string;
  passwordHash: string;
  role: string;
}

export async function findAdminByUsername(username: string): Promise<AdminUser | null> {
  const { rows } = await pool.query(
    "SELECT id, username, password_hash, role FROM admin_users WHERE username = $1",
    [username],
  );
  const a = rows[0];
  if (!a) return null;
  return { id: a.id, username: a.username, passwordHash: a.password_hash, role: a.role };
}
