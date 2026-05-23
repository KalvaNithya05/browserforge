// Turn flat path keys into a simple folder tree (not a real filesystem).
// Example: "src/App.jsx" → folders.src.files includes "src/App.jsx"
export function buildFileTree(paths) {
  const root = { folders: {}, files: [] };

  for (const path of [...paths].sort()) {
    const parts = path.split("/");

    if (parts.length === 1) {
      root.files.push(path);
      continue;
    }

    let current = root;

    for (let i = 0; i < parts.length - 1; i++) {
      const folderName = parts[i];

      if (!current.folders[folderName]) {
        current.folders[folderName] = { folders: {}, files: [] };
      }

      current = current.folders[folderName];
    }

    current.files.push(path);
  }

  return root;
}

export function normalizeFilePath(path) {
  return path.trim().replace(/\\/g, "/").replace(/^\/+/, "");
}

export function getBaseName(filePath) {
  return filePath.split("/").pop() ?? filePath;
}
