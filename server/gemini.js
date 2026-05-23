const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

export async function explainCodeWithGemini({
  code,
  fileName,
  language,
  apiKey,
  model,
}) {
  const prompt = `You are a friendly coding mentor inside a browser IDE called BrowserForge.
Explain code clearly for beginners. Use short sections and simple language.
Mention what the code does, key parts, and one helpful tip.

Explain this ${language || "code"} file named "${fileName || "file"}":

\`\`\`
${code}
\`\`\``;

  const response = await fetch(
    `${GEMINI_BASE_URL}/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
        },
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.error?.message || "The Gemini API returned an error.";
    throw new Error(message);
  }

  const explanation = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (!explanation) {
    throw new Error("No explanation was returned from Gemini.");
  }

  return explanation;
}
