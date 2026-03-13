import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs/promises";
import { mkdirSync } from "node:fs";
import { detectWorkspace, findGitRoot, extractGitHubSlug, loadWorkspaceConfig } from "./scanner.js";

const execFileAsync = promisify(execFile);
const TEST_DIR = "/tmp/crc-workspace-test-" + Math.random().toString(36).slice(2);

async function setup(): Promise<void> {
  await fs.mkdir(TEST_DIR, { recursive: true });
  await execFileAsync("git", ["init", "-b", "main"], { cwd: TEST_DIR });
  await execFileAsync("git", ["config", "user.email", "test@test.com"], { cwd: TEST_DIR });
  await execFileAsync("git", ["config", "user.name", "Test"], { cwd: TEST_DIR });
  await fs.writeFile(`${TEST_DIR}/test.txt`, "hello");
  await execFileAsync("git", ["add", "."], { cwd: TEST_DIR });
  await execFileAsync("git", ["commit", "-m", "initial"], { cwd: TEST_DIR });
}

async function cleanup(): Promise<void> {
  await fs.rm(TEST_DIR, { recursive: true, force: true });
}

describe("Workspace scanner", () => {
  beforeEach(setup);
  afterEach(cleanup);

  it("detects a git workspace", () => {
    const ws = detectWorkspace(TEST_DIR);
    expect(ws.isGitRepo).toBe(true);
    expect(ws.root).toBe(TEST_DIR);
    expect(ws.name).toBeTruthy();
  });

  it("finds git root from subdirectory", () => {
    const subDir = `${TEST_DIR}/src`;
    mkdirSync(subDir);
    const root = findGitRoot(subDir);
    expect(root).toBe(TEST_DIR);
  });

  it("extracts GitHub slug from SSH URL", () => {
    expect(extractGitHubSlug("git@github.com:owner/repo.git")).toBe("owner/repo");
    expect(extractGitHubSlug("git@github.com:user/proj.git")).toBe("user/proj");
  });

  it("extracts GitHub slug from HTTPS URL", () => {
    expect(extractGitHubSlug("https://github.com/owner/repo.git")).toBe("owner/repo");
    expect(extractGitHubSlug("https://github.com/user/proj")).toBe("user/proj");
  });

  it("returns undefined for non-GitHub URLs", () => {
    expect(extractGitHubSlug("https://gitlab.com/owner/repo.git")).toBeUndefined();
    expect(extractGitHubSlug("file:///local/repo")).toBeUndefined();
  });

  it("loads workspace config", async () => {
    await fs.writeFile(`${TEST_DIR}/.crc.json`, JSON.stringify({
      model: "o4-mini",
      approvalPolicy: "on-request",
    }));
    const config = loadWorkspaceConfig(TEST_DIR);
    expect(config.model).toBe("o4-mini");
    expect(config.approvalPolicy).toBe("on-request");
  });

  it("returns empty config when no .crc.json exists", () => {
    const config = loadWorkspaceConfig(TEST_DIR);
    expect(config).toEqual({});
  });
});
