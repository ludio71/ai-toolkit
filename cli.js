#!/usr/bin/env node

const command = process.argv[2] || "install";
const pkg = require("./package.json");

const commands = {
  install: () => require("./install.js").main(),
  uninstall: () => require("./uninstall.js").main(),
};

const run = commands[command];
if (!run) {
  console.error(`ai-toolkit: nieznana komenda "${command}". Uzyj: install | uninstall`);
  process.exit(1);
}

try {
  run();
} catch (error) {
  // Wywolanie reczne ma prawo zakonczyc sie bledem — w odroznieniu od postinstall.
  console.error(`${pkg.name}: ${command} nie powiodl sie — ${error.message}`);
  process.exit(1);
}
