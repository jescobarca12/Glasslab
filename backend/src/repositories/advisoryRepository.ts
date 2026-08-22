import { pool } from "../db/pool";

export interface AdvisoryRequest {
  name?: string | null;
  email: string;
  phone?: string | null;
  city?: string | null;
  projectName?: string | null;
  contactSlot?: string | null;
  notes?: string | null;
}

export interface AdvisoryRow extends AdvisoryRequest {
  id: number;
  createdAt: string;
  attended: boolean;
}

export async function insertAdvisoryRequest(req: AdvisoryRequest): Promise<AdvisoryRow> {
  const { rows } = await pool.query(
    `INSERT INTO advisory_requests (user_name, user_email, user_phone, user_city, project_name, contact_slot, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id, created_at, user_name, user_email, user_phone, user_city, project_name, contact_slot, notes, attended`,
    [req.name ?? null, req.email, req.phone ?? null, req.city ?? null,
      req.projectName ?? null, req.contactSlot ?? null, req.notes ?? null],
  );
  return mapear(rows[0]);
}

export async function listAdvisoryRequests(limit: number, offset: number): Promise<{ items: AdvisoryRow[]; total: number }> {
  const { rows: countRows } = await pool.query("SELECT count(*)::int AS total FROM advisory_requests");
  const { rows } = await pool.query(
    `SELECT id, created_at, user_name, user_email, user_phone, user_city, project_name, contact_slot, notes, attended
       FROM advisory_requests ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
  return { items: rows.map(mapear), total: countRows[0]!.total };
}

function mapear(r: Record<string, any>): AdvisoryRow {
  return {
    id: r.id,
    createdAt: r.created_at.toISOString(),
    name: r.user_name,
    email: r.user_email,
    phone: r.user_phone,
    city: r.user_city,
    projectName: r.project_name,
    contactSlot: r.contact_slot,
    notes: r.notes,
    attended: r.attended,
  };
}
