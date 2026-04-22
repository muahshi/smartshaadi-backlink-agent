/**
 * SmartShaadi Backlink Agent — CLI Runner
 * File: scripts/run-agent.js
 *
 * GitHub Actions se directly run hota hai
 * Node.js built-in https use karta hai — koi extra deps nahi
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const GROQ_KEY   = process.env.GROQ_API_KEY;
const SERPER_KEY = process.env.SERPER_API_KEY;
const GH_TOKEN   = process.env.GITHUB_TOKEN;
const GH_OWNER   = process.env.GITHUB_REPO_OWNER || 'muahshi';
const GH_REPO    = process.env.GITHUB_REPO_NAME  || 'SmartShaadi.ai';
const CITIES     = (process.env.CITIES || 'Delhi,Mumbai,Jaipur').split(',').map(s => s.trim());
const MAX        = parseInt(process.env.MAX_RESULTS || '20');

if (!GROQ_KEY || !SERPER_KEY) {
  console.error('❌ GROQ_API_KEY aur SERPER_API_KEY zaroori hain!');
  process.exit(1);
}

// ─── HTTP HELPERS ─────────────────────────────────────────────────────────────

function post(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({ hostname, path, method: 'POST', headers: { ...headers, 'Content-Length': Buffer.byteLength(data) } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch(e) { reject(new Error(`JSON parse failed: ${d.slice(0,200)}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(data);
    req.end();
  });
}

function get(hostname, path, headers) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname, path, method: 'GET', headers }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch(e) { resolve({ status: res.statusCode, data: d }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function put(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({ hostname, path, method: 'PUT', headers: { ...headers, 'Content-Length': Buffer.byteLength(data) } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch(e) { resolve({ status: res.statusCode, data: d }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ─── SEARCH QUERIES ───────────────────────────────────────────────────────────

const QUERIES = [
  c => `"write for us" wedding blog ${c} India`,
  c => `"guest post" wedding planning India ${c}`,
  c => `wedding planner directory ${c} India submit listing`,
  c => `site:quora.com wedding planning ${c} India`,
  c => `top wedding blogs India ${c} 2026`,
  c => `AI wedding planner India review blog`,
];

// ─── SERPER SEARCH ────────────────────────────────────────────────────────────

async function search(query) {
  console.log(`  🔍 Searching: "${query}"`);
  const data = await post('google.serper.dev', '/search',
    { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
    { q: query, gl: 'in', hl: 'en', num: 8 }
  );
  return data.organic || [];
}

// ─── GROQ SCORER ──────────────────────────────────────────────────────────────

async function score(results, city) {
  if (!results.length) return [];

  const prompt = `SEO backlink analyst for SmartShaadi.online (Indian wedding planning AI platform).

Analyze these search results for backlink opportunities. Return ONLY JSON array:
[{"index":1,"score":85,"strategy":"Guest Post","da":45,"reason":"Hinglish reason"}]

Results:
${results.map((r, i) => `[${i+1}] ${r.title}\n${r.link}\n${r.snippet}`).join('\n\n')}

Strategies: Guest Post, Directory Listing, Forum Comment, Quora Answer, Reddit Thread, Blog Comment, Resource Page, Brand Mention
Score 0-100. Only include score >= 40. City context: ${city}`;

  const data = await post('api.groq.com', '/openai/v1/chat/completions',
    { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
    { model: 'llama-3.3-70b-versatile', max_tokens: 1500, temperature: 0.2,
      messages: [
        { role: 'system', content: 'Return ONLY valid JSON arrays. No markdown.' },
        { role: 'user', content: prompt }
      ]
    }
  );

  const text = data.choices?.[0]?.message?.content || '[]';
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];

  const scores = JSON.parse(match[0]);
  return scores
    .filter(s => s.score >= 40)
    .map(s => {
      const r = results[s.index - 1];
      if (!r) return null;
      return {
        id: `${Date.now()}-${s.index}`,
        url: r.link,
        title: r.title,
        snippet: r.snippet,
        strategy: s.strategy,
        relevanceScore: s.score,
        city,
        da: s.da,
        reasoning: s.reason,
        timestamp: new Date().toISOString(),
        status: 'new'
      };
    }).filter(Boolean);
}

// ─── GITHUB PUSH ──────────────────────────────────────────────────────────────

async function pushGitHub(leads) {
  if (!GH_TOKEN) { console.log('⚠️  No GITHUB_TOKEN — skipping push'); return; }

  const date = new Date().toISOString().split('T')[0];
  const high = leads.filter(l => l.relevanceScore >= 70);

  const md = `# SmartShaadi Backlink Leads

> Updated: ${date} | Total: ${leads.length} | High-Value: ${high.length}

## High-Value Leads

${high.sort((a,b) => b.relevanceScore - a.relevanceScore).map(l =>
`### ${l.title}
- **URL:** ${l.url}
- **Strategy:** ${l.strategy}  
- **Score:** ${l.relevanceScore}/100
- **City:** ${l.city}
- **Why:** ${l.reasoning}

`).join('')}

## All Leads Table

| URL | Strategy | Score | City |
|-----|----------|-------|------|
${leads.sort((a,b) => b.relevanceScore - a.relevanceScore).map(l =>
  `| [${l.title.slice(0,40)}](${l.url}) | ${l.strategy} | ${l.relevanceScore} | ${l.city} |`
).join('\n')}

*Auto-generated by SmartShaadi Backlink Agent*
`;

  const apiPath = `/repos/${GH_OWNER}/${GH_REPO}/contents/backlink_leads.md`;
  
  // Get current SHA
  let sha;
  const existing = await get('api.github.com', apiPath, {
    'Authorization': `Bearer ${GH_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'SmartShaadi-Agent',
  });
  if (existing.status === 200) sha = existing.data.sha;

  const body = {
    message: `🔗 Backlink scan: ${leads.length} leads — ${date}`,
    content: Buffer.from(md).toString('base64'),
    branch: 'main',
  };
  if (sha) body.sha = sha;

  const result = await put('api.github.com', apiPath, {
    'Authorization': `Bearer ${GH_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'User-Agent': 'SmartShaadi-Agent',
  }, body);

  if (result.status === 200 || result.status === 201) {
    console.log(`✅ GitHub push successful: ${result.data.content?.html_url}`);
  } else {
    console.error('❌ GitHub push failed:', result.status, JSON.stringify(result.data).slice(0, 200));
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀 SmartShaadi Backlink Agent — CLI Runner');
  console.log(`📍 Cities: ${CITIES.join(', ')}`);
  console.log(`🎯 Max Results: ${MAX}\n`);

  const allLeads = [];

  for (const city of CITIES) {
    if (allLeads.length >= MAX) break;
    console.log(`\n🏙️  ${city} scan kar raha hoon...`);

    for (const queryFn of QUERIES) {
      if (allLeads.length >= MAX) break;
      try {
        const results = await search(queryFn(city));
        if (!results.length) continue;

        const leads = await score(results, city);
        allLeads.push(...leads);

        const hv = leads.filter(l => l.relevanceScore >= 70).length;
        console.log(`  ✨ ${leads.length} leads (${hv} high-value)`);

        await new Promise(r => setTimeout(r, 1500)); // Rate limit
      } catch(e) {
        console.warn(`  ⚠️  Skip: ${e.message}`);
      }
    }
  }

  console.log(`\n📊 Total: ${allLeads.length} leads`);
  console.log(`⭐ High-value (70+): ${allLeads.filter(l => l.relevanceScore >= 70).length}`);

  // Save locally
  const outPath = path.join(process.cwd(), 'backlink_leads_raw.json');
  fs.writeFileSync(outPath, JSON.stringify(allLeads, null, 2));
  console.log(`💾 Saved to ${outPath}`);

  // Push to GitHub
  await pushGitHub(allLeads);

  console.log('\n🎉 Done!');
}

main().catch(e => {
  console.error('❌ Fatal:', e.message);
  process.exit(1);
});

