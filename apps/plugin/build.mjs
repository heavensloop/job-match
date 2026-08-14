import "dotenv/config";
import { build, context } from "esbuild";
import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";

const watch = process.argv.includes("--watch");
const outdir = "dist";
const webAppUrl = process.env.WEB_APP_URL ?? "http://localhost:3000";

rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });

const options = {
  entryPoints: {
    background: "src/background.ts",
    popup: "src/popup.ts",
    content: "src/content.ts",
    "connect-bridge": "src/connect-bridge.ts",
    "manual-vet": "src/manual-vet.ts",
  },
  bundle: true,
  outdir,
  // IIFE rather than ESM: avoids needing "type": "module" on the service
  // worker in manifest.json and keeps popup.html's <script> tag plain.
  format: "iife",
  target: "es2022",
  sourcemap: true,
  define: {
    "process.env.WEB_APP_URL": JSON.stringify(webAppUrl),
  },
};

function copyStaticFiles() {
  const manifest = readFileSync("manifest.json", "utf8").replaceAll(
    "__WEB_APP_URL__",
    webAppUrl,
  );
  writeFileSync(`${outdir}/manifest.json`, manifest);
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
