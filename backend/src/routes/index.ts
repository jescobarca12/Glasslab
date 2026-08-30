import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAdmin, requireAuth } from "../middleware/requireAuth";
import * as catalog from "../controllers/catalogController";
import * as diagnosis from "../controllers/diagnosisController";
import * as gamification from "../controllers/gamificationController";
import * as admin from "../controllers/adminController";
import * as labels from "../controllers/labelsController";
import * as rulesAdmin from "../controllers/rulesAdminController";
import * as citiesAdmin from "../controllers/citiesAdminController";
import * as emailVerification from "../controllers/emailVerificationController";
import * as users from "../controllers/usersController";
import * as analytics from "../controllers/analyticsController";
import * as advisory from "../controllers/advisoryController";
import * as challengeQuiz from "../controllers/challengeQuizController";
import * as cityChallenges from "../controllers/cityChallengeController";

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
apiRouter.get("/challenges/:code/quiz", asyncHandler(challengeQuiz.getQuiz));
apiRouter.post("/challenges/:code/answer", asyncHandler(challengeQuiz.answer));
apiRouter.get("/labels", asyncHandler(labels.getPublicLabels));
apiRouter.get("/lab", asyncHandler(analytics.listLabTopics));
apiRouter.get("/portfolio", asyncHandler(catalog.listPortafolio));

// --- Verificación de correo (OTP) ---
apiRouter.post("/auth/email/request-code", asyncHandler(emailVerification.requestCode));
apiRouter.post("/auth/email/verify", asyncHandler(emailVerification.verify));
apiRouter.post("/auth/email/session", asyncHandler(emailVerification.startSession));
apiRouter.get("/auth/email/status", asyncHandler(emailVerification.status));

// --- Perfil del usuario del asistente (lo guarda el registro) ---
apiRouter.post("/users/profile", asyncHandler(users.saveProfile));

// --- Diagnósticos / motor de reglas ---
apiRouter.post("/diagnoses/evaluate", asyncHandler(diagnosis.evaluate));
apiRouter.post("/diagnoses", asyncHandler(diagnosis.create));
apiRouter.get("/diagnoses/:leadId/report.pdf", asyncHandler(diagnosis.downloadReport));
apiRouter.get("/diagnoses/:leadId", asyncHandler(diagnosis.getOne));

// --- Retos por ciudad (Módulo B: pon a prueba tu criterio) ---
apiRouter.get("/city-challenges", asyncHandler(cityChallenges.listCities));
apiRouter.get("/city-challenges/reto/:code", asyncHandler(cityChallenges.getQuiz));
apiRouter.post("/city-challenges/reto/:code/answer", asyncHandler(cityChallenges.answer));
apiRouter.get("/city-challenges/:cityCode/progress", asyncHandler(cityChallenges.progress));
apiRouter.get("/city-challenges/:cityCode", asyncHandler(cityChallenges.listByCity));

// --- Analítica de producto (la emite el asistente) ---
apiRouter.post("/events", asyncHandler(analytics.track));

// --- Asesoría (quien no sabe qué vidrio necesita) ---
apiRouter.post("/advisory-requests", asyncHandler(advisory.create));

// --- Gamificación ---
apiRouter.get("/players/:email", asyncHandler(gamification.getPlayer));
apiRouter.post("/players/:email/challenges", asyncHandler(gamification.completeChallengeForPlayer));

// --- Panel administrativo (JWT) ---
// Consulta de leads: la abren admin y viewer. Todo lo que modifica el motor
// (preguntas, reglas, ciudades) exige rol admin.
apiRouter.post("/admin/login", asyncHandler(admin.login));
apiRouter.get("/admin/me", requireAuth, asyncHandler(admin.me));
apiRouter.get("/admin/leads.csv", requireAuth, asyncHandler(admin.exportLeadsCsv));
apiRouter.get("/admin/leads", requireAuth, asyncHandler(admin.listLeads));
apiRouter.get("/admin/leads/:leadId", requireAuth, asyncHandler(admin.getLead));
apiRouter.get("/admin/advisory-requests", requireAuth, asyncHandler(advisory.list));
apiRouter.get("/admin/users.csv", requireAuth, asyncHandler(users.exportUsersCsv));
apiRouter.get("/admin/users", requireAuth, asyncHandler(users.listUsers));

// Tableros de lectura: los abren admin y viewer, como los leads.
apiRouter.get("/admin/analytics/marketing", requireAuth, asyncHandler(analytics.marketing));
apiRouter.get("/admin/analytics/certifications", requireAuth, asyncHandler(analytics.certifications));
apiRouter.get("/admin/labels", requireAuth, requireAdmin, asyncHandler(labels.listLabels));
apiRouter.put("/admin/labels/:grupo/:campo", requireAuth, requireAdmin, asyncHandler(labels.editLabel));
apiRouter.get("/admin/rules", requireAuth, requireAdmin, asyncHandler(rulesAdmin.listRules));
apiRouter.get("/admin/rules/:code", requireAuth, requireAdmin, asyncHandler(rulesAdmin.getRule));
apiRouter.put("/admin/rules/:code", requireAuth, requireAdmin, asyncHandler(rulesAdmin.editRule));
apiRouter.get("/admin/cities", requireAuth, requireAdmin, asyncHandler(citiesAdmin.listCities));
apiRouter.get("/admin/cities/:code", requireAuth, requireAdmin, asyncHandler(citiesAdmin.getCity));
apiRouter.put("/admin/cities/:code", requireAuth, requireAdmin, asyncHandler(citiesAdmin.editCity));
