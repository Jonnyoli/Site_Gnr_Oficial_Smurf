import {
  Router,
  type IRouter,
} from "express";

import healthRouter from "./health";
import authRouter from "./auth";
import dataRouter from "./data";
import auditRoutes from "./audit";
import alertsRoutes from "./alerts";
import storeRoutes from "./store";
import settingsRoutes from "./settings";
import documentsRoutes from "./documents";
import unitsRoutes from "./units";
import operationalNotificationsRoutes from "./operationalNotifications";
import investigationEvidenceRoutes from "./investigationEvidence";
import officialDocumentsRoutes from "./officialDocuments";
import globalSearchRoutes from "./globalSearch";
import executiveDashboardRoutes from "./executiveDashboard";
import departmentsRoutes from "./departments";
import csoMeetingsRoutes from "./csoMeetings";
import csoMinutesRoutes from "./csoMinutes";
import cegRoutes from "./ceg";
import drhRoutes from "./drh";
import commandCenterRoutes from "./commandCenter";
import departmentSearchRoutes from "./departmentSearch";
import drhWorkforceRoutes from "./drhWorkforce";
import agendaRoutes from "./agenda";
import announcementsRoutes from "./announcements";
import guardProfilesRoutes from "./guardProfiles";
import profileSocialRoutes from "./profileSocial";
import storeSocialRoutes from "./storeSocial";
import profileSocialCustomizationRoutes from "./profileSocialCustomization";
import sergeantEvaluationsRoutes from "./sergeantEvaluations";
import forumRoutes from "./forum";
import hierarchicalEvaluationsRoutes from "./hierarchicalEvaluations";
import academyRoutes from "./academy";
import operationalSyncRoutes from "./operationalSync";
import nicBotRoutes from "./nicBot";
import schoolRoutes from "./school";
import unitHubRoutes from "./unitHub";
import systemHealthRoutes from "./systemHealth";
import discordCommandCenterRoutes from "./discordCommandCenter";
import youtubeRoutes from "./youtube";
import {
  requireAuth,
} from "../middlewares/auth";


const router: IRouter = Router();

function shouldBypassGlobalAuth(path: string) {
  return (
    path === "/healthz" ||
    path.startsWith("/auth") ||
    path.startsWith("/internal/nic-bot") ||
    path.startsWith("/discord-command-center/bot") ||
    path.startsWith("/school/discord/internal") ||
    path.startsWith("/unit-hub/internal") ||
    path.startsWith("/system-health/bot-heartbeat")
  );
}

router.use((req, res, next) => {
  if (shouldBypassGlobalAuth(req.path)) {
    next();
    return;
  }

  requireAuth(req, res, next);
});

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/data", dataRouter);
router.use("/audit", auditRoutes);
router.use("/alerts", alertsRoutes);
router.use("/store", storeRoutes);
router.use("/settings", settingsRoutes);
router.use("/documents", documentsRoutes);
router.use("/units", unitsRoutes);
router.use("/unit-hub", unitHubRoutes);
router.use("/system-health", systemHealthRoutes);

router.use(
  "/operational-notifications",
  operationalNotificationsRoutes,
);
router.use(
  "/investigation-evidence",
  investigationEvidenceRoutes,
);
router.use(
  "/official-documents",
  officialDocumentsRoutes,
);

router.use("/global-search", globalSearchRoutes);
router.use(
  "/executive-dashboard",
  executiveDashboardRoutes,
);

router.use("/departments", departmentsRoutes);
router.use("/cso", csoMeetingsRoutes);
router.use("/cso-minutes", csoMinutesRoutes);
router.use("/ceg", cegRoutes);
router.use("/drh", drhRoutes);
router.use("/command-center", commandCenterRoutes);
router.use(
  "/department-search",
  departmentSearchRoutes,
);
router.use(
  "/drh-workforce",
  drhWorkforceRoutes,
);

router.use("/agenda", agendaRoutes);
router.use("/announcements", announcementsRoutes);
router.use("/forum", forumRoutes);

router.use("/guard-profiles", guardProfilesRoutes);
router.use("/profile-social", profileSocialRoutes);
router.use("/store-social", storeSocialRoutes);
router.use(
  "/profile-social-customization",
  profileSocialCustomizationRoutes,
);

router.use(
  "/sergeant-evaluations",
  sergeantEvaluationsRoutes,
);
router.use(
  "/hierarchical-evaluations",
  hierarchicalEvaluationsRoutes,
);

/**
 * Academia Digital
 *
 * Frontend:
 * /academia
 * /academia/radio
 * /academia/certificados
 * /academia/formadores
 *
 * API:
 * /api/academy/*
 */
router.use("/academy", academyRoutes);

router.use("/operational-sync", operationalSyncRoutes);
router.use("/internal/nic-bot", nicBotRoutes);

router.use(
  "/school",
  schoolRoutes,
);

router.use("/discord-command-center", discordCommandCenterRoutes);

router.use("/youtube", youtubeRoutes);

export default router;
