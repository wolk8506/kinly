// Сборка ZIP из списка путей (archive:create) — без Electron.
const fs = require("fs");
const path = require("path");
const { ZipArchive } = require("archiver");
const {
  listFilesRecursive,
  getArchiveRoot,
  toArchiveEntryName,
} = require("./archiveUtils.cjs");

/**
 * @param {string[]} filePaths
 * @param {string} archivePath
 * @param {{ onArchiveProgress?: (payload: object) => void }} [opts]
 */
async function createArchiveFromPaths(filePaths, archivePath, opts = {}) {
  if (!filePaths?.length) {
    throw new Error("No files to archive");
  }
  if (!archivePath) {
    throw new Error("archivePath is required");
  }

  const allFiles = listFilesRecursive(filePaths);
  const archiveRoot = getArchiveRoot(filePaths);

  await fs.promises.mkdir(path.dirname(archivePath), { recursive: true });
  const output = fs.createWriteStream(archivePath);
  const archive = new ZipArchive({ zlib: { level: 9 } });
  archive.pipe(output);

  const fileEntries = [];
  let cumulative = 0;
  for (const src of allFiles) {
    let size = 0;
    try {
      size = fs.statSync(src).size || 0;
    } catch {
      size = 0;
    }
    const nameInArchive = toArchiveEntryName(archiveRoot, src);
    fileEntries.push({
      path: src,
      name: nameInArchive,
      size,
      start: cumulative,
      end: cumulative + size,
    });
    cumulative += size;
    archive.file(src, { name: nameInArchive });
  }
  const totalBytesComputed = cumulative;

  const emit = opts.onArchiveProgress;

  if (typeof emit === "function") {
    emit({
      phase: "writing2",
      totalFiles: fileEntries.length,
      processedFiles: 0,
      totalBytes: totalBytesComputed,
      processedBytes: 0,
      percent: 0,
      currentFile: "",
      filePercent: 0,
      message: "Начало записи",
    });
  }

  archive.on("progress", (info) => {
    if (typeof emit !== "function") return;

    const processed = info && info.fs ? info.fs.processedBytes : 0;
    const percent = totalBytesComputed
      ? Math.round((processed / totalBytesComputed) * 100)
      : 0;

    let currentFile = "";
    let filePercent = 0;
    let processedFiles = 0;
    for (let i = 0; i < fileEntries.length; i++) {
      const fe = fileEntries[i];
      if (processed >= fe.end) {
        processedFiles = i + 1;
        continue;
      }
      if (processed >= fe.start && processed < fe.end) {
        currentFile = fe.name;
        const inside = processed - fe.start;
        filePercent = fe.size ? Math.round((inside / fe.size) * 100) : 0;
        processedFiles = i;
        break;
      }
    }
    if (processed >= totalBytesComputed) {
      processedFiles = fileEntries.length;
      currentFile = fileEntries.length
        ? fileEntries[fileEntries.length - 1].name
        : "";
      filePercent = 100;
    }

    emit({
      phase: "writing2",
      totalFiles: fileEntries.length,
      processedFiles,
      totalBytes: totalBytesComputed,
      processedBytes: processed,
      percent,
      currentFile,
      filePercent,
      message: "Запись ZIP-бэкапа",
    });
  });

  const finalizePromise = new Promise((resolve, reject) => {
    output.on("close", () => {
      if (typeof emit === "function") {
        emit({
          phase: "writing2",
          totalFiles: fileEntries.length,
          processedFiles: fileEntries.length,
          totalBytes: totalBytesComputed,
          processedBytes: totalBytesComputed,
          percent: 100,
          currentFile: fileEntries.length
            ? fileEntries[fileEntries.length - 1].name
            : "",
          filePercent: 100,
          message: "Бэкап готов",
        });
      }
      resolve();
    });
    archive.on("warning", () => {});
    archive.on("error", (err) => reject(err));
  });

  await archive.finalize();
  await finalizePromise;

  return {
    archivePath,
    entryNames: fileEntries.map((e) => e.name),
    totalBytes: totalBytesComputed,
    totalFiles: fileEntries.length,
  };
}

module.exports = { createArchiveFromPaths };