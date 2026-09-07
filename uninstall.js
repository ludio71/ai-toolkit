#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const pkg = require("./package.json");

const PACKAGE_NAME = pkg.name;
const BEGIN = `<!-- BEGIN ${PACKAGE_NAME} -->`;
const END = `<!-- END ${PACKAGE_NAME} -->`;
const MANIFEST = ".ai-toolkit-manifest.json";

function findProjectRoot() {
  if (process.env.PROJECT_ROOT) return process.env.PROJECT_ROOT;

  let dir = __dirname;
  while (dir !== path.dirname(dir)) {
    if (path.basename(dir) === "node_modules") return path.dirname(dir);
    dir = path.dirname(dir);
  }
  return process.cwd();
}

function removeRulesBlock(content) {
  const start = content.indexOf(BEGIN);
  const end = content.indexOf(END);
  if (start === -1 || end === -1 || end < start) return content;
  return (content.slice(0, start) + content.slice(end + END.length)).replace(/\n{3,}/g, "\n\n");
}

/** Usuwa katalog tylko wtedy, gdy jest pusty — nigdy nie kasuje cudzych plików. */
function pruneIfEmpty(dir) {
  try {
    if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
      fs.rmdirSync(dir);
      return true;
    }
  } catch {
    /* katalog zajęty albo nieusuwalny — zostawiamy w spokoju */
  }
  return false;
}

function main() {
  const projectRoot = findProjectRoot();
  const manifestPath = path.join(projectRoot, ".claude", MANIFEST);

  if (!fs.existsSync(manifestPath)) {
    console.log(`${PACKAGE_NAME}: brak manifestu w ${projectRoot} — nie ma czego usuwac`);
    return;
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (error) {
    // Uszkodzony manifest: nie zgadujemy po zawartosci katalogu, zostawiamy pliki.
    console.error(
      `${PACKAGE_NAME}: manifest jest uszkodzony (${error.message}). ` +
        "Zadne pliki nie zostaly usuniete — sprzatnij recznie albo przywroc manifest.",
    );
    process.exitCode = 1;
    return;
  }

  const skillsDir = manifest.skillsDir || ".claude/skills";
  const skills = (manifest.files && manifest.files.skills) || {};
  let removed = 0;

  for (const [skillName, entry] of Object.entries(skills)) {
    const skillRoot = path.join(projectRoot, ...skillsDir.split("/"), skillName);

    for (const relFile of entry.files || []) {
      const target = path.join(skillRoot, ...relFile.split("/"));
      if (fs.existsSync(target)) {
        fs.rmSync(target, { force: true });
        removed += 1;
      }
      // Podkatalogi skilla (np. references/) sprzatane od najglebszego.
      let dir = path.dirname(target);
      while (dir.startsWith(skillRoot) && dir !== skillRoot && pruneIfEmpty(dir)) {
        dir = path.dirname(dir);
      }
    }
    pruneIfEmpty(skillRoot);
  }

  pruneIfEmpty(path.join(projectRoot, ...skillsDir.split("/")));

  const rulesPath = path.join(projectRoot, "CLAUDE.md");
  if (fs.existsSync(rulesPath)) {
    const before = fs.readFileSync(rulesPath, "utf8");
    const after = removeRulesBlock(before);
    if (after !== before) {
      // Plik zostaje, jesli poza blokiem cokolwiek jest — to tresc uzytkownika.
      if (after.trim() === "") fs.rmSync(rulesPath, { force: true });
      else fs.writeFileSync(rulesPath, after);
      removed += 1;
    }
  }

  fs.rmSync(manifestPath, { force: true });
  pruneIfEmpty(path.join(projectRoot, ".claude"));

  console.log(`${PACKAGE_NAME}: usunieto ${removed} zarzadzany(ch) plik(ow) z ${projectRoot}`);
}

if (require.main === module) main();

module.exports = { main, removeRulesBlock };
