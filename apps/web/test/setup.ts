import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

// Feature tests need a real DATABASE_URL; prefer .env.test (a separate DB
// from dev, see .env.test.example) and fall back to .env if it's missing.
const testEnvPath = resolve(process.cwd(), ".env.test");
config({
  path: existsSync(testEnvPath) ? testEnvPath : resolve(process.cwd(), ".env"),
});
