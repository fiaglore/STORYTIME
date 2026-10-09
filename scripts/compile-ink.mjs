// Compiles every chapters/*.ink file into src/content/compiled/*.json
// using the inkjs compiler CLI, so the app only ever loads pre-compiled
// Ink JSON at runtime (no compiler bundle shipped to the browser).
import { execFileSync } from "node:child_process";
import {
  readdirSync,
  existsSync,
  mkdirSync,
  rmSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const chaptersDir = join(root, "chapters");
const outDir = join(root, "src", "content", "compiled");
const compilerBin = join(root, "node_modules", "inkjs", "bin", "inkjs-compiler.js");

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const inkFiles = readdirSync(chaptersDir).filter((f) => f.endsWith(".ink"));

if (inkFiles.length === 0) {
  console.log("No .ink files found in chapters/.");
  process.exit(0);
}

let hadError = false;

for (const file of inkFiles) {
  const inkPath = join(chaptersDir, file);
  const producedJson = `${inkPath}.json`;
  const finalName = basename(file, ".ink") + ".json";
  const finalPath = join(outDir, finalName);

  console.log(`Compiling ${file}...`);
  try {
    execFileSync("node", [compilerBin, inkPath], { stdio: "inherit" });
    if (!existsSync(producedJson)) {
      throw new Error(`Compiler did not produce ${producedJson}`);
    }
    // inklecate/inkjs-compiler writes a UTF-8 BOM that breaks JSON.parse
    // in the browser; strip it while relocating the file into src/.
    const raw = readFileSync(producedJson, "utf8").replace(/^﻿/, "");
    writeFileSync(finalPath, raw);
    rmSync(producedJson);
    console.log(`  -> ${finalName}`);
  } catch (err) {
    hadError = true;
    console.error(`Failed to compile ${file}:`, err.message);
    if (existsSync(producedJson)) rmSync(producedJson);
  }
}

if (hadError) process.exit(1);
