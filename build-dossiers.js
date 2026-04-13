#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = (process.env.ANTHROPIC_API_KEY || '').trim();
if (!API_KEY) { console.error('ANTHROPIC_API_KEY not set'); process.exit(1); }
if (!/^[A-Za-z0-9_-]+$/.test(API_KEY)) {
  console.error('ANTHROPIC_API_KEY contains invalid characters (whitespace or non-ASCII). Re-export it cleanly.');
  process.exit(1);
}

const QUEUE = JSON.parse(fs.readFileSync(path.join(__dirname, 'teams-queue.json'), 'utf8'));
const TPL = fs.readFileSync(path.join(__dirname, 'RESEARCH_PROMPT.md'), 'utf8');
const OUT_DIR = path.join(__dirname, 'nfl-health-systems', 'data', 'dossiers');
const FULL_OUT = path.join(__dirname, 'nfl-health-systems', 'data', 'teams-full.json');
const DELAY_MS = parseInt(process.env.CLAUDE_DELAY_MS || '9000', 10);
const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-4-5-20250929';
const MAX_TOKENS = parseInt(process.env.CLAUDE_MAX_TOKENS || '4096', 10);

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function slug(n) { return n.toLowerCase().replace(/[^a-z0-9]+/g, '-'); }

function buildPrompt(t) {
  return TPL
    .replace('{{HEALTH_SYSTEM_NAME}}', t.healthSystem)
    .replace('{{EIN}}', t.ein || 'unknown - search ProPublica')
    .replace('{{NFL_TEAM}}', t.team)
    .replace('{{DEAL_TYPE}}', (t.dealType || []).join(', ') || 'unknown');
}

function callClaude(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }]
    });
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05'
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const p = JSON.parse(data);
          if (p.error) return reject(new Error(p.error.message));
          const text = (p.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
          resolve(text);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function extractJSON(raw) {
  const s = raw.indexOf('{');
  const e = raw.lastIndexOf('}');
  if (s === -1 || e === -1) throw new Error('No JSON in response');
  return JSON.parse(raw.slice(s, e + 1));
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const targets = QUEUE.filter(t => t.status === 'PENDING');
  console.log('\nBuilding dossiers for ' + targets.length + ' systems...\n');

  const all = [];
  if (fs.existsSync(FULL_OUT)) {
    all.push(...JSON.parse(fs.readFileSync(FULL_OUT, 'utf8')));
    console.log('Loaded ' + all.length + ' existing dossiers.\n');
  }

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const outFile = path.join(OUT_DIR, slug(t.team) + '.json');

    if (fs.existsSync(outFile)) {
      console.log('[' + (i + 1) + '/' + targets.length + '] SKIP: ' + t.team);
      const ex = JSON.parse(fs.readFileSync(outFile, 'utf8'));
      if (!all.find(d => d.team === t.team)) all.push(ex);
      continue;
    }

    console.log('[' + (i + 1) + '/' + targets.length + '] Researching: ' + t.healthSystem + ' (' + t.team + ')...');

    try {
      const raw = await callClaude(buildPrompt(t));
      const dossier = extractJSON(raw);
      fs.writeFileSync(outFile, JSON.stringify(dossier, null, 2));
      all.push(dossier);
      console.log('  OK: ' + dossier.accusation);
    } catch (err) {
      console.error('  FAIL ' + t.team + ': ' + err.message);
      fs.writeFileSync(outFile + '.error', JSON.stringify({ team: t.team, error: err.message }));
    }

    if (i < targets.length - 1) {
      process.stdout.write('  waiting...\r');
      await sleep(DELAY_MS);
    }
  }

  fs.writeFileSync(FULL_OUT, JSON.stringify(all, null, 2));
  console.log('\nDone. ' + all.length + ' dossiers -> ' + FULL_OUT);
  console.log('Run: node build-cards.js\n');
}

main().catch(e => { console.error(e); process.exit(1); });
