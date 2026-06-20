import { spawn } from 'child_process';
import fs from 'fs';

const ps = spawn('powershell', [
  '-NoProfile',
  '-Command',
  'Get-Content reports\\estatistica_camadas_lote1_output.json -Encoding BigEndianUnicode -Raw | ConvertFrom-Json | ConvertTo-Json -Depth 10'
]);

let out = '';
ps.stdout.on('data', d => { out += d.toString('utf8'); });
ps.stderr.on('data', d => { console.error('PS ERR:', d.toString()); });

ps.on('close', (code) => {
  if (code !== 0) {
    console.error('PowerShell exited with code', code);
    process.exit(1);
  }
  // Strip BOM if present
  if (out.charCodeAt(0) === 0xFEFF) out = out.slice(1);
  try {
    let data = JSON.parse(out);
    // Handle PowerShell wrapped format { value: [...] }
    if (data && data.value && Array.isArray(data.value)) {
      data = data.value;
    }
    if (!Array.isArray(data)) {
      console.error('Unexpected JSON structure');
      console.log(out.substring(0, 500));
      process.exit(1);
    }
    fs.writeFileSync('reports/lote1_clean.json', JSON.stringify(data, null, 2), 'utf8');
    console.log('Saved:', data.length, 'cards');
    const verify = JSON.parse(fs.readFileSync('reports/lote1_clean.json', 'utf8'));
    console.log('C1:', verify[0].camada1.substring(0, 100));
    console.log('Has ç:', verify[0].camada1.includes('ç'));
    console.log('Has ã:', verify[0].camada1.includes('ã'));
  } catch (e) {
    console.error('Parse error:', e.message);
    console.log('First 200 chars of output:', out.substring(0, 200));
  }
});
