const fs = require("fs");
const path = require("path");

const dir = path.join(process.cwd(), ".next");

function removeDir(target) {
  if (!fs.existsSync(target)) return;
  fs.rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

try {
  removeDir(dir);
  console.log("Removed .next");
} catch (err) {
  console.error("Failed to remove .next:", err.message);
  process.exit(1);
}
