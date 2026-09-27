import fs from "node:fs"
import path from "node:path"
// Test reading the files and the singleton logic
const baseDir = path.resolve(process.cwd(), "data", "historical-comments")
console.log("Checking directory:", baseDir)
console.log("Directory exists:", fs.existsSync(baseDir))
if (fs.existsSync(baseDir)) {
    const files = fs.readdirSync(baseDir)
    console.log("Found files:", files)
    for (const f of files) {
        if (f.endsWith(".json")) {
            const data = JSON.parse(fs.readFileSync(path.join(baseDir, f), "utf-8"))
            console.log(`File: ${f}, records: ${data.length}`)
            console.log(`Sample comment from ${f}: "${data[0]?.comment}"`)
        }
    }
}