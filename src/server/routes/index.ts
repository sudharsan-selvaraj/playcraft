import { Router } from "express";
import sessionRoutes from "./session";
import playwrightRoutes from "./playwright";

const router = Router();

router.use("/session", sessionRoutes);
router.use("/playwright-code", playwrightRoutes);

export { router };
