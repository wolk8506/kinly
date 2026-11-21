import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  buildExportManifest,
  buildGenealogyDataExportPayload,
} from "../../src/main/handlers/exportArchiveManifest.js";

/**
 * Имитация staging exportToZip: manifest + genealogy-data в temp, people/* из библиотеки.
 * @param {string} stagingRoot
 * @param {{ people: object[], photoFolders?: string[], includeTags?: boolean, includeHistory?: boolean }} opts
 * @returns {Promise<{ filePaths: string[], stagingRoot: string }>}
 */
export async function buildExportStaging(stagingRoot, opts) {
  const people = opts.people ?? [];
  const photoFolders = opts.photoFolders ?? ["original", "thumbs"];
  const createdAt = "2026-06-01T12:00:00.000Z";
  const archiveName = "vitest-export";

  await mkdir(stagingRoot, { recursive: true });
  await mkdir(join(stagingRoot, "people", "1", "photos", "original"), {
    recursive: true,
  });
  await mkdir(join(stagingRoot, "people", "1", "photos", "thumbs"), {
    recursive: true,
  });

  const manifestPath = join(stagingRoot, "manifest.json");
  const genealogyPath = join(stagingRoot, "genealogy-data.json");

  await writeFile(
    manifestPath,
    JSON.stringify(
      buildExportManifest({
        archiveName,
        createdAt,
        photoFolders,
        includeTags: opts.includeTags !== false,
        includeHistory: Boolean(opts.includeHistory),
      }),
      null,
      2,
    ),
    "utf-8",
  );

  await writeFile(
    genealogyPath,
    JSON.stringify(
      buildGenealogyDataExportPayload({
        people,
        archiveName,
        createdAt,
        photoFolders,
        includeTags: opts.includeTags !== false,
        includeHistory: Boolean(opts.includeHistory),
      }),
      null,
      2,
    ),
    "utf-8",
  );

  await writeFile(
    join(stagingRoot, "people", "1", "photos.json"),
    "[]",
    "utf-8",
  );
  await writeFile(
    join(stagingRoot, "people", "1", "photos", "original", "shot.txt"),
    "export-fixture",
    "utf-8",
  );
  await writeFile(
    join(stagingRoot, "people", "1", "photos", "thumbs", "shot.txt"),
    "export-fixture-thumb",
    "utf-8",
  );

  if (opts.includeTags !== false) {
    await writeFile(
      join(stagingRoot, "tags.json"),
      JSON.stringify({ tags: [], personTags: {} }),
      "utf-8",
    );
  }

  const filePaths = [manifestPath, genealogyPath, join(stagingRoot, "people", "1")];
  if (opts.includeTags !== false) {
    filePaths.push(join(stagingRoot, "tags.json"));
  }

  return { filePaths, stagingRoot };
}