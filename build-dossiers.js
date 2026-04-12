#!/usr/bin/env node
// ============================================================
// build-dossiers.js
// Run with: node build-dossiers.js
// Requires: ANTHROPIC_API_KEY in environment
// Output:   data/dossiers/{team-slug}.json + data/teams-full.json
// ============================================================

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error('ANTHROPIC_API_KEY not set'); process.exit(1); }

const QUEUE = JSON.parse(fs.readFileSync('teams-queue.json', 'utf8'));
const PROMPT_TPL = fs.readFileSync('RESEARCH_PROMPT.md', 'utf8');
const OUT_DIR = path.join('nfl-health-systems', 'data', 'dossiers');
const FULL_OUT = path.join('nfl-health-systems', 'data', 'teams-full.json');

// Rate limit: 1 request per 8 seconds to stay inside Anthropic limits
const DELAY_MS = 8000;

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function buildPrompt(team) {
  return PROMPT_TPL
    .replace('{{HEALTH_SYSTEM_NAME}}', team.healthSystem)
    .replace('{{EIN}}', team.ein || 'unknown - search ProPublica')
    .replace('{{NFL_TEAM}}', team.team)
    .replace('{{DEAL_TYPE}}', team.dealType.join(', ') || 'unknown - research required');
}

function callClaude(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      tools: [{
        type: 'web_search_20250305',
        name: 'web_search'
      }],
      messages: [{
        role: 'user',
        content: prompt
      }]
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
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message));
          // Extract the final text block (after tool use rounds)
          const textBlocks = (parsed.content || []).filter(b => b.type === 'text');
          const text = textBlocks.map(b => b.text).join('');
          resolve(text);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function extractJSON(raw) {
  // Strip any markdown fences or preamble before the first {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON found in response');
  return JSON.parse(raw.slice(start, end + 1));
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const targets = QUEUE.filter(t => t.status === 'PENDING');
  console.log(`\nBuilding dossiers for ${targets.length} health systems...\n`);

  const allDossiers = [];

  // Load any already-completed dossiers
  if (fs.existsSync(FULL_OUT)) {
    const existing = JSON.parse(fs.readFileSync(FULL_OUT, 'utf8'));
    allDossiers.push(...existing);
    console.log(`Loaded ${existing.length} existing dossiers.\n`);
  }

  for (let i = 0; i < targets.length; i++) {
    const team = targets[i];
    const outFile = path.join(OUT_DIR, slug(team.team) + '.json');

    // Skip if already built
    if (fs.existsSync(outFile)) {
      console.log(`[${i+1}/${targets.length}] SKIP (exists): ${team.team}`);
      const existing = JSON.parse(fs.readFileSync(outFile, 'utf8'));
      if (!allDossiers.find(d => d.team === team.team)) allDossiers.push(existing);
      continue;
    }

    console.log(`[${i+1}/${targets.length}] Researching: ${team.healthSystem} (${team.team})...`);

    try {
      const prompt = buildPrompt(team);
      const raw = await callClaude(prompt);
      const dossier = extractJSON(raw);

      // Write individual file
      fs.writeFileSync(outFile, JSON.stringify(dossier, null, 2));
      allDossiers.push(dossier);
      console.log(`  OK ${team.team}: ${dossier.accusation}`);

    } catch (err) {
      console.error(`  FAIL ${team.team}: ${err.message}`);
      // Write error placeholder so we can retry
      fs.writeFileSync(outFile + '.error', JSON.stringify({ team: team.team, error: err.message }));
    }

    // Rate limit pause (skip after last)
    if (i < targets.length - 1) {
      console.log(`  ...waiting ${DELAY_MS/1000}s`);
      await sleep(DELAY_MS);
    }
  }

  // Write combined file
  fs.writeFileSync(FULL_OUT, JSON.stringify(allDossiers, null, 2));
  console.log(`\nAll dossiers written to ${FULL_OUT}`);
  console.log(`  ${allDossiers.length} total systems.`);
  console.log(`\nNext: run node build-cards.js to update the site HTML.\n`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
