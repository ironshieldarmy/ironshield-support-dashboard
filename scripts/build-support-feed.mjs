import { randomBytes, pbkdf2Sync, createCipheriv } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const [inputArg = "private-support-snapshot.json", outputArg = "support-feed.json", passphraseArg] =
  process.argv.slice(2);

const passphrase = passphraseArg || process.env.SUPPORT_FEED_PASSPHRASE || "";

if (!passphrase) {
  console.error("Brak hasla do zaszyfrowania feedu. Podaj je jako 3. argument albo SUPPORT_FEED_PASSPHRASE.");
  process.exit(1);
}

const inputPath = resolve(process.cwd(), inputArg);
const outputPath = resolve(process.cwd(), outputArg);
const payloadText = readFileSync(inputPath, "utf8");

let parsedPayload = null;

try {
  parsedPayload = JSON.parse(payloadText);
} catch {
  console.error("Plik wejściowy nie jest poprawnym JSON-em.");
  process.exit(1);
}

if (!parsedPayload || typeof parsedPayload !== "object" || !Array.isArray(parsedPayload.tickets)) {
  console.error("Plik wejściowy musi zawierać pole tickets jako tablicę.");
  process.exit(1);
}

const iterations = 200000;
const salt = randomBytes(16);
const iv = randomBytes(12);
const key = pbkdf2Sync(passphrase, salt, iterations, 32, "sha256");
const cipher = createCipheriv("aes-256-gcm", key, iv);
const ciphertext = Buffer.concat([cipher.update(payloadText, "utf8"), cipher.final()]);
const tag = cipher.getAuthTag();

const envelope = {
  version: 1,
  algorithm: "AES-256-GCM",
  updatedAt: new Date().toISOString(),
  kdf: {
    name: "PBKDF2",
    hash: "SHA-256",
    iterations,
    salt: salt.toString("base64"),
  },
  iv: iv.toString("base64"),
  ciphertext: ciphertext.toString("base64"),
  tag: tag.toString("base64"),
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(envelope, null, 2)}\n`, "utf8");

console.log(`Encrypted ${parsedPayload.tickets.length} tickets -> ${outputPath}`);
