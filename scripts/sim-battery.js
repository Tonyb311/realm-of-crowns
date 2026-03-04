/**
 * Simulation Battery Runner — 5 runs with different configs
 * Uses 10-tick batches to avoid HTTP timeout on Azure Container Apps.
 * Usage: node scripts/sim-battery.js <JWT_TOKEN>
 */
const https = require('https');
const fs = require('fs');

const API_BASE = 'https://realm-of-crowns.ambitioustree-37a1315e.eastus.azurecontainerapps.io/api';
const TOKEN = process.argv[2];
if (!TOKEN) { console.error('Usage: node scripts/sim-battery.js <JWT_TOKEN>'); process.exit(1); }

const BATCH_SIZE = 10; // ticks per HTTP request to avoid timeout

function request(method, path, body, timeoutMs = 240000) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const data = body ? JSON.stringify(body) : null;
    const headers = {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    };
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const req = https.request({
      hostname: url.hostname, path: url.pathname + url.search,
      method, headers, timeout: timeoutMs,
    }, res => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        try { resolve({ status: res.statusCode, data: JSON.parse(text) }); }
        catch { resolve({ status: res.statusCode, data: text }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    if (data) req.write(data);
    req.end();
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Run configs
const RUNS = [
  {
    name: 'Run 1: Baseline — even race/class, diverse levels',
    seed: { count: 40, raceDistribution: 'even', classDistribution: 'even', startingLevel: 'diverse', intelligence: 50, startingGold: 100, namePrefix: 'R1' },
    ticks: 30,
  },
  {
    name: 'Run 2: Realistic race/class distribution, diverse levels',
    seed: { count: 40, raceDistribution: 'realistic', classDistribution: 'realistic', startingLevel: 'diverse', intelligence: 50, startingGold: 100, namePrefix: 'R2' },
    ticks: 30,
  },
  {
    name: 'Run 3: Low-level combat (all L1 start), even distribution',
    seed: { count: 40, raceDistribution: 'even', classDistribution: 'even', startingLevel: 1, intelligence: 50, startingGold: 100, namePrefix: 'R3' },
    ticks: 30,
  },
  {
    name: 'Run 4: Mid-level combat (all L5 start), even distribution, high intelligence',
    seed: { count: 40, raceDistribution: 'even', classDistribution: 'even', startingLevel: 5, intelligence: 70, startingGold: 100, namePrefix: 'R4' },
    ticks: 30,
  },
  {
    name: 'Run 5: Warrior-heavy — melee stress test',
    seed: { count: 40, raceDistribution: 'even', classDistribution: 'even', startingLevel: 'diverse', intelligence: 60, startingGold: 100, namePrefix: 'R5' },
    ticks: 30,
    // Note: profileDistribution override not available via PATCH API (not in Zod schema)
    // Default profile is: gatherer:3, crafter:2, merchant:1, warrior:2, politician:1, socialite:1, explorer:1, balanced:2
    // Run 5 will use the same default — documenting this limitation
  },
];

async function waitForRunComplete(maxWaitMs = 300000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const status = await request('GET', '/admin/simulation/status');
    if (status.data?.runProgress === null) return true;
    console.log(`    Waiting... progress: ${JSON.stringify(status.data?.runProgress)}`);
    await sleep(5000);
  }
  return false;
}

async function runBattery() {
  const results = [];

  for (let i = 0; i < RUNS.length; i++) {
    const run = RUNS[i];
    console.log(`\n${'='.repeat(70)}`);
    console.log(`[${new Date().toISOString()}] Starting ${run.name}`);
    console.log(`${'='.repeat(70)}`);

    // 1. Stop any in-progress simulation
    await request('POST', '/admin/simulation/stop');
    await sleep(2000);

    // 2. Cleanup previous bots
    console.log('  Cleaning up previous bots...');
    const cleanup = await request('DELETE', '/admin/simulation/cleanup', { confirm: true });
    console.log(`  Cleanup: ${cleanup.status} — ${typeof cleanup.data === 'object' ? cleanup.data.message || JSON.stringify(cleanup.data) : cleanup.data}`);
    await sleep(2000);

    // 3. Seed bots
    console.log(`  Seeding ${run.seed.count} bots...`);
    const seed = await request('POST', '/admin/simulation/seed', run.seed);
    if (seed.status !== 200) {
      console.error(`  SEED FAILED: ${seed.status}`, JSON.stringify(seed.data).slice(0, 300));
      results.push({ name: run.name, error: 'Seed failed', status: seed.status });
      continue;
    }
    console.log(`  Seeded: ${seed.data.botsCreated} bots`);

    // 4. Run ticks in batches
    const totalTicks = run.ticks;
    let ticksDone = 0;
    let totalEncounters = 0;
    const runStartTime = Date.now();
    let runFailed = false;

    while (ticksDone < totalTicks) {
      const batch = Math.min(BATCH_SIZE, totalTicks - ticksDone);
      console.log(`  Running tick batch ${ticksDone + 1}-${ticksDone + batch} of ${totalTicks}...`);

      try {
        const batchResult = await request('POST', '/admin/simulation/run', { ticks: batch });
        if (batchResult.status !== 200) {
          console.error(`  BATCH FAILED: ${batchResult.status}`, JSON.stringify(batchResult.data).slice(0, 300));

          // Check if it's "already in progress" — wait for it
          if (batchResult.data?.error?.includes('already in progress')) {
            console.log('  Waiting for in-progress run to complete...');
            await waitForRunComplete();
            continue; // retry the batch
          }

          runFailed = true;
          break;
        }

        ticksDone += batchResult.data.ticksRun || batch;
        console.log(`  Batch done. Total ticks: ${ticksDone}/${totalTicks}`);
      } catch (err) {
        console.error(`  BATCH ERROR: ${err.message}`);
        // On timeout, wait for the server to finish, then continue
        if (err.message.includes('timeout')) {
          console.log('  HTTP timeout — waiting for server to finish batch...');
          await waitForRunComplete();
          // Re-check how many ticks actually completed
          const status = await request('GET', '/admin/simulation/status');
          ticksDone = status.data?.lastTickNumber || ticksDone;
          console.log(`  Server at tick ${ticksDone}, continuing...`);
        } else {
          runFailed = true;
          break;
        }
      }
    }

    const elapsed = ((Date.now() - runStartTime) / 1000).toFixed(1);
    console.log(`  Run completed in ${elapsed}s (${ticksDone} ticks, ${(elapsed / ticksDone).toFixed(1)}s/tick)`);

    if (runFailed) {
      results.push({ name: run.name, error: 'Run failed', ticksDone });
      continue;
    }

    // 5. Check SimulationRun records
    const runs_resp = await request('GET', '/admin/simulation/runs');
    const allRuns = runs_resp.data?.runs || [];
    console.log(`  Total SimulationRun records: ${allRuns.length}`);

    // Get the latest completed run(s) — batching creates multiple runs
    // Collect all runs created since this sim started (by checking startedAt)
    const runStartIso = new Date(runStartTime).toISOString();
    const thisSimRuns = allRuns.filter(r => r.startedAt >= runStartIso);

    // Sum up encounter counts from all runs in this sim
    let encounterTotal = 0;
    const runIds = [];
    for (const r of thisSimRuns) {
      encounterTotal += r.encounterCount || 0;
      runIds.push(r.id);
      console.log(`    Run ${r.id.slice(0, 8)}: ${r.status} | ${r.ticksCompleted}t | ${r.encounterCount} enc`);
    }

    // Update notes on all runs from this sim
    for (const rid of runIds) {
      await request('PATCH', `/admin/simulation/runs/${rid}`, { notes: run.name });
    }
    console.log(`  Notes updated on ${runIds.length} run record(s)`);

    results.push({
      name: run.name,
      runIds,
      ticksCompleted: ticksDone,
      encounterCount: encounterTotal,
      elapsedSeconds: parseFloat(elapsed),
      status: 'completed',
      runCount: runIds.length,
    });

    // Brief pause between runs
    if (i < RUNS.length - 1) {
      console.log('  Pausing 5s before next run...');
      await sleep(5000);
    }
  }

  // Print summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('BATTERY COMPLETE — Summary:');
  console.log(`${'='.repeat(70)}`);
  console.log(JSON.stringify(results, null, 2));

  fs.writeFileSync('scripts/sim-battery-results.json', JSON.stringify(results, null, 2));
  console.log('\nResults written to scripts/sim-battery-results.json');
}

runBattery().catch(err => {
  console.error('Battery failed:', err);
  process.exit(1);
});
