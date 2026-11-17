const { ipcMain } = require("electron");
const { getMainWindow } = require("../mainWindow.cjs");
const { listFilesRecursive, getTotalSize } = require("./archiveUtils.cjs");
const { createArchiveFromPaths } = require("./archiveCreateFromPaths.cjs");

function safeSend(win, payload) {
  if (!win || !win.webContents) return;
  if (!payload || typeof payload !== "object") return;
  try {
    win.webContents.send("archive:progress", payload);
  } catch (e) {}
}

ipcMain.handle("archive:create", async (_, filePaths, archivePath) => {
  const win = getMainWindow();
  if (!filePaths || filePaths.length === 0)
    throw new Error("No files to archive");
  if (!archivePath) return null;

  const allFiles = listFilesRecursive(filePaths);
  const totalFiles = allFiles.length;
  const totalBytes = getTotalSize(allFiles);
  safeSend(win, {
    phase: "preparation",
    totalFiles,
    processedFiles: 0,
    totalBytes,
    processedBytes: 0,
    percent: 0,
    message: "Подготовка файлов",
  });

  let prepCount = 0;
  for (const f of allFiles) {
    prepCount++;
    if (prepCount % 10 === 0 || prepCount === totalFiles) {
      safeSend(win, {
        phase: "preparation",
        totalFiles,
        processedFiles: prepCount,
        totalBytes,
        processedBytes: 0,
        percent: Math.round((prepCount / totalFiles) * 100),
        message: `Подготовлено ${prepCount}/${totalFiles}`,
      });
    }
  }

  await createArchiveFromPaths(filePaths, archivePath, {
    onArchiveProgress: (payload) => safeSend(win, payload),
  });

  return archivePath;
});