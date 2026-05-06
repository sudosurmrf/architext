/**
 * @module @architext/web/panel/FilesTab
 * Concepts: [[FileTree]], [[FilesEngine]], [[TreeView]], [[ReactiveCompute]]
 * Spec: §4.6 Side panel — Files tab (predicted file tree from files-engine)
 * Depends on: [[spec-store]] (spec), [[@architext/files-engine]] (computeFileTree), [[@architext/catalog]] (loadCatalog)
 * Consumed by: [[SidePanel]] (tab content)
 */

import { useMemo } from "react";
import { Folder, FileText } from "lucide-react";
import { useSpecStore } from "../store/spec-store";
import { computeFileTree } from "@architext/files-engine";
import { loadCatalog } from "@architext/catalog";

interface TreeNode {
  path: string;
  name: string;
  depth: number;
  isDir: boolean;
}

function buildTreeNodes(paths: readonly string[]): TreeNode[] {
  const seenDirs = new Set<string>();
  const nodes: TreeNode[] = [];

  for (const filePath of paths) {
    const parts = filePath.split("/");
    // Emit directory nodes for each intermediate directory
    for (let i = 0; i < parts.length - 1; i++) {
      const dirPath = parts.slice(0, i + 1).join("/") + "/";
      if (!seenDirs.has(dirPath)) {
        seenDirs.add(dirPath);
        nodes.push({
          path: dirPath,
          name: parts[i]!,
          depth: i,
          isDir: true,
        });
      }
    }
    // Emit the file node
    nodes.push({
      path: filePath,
      name: parts[parts.length - 1]!,
      depth: parts.length - 1,
      isDir: false,
    });
  }

  return nodes;
}

export function FilesTab() {
  const spec = useSpecStore((s) => s.spec);

  const fileTree = useMemo(() => {
    const catalog = loadCatalog();
    return computeFileTree(spec, catalog);
  }, [spec]);

  const treeNodes = useMemo(() => buildTreeNodes(fileTree.paths), [fileTree.paths]);

  if (treeNodes.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500">
        Add services and components to see predicted files.
      </div>
    );
  }

  return (
    <div className="p-3">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Predicted Files</h3>
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-2">
        {treeNodes.map((node) => (
          <div
            key={node.path}
            className="flex items-center gap-1.5 py-0.5 text-xs text-gray-700 hover:bg-gray-100 rounded px-1 cursor-default"
            style={{ paddingLeft: `${node.depth * 16}px` }}
          >
            {node.isDir ? (
              <Folder className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
            ) : (
              <FileText className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
            )}
            <span>{node.name}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-400">
        {fileTree.paths.length} files predicted
      </p>
    </div>
  );
}
