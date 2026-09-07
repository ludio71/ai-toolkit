#!/usr/bin/env node
/**
 * Weryfikacja instalatora na jednorazowym projekcie w katalogu tymczasowym.
 * Sprawdza cztery wlasnosci z planu: instalacje, idempotencje, guardy i czysta deinstalacje.
 */

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const install = require("../install.js");
const uninstall = require("../uninstall.js");

let failures = 0;

function check(name, condition, detail = "") {
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function withProjectRoot(root, fn) {
  const previous = process.env.PROJECT_ROOT;
  process.env.PROJECT_ROOT = root;
  try {
    return fn();
  } finally {
    if (previous === undefined) delete process.env.PROJECT_ROOT;
    else process.env.PROJECT_ROOT = previous;
  }
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), "ai-toolkit-verify-"));
const claudeMd = path.join(root, "CLAUDE.md");
const manifestPath = path.join(root, ".claude", ".ai-toolkit-manifest.json");
const skillPath = path.join(root, ".claude", "skills", "code-review", "SKILL.md");

console.log(`projekt testowy: ${root}\n`);

// --- 1. Instalacja w projekcie, ktory ma juz wlasne CLAUDE.md ---
console.log("1. instalacja");
fs.writeFileSync(claudeMd, "# Moj projekt\n\nWlasna notatka, ktora ma przezyc instalacje.\n");
withProjectRoot(root, () => install.main());

check("skill wylądował w .claude/skills/", fs.existsSync(skillPath));
check("manifest zapisany", fs.existsSync(manifestPath));

let rules = fs.readFileSync(claudeMd, "utf8");
check("blok sentinel dodany", rules.includes(install.BEGIN) && rules.includes(install.END));
check("wlasna notatka nietknieta", rules.includes("Wlasna notatka"));

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
check("manifest ma wersje z package.json", manifest.version === require("../package.json").version);
check("manifest grupuje pliki per skill", Array.isArray(manifest.files.skills["code-review"].files));

// --- 2. Idempotencja: druga instalacja nie duplikuje bloku ---
console.log("\n2. idempotencja");
fs.appendFileSync(claudeMd, "\nDopisek PO bloku — tez ma przezyc.\n");
withProjectRoot(root, () => install.main());

rules = fs.readFileSync(claudeMd, "utf8");
const beginCount = rules.split(install.BEGIN).length - 1;
check("dokladnie jeden znacznik BEGIN", beginCount === 1, `znaleziono ${beginCount}`);
check("notatka sprzed bloku przezyla", rules.includes("Wlasna notatka"));
check("dopisek zza bloku przezyl", rules.includes("Dopisek PO bloku"));

// --- 3. Guardy ---
console.log("\n3. guardy");
let threw = null;
try {
  install.applyRulesBlock("# x", `tresc z ${install.BEGIN} w srodku`);
} catch (error) {
  threw = error.message;
}
check("sentinel-injection odrzucony", threw !== null && /sentinel injection/.test(threw), threw || "brak wyjatku");

threw = null;
try {
  install.applyRulesBlock(`# x\n${install.BEGIN}\nurwane\n`, "nowe reguly");
} catch (error) {
  threw = error.message;
}
check("uszkodzony blok wykryty", threw !== null && /uszkodzony blok/.test(threw), threw || "brak wyjatku");

// --- 4. Deinstalacja ---
console.log("\n4. deinstalacja");
withProjectRoot(root, () => uninstall.main());

rules = fs.readFileSync(claudeMd, "utf8");
check("blok sentinel usuniety", !rules.includes(install.BEGIN) && !rules.includes(install.END));
check("tresc uzytkownika zostala", rules.includes("Wlasna notatka") && rules.includes("Dopisek PO bloku"));
check("plik skilla usuniety", !fs.existsSync(skillPath));
check(
  "pusty katalog skilla sprzatniety",
  !fs.existsSync(path.dirname(skillPath)),
  "zostal osierocony katalog",
);
check("manifest usuniety", !fs.existsSync(manifestPath));

fs.rmSync(root, { recursive: true, force: true });

console.log(`\n${failures === 0 ? "WSZYSTKO ZIELONE" : `${failures} niepowodzen`}`);
process.exit(failures === 0 ? 0 : 1);
