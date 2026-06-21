import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local manually
const envPath = path.join(process.cwd(), '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing environment variables!");
  process.exit(1);
}

const client = createClient(url, key);

async function run() {
  const { data, error } = await client.from('username_map').select('*');
  if (error) {
    console.error("Error fetching username_map:", error);
  } else {
    console.log("Database username_map mapping:");
    console.log(JSON.stringify(data, null, 2));
  }
}

run();
