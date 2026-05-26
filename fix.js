#!/usr/bin/env node
// fix-slangmath.js  — run once from project root: node fix-slangmath.js
import { existsSync, readFileSync, writeFileSync, readdirSync, copyFileSync } from "fs";
import { join } from "path";

const dir = "./node_modules/slangmath";
let patched = 0;

const npmPackageFileMap = {
  "slang-basic.js": "src/core/basic.js",
  "slang-convertor.js": "src/convertor.js",
  "slang-extended.js": "src/extended.js",
  "slang-linalg.js": "src/math/linalg.js",
  "slang-ode.js": "src/math/ode.js",
  "slang-symbolic.js": "src/symbolic.js"
};

function materializeExportFiles() {
  for (const [target, source] of Object.entries(npmPackageFileMap)) {
    const targetPath = join(dir, target);
    const sourcePath = join(dir, source);

    if (!existsSync(targetPath) && existsSync(sourcePath)) {
      copyFileSync(sourcePath, targetPath);
      patched++;
      console.log(`  + Added missing npm export: ${target}`);
    }
  }
}

function fixFile(name) {
  const path = join(dir, name);
  let src;
  try {
    src = readFileSync(path, "utf-8");
  } catch {
    console.log(`  SKIP: ${name}`);
    return;
  }

  const orig = src;

  // ── Pass 1: replace non-ASCII chars with a space ─────────────────────────
  src = src.replace(/[^\x00-\x7F]/g, " ");

  // ── Pass 2: inside block-comment bodies, neutralise any "* /" or "*/" ───
  // We track whether we are inside a /* … */ comment character-by-character.
  // Only comment BODIES are rewritten — string literals and code are untouched.
  let out = "";
  let i = 0;
  while (i < src.length) {
    // ── entering a block comment ─────────────────────────────────────────
    if (src[i] === "/" && src[i + 1] === "*") {
      out += "/*";
      i += 2;
      // scan body until the REAL closing */
      while (i < src.length) {
        if (src[i] === "*" && src[i + 1] === "/") {
          out += "*/"; // real end of comment
          i += 2;
          break;
        }
        // inside the body: if we see '*' followed (possibly after spaces) by '/',
        // esbuild may still treat it as a closer — safest: change '*' → '×' in body
        if (src[i] === "*") {
          out += "-"; // replace stray '*' in comment body with '-'
          i++;
        } else {
          out += src[i++];
        }
      }
      continue;
    }

    // ── single-line comment: copy verbatim ──────────────────────────────
    if (src[i] === "/" && src[i + 1] === "/") {
      const nl = src.indexOf("\n", i);
      if (nl === -1) {
        out += src.slice(i);
        break;
      }
      out += src.slice(i, nl + 1);
      i = nl + 1;
      continue;
    }

    // ── string literals: copy verbatim (esbuild handles */ in strings fine) ─
    if (src[i] === '"' || src[i] === "'" || src[i] === "`") {
      const q = src[i];
      out += q;
      i++;
      while (i < src.length) {
        if (src[i] === "\\") {
          out += src[i] + src[i + 1];
          i += 2;
          continue;
        }
        out += src[i];
        if (src[i++] === q) break;
      }
      continue;
    }

    out += src[i++];
  }
  src = out;

  if (src !== orig) {
    writeFileSync(path, src, "utf-8");
    patched++;
    console.log(`  ✓ Fixed: ${name}`);
  } else {
    console.log(`  · OK:    ${name}`);
  }
}

function fixDuplicateErf() {
  const path = join(dir, "slang-stats.js");
  let src;
  try {
    src = readFileSync(path, "utf-8");
  } catch {
    return;
  }
  const orig = src;
  let first = true;
  src = src.replace(/function _erf\(/g, (m) => {
    if (first) {
      first = false;
      return m;
    }
    return "function _erf2(";
  });
  if (src !== orig) {
    writeFileSync(path, src, "utf-8");
    patched++;
    console.log("  ✓ Fixed duplicate _erf in slang-stats.js");
  }
}

console.log("\n🔧 Patching slangmath...\n");
try {
  materializeExportFiles();
  const files = readdirSync(dir).filter((f) => f.endsWith(".js"));
  for (const f of files) fixFile(f);
  fixDuplicateErf();
  console.log(`\n✅ Done — ${patched} file(s) patched. Run: npm run dev\n`);
} catch (e) {
  console.error("\n❌", e.message);
  process.exit(1);
}
