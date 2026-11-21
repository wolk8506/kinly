/**
 * Краткий итог импорта ZIP для колокольчика (что вошло / что пропущено).
 * @param {object} [report]
 * @returns {{ message: string, type: 'success' | 'warning' | 'error' }}
 */
export function formatImportNotificationMessage(report) {
  if (!report || typeof report !== "object") {
    return {
      message: "Импорт из ZIP-бэкапа выполнен",
      type: "success",
    };
  }

  const segments = [];
  const success = Number(report.success) || 0;
  const failed = Number(report.failed) || 0;
  const total = Number(report.totalPersons) || 0;
  const inArchive = Number(report.peopleInArchive) || 0;
  const skippedByChoice = Number(report.peopleSkippedByChoice) || 0;

  let peopleLine = `Люди: ${success}`;
  if (total > 0) peopleLine += ` из ${total}`;
  if (failed > 0) peopleLine += `, ошибок ${failed}`;
  if (skippedByChoice > 0) {
    peopleLine += `; не импортировано по решению: ${skippedByChoice}`;
  } else if (inArchive > total && total > 0) {
    peopleLine += ` (в архиве ${inArchive})`;
  }
  segments.push(peopleLine);

  const ext = Number(report.externalImported) || 0;
  const extFiles = Number(report.externalFiles) || 0;
  const extErr = report.errors?.find((e) => e.scope === "external")?.error;
  if (extErr) {
    segments.push(`Справочник: ошибка (${extErr})`);
  } else if (ext > 0) {
    segments.push(
      `Справочник: ${ext}${extFiles ? `, файлов ${extFiles}` : ""}`,
    );
  }

  if (report.tagsSkipped) {
    segments.push("Метки: пропущены");
  } else if (report.tagsImported) {
    segments.push("Метки: восстановлены");
  } else if (report.errors?.some((e) => e.scope === "tags")) {
    const err = report.errors.find((e) => e.scope === "tags")?.error;
    segments.push(`Метки: ошибка (${err})`);
  }

  if (report.historySkipped) {
    segments.push("Журнал: пропущен");
  } else if (report.historyImported) {
    const lines = Number(report.historyLineCount) || 0;
    segments.push(lines > 0 ? `Журнал: +${lines} строк` : "Журнал: восстановлен");
  } else if (report.errors?.some((e) => e.scope === "history")) {
    const err = report.errors.find((e) => e.scope === "history")?.error;
    segments.push(`Журнал: ошибка (${err})`);
  }

  const photoSkipped = Number(report.photoFilesSkipped) || 0;
  if (photoSkipped > 0) {
    segments.push(`Файлы фото: не скопировано ${photoSkipped} (папки не выбраны)`);
  }

  if (
    Array.isArray(report.restoredDatabaseFiles) &&
    report.restoredDatabaseFiles.length > 0
  ) {
    segments.push("База лиц: восстановлена");
  }

  let type = "success";
  if (failed > 0) type = "error";
  else if (extErr || (report.errors?.length ?? 0) > 0) type = "warning";

  return {
    message: `Импорт завершён. ${segments.join(". ")}.`,
    type,
  };
}