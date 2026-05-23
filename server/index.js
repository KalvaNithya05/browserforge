import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { explainCodeWithGemini } from "./gemini.js";
import { connectDB } from "./db/connect.js";
import projectsRouter from "./routes/projects.js";

dotenv.config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.post("/api/explain", async (req, res) => {
  const { code, fileName, language } = req.body ?? {};

  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Code is required." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is missing. Add it to server/.env",
    });
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  try {
    const explanation = await explainCodeWithGemini({
      code,
      fileName,
      language,
      apiKey,
      model,
    });

    res.json({ explanation });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not reach Gemini.";
    res.status(500).json({ error: message });
  }
});

app.use("/api/projects", projectsRouter);

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Failed to start server."
    );
    process.exit(1);
  }
}

startServer();
