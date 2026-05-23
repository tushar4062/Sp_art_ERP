/**
 * One-time: create login credentials for senior teachers that only have a profile.
 * Usage: node scripts/backfill-senior-credentials.mjs
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");
try {
  const env = readFileSync(envPath, "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {
  /* optional .env */
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI not set");
  process.exit(1);
}

function generatePassword() {
  const specials = "@$!%*?&";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  const pick = (s) => s[Math.floor(Math.random() * s.length)];
  const chars = [pick(upper), pick(lower), pick(digits), pick(specials)];
  const pool = lower + upper + digits + specials;
  while (chars.length < 12) chars.push(pick(pool));
  return chars.sort(() => Math.random() - 0.5).join("");
}

const SeniorSchema = new mongoose.Schema(
  {
    fullName: String,
    email: String,
    phone: String,
    status: String,
    badgeId: String,
  },
  { collection: "seniorteachers", strict: false },
);

const CredentialSchema = new mongoose.Schema(
  {
    name: String,
    username: String,
    email: String,
    password: String,
    passwordHash: String,
    role: String,
    accountStatus: String,
    createdBy: String,
  },
  { collection: "credentials", strict: false },
);

async function main() {
  await mongoose.connect(uri);
  const Senior = mongoose.model("SeniorBackfill", SeniorSchema);
  const Credential = mongoose.model("CredentialBackfill", CredentialSchema);

  const seniors = await Senior.find({});
  let created = 0;
  let skipped = 0;

  for (const s of seniors) {
    const email = (s.email || "").trim().toLowerCase();
    if (!email) {
      console.warn("Skip (no email):", s.fullName, s.badgeId);
      skipped++;
      continue;
    }
    const exists = await Credential.findOne({ email });
    if (exists) {
      if (exists.role !== "senior_teacher") {
        exists.role = "senior_teacher";
        await exists.save();
        console.log("Updated role to senior_teacher:", email);
      } else {
        console.log("Already has credential:", email);
      }
      skipped++;
      continue;
    }

    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 12);
    let username = email.split("@")[0];
    let n = 1;
    while (await Credential.findOne({ username })) {
      username = `${email.split("@")[0]}${n}`;
      n++;
    }

    await Credential.create({
      name: s.fullName || "Senior Teacher",
      username,
      email,
      password,
      passwordHash,
      role: "senior_teacher",
      accountStatus: s.status === "Inactive" ? "Inactive" : "Active",
      mobileNumber: s.phone,
      createdBy: "backfill-senior-credentials",
    });

    console.log(`CREATED ${email}  temp password: ${password}`);
    created++;
  }

  console.log(`Done. Created ${created}, skipped ${skipped}.`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
