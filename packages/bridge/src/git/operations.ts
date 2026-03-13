/**
 * Git operations module for the CRC bridge.
 *
 * Provides typed async wrappers for git commands that the mobile client
 * can invoke through the bridge. All operations run in a specified repo path.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface GitOperationResult {
  success: boolean;
  output: string;
  error?: string;
}

export interface GitStatusResult {
  branch: string;
  ahead: number;
  behind: number;
  dirty: boolean;
  staged: string[];
  modified: string[];
  untracked: string[];
}

export interface GitBranchInfo {
  name: string;
  current: boolean;
}

export interface GitLogEntry {
  hash: string;
  message: string;
  author: string;
  date: string;
}

function runGit(repoPath: string, args: string[]): Promise<GitOperationResult> {
  return execFileAsync("git", args, {
    cwd: repoPath,
    maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large diffs
    timeout: 30000,
  })
    .then(({ stdout }) => ({ success: true, output: stdout.trim() }))
    .catch((err: Error & { stderr?: string }) => ({
      success: false,
      output: "",
      error: err.stderr || err.message,
    }));
}

/**
 * Returns the current branch, ahead/behind counts, and staged/modified/untracked files.
 * @param repoPath - Absolute path to the git repository.
 * @returns A {@link GitStatusResult} with branch info and file lists.
 */
export async function gitStatus(repoPath: string): Promise<GitStatusResult> {
  const branchResult = await runGit(repoPath, ["rev-parse", "--abbrev-ref", "HEAD"]);
  if (!branchResult.success) {
    return { branch: "unknown", ahead: 0, behind: 0, dirty: false, staged: [], modified: [], untracked: [] };
  }
  const branch = branchResult.output;

  // Get ahead/behind counts
  const abResult = await runGit(repoPath, [
    "rev-list", "--left-right", "--count", "HEAD...@{upstream}",
  ]);
  let ahead = 0, behind = 0;
  if (abResult.success && abResult.output.includes("\t")) {
    const [a, b] = abResult.output.split("\t").map(Number);
    ahead = a || 0;
    behind = b || 0;
  }

  // Get file status
  const statusResult = await runGit(repoPath, ["status", "--porcelain=v1"]);
  const staged: string[] = [];
  const modified: string[] = [];
  const untracked: string[] = [];

  if (statusResult.success) {
    for (const line of statusResult.output.split("\n")) {
      if (!line) continue;
      const filePath = line.slice(3);
      const index = line[0];
      const worktree = line[1];
      if (index !== "?" && index !== " ") staged.push(filePath);
      if (worktree === "M" || worktree === "D") modified.push(filePath);
      if (index === "?" && worktree === "?") untracked.push(filePath);
    }
  }

  const dirty = staged.length > 0 || modified.length > 0 || untracked.length > 0;
  return { branch, ahead, behind, dirty, staged, modified, untracked };
}

/**
 * Stages the given file paths in the git index.
 * @param repoPath - Absolute path to the git repository.
 * @param paths - File or directory paths to stage.
 * @returns A {@link GitOperationResult} indicating success or failure.
 */
export async function gitAdd(repoPath: string, paths: string[]): Promise<GitOperationResult> {
  return runGit(repoPath, ["add", ...paths]);
}

/**
 * Creates a new commit with the specified message.
 * @param repoPath - Absolute path to the git repository.
 * @param message - The commit message string.
 * @returns A {@link GitOperationResult} indicating success or failure.
 */
export async function gitCommit(repoPath: string, message: string): Promise<GitOperationResult> {
  return runGit(repoPath, ["commit", "-m", message]);
}

/**
 * Pushes commits to a remote, optionally specifying the remote and branch.
 * @param repoPath - Absolute path to the git repository.
 * @param remote - Optional remote name (e.g. "origin").
 * @param branch - Optional branch name to push.
 * @returns A {@link GitOperationResult} indicating success or failure.
 */
