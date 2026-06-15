import 'dotenv/config';
import { MemWal } from '@mysten-incubation/memwal';
async function main() {
  const memwal = MemWal.create({
    key: process.env.MEMWAL_PRIVATE_KEY,
    accountId: process.env.MEMWAL_ACCOUNT_ID,
    serverUrl: process.env.MEMWAL_SERVER_URL ?? 'https://relayer.memwal.ai',
    namespace: 'demo',
  });
  const testValue = `gate-test-${Date.now()}`;
  console.log('Storing:', testValue);
  await memwal.rememberAndWait(testValue, undefined, { timeoutMs: 30000 });
  console.log('Stored.');
  const results = await memwal.recall({ query: testValue, topK: 5 });
  console.log('Recalled:', results);
}
main().catch(console.error);
