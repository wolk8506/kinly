import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createRequire } from "node:module";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildExportStaging } from "../helpers/buildExportStaging.mjs";
import { ARCHIVE_KIND, APP_IDENTIFIER } from "../../src/main/handlers/exportArchiveManifest.js";

const require = createRequire(import.meta.url);
const { createArchiveFromPaths } = require("../../src/main/handlers/archiveCreateFromPaths.cjs");
const { inspectArchive } = require("../../src/main/handlers/importArchiveInspect.cjs");

describe("export ZIP (manifest + archiveCreateFromPaths)", () => {
  let workDir;
  let stagingRoot;
  let zipPath;

  const people = [{ id: 1, firstName: "Экспорт", lastName: "Тестов" }];

  beforeAll(async () => {
    workDir = await mkdtemp(join(tmpdir(), "genealogy-export-test-"));
    stagingRoot = join(workDir, "staging");
    zipPath = join(workDir, "export.zip");

    const { filePaths } = await buildExportStaging(stagingRoot, {
      people,
      photoFolders: ["original", "thumbs"],
      includeTags: true,
      includeHistory: false,
    });

    const result = await createArchiveFromPaths(filePaths, zipPath);
    expect(result.totalFiles).toBeGreaterThanOrEqual(4);
    expect(result.entryNames).toContain("manifest.json");
    expect(result.entryNames).toContain("genealogy-data.json");
    expect(result.entryNames).toContain("people/1/photos.json");
    expect(result.entryNames).toContain("people/1/photos/original/shot.txt");
    expect(result.entryNames).toContain("tags.json");
  });

  afterAll(async () => {
    if (workDir) await rm(workDir, { recursive: true, force: true });
  });

  it("manifest in zip matches buildExportManifest shape", async () => {
    const info = await inspectArchive(zipPath);
    expect(info.ok).toBe(true);
    expect(info.isOurArchive).toBe(true);
    expect(info.appIdentifier).toBe(APP_IDENTIFIER);
    expect(info.peopleCount).toBe(1);
    expect(info.hasPeopleRoot).toBe(true);
    expect(info.hasTagsFile).toBe(true);
    expect(info.includeTags).toBe(true);
    expect(info.availablePhotoFolders.sort()).toEqual(["original", "thumbs"]);

    const raw = JSON.parse(await readFile(join(stagingRoot, "manifest.json"), "utf-8"));
    expect(raw.kind).toBe(ARCHIVE_KIND);
    expect(raw.version).toBe(2);
    expect(raw.appIdentifier).toBe(APP_IDENTIFIER);
  });
});