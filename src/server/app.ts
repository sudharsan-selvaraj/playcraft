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

app.use("/api", router);

app.use(express.static(path.join(__dirname, "../../lib/public")));

app.get("/", (req, res) => {
  res.sendFile(getIndexHtmlPath());
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unexpected error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

export { app };
