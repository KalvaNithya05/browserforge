// File extension (lowercase, no dot) → Monaco Editor language id
const EXTENSION_TO_LANGUAGE = {
  html: "html",
  css: "css",
  js: "javascript",
  ts: "typescript",
  json: "json",
  md: "markdown",
  py: "python",
  java: "java",
  cpp: "cpp",
};

export function getEditorLanguage(fileName) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TO_LANGUAGE[extension] ?? "plaintext";
}
