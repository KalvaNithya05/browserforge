// Extension → icon key + Tailwind color (icons rendered in FileTree.jsx)
export const FILE_ICON_MAP = {
  js: { icon: "fileCode", color: "text-yellow-400" },
  jsx: { icon: "fileCode", color: "text-yellow-400" },
  mjs: { icon: "fileCode", color: "text-yellow-400" },
  ts: { icon: "fileCode", color: "text-blue-400" },
  tsx: { icon: "fileCode", color: "text-blue-400" },
  html: { icon: "fileCode", color: "text-orange-400" },
  htm: { icon: "fileCode", color: "text-orange-400" },
  css: { icon: "palette", color: "text-sky-400" },
  json: { icon: "fileJson", color: "text-amber-300" },
  md: { icon: "fileText", color: "text-violet-300" },
  py: { icon: "fileCode", color: "text-emerald-400" },
  java: { icon: "fileCode", color: "text-red-400" },
  cpp: { icon: "fileCode", color: "text-purple-400" },
  cc: { icon: "fileCode", color: "text-purple-400" },
};

export function getFileIcon(filePath) {
  const extension = filePath.split(".").pop()?.toLowerCase() ?? "";
  return FILE_ICON_MAP[extension] ?? { icon: "file", color: "text-zinc-400" };
}
