import type { Request, Response } from "express";
import { NotFoundError } from "../errors/AppError";
import * as catalog from "../repositories/catalogRepository";

export async function listCities(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await catalog.getCities());
}

export async function getCity(req: Request, res: Response): Promise<void> {
  const city = await catalog.getCityByCode(req.params["code"]!);
  if (!city) throw new NotFoundError(`No existe la ciudad ${req.params["code"]}`);
  res.status(200).json(city);
}

export async function listGlassFamilies(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await catalog.getGlassFamilies());
}

export async function listApplications(req: Request, res: Response): Promise<void> {
  const onlyVisible = req.query["visible"] === "true";
  res.status(200).json(await catalog.getApplications(onlyVisible));
}

export async function listNeeds(req: Request, res: Response): Promise<void> {
  const onlyVisible = req.query["visible"] === "true";
  res.status(200).json(await catalog.getNeeds(onlyVisible));
}

export async function listChallenges(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await catalog.getChallenges());
}
