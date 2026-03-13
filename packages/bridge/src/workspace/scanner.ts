/**
 * Workspace detection and configuration for the CRC bridge.
 *
 * Detects git repositories, reads .git/config for remote info,
 * and manages per-workspace CRC configuration.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface WorkspaceInfo {
  /** Absolute path to the workspace root (git repo root). */
  root: string;
  /** Repository name (from remote origin URL, or directory name). */
  name: string;
  /** Remote origin URL if available. */
  remoteUrl?: string;
  /** GitHub owner/repo extracted from remote URL (e.g., "user/repo"). */
  githubSlug?: string;
  /** Whether this is a git repository. */
  isGitRepo: boolean;
}

export interface WorkspaceConfig {
  /** Default model for this workspace. */
  model?: string;
  /** Default approval policy. */
  approvalPolicy?: "on-request" | "never" | "unlessTrusted";
  /** Custom relay URL override. */
  relayUrl?: string;
}

const WORKSPACE_CONFIG_FILE = ".crc.json";

/**
 * Detect workspace information from a directory path.
 * Walks up the directory tree to find the git root.
 */
export function detectWorkspace(dirPath: string): WorkspaceInfo {
  const gitRoot = findGitRoot(dirPath);
  const isGitRepo = gitRoot !== null;

  let remoteUrl: string | undefined;
  let githubSlug: string | undefined;
  let name: string;

  if (isGitRepo && gitRoot) {
    name = gitRoot.split("/").pop() || "unknown";
    const gitConfigPath = join(gitRoot, ".git", "config");
    
    if (existsSync(gitConfigPath)) {
      const configContent = readFileSync(gitConfigPath, "utf-8");
      const remoteMatch = configContent.match(/url\s*=\s*(.+)/);
      if (remoteMatch) {
        remoteUrl = remoteMatch[1].trim();
        githubSlug = extractGitHubSlug(remoteUrl);
      }
    }
  } else {
    name = dirPath.split("/").pop() || "unknown";
  }

  return {
    root: gitRoot || dirPath,
    name,
    remoteUrl,
    githubSlug,
    isGitRepo,
  };
}

/**
 * Find the root of the git repository by walking up from the given path.
 */
export function findGitRoot(startPath: string): string | null {
  let current = startPath;
  
  while (current !== "/" && current !== "") {
    if (existsSync(join(current, ".git"))) {
      return current;
    }
    current = join(current, "..");
  }
  
  return null;
}

/**
 * Extract the owner/repo slug from a GitHub remote URL.
 * Handles both SSH (git@github.com:owner/repo.git) and HTTPS formats.
 */
export function extractGitHubSlug(remoteUrl: string): string | undefined {
  // SSH format: git@github.com:owner/repo.git
  const sshMatch = remoteUrl.match(/git@github\.com:([^/]+)\/([^/.]+)/);
  if (sshMatch) {
    return `${sshMatch[1]}/${sshMatch[2]}`;
  }
  
  // HTTPS format: https://github.com/owner/repo.git
  const httpsMatch = remoteUrl.match(/github\.com\/([^/]+)\/([^/.]+)/);
  if (httpsMatch) {
    return `${httpsMatch[1]}/${httpsMatch[2]}`;
  }
  
  return undefined;
}

/**
 * Load workspace-specific CRC configuration from .crc.json.
 */
export function loadWorkspaceConfig(workspaceRoot: string): WorkspaceConfig {
  const configPath = join(workspaceRoot, WORKSPACE_CONFIG_FILE);
  
  if (!existsSync(configPath)) {
    return {};
  }
  
  try {
    const content = readFileSync(configPath, "utf-8");
    return JSON.parse(content) as WorkspaceConfig;
  } catch {
    return {};
  }
}
