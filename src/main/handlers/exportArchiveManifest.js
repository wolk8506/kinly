// Паспорт ZIP-бэкапа (общий для exportToZip и импорта).
// Без dataStore/config/Electron — безопасно для рендерера (Vite ESM).
export const GENEALOGY_DATA_SCHEMA_VERSION = 1;

export const APP_IDENTIFIER = "MY_GENEALOGY_APP";
export const ARCHIVE_KIND = "genealogy-archive";
export const ARCHIVE_MANIFEST_VERSION = 2;

export function buildExportManifest({
  archiveName,
  createdAt,
  photoFolders,
  includeTags,
  includeHistory,
}) {
  const folders = Array.isArray(photoFolders) ? photoFolders : [];
  return {
    appIdentifier: APP_IDENTIFIER,
    archiveName,
    createdAt,
    selectedPhotoFolders: folders,
    photoFolders: folders,
    includeTags: Boolean(includeTags),
    includeHistory: Boolean(includeHistory),
    kind: ARCHIVE_KIND,
    version: ARCHIVE_MANIFEST_VERSION,
  };
}

export function buildGenealogyDataExportPayload({
  people,
  archiveName,
  createdAt,
  photoFolders,
  includeTags,
  includeHistory,
}) {
  const folders = Array.isArray(photoFolders) ? photoFolders : [];
  return {
    schemaVersion: GENEALOGY_DATA_SCHEMA_VERSION,
    appIdentifier: APP_IDENTIFIER,
    archiveName,
    exportedAt: createdAt,
    selectedPhotoFolders: folders,
    photoFolders: folders,
    includeTags: Boolean(includeTags),
    includeHistory: Boolean(includeHistory),
    people: Array.isArray(people) ? people : [],
  };
}