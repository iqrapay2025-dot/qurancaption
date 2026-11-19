// Load testing script for Quran Caption Studio
// Evaluates concurrency ramps (10, 50, 100, 200 connections)
// Safe local benchmark against local server (http://localhost:3000)

import autocannon from 'autocannon';

const BASE_URL = process.env.BENCH_URL || 'http://localhost:3000';

const scenarios = [
  {
    name: 'Read Path: Quran Chapters (/api/quran/chapters)',
    url: `${BASE_URL}/api/quran/chapters`,
    method: 'GET',
    duration: 5,
  },
  {
    name: 'Read Path: Surah Al-Fatihah Verses (/api/quran/verses?surah=1&from=1&to=7)',
    url: `${BASE_URL}/api/quran/verses?surah=1&from=1&to=7`,
    method: 'GET',
    duration: 5,
  },
  {
    name: 'Auth Session Verification (/api/app/auth/me)',
    url: `${BASE_URL}/api/app/auth/me`,
    method: 'GET',
    duration: 5,
  },
  {
    name: 'Static Core App Route (/)',
    url: `${BASE_URL}/`,
    method: 'GET',
    duration: 5,
  },
];

const concurrencies = [10, 50, 100, 200];

async function runBenchmark() {
  console.log(`=======================================================`);
  console.log(`   QURAN CAPTION STUDIO - LOCAL BENCHMARK SUITE       `);
  console.log(`   Target: ${BASE_URL}                                `);
  console.log(`   Date: ${new Date().toISOString()}                  `);
  console.log(`=======================================================\n`);

  const summaryResults = [];

  for (const scenario of scenarios) {
    console.log(`\n>>> SCENARIO: ${scenario.name}`);
    console.log(`URL: ${scenario.url}`);

    for (const c of concurrencies) {
      process.stdout.write(`  [Concurrency ${c.toString().padEnd(3)}] Running for ${scenario.duration}s... `);
      try {
        const result = await autocannon({
          url: scenario.url,
          method: scenario.method,
          connections: c,
          duration: scenario.duration,
          pipelining: 1,
        });

        const rps = Math.round(result.requests.average);
        const p50 = result.latency.p50;
        const p95 = result.latency.p97_5 || result.latency.p99;
        const p99 = result.latency.p99;
        const errors = result.errors + result.timeouts;
        const non2xx = result.non2xx;

        console.log(`DONE: Req/sec: ${rps} | p50: ${p50}ms | p95: ${p95}ms | p99: ${p99}ms | Errors: ${errors} | Non-2xx: ${non2xx}`);

        summaryResults.push({
          scenario: scenario.name,
          concurrency: c,
          rps,
          p50,
          p95,
          p99,
          errors,
          non2xx,
        });
      } catch (err) {
        console.log(`FAILED: ${err.message}`);
        summaryResults.push({
          scenario: scenario.name,
          concurrency: c,
          error: err.message,
        });
      }
    }
  }

  console.log('\n\n=======================================================');
  console.log('                 FINAL BENCHMARK SUMMARY               ');
  console.log('=======================================================');
  console.table(summaryResults);
}

runBenchmark().catch(console.error);
