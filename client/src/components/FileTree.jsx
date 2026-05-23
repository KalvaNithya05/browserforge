import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  File,
  FileCode,
  FileJson,
  FileText,
  Folder,
  FolderOpen,
  Palette,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { buildFileTree, getBaseName } from "../utils/buildFileTree";
import { getFileIcon } from "../utils/fileIcons";

const ICONS = {
  file: File,
  fileCode: FileCode,
  fileJson: FileJson,
  fileText: FileText,
  palette: Palette,
};

const iconSm = "w-4 h-4 shrink-0";
const iconXs = "w-3.5 h-3.5 shrink-0";

// Sidebar indentation: deeper nesting = more padding
const INDENT_BASE = 8;
const INDENT_STEP = 18;

function indent(depth) {
  return INDENT_BASE + depth * INDENT_STEP;
}

function FileRow({
  filePath,
  isActive,
  isRenaming,
  renameValue,
  renameError,
  canDelete,
  onSelect,
  onRename,
  onDelete,
  onRenameChange,
  onRenameSave,
  onRenameCancel,
  depth,
}) {
  const paddingLeft = indent(depth);
  const { icon, color } = getFileIcon(filePath);
  const FileIcon = ICONS[icon] ?? File;
  const baseName = getBaseName(filePath);

  if (isRenaming) {
    return (
      <li
        className="p-2 mx-1 rounded-md bg-zinc-800/80 border border-zinc-600"
        style={{ marginLeft: paddingLeft }}
      >
        <input
          type="text"
          value={renameValue}
          onChange={(e) => onRenameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onRenameSave();
            if (e.key === "Escape") onRenameCancel();
          }}
          autoFocus
          className="w-full px-2 py-1 mb-2 rounded text-sm font-mono bg-zinc-900 border border-zinc-600 text-white"
        />
        {renameError && <p className="text-xs text-red-400 mb-2">{renameError}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onRenameSave}
            className="flex-1 text-xs py-1 rounded bg-blue-600 hover:bg-blue-500"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onRenameCancel}
            className="flex-1 text-xs py-1 rounded bg-zinc-700 hover:bg-zinc-600"
          >
            Cancel
          </button>
        </div>
      </li>
    );
  }

  return (
    <li
      className="group flex items-center gap-0.5 mx-1 rounded-md"
      style={{ paddingLeft }}
    >
      <button
        type="button"
        onClick={() => onSelect(filePath)}
        title={filePath}
        className={`flex-1 min-w-0 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-mono transition-all duration-150 ${
          isActive
            ? "bg-blue-600/90 text-white shadow-sm"
            : "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
        }`}
      >
        <FileIcon className={`${iconSm} ${isActive ? "text-white" : color}`} />
        <span className="truncate">{baseName}</span>
      </button>
      <div className="flex shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => onRename(filePath)}
          aria-label={`Rename ${filePath}`}
          className="p-1.5 rounded text-zinc-500 hover:text-amber-400 hover:bg-zinc-700"
        >
          <Pencil className={iconXs} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(filePath)}
          disabled={!canDelete}
          aria-label={`Delete ${filePath}`}
          className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-zinc-500 disabled:hover:bg-transparent"
        >
          <Trash2 className={iconXs} />
        </button>
      </div>
    </li>
  );
}

function FolderSection({
  node,
  folderPath,
  depth,
  collapsedFolders,
  onToggleFolder,
  onNewInFolder,
  fileProps,
}) {
  const folderNames = Object.keys(node.folders).sort();
  const files = [...node.files].sort();
  const paddingLeft = indent(depth);

  return (
    <>
      {files.map((filePath) => (
        <FileRow
          key={filePath}
          filePath={filePath}
          depth={depth}
          isActive={fileProps.activeFile === filePath}
          isRenaming={fileProps.renamingFile === filePath}
          renameValue={fileProps.renameValue}
          renameError={fileProps.renameError}
          canDelete={fileProps.fileCount > 1}
          onSelect={fileProps.onSelect}
          onRename={fileProps.onRename}
          onDelete={fileProps.onDelete}
          onRenameChange={fileProps.onRenameChange}
          onRenameSave={fileProps.onRenameSave}
          onRenameCancel={fileProps.onRenameCancel}
        />
      ))}

      {folderNames.map((folderName) => {
        const childPath = folderPath ? `${folderPath}/${folderName}` : folderName;
        const isCollapsed = collapsedFolders.has(childPath);
        const FolderIcon = isCollapsed ? Folder : FolderOpen;

        return (
          <li key={childPath} className="mx-1">
            <div
              className="group flex items-center gap-0.5 rounded-md transition-all duration-150 hover:bg-zinc-800"
              style={{ paddingLeft }}
            >
              <button
                type="button"
                onClick={() => onToggleFolder(childPath)}
                className="flex-1 flex items-center gap-1.5 py-1.5 text-left text-sm text-zinc-300 hover:text-zinc-100"
              >
                {isCollapsed ? (
                  <ChevronRight className={`${iconXs} text-zinc-500`} />
                ) : (
                  <ChevronDown className={`${iconXs} text-zinc-500`} />
                )}
                <FolderIcon className={`${iconSm} text-amber-400/90`} />
                <span className="font-medium truncate">{folderName}</span>
              </button>
              <button
                type="button"
                onClick={() => onNewInFolder(childPath)}
                title={`New file in ${childPath}`}
                className="shrink-0 p-1.5 mr-1 rounded text-zinc-500 opacity-0 group-hover:opacity-100 hover:bg-zinc-700 hover:text-white transition-all"
              >
                <Plus className={iconXs} />
              </button>
            </div>

            {!isCollapsed && (
              <ul>
                <FolderSection
                  node={node.folders[folderName]}
                  folderPath={childPath}
                  depth={depth + 1}
                  collapsedFolders={collapsedFolders}
                  onToggleFolder={onToggleFolder}
                  onNewInFolder={onNewInFolder}
                  fileProps={fileProps}
                />
              </ul>
            )}
          </li>
        );
      })}
    </>
  );
}

export function FileTree({
  paths,
  activeFile,
  renamingFile,
  renameValue,
  renameError,
  fileCount,
  onSelect,
  onRename,
  onDelete,
  onRenameChange,
  onRenameSave,
  onRenameCancel,
  onNewInFolder,
}) {
  const [collapsedFolders, setCollapsedFolders] = useState(new Set());
  const tree = buildFileTree(paths);

  const toggleFolder = (folderPath) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  const fileProps = {
    activeFile,
    renamingFile,
    renameValue,
    renameError,
    fileCount,
    onSelect,
    onRename,
    onDelete,
    onRenameChange,
    onRenameSave,
    onRenameCancel,
  };

  return (
    <ul className="text-sm py-1">
      <FolderSection
        node={tree}
        folderPath=""
        depth={0}
        collapsedFolders={collapsedFolders}
        onToggleFolder={toggleFolder}
        onNewInFolder={onNewInFolder}
        fileProps={fileProps}
      />
    </ul>
  );
}
