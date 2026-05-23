import { API_BASE } from "./config.js";

export async function explainCode({ code, fileName, language }) {
  const response = await fetch(`${API_BASE}/api/explain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, fileName, language }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to explain code.");
  }

  return data.explanation;
}
