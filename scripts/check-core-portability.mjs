#!/usr/bin/env node
/**
 * Guards the one invariant that makes @winelore/core reusable by the Expo app:
 * it must not reach for anything that only exists in a browser, in Node, or in
 * Next.js. If you need one of those, take it as a parameter and let the caller
 * (web or native) supply the platform's version.
 *
 * Run with `npm run check:core`.
 */
import { readFileSync } from "node:fs"
import { globSync } from "node:fs"
import { join } from "node:path"

const ROOT = "packages/core/src"

/** Generated GraphQL output is not hand-written and is platform-neutral in practice. */
const IGNORE = [/^packages\/core\/src\/gql\//]

const BANNED = [
  { re: /\bfrom\s+['"]node:/, what: "a node: builtin" },
  { re: /\bfrom\s+['"](fs|path|crypto|os|child_process)['"]/, what: "a Node core module" },
  { re: /\bfrom\s+['"]next(\/|['"])/, what: "next" },
  { re: /\bfrom\s+['"]react-dom(\/|['"])/, what: "react-dom" },
  { re: /\bfrom\s+['"]js-cookie['"]/, what: "js-cookie" },
  { re: /(?<![\w.])document\s*\./, what: "document" },
  { re: /(?<![\w.])window\s*\./, what: "window" },
  { re: /(?<![\w.])localStorage\b/, what: "localStorage" },
  { re: /(?<![\w.])navigator\s*\./, what: "navigator" },
  { re: /(?<![\w.])process\s*\.\s*cwd\b/, what: "process.cwd()" },
]

const files = globSync(join(ROOT, "**/*.{ts,tsx}"))
const violations = []

for (const file of files) {
  if (IGNORE.some((re) => re.test(file))) continue
  const lines = readFileSync(file, "utf8").split("\n")
  lines.forEach((line, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return
    for (const { re, what } of BANNED) {
      if (re.test(line)) violations.push({ file, line: i + 1, what, text: line.trim() })
    }
  })
}

if (violations.length) {
  console.error(`\n@winelore/core must stay platform-agnostic — ${violations.length} violation(s):\n`)
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  uses ${v.what}`)
    console.error(`    ${v.text.slice(0, 100)}`)
  }
  console.error(`\nPass the platform's implementation in as a parameter instead.\n`)
  process.exit(1)
}

console.log(`@winelore/core is platform-agnostic (${files.length} files checked).`)
