import type { Request, Response } from "express";
import { NotFoundError } from "../errors/AppError";
import { getCities, getCityByCode } from "../repositories/catalogRepository";
import { updateCity, type CityUpdateInput } from "../repositories/citiesAdminRepository";

/** GET /api/admin/cities — listado de ciudades (200). */
export async function listCities(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await getCities());
}

/** GET /api/admin/cities/:code — detalle de una ciudad (200 / 404). */
export async function getCity(req: Request, res: Response): Promise<void> {
  const city = await getCityByCode(req.params["code"]!);
  if (!city) throw new NotFoundError(`No existe la ciudad ${req.params["code"]}`);
  res.status(200).json(city);
}

/** PUT /api/admin/cities/:code — actualiza una ciudad (200 / 400 / 404). */
export async function editCity(req: Request, res: Response): Promise<void> {
  const b = req.body as Partial<CityUpdateInput>;
  const input: CityUpdateInput = {
    nombre: String(b.nombre ?? ""),
    departamento: String(b.departamento ?? ""),
    activa: b.activa ?? true,
    lat: b.lat ?? null,
    lng: b.lng ?? null,
    altitudM: b.altitudM ?? null,
    clima: b.clima ?? null,
    tempPromC: b.tempPromC ?? null,
    tempMaxC: b.tempMaxC ?? null,
    humedadPct: b.humedadPct ?? null,
    zonaSismicaNsr10: b.zonaSismicaNsr10 ?? null,
    aeropuerto: b.aeropuerto ?? null,
    corredoresRuido: b.corredoresRuido ?? [],
    fuentes: b.fuentes ?? [],
  };
  const code = req.params["code"]!;
  await updateCity(code, input);
  res.status(200).json(await getCityByCode(code));
}
