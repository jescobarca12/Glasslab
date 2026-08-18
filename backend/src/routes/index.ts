import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/requireAuth";
import * as catalog from "../controllers/catalogController";
import * as diagnosis from "../controllers/diagnosisController";
import * as gamification from "../controllers/gamificationController";
import * as admin from "../controllers/adminController";
import * as labels from "../controllers/labelsController";
import * as rulesAdmin from "../controllers/rulesAdminController";
import * as citiesAdmin from "../controllers/citiesAdminController";

export const apiRouter = Router();

// --- Salud ---
apiRouter.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "vitelsa-glasslab-api" });
});

// --- Catálogo (solo lectura) ---
apiRouter.get("/cities", asyncHandler(catalog.listCities));
apiRouter.get("/cities/:code", asyncHandler(catalog.getCity));
apiRouter.get("/glass-families", asyncHandler(catalog.listGlassFamilies));
apiRouter.get("/applications", asyncHandler(catalog.listApplications));
apiRouter.get("/needs", asyncHandler(catalog.listNeeds));
apiRouter.get("/challenges", asyncHandler(catalog.listChallenges));
apiRouter.get("/labels", asyncHandler(labels.getPublicLabels));

// --- Diagnósticos / motor de reglas ---
apiRouter.post("/diagnoses/evaluate", asyncHandler(diagnosis.evaluate));
apiRouter.post("/diagnoses", asyncHandler(diagnosis.create));
apiRouter.get("/diagnoses/:leadId", asyncHandler(diagnosis.getOne));

// --- Gamificación ---
apiRouter.get("/players/:email", asyncHandler(gamification.getPlayer));
apiRouter.post("/players/:email/challenges", asyncHandler(gamification.completeChallengeForPlayer));

// --- Panel administrativo (JWT) ---
apiRouter.post("/admin/login", asyncHandler(admin.login));
apiRouter.get("/admin/me", requireAuth, asyncHandler(admin.me));
apiRouter.get("/admin/leads.csv", requireAuth, asyncHandler(admin.exportLeadsCsv));
apiRouter.get("/admin/leads", requireAuth, asyncHandler(admin.listLeads));
apiRouter.get("/admin/leads/:leadId", requireAuth, asyncHandler(admin.getLead));
apiRouter.get("/admin/labels", requireAuth, asyncHandler(labels.listLabels));
apiRouter.put("/admin/labels/:grupo/:campo", requireAuth, asyncHandler(labels.editLabel));
apiRouter.get("/admin/rules", requireAuth, asyncHandler(rulesAdmin.listRules));
apiRouter.get("/admin/rules/:code", requireAuth, asyncHandler(rulesAdmin.getRule));
apiRouter.put("/admin/rules/:code", requireAuth, asyncHandler(rulesAdmin.editRule));
apiRouter.get("/admin/cities", requireAuth, asyncHandler(citiesAdmin.listCities));
apiRouter.get("/admin/cities/:code", requireAuth, asyncHandler(citiesAdmin.getCity));
apiRouter.put("/admin/cities/:code", requireAuth, asyncHandler(citiesAdmin.editCity));
