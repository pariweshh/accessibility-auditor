import fs from "fs"
import path from "path"
import cp from "child_process"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const src = path.resolve(
  __dirname,
  "..",
  "node_modules",
  "@sparticuz",
  "chromium"
)
if (!fs.existsSync(src)) {
  console.error("Skipping copy: chromium not installed at", src)
  process.exit(0)
}

const candidates = [
  path.resolve(".vercel", "output", "functions"),
  path.resolve(".vercel_build_output", "functions"),
  path.resolve(".next", "server"),
  path.resolve(".next", "server", "app"),
]

function copyFolder(from, to) {
  try {
    if (fs.cpSync) {
      fs.mkdirSync(path.dirname(to), { recursive: true })
      fs.cpSync(from, to, { recursive: true })
    } else {
      const cmd =
        process.platform === "win32"
          ? `xcopy /E /I "${from}" "${to}"`
          : `cp -R "${from}" "${to}"`
      cp.execSync(cmd, { stdio: "inherit" })
    }
    console.log("copied", from, "->", to)
  } catch (e) {
    console.error("copy failed", e.message)
  }
}

candidates.forEach((dir) => {
  if (!fs.existsSync(dir)) return
  const funcs = fs.readdirSync(dir)
  funcs.forEach((f) => {
    const funcDir = path.join(dir, f)
    if (!fs.existsSync(funcDir)) return
    // try common targets inside a function bundle
    const targets = [
      path.join(funcDir, "node", "node_modules", "@sparticuz", "chromium"),
      path.join(funcDir, "node_modules", "@sparticuz", "chromium"),
    ]
    targets.forEach((t) => {
      try {
        copyFolder(src, t)
      } catch {}
    })
  })
})
