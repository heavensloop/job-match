import { build, context } from "esbuild";
import { cpSync, mkdirSync, rmSync } from "node:fs";

const watch = process.argv.includes("--watch");
const outdir = "dist";

rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });

const options = {
  entryPoints: {
    background: "src/background.ts",
    popup: "src/popup.ts",
  },
  bundle: true,
  outdir,
  // IIFE rather than ESM: avoids needing "type": "module" on the service
  // worker in manifest.json and keeps popup.html's <script> tag plain.
  format: "iife",
  target: "es2022",
  sourcemap: true,
};

function copyStaticFiles() {
  cpSync("manifest.json", `${outdir}/manifest.json`);
  cpSync("public/popup.html", `${outdir}/popup.html`);
}

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  copyStaticFiles();
  console.log("Watching apps/plugin for changes...");
} else {
  await build(options);
  copyStaticFiles();
  console.log(`Built extension to ${outdir}/`);
}
