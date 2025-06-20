import { Router } from "express";
import sessionRoutes from "./session";

const router = Router();

router.use("/session", sessionRoutes);

export { router };
