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

export async function gitAdd(repoPath: string, paths: string[]): Promise<GitOperationResult> {
  return runGit(repoPath, ["add", ...paths]);
}

export async function gitCommit(repoPath: string, message: string): Promise<GitOperationResult> {
  return runGit(repoPath, ["commit", "-m", message]);
}

export async function gitPush(repoPath: string, remote?: string, branch?: string): Promise<GitOperationResult> {
  const args = ["push"];
  if (remote && branch) args.push(remote, branch);
  return runGit(repoPath, args);
}

export async function gitPull(repoPath: string, remote?: string, branch?: string): Promise<GitOperationResult> {
  const args = ["pull"];
  if (remote && branch) args.push(remote, branch);
  return runGit(repoPath, args);
}

export async function gitBranchList(repoPath: string): Promise<GitOperationResult> {
  return runGit(repoPath, ["branch", "--list"]);
}

export async function gitBranchCreate(repoPath: string, name: string): Promise<GitOperationResult> {
  return runGit(repoPath, ["checkout", "-b", name]);
}

export async function gitBranchSwitch(repoPath: string, name: string): Promise<GitOperationResult> {
  return runGit(repoPath, ["checkout", name]);
}

export async function gitStash(repoPath: string): Promise<GitOperationResult> {
  return runGit(repoPath, ["stash"]);
}

export async function gitStashPop(repoPath: string): Promise<GitOperationResult> {
  return runGit(repoPath, ["stash", "pop"]);
}

export async function gitDiff(repoPath: string, target?: string): Promise<GitOperationResult> {
  const args = ["diff"];
  if (target) args.push(target);
  return runGit(repoPath, args);
}

export async function gitLog(repoPath: string, count = 10): Promise<GitOperationResult> {
  return runGit(repoPath, ["log", `--max-count=${count}`, "--format=%H|%s|%an|%ai"]);
}

export async function gitRemoteUrl(repoPath: string): Promise<GitOperationResult> {
  return runGit(repoPath, ["remote", "get-url", "origin"]);
}

export async function gitResetToRemote(repoPath: string): Promise<GitOperationResult> {
  return runGit(repoPath, ["reset", "--hard", "@{upstream}"]);
}
