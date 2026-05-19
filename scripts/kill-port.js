const { execSync } = require("child_process");

const port = process.argv[2] || "3000";
const isWin = process.platform === "win32";

try {
  if (isWin) {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      const m = line.trim().match(/\s+(\d+)\s*$/);
      if (m) pids.add(m[1]);
    }
    for (const pid of pids) {
      if (pid && pid !== "0") {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
          console.log(`Killed process ${pid} on port ${port}`);
        } catch {
          /* already gone */
        }
      }
    }
  } else {
    execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, {
      stdio: "inherit",
      shell: true,
    });
  }
} catch {
  console.log(`No process found on port ${port}`);
}
