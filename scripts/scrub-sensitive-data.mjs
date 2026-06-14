// Script to remove hardcoded Supabase credentials from git history.
// Run: node scripts/scrub-sensitive-data.mjs
// After running: git push --force --all (only if you're the only contributor!)
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const sensitiveValues = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5d2FkdGF6c3d1bHZ6a2x6ZmR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMTA3MjgsImV4cCI6MjA5NjU4NjcyOH0.KQMmYq8JJWzzDGVPk2rnyCG73FEILKncUz4rahN21Kw',
  'https://qywadtazswulvzklzfdu.supabase.co',
];

// Get list of all files in all commits that contain sensitive data
console.log('Scanning git history for sensitive data...');

for (const value of sensitiveValues) {
  try {
    const grepOut = execSync(`git grep -l "${value}" $(git rev-list --all)`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    if (grepOut.trim()) {
      console.log(`Found sensitive value in commits: ${grepOut.trim().substring(0, 200)}...`);
    } else {
      console.log(`No occurrences of value found in git history.`);
    }
  } catch (e) {
    console.log(`No occurrences found or error: ${e.message}`);
  }
}

console.log('');
console.log('To scrub the history, run:');
console.log('');
console.log('# Replace ANON_KEY with env var in all commits');
console.log('git filter-branch --force --tree-filter "git ls-files -z | xargs -0 sed -i s%eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5d2FkdGF6c3d1bHZ6a2x6ZmR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMTA3MjgsImV4cCI6MjA5NjU4NjcyOH0.KQMmYq8JJWzzDGVPk2rnyCG73FEILKncUz4rahN21Kw%process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY%g" 2>/dev/null || true');
console.log('');
console.log('# Replace SUPABASE_URL with env var in all commits');
console.log('git filter-branch --force --tree-filter "git ls-files -z | xargs -0 sed -i s%https://qywadtazswulvzklzfdu.supabase.co%process.env.NEXT_PUBLIC_SUPABASE_URL%g" 2>/dev/null || true');
console.log('');
console.log('# Force push after scrub (DANGEROUS - coordinate with team)');
console.log('git push --force --all');
console.log('');
console.log('IMPORTANT: This rewrites git history. Coordinate with all contributors.');
console.log('After scrub, regenerate the ANON_KEY in Supabase Dashboard and update .env.local');
