import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as git from "./operations.js";
import * as fs from "node:fs/promises";

const execFileAsync = promisify(execFile);

// Use a temp git repo for integration tests
const TEST_REPO = "/tmp/crc-git-test-" + Math.random().toString(36).slice(2);

async function setupTestRepo(): Promise<void> {
  await fs.mkdir(TEST_REPO, { recursive: true });
  await execFileAsync("git", ["init", "-b", "main"], { cwd: TEST_REPO });
  await execFileAsync("git", ["config", "user.email", "test@test.com"], { cwd: TEST_REPO });
  await execFileAsync("git", ["config", "user.name", "Test"], { cwd: TEST_REPO });
  await fs.writeFile(`${TEST_REPO}/test.txt`, "hello");
  await execFileAsync("git", ["add", "."], { cwd: TEST_REPO });
  await execFileAsync("git", ["commit", "-m", "initial"], { cwd: TEST_REPO });
}

async function cleanupTestRepo(): Promise<void> {
  await fs.rm(TEST_REPO, { recursive: true, force: true });
}

describe("Git operations", () => {
  beforeEach(async () => {
    await setupTestRepo();
  });

  afterEach(async () => {
    await cleanupTestRepo();
  });

  it("gitStatus returns current branch", async () => {
    const status = await git.gitStatus(TEST_REPO);
    expect(status.branch).toBe("main");
    expect(status.dirty).toBe(false);
    expect(status.staged).toHaveLength(0);
  });

  it("gitStatus detects dirty files", async () => {
    await fs.writeFile(`${TEST_REPO}/new.txt`, "new file");
    const status = await git.gitStatus(TEST_REPO);
    expect(status.dirty).toBe(true);
    expect(status.untracked).toContain("new.txt");
  });

  it("gitAdd stages files", async () => {
    await fs.writeFile(`${TEST_REPO}/new.txt`, "new file");
    const result = await git.gitAdd(TEST_REPO, ["new.txt"]);
    expect(result.success).toBe(true);
    
    const status = await git.gitStatus(TEST_REPO);
    expect(status.staged).toContain("new.txt");
  });

  it("gitBranchCreate creates a new branch", async () => {
    const result = await git.gitBranchCreate(TEST_REPO, "feature");
    expect(result.success).toBe(true);
    
    const status = await git.gitStatus(TEST_REPO);
    expect(status.branch).toBe("feature");
  });

  it("gitLog returns commits", async () => {
    const result = await git.gitLog(TEST_REPO, 5);
    expect(result.success).toBe(true);
    expect(result.output).toContain("initial");
  });

  it("gitDiff returns diff output", async () => {
    await fs.writeFile(`${TEST_REPO}/test.txt`, "modified");
    const result = await git.gitDiff(TEST_REPO);
    expect(result.success).toBe(true);
    expect(result.output).toContain("test.txt");
  });

  it("gitBranchList lists branches", async () => {
    await git.gitBranchCreate(TEST_REPO, "develop");
    const result = await git.gitBranchList(TEST_REPO);
    expect(result.success).toBe(true);
    expect(result.output).toContain("main");
    expect(result.output).toContain("develop");
  });
});
