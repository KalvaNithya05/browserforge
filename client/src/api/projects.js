import { API_BASE } from "./config.js";

export async function saveProject({ id, name, files, activeFile }) {
  const response = await fetch(`${API_BASE}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, name, files, activeFile }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to save project.");
  }

  return data.project;
}

export async function listProjects() {
  const response = await fetch(`${API_BASE}/api/projects`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to load project list.");
  }

  return data.projects;
}

export async function loadProject(id) {
  const response = await fetch(`${API_BASE}/api/projects/${id}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to load project.");
  }

  return data.project;
}
