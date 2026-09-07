#!/usr/bin/env node
/**
 * Bramka jakosci paczki — uruchamiana lokalnie i w CI przed publikacja.
 * Sprawdza to, czego zla wartosc psuje instalacje dopiero u konsumenta.
 */

const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const errors = [];

function fail(message) {
  errors.push(message);
}

// 1. Metadane paczki
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (!pkg.name) fail("package.json: brak pola name");
if (!pkg.version) fail("package.json: brak pola version");
if (!pkg.publishConfig || !pkg.publishConfig.registry) {
  fail("package.json: brak publishConfig.registry — paczka poszlaby na publiczny npm");
}
if (pkg.publishConfig && pkg.publishConfig.registry !== "https://npm.pkg.github.com") {
  fail(`package.json: publishConfig.registry = ${pkg.publishConfig.registry}, oczekiwano GitHub Packages`);
}
if (pkg.name && pkg.name.startsWith("@")) {
  const scope = pkg.name.slice(1).split("/")[0];
  const repo = (pkg.repository && pkg.repository.url) || "";
  if (repo && !repo.toLowerCase().includes(`/${scope.toLowerCase()}/`)) {
    fail(`scope @${scope} nie zgadza sie z wlascicielem repo w package.json#repository — GitHub Packages odrzuci publikacje`);
  }
}

// 2. Pliki wchodzace do paczki istnieja
for (const entry of pkg.files || []) {
  const target = path.join(root, entry);
  if (!fs.existsSync(target)) fail(`package.json#files wskazuje na nieistniejacy ${entry}`);
}

// 3. Skille: frontmatter i zgodnosc nazwy z katalogiem
const skillsDir = path.join(root, "skills");
if (!fs.existsSync(skillsDir)) {
  fail("brak katalogu skills/");
} else {
  const skills = fs.readdirSync(skillsDir, { withFileTypes: true }).filter((e) => e.isDirectory());
  if (skills.length === 0) fail("skills/ nie zawiera zadnego skilla");

  for (const skill of skills) {
    const skillFile = path.join(skillsDir, skill.name, "SKILL.md");
    if (!fs.existsSync(skillFile)) {
      fail(`skills/${skill.name}: brak SKILL.md`);
      continue;
    }

    const content = fs.readFileSync(skillFile, "utf8");
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) {
      fail(`skills/${skill.name}/SKILL.md: brak frontmattera YAML`);
      continue;
    }

    const frontmatter = match[1];
    const name = (frontmatter.match(/^name:\s*(.+)$/m) || [])[1];
    const description = (frontmatter.match(/^description:\s*(.+)$/m) || [])[1];

    if (!name) fail(`skills/${skill.name}/SKILL.md: frontmatter bez pola name`);
    if (!description) fail(`skills/${skill.name}/SKILL.md: frontmatter bez pola description`);
    if (name && name.trim() !== skill.name) {
      fail(`skills/${skill.name}/SKILL.md: name="${name.trim()}" nie zgadza sie z nazwa katalogu`);
    }
  }
}

// 4. Reguly nie moga niesc wlasnych znacznikow sentinel
const rulesFile = path.join(root, "rules", "CLAUDE.md");
if (fs.existsSync(rulesFile)) {
  const rules = fs.readFileSync(rulesFile, "utf8");
  if (rules.includes(`<!-- BEGIN ${pkg.name} -->`) || rules.includes(`<!-- END ${pkg.name} -->`)) {
    fail("rules/CLAUDE.md zawiera znaczniki sentinel — instalator odmowilby zapisu u konsumenta");
  }
}

if (errors.length > 0) {
  console.error("walidacja paczki nie przeszla:\n");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`walidacja OK: ${pkg.name}@${pkg.version}`);
