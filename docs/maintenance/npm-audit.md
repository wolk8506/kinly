# npm audit (snapshot)

**Date:** 2026-11-14 (v1.15 prep)  
**Command:** `npm audit` in repo root after `electron@45.3.2`, `vitest@3.2.7`, `@vitest/coverage-v8@3.2.7`.  
**Totals:** 19 issues — **2 critical, 0 high**, 12 moderate, 5 low *(after `npm audit fix` if applied — re-run audit before ship)*.

Do **not** run `npm audit fix --force` without a deliberate plan: npm proposes **semver-major downgrades** that conflict with current code (archiver 8, electron-builder 26, milkdown 7.6).

## Direct dependencies involved

| Package | Installed (package.json) | Severity | Chain | npm “fix” | Risk if applied |
|---------|---------------------------|----------|-------|-----------|-----------------|
| `electron-builder` | `^26.18.0` | moderate | `minimatch` → `@electron/universal` → `app-builder-lib` | downgrade to **25.1.0** | Breaks current builder stack; **dev/packaging only**, not runtime in installed app |
| `archiver` | `^8.0.0` | moderate | `readdir-glob` → `minimatch` (GHSA-g3hv-75wg-m249) | downgrade to **7.0.1** | Reverts v1.14 **ZipArchive** path in backups; DoS via crafted paths — only if attacker controls archive **inputs** |
| `@milkdown/react` | `^7.23.0` | low | `remark-math` → `katex` (prototype pollution, GHSA-238p-pmpm-9mq7) | suggests `@milkdown/react@7.6.1` (stale advice) | Bio editor only; trust / untrusted markdown context |
| `vitest` | `^3.2.7` | moderate / critical | `@vitest/mocker`, `tinypool` (dev) | `npm audit fix` within 3.x | **Dev/test only**; bump vitest when advisories target tinypool |

## Runtime vs dev

- **Packaging:** `electron-builder` / `minimatch` — used at `npm run dist:*`, not in the shipped renderer/main logic for daily use.
- **Backups:** `archiver` — main process when user exports ZIP; mitigate by not importing untrusted archives as library root.
- **Bio:** `katex` via milkdown — relevant if biography renders untrusted math; typical use is local family data.
- **Tests:** `vitest` / `tinypool` — CI and local `npm test` only.

## Recommended posture (no breaking changes)

1. **Electron 45.x** — stay on latest **45.3.x** patch before release (`npm install electron@45.3.2` or newer 45.x).
2. **Re-audit** before tag (`npm audit` + this file).
3. **electron-builder / minimatch:** watch upstream `electron-builder` 26.x for patched `app-builder-lib`; bump minor when release notes mention minimatch.
4. **archiver:** watch `archiver` 8.x or `readdir-glob` for minimatch ≥ fixed; avoid downgrade to 7 without re-testing `exportToZip` / import.
5. **milkdown / katex:** optional follow-up — override/resolution on `katex` ≥ 0.18.2 if milkdown tree allows, or isolate math in bio; test editor after any bump.
6. **vitest:** keep 3.2.x current; run `npm audit fix` for non-breaking dev-deps; no high/critical in **production** `dependencies`.

## Environment noise

`npm warn Unknown env config "devdir"` — local npm config, not a project vulnerability.