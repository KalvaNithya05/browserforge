import express from "express";
import { Project } from "../models/Project.js";

const router = express.Router();

// POST /api/projects — save a project (create or update)
router.post("/", async (req, res) => {
  const { id, name, files, activeFile } = req.body ?? {};

  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "Project name is required." });
  }

  if (!files || typeof files !== "object") {
    return res.status(400).json({ error: "Files are required." });
  }

  if (!activeFile || typeof activeFile !== "string") {
    return res.status(400).json({ error: "activeFile is required." });
  }

  if (files[activeFile] === undefined) {
    return res.status(400).json({
      error: "activeFile must match a file in files.",
    });
  }

  try {
    if (id) {
      const updated = await Project.findByIdAndUpdate(
        id,
        { name: name.trim(), files, activeFile },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ error: "Project not found." });
      }

      return res.json({
        message: "Project updated",
        project: {
          id: updated._id.toString(),
          name: updated.name,
          files: updated.files,
          activeFile: updated.activeFile,
        },
      });
    }

    const created = await Project.create({
      name: name.trim(),
      files,
      activeFile,
    });

    res.status(201).json({
      message: "Project saved",
      project: {
        id: created._id.toString(),
        name: created.name,
        files: created.files,
        activeFile: created.activeFile,
      },
    });
  } catch {
    res.status(500).json({ error: "Could not save project." });
  }
});

// GET /api/projects — list all saved projects
router.get("/", async (_req, res) => {
  try {
    const projects = await Project.find()
      .select("name activeFile updatedAt")
      .sort({ updatedAt: -1 });

    res.json({
      projects: projects.map((p) => ({
        id: p._id.toString(),
        name: p.name,
        activeFile: p.activeFile,
        updatedAt: p.updatedAt,
      })),
    });
  } catch {
    res.status(500).json({ error: "Could not load project list." });
  }
});

// GET /api/projects/:id — load one project
router.get("/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ error: "Project not found." });
    }

    res.json({
      project: {
        id: project._id.toString(),
        name: project.name,
        files: project.files,
        activeFile: project.activeFile,
      },
    });
  } catch {
    res.status(500).json({ error: "Could not load project." });
  }
});

export default router;
