import "dotenv/config";
import { db } from "../lib/db";
import { createUser } from "../lib/users";

// One-off provisioning for trusted testers (decision #5: not general-purpose
// SaaS auth, no public signup flow). Usage:
//   npm run create-user --workspace=apps/web -- <email> <password>
async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error("Usage: create-user <email> <password>");
    process.exit(1);
  }

  const user = await createUser(email, password);
  console.log(`User ready: ${user.email} (${user.id})`);
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
