import 'dotenv/config';
import { MemWal } from "@mysten-incubation/memwal";

async function main() {
  const memwal = MemWal.create({
    key: process.env.MEMWAL_PRIVATE_KEY,
    accountId: process.env.MEMWAL_ACCOUNT_ID,
    serverUrl: process.env.MEMWAL_SERVER_URL ?? "https://relayer.memory.walrus.xyz",
  });

  const testValue = `gate-test-${Date.now()}`;
  console.log('Storing:', testValue);

  const job = await memwal.remember(testValue);
  await memwal.waitForRememberJob(job.job_id);
  console.log('Stored successfully.');

  const result = await memwal.recall(testValue);
  console.log('Recalled:', result.results[0]?.text ?? 'nothing returned');
}

main().catch(console.error);