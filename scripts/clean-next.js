const fs = require("fs");
const path = require("path");

const dir = path.join(process.cwd(), ".next");

try {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
  console.log("Removed .next");
} catch (err) {
  console.error("Failed to remove .next:", err.message);
  process.exit(1);
}