import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { explainCode } from "./api/explainCode";
import { saveProject, listProjects, loadProject } from "./api/projects";
import { getEditorLanguage } from "./utils/getEditorLanguage";
import { normalizeFilePath } from "./utils/buildFileTree";
import { FileTree } from "./components/FileTree";

const STORAGE_KEY = "browserforge-project";
const PROJECT_ID_KEY = "browserforge-project-id";
const RESTORE_ON_START_KEY = "browserforge-restore-on-start";

const DEFAULT_FILES = {
  "index.html": `<h1>Hello Preview</h1>
<p>Edit HTML, CSS, or JS and watch the preview update.</p>`,

  "index.css": `body {
  font-family: system-ui, sans-serif;
  background: #1a1a2e;
  color: #eee;
  padding: 2rem;
}

h1 {
  color: #60a5fa;
}`,

  "script.js": `const heading = document.querySelector("h1");
heading.addEventListener("click", () => {
  heading.textContent = "You clicked the heading!";
});`,

  "src/App.jsx": `// Example file inside a folder
export function greet(name) {
  return "Hello, " + name;
}`,
};

const DEFAULT_ACTIVE_FILE = "index.html";

function buildPreviewHtml(files) {
  const html = files["index.html"] ?? "";
  const css = files["index.css"] ?? "";
  const js = files["script.js"] ?? "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>${css}</style>
</head>
<body>
  ${html}
  <script>${js}</script>
</body>
</html>`;
}

function App() {
  const [files, setFiles] = useState(DEFAULT_FILES);
  const [activeFile, setActiveFile] = useState(DEFAULT_ACTIVE_FILE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileError, setNewFileError] = useState("");
  const [renamingFile, setRenamingFile] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState("");
  const [showExplainPanel, setShowExplainPanel] = useState(false);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainText, setExplainText] = useState("");
  const [explainError, setExplainError] = useState("");
  const [projectName, setProjectName] = useState("My BrowserForge Project");
  const [projectId, setProjectId] = useState(null);
  const [projectList, setProjectList] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [dbMessage, setDbMessage] = useState("");
  const [dbLoading, setDbLoading] = useState(false);
  const [restoreOnStart, setRestoreOnStart] = useState(false);

  // Resize state
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [previewWidth, setPreviewWidth] = useState(420);
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
  const [isDraggingPreview, setIsDraggingPreview] = useState(false);

  // Projects dropdown state
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);

  // Sidebar resize handlers
  const handleSidebarMouseDown = () => {
    setIsDraggingSidebar(true);
  };

  useEffect(() => {
    if (!isDraggingSidebar) return;

    const handleMouseMove = (e) => {
      // Constrain sidebar between 220px and 500px
      const newWidth = Math.max(220, Math.min(500, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDraggingSidebar(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingSidebar]);

  // Preview resize handlers
  const handlePreviewMouseDown = () => {
    setIsDraggingPreview(true);
  };

  useEffect(() => {
    if (!isDraggingPreview) return;

    const handleMouseMove = (e) => {
      // Constrain preview between 250px and 700px
      // Calculate from right edge: window width - mouse position
      const rightEdgeX = window.innerWidth - e.clientX;
      const newWidth = Math.max(250, Math.min(700, rightEdgeX));
      setPreviewWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDraggingPreview(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingPreview]);

  // Close projects dropdown when clicking outside
  useEffect(() => {
    if (!isProjectsOpen) return;

    const handleClickOutside = (e) => {
      const projectsContainer = document.getElementById("projects-dropdown-container");
      if (projectsContainer && !projectsContainer.contains(e.target)) {
        setIsProjectsOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isProjectsOpen]);

  // Restore project from localStorage once when the app first loads
  // Default: do NOT restore previous project on startup unless the
  // user explicitly enables it by setting `browserforge-restore-on-start` to 'true'
  useEffect(() => {
    const shouldRestore = localStorage.getItem(RESTORE_ON_START_KEY) === "true";
    setRestoreOnStart(shouldRestore);

    if (shouldRestore) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const { files: savedFiles, activeFile: savedActiveFile } =
            JSON.parse(saved);

          if (savedFiles && typeof savedFiles === "object") {
            setFiles(savedFiles);

            const fileNames = Object.keys(savedFiles);
            if (savedActiveFile && savedFiles[savedActiveFile] !== undefined) {
              setActiveFile(savedActiveFile);
            } else if (fileNames.length > 0) {
              setActiveFile(fileNames[0]);
            }
          }
        } catch {
          console.warn("Could not read saved project; using defaults.");
        }
      }

      const savedProjectId = localStorage.getItem(PROJECT_ID_KEY);
      if (savedProjectId) {
        setProjectId(savedProjectId);
      }
    } else {
      // Start fresh: empty file explorer and no active file
      setFiles({});
      setActiveFile("");
      setProjectId(null);
    }

    setIsLoaded(true);
  }, []);

  // Load project list from MongoDB for the dropdown
  useEffect(() => {
    if (!isLoaded) return;

    listProjects()
      .then((projects) => setProjectList(projects))
      .catch(() => {});
  }, [isLoaded]);

  // Save project to localStorage whenever files or activeFile change
  useEffect(() => {
    if (!isLoaded) return;

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ files, activeFile })
    );
  }, [files, activeFile, isLoaded]);

  const previewHtml = buildPreviewHtml(files);

  const handleEditorChange = (value) => {
    setFiles((prev) => ({
      ...prev,
      [activeFile]: value ?? "",
    }));
  };

  const handleNewFileClick = () => {
    setRenamingFile(null);
    setRenameError("");
    setIsCreatingFile(true);
    setNewFileName("");
    setNewFileError("");
  };

  const handleNewInFolder = (folderPath) => {
    setRenamingFile(null);
    setRenameError("");
    setIsCreatingFile(true);
    setNewFileName(`${folderPath}/`);
    setNewFileError("");
  };

  const handleCreateFile = () => {
    const fileName = normalizeFilePath(newFileName);

    if (!fileName) {
      setNewFileError("Enter a file path.");
      return;
    }

    if (fileName.endsWith("/") || fileName.includes("//")) {
      setNewFileError("Enter a valid path like src/App.jsx");
      return;
    }

    if (files[fileName] !== undefined) {
      setNewFileError(`"${fileName}" already exists.`);
      return;
    }

    setFiles((prev) => ({
      ...prev,
      [fileName]: "",
    }));
    setActiveFile(fileName);
    setIsCreatingFile(false);
    setNewFileName("");
    setNewFileError("");
  };

  const handleCancelNewFile = () => {
    setIsCreatingFile(false);
    setNewFileName("");
    setNewFileError("");
  };

  const handleRenameClick = (fileName) => {
    setIsCreatingFile(false);
    setNewFileError("");
    setRenamingFile(fileName);
    setRenameValue(fileName);
    setRenameError("");
  };

  const handleCancelRename = () => {
    setRenamingFile(null);
    setRenameValue("");
    setRenameError("");
  };

  const handleSaveRename = () => {
    const oldName = renamingFile;

    if (!oldName) return;

    const newName = normalizeFilePath(renameValue);

    if (!newName) {
      setRenameError("Enter a file path.");
      return;
    }

    if (newName.endsWith("/") || newName.includes("//")) {
      setRenameError("Enter a valid path like src/App.jsx");
      return;
    }

    if (newName === oldName) {
      handleCancelRename();
      return;
    }

    if (files[newName] !== undefined) {
      setRenameError(`"${newName}" already exists.`);
      return;
    }

    setFiles((prev) => {
      const { [oldName]: content, ...rest } = prev;
      return { ...rest, [newName]: content };
    });

    if (activeFile === oldName) {
      setActiveFile(newName);
    }

    handleCancelRename();
  };

  const handleDeleteFile = (fileName) => {
    if (Object.keys(files).length <= 1) return;

    const { [fileName]: _, ...updatedFiles } = files;

    setFiles(updatedFiles);

    if (activeFile === fileName) {
      setActiveFile(Object.keys(updatedFiles)[0]);
    }

    if (renamingFile === fileName) {
      handleCancelRename();
    }
  };

  const fileCount = Object.keys(files).length;

  const handleExplainCode = async () => {
    setShowExplainPanel(true);
    setExplainLoading(true);
    setExplainText("");
    setExplainError("");

    try {
      const explanation = await explainCode({
        code: files[activeFile] ?? "",
        fileName: activeFile,
        language: getEditorLanguage(activeFile),
      });
      setExplainText(explanation);
    } catch (error) {
      setExplainError(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setExplainLoading(false);
    }
  };

  const handleCloseExplainPanel = () => {
    setShowExplainPanel(false);
    setExplainError("");
  };

  const refreshProjectList = async () => {
    const projects = await listProjects();
    setProjectList(projects);
  };

  const handleSaveToMongo = async () => {
    setDbLoading(true);
    setDbMessage("");

    try {
      const project = await saveProject({
        id: projectId,
        name: projectName.trim() || "Untitled Project",
        files,
        activeFile,
      });

      setProjectId(project.id);
      setProjectName(project.name);
      localStorage.setItem(PROJECT_ID_KEY, project.id);
      // Remember that the user explicitly saved: enable restore-on-start
      try {
        localStorage.setItem("browserforge-restore-on-start", "true");
        setRestoreOnStart(true);
      } catch {}
      await refreshProjectList();
      setSelectedProjectId(project.id);
      setDbMessage("Saved to MongoDB!");
    } catch (error) {
      setDbMessage(
        error instanceof Error ? error.message : "Could not save project."
      );
    } finally {
      setDbLoading(false);
    }
  };

  const handleLoadFromMongo = async () => {
    if (!selectedProjectId) {
      setDbMessage("Select a project to load.");
      return;
    }

    setDbLoading(true);
    setDbMessage("");

    try {
      const project = await loadProject(selectedProjectId);

      setFiles(project.files);
      setProjectName(project.name);
      setProjectId(project.id);
      localStorage.setItem(PROJECT_ID_KEY, project.id);

      const fileNames = Object.keys(project.files);
      if (project.files[project.activeFile] !== undefined) {
        setActiveFile(project.activeFile);
      } else if (fileNames.length > 0) {
        setActiveFile(fileNames[0]);
      }

      setDbMessage(`Loaded "${project.name}"`);
    } catch (error) {
      setDbMessage(
        error instanceof Error ? error.message : "Could not load project."
      );
    } finally {
      setDbLoading(false);
    }
  };

  return (
    <>
      <div className="h-screen flex bg-zinc-900 text-white overflow-hidden">
  
        {/* Sidebar */}
        <div
          className="overflow-auto border-r border-zinc-700 flex flex-col bg-zinc-900"
          style={{ width: `${sidebarWidth}px` }}
        >
  
          <header className="shrink-0 px-4 py-3 border-b border-zinc-700 bg-zinc-900/80">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white">
                  BrowserForge
                </h1>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Browser IDE
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !restoreOnStart;
                      setRestoreOnStart(next);
                      try {
                        localStorage.setItem(RESTORE_ON_START_KEY, next ? "true" : "false");
                      } catch {}
                    }}
                    className={`text-xs px-2 py-0.5 rounded ${restoreOnStart ? "bg-green-600 text-white" : "bg-zinc-700 text-zinc-100 hover:bg-zinc-600"}`}
                    aria-pressed={restoreOnStart}
                    title={restoreOnStart ? "Auto-restore enabled" : "Auto-restore disabled"}
                  >
                    {restoreOnStart ? "Auto-restore: On" : "Auto-restore: Off"}
                  </button>
                </div>
              </div>
            </div>

            {/* Projects button and dropdown */}
            <div id="projects-dropdown-container" className="relative">
              <button
                type="button"
                onClick={() => setIsProjectsOpen(!isProjectsOpen)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm font-medium transition-colors ${
                  isProjectsOpen
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-700 hover:bg-zinc-600 text-zinc-100"
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4z" />
                    <path
                      fillRule="evenodd"
                      d="M3 10a1 1 0 011-1h12a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Projects
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${
                    isProjectsOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </button>

              {/* Dropdown menu */}
              {isProjectsOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-800 border border-zinc-700 rounded shadow-lg p-3 z-50 space-y-3">
                  {/* Project name input */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1 uppercase tracking-wide">
                      Project Name
                    </label>
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-zinc-700 border border-zinc-600 rounded text-white placeholder-zinc-400 focus:outline-none focus:border-blue-500"
                      placeholder="My Project"
                    />
                  </div>

                  {/* Save button */}
                  <button
                    type="button"
                    onClick={handleSaveToMongo}
                    disabled={dbLoading}
                    className="w-full px-3 py-1.5 rounded text-sm font-medium bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-50 text-white transition-colors"
                  >
                    {dbLoading ? "Saving..." : "💾 Save Project"}
                  </button>

                  {/* Load section */}
                  <div className="border-t border-zinc-700 pt-3 space-y-2">
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wide">
                      Load Project
                    </label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-zinc-700 border border-zinc-600 rounded text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Select a project...</option>
                      {projectList.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleLoadFromMongo}
                      disabled={dbLoading || !selectedProjectId}
                      className="w-full px-3 py-1.5 rounded text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white transition-colors"
                    >
                      {dbLoading ? "Loading..." : "📂 Load Project"}
                    </button>
                  </div>

                  {/* Status message */}
                  {dbMessage && (
                    <div
                      className={`text-xs p-2 rounded ${
                        dbMessage.includes("Could not") ||
                        dbMessage.includes("Select")
                          ? "bg-red-900/40 text-red-300"
                          : "bg-green-900/40 text-green-300"
                      }`}
                    >
                      {dbMessage}
                    </div>
                  )}
                </div>
              )}
            </div>
          </header>
  
          <div className="flex-1 overflow-y-auto p-4">
  
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
                Files
              </h2>
  
              <button
                type="button"
                onClick={handleNewFileClick}
                className="text-xs px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600"
              >
                + New
              </button>
            </div>

            {/* New file input when creating */}
            {isCreatingFile && (
              <div className="mb-3 p-3 bg-zinc-800 border border-zinc-700 rounded">
                <label className="block text-xs text-zinc-300 mb-1">File path</label>
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="src/App.jsx or index.html"
                  className="w-full px-3 py-1.5 mb-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                />
                {newFileError && <div className="text-xs text-red-400 mb-2">{newFileError}</div>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCreateFile}
                    className="flex-1 text-sm px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelNewFile}
                    className="flex-1 text-sm px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <FileTree
              paths={Object.keys(files)}
              activeFile={activeFile}
              renamingFile={renamingFile}
              renameValue={renameValue}
              renameError={renameError}
              fileCount={fileCount}
              onSelect={setActiveFile}
              onRename={handleRenameClick}
              onDelete={handleDeleteFile}
              onRenameChange={setRenameValue}
              onRenameSave={handleSaveRename}
              onRenameCancel={handleCancelRename}
              onNewInFolder={handleNewInFolder}
            />
  
          </div>
        </div>

        {/* Sidebar resize divider */}
        <div
          onMouseDown={handleSidebarMouseDown}
          className={`w-1 cursor-col-resize hover:bg-blue-500 transition-colors ${
            isDraggingSidebar ? "bg-blue-500" : "bg-zinc-700"
          }`}
        />
  
        {/* Editor */}
        <div className="flex-1 border-r border-zinc-700 p-4 flex flex-col min-w-0">
  
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">
              Editor
            </h2>
  
            <button
              type="button"
              onClick={handleExplainCode}
              disabled={explainLoading}
              className="text-xs px-3 py-1.5 rounded bg-violet-600 hover:bg-violet-500"
            >
              ✨ Explain Code
            </button>
          </div>
  
          <div className="flex-1 min-h-0 rounded overflow-hidden">
            <Editor
              height="100%"
              language={getEditorLanguage(activeFile)}
              value={files[activeFile] ?? ""}
              onChange={handleEditorChange}
              theme="vs-dark"
              options={{
                automaticLayout: true,
              }}
            />
          </div>
  
        </div>

        {/* Preview resize divider */}
        <div
          onMouseDown={handlePreviewMouseDown}
          className={`w-1 cursor-col-resize hover:bg-green-500 transition-colors ${
            isDraggingPreview ? "bg-green-500" : "bg-zinc-700"
          }`}
        />
  
        {/* Preview */}
        <div
          className="overflow-auto p-4 flex flex-col bg-zinc-900"
          style={{ width: `${previewWidth}px` }}
        >
  
          <h2 className="text-lg font-bold mb-4">
            Preview
          </h2>
  
          <iframe
            title="Live preview"
            srcDoc={previewHtml}
            sandbox="allow-scripts"
            className="flex-1 w-full rounded bg-white border border-zinc-700"
          />
  
        </div>
  
        {/* AI explanation panel */}
        {showExplainPanel && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <button
              type="button"
              onClick={handleCloseExplainPanel}
              className="flex-1 bg-black/50"
              aria-label="Close explanation panel"
            />
  
            <aside className="w-full max-w-md h-full bg-zinc-800 border-l border-zinc-600 shadow-xl flex flex-col">
  
              <div className="flex items-center justify-between p-4 border-b border-zinc-700">
                <div>
                  <h1 className="text-lg font-bold text-violet-300">
                    AI Assistant
                  </h1>
  
                  <p className="text-xs text-zinc-400 font-mono mt-1">
                    Explaining: {activeFile}
                  </p>
                </div>
  
                <button
                  type="button"
                  onClick={handleCloseExplainPanel}
                  className="px-2 py-1 rounded text-zinc-400 hover:bg-zinc-700 hover:text-white"
                >
                  ×
                </button>
              </div>
  
<div className="flex-1 overflow-y-auto p-5 space-y-4">

                {explainLoading && (
                  <div className="flex items-center gap-2 text-zinc-400 animate-pulse">
                    <span className="inline-block animate-spin">⚙️</span>
                    <p>Analyzing your code...</p>
                  </div>
                )}

                {!explainLoading && explainError && (
                  <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-400 text-sm">
                    <span className="font-semibold">❌ Error: </span>{explainError}
                  </div>
                )}

                {!explainLoading && !explainError && explainText && (
                  <div className="space-y-4 text-sm leading-relaxed">
                    {/* Split explanation by paragraphs and format */}
                    {explainText.split('\n\n').map((paragraph, idx) => {
                      // Check if it's a code block (starts with backticks)
                      if (paragraph.trim().startsWith('```')) {
                        return (
                          <div key={idx} className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden">
                            <div className="bg-zinc-950 px-3 py-2 border-b border-zinc-700 text-xs font-mono text-zinc-400">
                              📝 Code Example
                            </div>
                            <pre className="p-3 overflow-x-auto text-zinc-300 text-xs font-mono">
                              <code>{paragraph.replace(/```/g, '').trim()}</code>
                            </pre>
                          </div>
                        );
                      }
                      
                      // Check if it's a heading (starts with # or **)
                      if (paragraph.trim().startsWith('**') && paragraph.trim().endsWith('**')) {
                        return (
                          <h3 key={idx} className="text-base font-bold text-violet-300 mt-4 pt-2 border-t border-zinc-700">
                            {paragraph.replace(/\*\*/g, '')}
                          </h3>
                        );
                      }
                      
                      // Check if it's a bullet list
                      if (paragraph.includes('•') || paragraph.includes('-')) {
                        return (
                          <ul key={idx} className="space-y-2 ml-2">
                            {paragraph.split('\n').filter(line => line.trim()).map((line, i) => (
                              <li key={i} className="flex gap-2 text-zinc-300">
                                <span className="text-violet-400 font-bold flex-shrink-0">✓</span>
                                <span>{line.replace(/^[-•]\s*/, '')}</span>
                              </li>
                            ))}
                          </ul>
                        );
                      }

                      // Regular paragraph
                      return (
                        <p key={idx} className="text-zinc-200 leading-relaxed">
                          {paragraph}
                        </p>
                      );
                    })}
                    
                    {/* Add footer with file info */}
                    <div className="mt-6 pt-4 border-t border-zinc-700 flex items-center gap-2 text-xs text-zinc-400">
                      <span>📄</span>
                      <span>File: <span className="text-violet-400 font-mono">{activeFile}</span></span>
                    </div>
                  </div>
                )}
                {/* Friendly fallback when explanation is empty */}
                {!explainLoading && !explainError && !explainText && (
                  <div className="text-zinc-400">
                    No explanation available. Try selecting a different file, add more code, or click "Explain Code" again.
                  </div>
                )}
  
              </div>
  
            </aside>
          </div>
        )}
  
      </div>
    </>
  );
}
export default App;