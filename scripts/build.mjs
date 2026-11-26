import { execSync } from 'child_process';

const hasDb = Boolean(
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.NEON_DATABASE_URL
);

if (hasDb) {
  console.log('Running Payload database migrations...');
  try {
    execSync('npx payload migrate --force-accept-warning', { stdio: 'inherit' });
  } catch (error) {
    console.warn('Payload migration notice:', error?.message || error);
  }
} else {
  console.log('Skipping payload migrate: No database connection URL (DATABASE_URL / POSTGRES_URL) found in build environment.');
}

console.log('Running Next.js production build...');
execSync('npx next build', { stdio: 'inherit' });
