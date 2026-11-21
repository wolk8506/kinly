// scripts/build-with-progress.mjs
// Обёртка над electron-builder: стримит его вывод и показывает живую
// строку состояния — этап сборки, спиннер и прошедшее время.
// Использование: node scripts/build-with-progress.mjs --mac --arm64
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bin = path.join(root, "node_modules", "electron-builder", "cli.js");

const args = process.argv.slice(2);
const child = spawn(process.execPath, [bin, ...args], {
  cwd: root,
  env: process.env,
});

// --- Определение этапа по выводу билдера -------------------------------
const STAGES = [
  [/dmg|hdiutil/i, "создание DMG"],
  [/nsis|installer|squirrel/i, "создание установщика"],
  [/block ?map/i, "карта блоков"],
  [/sign|notariz|identity/i, "подпись"],
  [/packag|building for production|compile/i, "упаковка приложения"],
  [/version|configuration|resolved|platform/i, "подготовка"],
];
let stage = "запуск";
const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
let frame = 0;

const startedAt = Date.now();
const fmtElapsed = () => {
  const s = Math.floor((Date.now() - startedAt) / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

const isTTY = process.stdout.isTTY;
const statusLine = () =>
  `${spinnerFrames[frame++ % spinnerFrames.length]} Kinly · ${stage} · ${fmtElapsed()}`;

function drawStatus() {
  if (!isTTY) return;
  process.stdout.write(`\r\x1b[2K${statusLine()}`);
}

function writeChunk(text) {
  if (!isTTY) {
    process.stdout.write(text);
    return;
  }
  // Стираем строку статуса, выводим строку билдера, возвращаем статус.
  process.stdout.write(`\r\x1b[2K${text}`);
  drawStatus();
}

let stageChanged = true;
child.stdout.on("data", (chunk) => {
  const text = chunk.toString();
  for (const [re, label] of STAGES) {
    if (re.test(text)) {
      if (stage !== label) {
        stage = label;
        stageChanged = true;
      }
      break;
    }
  }
  writeChunk(text);
});
child.stderr.on("data", (chunk) => writeChunk(chunk.toString()));

const timer = setInterval(() => {
  if (isTTY) drawStatus();
}, 120);

child.on("close", (code) => {
  clearInterval(timer);
  if (isTTY) process.stdout.write("\r\x1b[2K");
  process.exit(code ?? 1);
});

child.on("error", (err) => {
  clearInterval(timer);
  console.error(err);
  process.exit(1);
});
