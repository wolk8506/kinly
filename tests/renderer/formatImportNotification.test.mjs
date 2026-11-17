import { describe, expect, it } from "vitest";
import { formatImportNotificationMessage } from "../../src/utils/formatImportNotificationMessage.js";

describe("formatImportNotificationMessage", () => {
  it("summarizes people, skips, and extras", () => {
    const { message, type } = formatImportNotificationMessage({
      success: 8,
      failed: 1,
      totalPersons: 9,
      peopleInArchive: 12,
      peopleSkippedByChoice: 3,
      externalImported: 2,
      externalFiles: 4,
      tagsImported: true,
      historyImported: true,
      historyLineCount: 50,
      photoFilesSkipped: 10,
      restoredDatabaseFiles: ["genealogy.sqlite"],
    });

    expect(type).toBe("error");
    expect(message).toContain("Люди: 8 из 9");
    expect(message).toContain("ошибок 1");
    expect(message).toContain("не импортировано по решению: 3");
    expect(message).toContain("Справочник: 2, файлов 4");
    expect(message).toContain("Метки: восстановлены");
    expect(message).toContain("Журнал: +50 строк");
    expect(message).toContain("не скопировано 10");
    expect(message).toContain("База лиц: восстановлена");
  });

  it("marks warning when only non-fatal errors", () => {
    const { type } = formatImportNotificationMessage({
      success: 2,
      totalPersons: 2,
      errors: [{ scope: "tags", error: "нет файла" }],
    });
    expect(type).toBe("warning");
  });
});