#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const pkg = require("./package.json");

const PACKAGE_NAME = pkg.name;
const PACKAGE_VERSION = pkg.version;
const BEGIN = `<!-- BEGIN ${PACKAGE_NAME} -->`;
const END = `<!-- END ${PACKAGE_NAME} -->`;
const MANIFEST = ".ai-toolkit-manifest.json";
const SKILLS_DIR = path.join(".claude", "skills");

/** Czy ścieżka leży w ulotnym cache `npx`, a nie w projekcie użytkownika. */
function isNpxCache(target) {
  return target.split(path.sep).includes("_npx");
}

/**
 * Katalog projektu konsumenta.
 *
 * Przy `npm install` jako zależność siedzimy w node_modules/<scope>/<pkg>, więc pierwszy
 * przodek o nazwie node_modules wskazuje korzeń projektu.
 *
 * Przy `npx` ten sam spacer trafia w cache npx (…/_npx/<hash>/node_modules/…) — czyli
 * w katalog tymczasowy, nie w projekt. To jest właśnie ścieżka projektów bez package.json
 * (Python, Go, Rust), więc korzeń bierzemy wtedy z katalogu wywołania komendy.
 */
function findProjectRoot() {
  if (process.env.PROJECT_ROOT) return process.env.PROJECT_ROOT;

  let dir = __dirname;
  while (dir !== path.dirname(dir)) {
    if (path.basename(dir) === "node_modules") {
      const candidate = path.dirname(dir);
      if (!isNpxCache(candidate)) return candidate;
      break;
    }
    dir = path.dirname(dir);
  }

  // INIT_CWD ustawia npm na katalog, z którego wywołano komendę.
  return process.env.INIT_CWD || process.cwd();
}

function copyDir(source, target, collected, skillRoot) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const src = path.join(source, entry.name);
    const dst = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDir(src, dst, collected, skillRoot);
    } else {
      fs.copyFileSync(src, dst);
      collected.push(path.relative(skillRoot, dst).split(path.sep).join("/"));
    }
  }
}

function installSkills(projectRoot) {
  const source = path.join(__dirname, "skills");
  if (!fs.existsSync(source)) return {};

  const targetRoot = path.join(projectRoot, SKILLS_DIR);
  fs.mkdirSync(targetRoot, { recursive: true });

  const installed = {};
  for (const skill of fs.readdirSync(source, { withFileTypes: true })) {
    if (!skill.isDirectory()) continue;

    const target = path.join(targetRoot, skill.name);
    // Pełna podmiana katalogu skilla: pliki skasowane w nowej wersji nie mogą przetrwać.
    fs.rmSync(target, { recursive: true, force: true });

    const files = [];
    copyDir(path.join(source, skill.name), target, files, target);
    installed[skill.name] = { files: files.sort() };
  }
  return installed;
}

/**
 * Idempotentne wstawienie bloku reguł. Dwa przypadki, których template nie obsługuje:
 * uszkodzony blok (jeden znacznik po ręcznej edycji) i znaczniki w samej dostarczonej treści.
 * Oba kończą się wyjątkiem, bo cicha kontynuacja duplikuje albo zjada treść użytkownika.
 */
function applyRulesBlock(existing, teamRules) {
  if (teamRules.includes(BEGIN) || teamRules.includes(END)) {
    throw new Error(
      "dostarczone reguly zawieraja znaczniki sentinel — odmawiam zapisu (sentinel injection)",
    );
  }

  const start = existing.indexOf(BEGIN);
  const end = existing.indexOf(END);

  if ((start === -1) !== (end === -1)) {
    throw new Error(
      `uszkodzony blok w CLAUDE.md: znaleziono ${start !== -1 ? "BEGIN bez END" : "END bez BEGIN"}. ` +
        "Przywroc pare znacznikow albo usun resztke recznie, potem powtorz instalacje.",
    );
  }

  const block = `${BEGIN}\n${teamRules.trim()}\n${END}`;

  if (start !== -1 && end !== -1) {
    if (end < start) {
      throw new Error("uszkodzony blok w CLAUDE.md: END wystepuje przed BEGIN");
    }
    return existing.slice(0, start) + block + existing.slice(end + END.length);
  }

  return existing.trimEnd() === "" ? block + "\n" : existing.trimEnd() + "\n\n" + block + "\n";
}

function installRules(projectRoot) {
  const rulesFile = path.join(__dirname, "rules", "CLAUDE.md");
  if (!fs.existsSync(rulesFile)) return [];

  const target = path.join(projectRoot, "CLAUDE.md");
  const existing = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
  const teamRules = fs.readFileSync(rulesFile, "utf8");

  fs.writeFileSync(target, applyRulesBlock(existing, teamRules));
  return ["CLAUDE.md"];
}

function writeManifest(projectRoot, skills, rules) {
  const manifestDir = path.join(projectRoot, ".claude");
  fs.mkdirSync(manifestDir, { recursive: true });

  const manifest = {
    package: PACKAGE_NAME,
    version: PACKAGE_VERSION,
    tool: "claude-code",
    installedAt: new Date().toISOString(),
    skillsDir: SKILLS_DIR.split(path.sep).join("/"),
    files: { skills, rules },
  };

  fs.writeFileSync(path.join(manifestDir, MANIFEST), JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}

function main() {
  const projectRoot = findProjectRoot();
  const skills = installSkills(projectRoot);
  const rules = installRules(projectRoot);
  writeManifest(projectRoot, skills, rules);

  const fileCount =
    Object.values(skills).reduce((sum, s) => sum + s.files.length, 0) + rules.length;
  console.log(
    `${PACKAGE_NAME}@${PACKAGE_VERSION}: zainstalowano ${fileCount} plik(ow) ` +
      `(${Object.keys(skills).length} skill/e) w ${projectRoot}`,
  );
}

if (require.main === module) {
  try {
    // `npx` najpierw rozpakowuje paczkę do cache i odpala tam postinstall. Nie ma wtedy
    // projektu do zapisania — instalacja dzieje się dopiero przy jawnym `ai-toolkit install`.
    if (process.env.npm_lifecycle_event === "postinstall" && isNpxCache(__dirname)) {
      process.exit(0);
    }
    main();
  } catch (error) {
    // postinstall nie moze wywrocic `npm install` konsumenta
    console.warn(`${PACKAGE_NAME}: instalacja pominieta — ${error.message}`);
  }
}

module.exports = { main, applyRulesBlock, findProjectRoot, isNpxCache, BEGIN, END };
