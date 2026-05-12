import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import projectsRouter from "./projects";
import mediaRouter from "./media";
import aiJobsRouter from "./ai_jobs";
import galleriesRouter from "./galleries";
import commentsRouter from "./comments";
import favoritesRouter from "./favorites";
import clientsRouter from "./clients";
import dashboardRouter from "./dashboard";
import usersRouter from "./users";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(storageRouter);
router.use(healthRouter);
router.use(authRouter);
router.use(projectsRouter);
router.use(mediaRouter);
router.use(aiJobsRouter);
router.use(galleriesRouter);
router.use(commentsRouter);
router.use(favoritesRouter);
router.use(clientsRouter);
router.use(dashboardRouter);
router.use(usersRouter);

export default router;
