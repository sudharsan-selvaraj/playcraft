import bodyParser from "body-parser";
import express from "express";
import { router } from "./routes";
import path from "path";
import { getIndexHtmlPath } from "../utils";
import cors from "cors";

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors());

// API routes first
app.use("/api", router);

// Serve static files from lib/public
app.use(express.static(path.join(__dirname, "../../lib/public")));

// Handle SPA routing - serve index.html for all non-api routes
app.get("/", (req, res) => {
  console.log(req);
  res.sendFile(getIndexHtmlPath());
});

export { app };
