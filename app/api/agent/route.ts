/**
 * SmartShaadi Backlink Agent — API Route
 * File: app/api/agent/route.ts
 *
 * Flow:
 * 1. Client se city + keyword milta hai
 * 2. Serper.dev se search results fetch karta hai
 * 3. Groq (Llama 3.3) se relevance score + strategy assign karta hai
 * 4. Structured BacklinkLead return karta hai
 */

import { NextRequest } from 'next/server';
import {
  INDIA_CITIES,
  SEARCH_TEMPLATES,
  type BacklinkLead,
  type BacklinkStrategy,
} from '@/lib/india-seo-data';

export const runtime = 'edge';
export const maxDuration = 60;

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface SerperResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

interface SerperResponse {
  organic: SerperResult[];
  knowledgeGraph?: { title: string; description: string };
}

// ─── SERPER SEARCH ────────────────────────────────────────────────────────────

async function searchSerper(query: string): Promise<SerperResult[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) throw new Error('SERPER_API_KEY not set');

  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: query,
      gl: 'in',       // India
      hl: 'en',
      num: 10,
      tbs: 'qdr:y',   // Past year results
    }),
  });

  if (!res.ok) throw new Error(`Serper API error: ${res.status}`);
  const data: SerperResponse = await res.json();
  return data.organic || [];
}

// ─── GROQ AI SCORER ───────────────────────────────────────────────────────────

async function scoreWithGroq(
  results: SerperResult[],
  city: string,
  keyword: string
): Promise<BacklinkLead[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');

  const prompt = `You are an SEO backlink analyst for SmartShaadi.online — India's #1 free AI wedding planning platform.

Website: https://smartshaadi.online
Description: Free AI tools for Indian wedding planning — budget calculator, kundali matching, vendor negotiation, invitation writer, chatbot. Targets Indian couples planning shaadi.

Search Context: City = ${city}, Keyword = "${keyword}"

Analyze these ${results.length} search results and for each one:
1. Decide relevance score (0-100) for SmartShaadi backlink opportunity
2. Assign best strategy from: Guest Post, Directory Listing, Forum Comment, Resource Page, Blog Comment, Quora Answer, Reddit Thread, Broken Link, Brand Mention
3. Estimate Domain Authority (0-100) based on URL/domain
4. Write 1-line reasoning in Hinglish

Search Results:
${results.map((r, i) => `
[${i + 1}] Title: ${r.title}
URL: ${r.link}
Snippet: ${r.snippet}
`).join('\n')}

SCORING RULES:
- Score 80-100: Perfect fit (wedding blog, Indian wedding directory, Quora/Reddit wedding thread)
- Score 60-79: Good fit (lifestyle blog, India events site, wedding adjacent)
- Score 40-59: Moderate (general India blog that could accept guest posts)
- Score 0-39: Skip (irrelevant, competitors, or spam)

Return ONLY valid JSON array, no explanation, no markdown:
[
  {
    "index": 1,
    "relevanceScore": 85,
    "strategy": "Guest Post",
    "da": 45,
    "reasoning": "Wedding blog hai, guest post section dikh raha hai, India focus hai"
  }
]

Include ALL ${results.length} results. If irrelevant, give score < 40.`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 2000,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: 'You are an SEO expert. Return ONLY valid JSON arrays. No markdown, no explanation.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Groq API error: ${res.status}`);
  const data = await res.json();
  const text: string = data.choices?.[0]?.message?.content || '[]';

  // Parse JSON safely
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  const scores = JSON.parse(jsonMatch[0]) as Array<{
    index: number;
    relevanceScore: number;
    strategy: BacklinkStrategy;
    da: number;
    reasoning: string;
  }>;

  // Find city data
  const cityData = INDIA_CITIES.find(c => c.name === city) || { state: 'India', tier: 2 };

  // Merge scores with search results
  const leads: BacklinkLead[] = scores
    .filter(s => s.relevanceScore >= 40) // Filter low-quality
    .map(score => {
      const result = results[score.index - 1];
      if (!result) return null;

      return {
        id: `${Date.now()}-${score.index}-${Math.random().toString(36).slice(2, 7)}`,
        url: result.link,
        title: result.title,
        snippet: result.snippet,
        strategy: score.strategy,
        relevanceScore: score.relevanceScore,
        city,
        state: cityData.state,
        reasoning: score.reasoning,
        da: score.da,
        timestamp: new Date().toISOString(),
        status: 'new',
      } as BacklinkLead;
    })
    .filter(Boolean) as BacklinkLead[];

  return leads;
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      cities = ['Delhi', 'Mumbai', 'Bangalore'],
      keywords = ['wedding planning India', 'shaadi planning tips'],
      maxResults = 20,
    } = body;

  // Create a ReadableStream for SSE (Server-Sent Events)
  const stream = new ReadableStream({
    async start(controller) {
      const encode = (data: object) =>
        new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);

      const allLeads: BacklinkLead[] = [];
      let totalSearches = 0;

      try {
        for (const cityName of cities) {
          controller.enqueue(encode({
            type: 'city_start',
            city: cityName,
            message: `🏙️ ${cityName} scan kar raha hoon...`,
          }));

          for (const keyword of keywords) {
            if (allLeads.length >= maxResults) break;

            // Pick a random search template
            const templateFn = SEARCH_TEMPLATES[
              Math.floor(Math.random() * SEARCH_TEMPLATES.length)
            ];
            const query = templateFn(cityName);

            controller.enqueue(encode({
              type: 'searching',
              query,
              message: `🔍 Searching: "${query}"`,
            }));

            try {
              // 1. Serper search
              const results = await searchSerper(query);
              if (results.length === 0) continue;

              controller.enqueue(encode({
                type: 'serper_done',
                count: results.length,
                message: `📊 ${results.length} results mile, AI se analyze kar raha hoon...`,
              }));

              // 2. Groq scoring
              const leads = await scoreWithGroq(results, cityName, keyword);
              allLeads.push(...leads);
              totalSearches++;

              // Stream each high-value lead immediately
              const highValue = leads.filter(l => l.relevanceScore >= 70);
              for (const lead of highValue) {
                controller.enqueue(encode({
                  type: 'lead_found',
                  lead,
                  message: `✅ High-value lead: ${lead.url}`,
                }));
              }

              controller.enqueue(encode({
                type: 'batch_done',
                city: cityName,
                keyword,
                found: leads.length,
                highValue: highValue.length,
                message: `✨ ${cityName} mein ${leads.length} leads mili (${highValue.length} high-value)`,
              }));

              // Rate limit — don't hammer APIs
              await new Promise(r => setTimeout(r, 1200));

            } catch (err) {
              controller.enqueue(encode({
                type: 'error',
                message: `⚠️ ${cityName}/${keyword} skip kiya: ${(err as Error).message}`,
              }));
            }
          }

          if (allLeads.length >= maxResults) break;
        }

        // Final summary
        const highValueCount = allLeads.filter(l => l.relevanceScore >= 70).length;
        controller.enqueue(encode({
          type: 'complete',
          totalLeads: allLeads.length,
          highValueLeads: highValueCount,
          totalSearches,
          leads: allLeads,
          message: `🎉 Complete! ${allLeads.length} leads mile, ${highValueCount} high-value opportunities`,
        }));

      } catch (err) {
        controller.enqueue(encode({
          type: 'fatal_error',
          message: `❌ Fatal error: ${(err as Error).message}`,
        }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });

  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