export async function gitPush(repoPath: string, remote?: string, branch?: string): Promise<GitOperationResult> {
  const args = ["push"];
  if (remote && branch) args.push(remote, branch);
  return runGit(repoPath, args);
}

/**
 * Pulls changes from a remote, optionally specifying the remote and branch.
 * @param repoPath - Absolute path to the git repository.
 * @param remote - Optional remote name (e.g. "origin").
 * @param branch - Optional branch name to pull.
 * @returns A {@link GitOperationResult} indicating success or failure.
 */
export async function gitPull(repoPath: string, remote?: string, branch?: string): Promise<GitOperationResult> {
  const args = ["pull"];
  if (remote && branch) args.push(remote, branch);
  return runGit(repoPath, args);
}

/**
 * Lists all local branches.
 * @param repoPath - Absolute path to the git repository.
 * @returns A {@link GitOperationResult} with the branch listing output.
 */
export async function gitBranchList(repoPath: string): Promise<GitOperationResult> {
  return runGit(repoPath, ["branch", "--list"]);
}

/**
 * Creates and switches to a new branch with the given name.
 * @param repoPath - Absolute path to the git repository.
 * @param name - The name for the new branch.
 * @returns A {@link GitOperationResult} indicating success or failure.
 */
export async function gitBranchCreate(repoPath: string, name: string): Promise<GitOperationResult> {
  return runGit(repoPath, ["checkout", "-b", name]);
}

/**
 * Switches to an existing branch with the given name.
 * @param repoPath - Absolute path to the git repository.
 * @param name - The name of the branch to switch to.
 * @returns A {@link GitOperationResult} indicating success or failure.
 */
export async function gitBranchSwitch(repoPath: string, name: string): Promise<GitOperationResult> {
  return runGit(repoPath, ["checkout", name]);
}

/**
 * Stashes the current working directory changes.
 * @param repoPath - Absolute path to the git repository.
 * @returns A {@link GitOperationResult} indicating success or failure.
 */
export async function gitStash(repoPath: string): Promise<GitOperationResult> {
  return runGit(repoPath, ["stash"]);
}

/**
 * Applies the most recent stash entry to the working directory.
 * @param repoPath - Absolute path to the git repository.
 * @returns A {@link GitOperationResult} indicating success or failure.
 */
export async function gitStashPop(repoPath: string): Promise<GitOperationResult> {
  return runGit(repoPath, ["stash", "pop"]);
}

/**
 * Shows the diff of unstaged changes, optionally against a target ref.
 * @param repoPath - Absolute path to the git repository.
 * @param target - Optional ref to diff against (e.g. a commit hash or branch).
 * @returns A {@link GitOperationResult} with the diff output.
 */
export async function gitDiff(repoPath: string, target?: string): Promise<GitOperationResult> {
  const args = ["diff"];
  if (target) args.push(target);
  return runGit(repoPath, args);
}

/**
 * Returns formatted commit log entries, up to the specified count.
 * @param repoPath - Absolute path to the git repository.
 * @param count - Maximum number of log entries to return (default 10).
 * @returns A {@link GitOperationResult} with pipe-delimited log output.
 */
export async function gitLog(repoPath: string, count = 10): Promise<GitOperationResult> {
  return runGit(repoPath, ["log", `--max-count=${count}`, "--format=%H|%s|%an|%ai"]);
}

/**
 * Returns the origin remote URL for the repository.
 * @param repoPath - Absolute path to the git repository.
 * @returns A {@link GitOperationResult} with the remote URL.
 */
export async function gitRemoteUrl(repoPath: string): Promise<GitOperationResult> {
  return runGit(repoPath, ["remote", "get-url", "origin"]);
}

/**
 * Hard-resets the working tree and index to match the upstream branch.
 * @param repoPath - Absolute path to the git repository.
 * @returns A {@link GitOperationResult} indicating success or failure.
 */
export async function gitResetToRemote(repoPath: string): Promise<GitOperationResult> {
  return runGit(repoPath, ["reset", "--hard", "@{upstream}"]);
}
