'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Search, Link2, TrendingUp, MapPin, Zap, Github,
  RefreshCw, CheckCircle, XCircle, AlertCircle,
  ChevronRight, Globe, Award, Target, Activity,
  Download, Filter
} from 'lucide-react';
import { INDIA_CITIES, WEDDING_KEYWORDS, type BacklinkLead } from '@/lib/india-seo-data';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface StreamEvent {
  type: string;
  message: string;
  lead?: BacklinkLead;
  leads?: BacklinkLead[];
  city?: string;
  totalLeads?: number;
  highValueLeads?: number;
  totalSearches?: number;
  count?: number;
  found?: number;
  highValue?: number;
}

type AgentStatus = 'idle' | 'running' | 'complete' | 'error';

const STRATEGY_COLORS: Record<string, string> = {
  'Guest Post':        'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'Directory Listing': 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  'Forum Comment':     'bg-purple-500/15 text-purple-300 border-purple-500/30',
  'Quora Answer':      'bg-orange-500/15 text-orange-300 border-orange-500/30',
  'Reddit Thread':     'bg-red-500/15 text-red-300 border-red-500/30',
  'Blog Comment':      'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  'Resource Page':     'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  'Brand Mention':     'bg-pink-500/15 text-pink-300 border-pink-500/30',
  'Broken Link':       'bg-gray-500/15 text-gray-300 border-gray-500/30',
};

const SCORE_COLOR = (score: number) => {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-yellow-400';
  return 'text-red-400';
};

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80
    ? 'from-emerald-500 to-teal-500'
    : score >= 60
    ? 'from-yellow-500 to-amber-500'
    : 'from-red-500 to-rose-500';

  return (
    <div className={`relative w-10 h-10 flex-shrink-0`}>
      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
        <circle
          cx="20" cy="20" r="16" fill="none"
          stroke="url(#sg)" strokeWidth="3" strokeLinecap="round"
          strokeDasharray={`${(score / 100) * 100.5} 100.5`}
        />
        <defs>
          <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={score >= 80 ? '#10b981' : score >= 60 ? '#eab308' : '#ef4444'} />
            <stop offset="100%" stopColor={score >= 80 ? '#14b8a6' : score >= 60 ? '#f59e0b' : '#f43f5e'} />
          </linearGradient>
        </defs>
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${SCORE_COLOR(score)}`}>
        {score}
      </span>
    </div>
  );
}

function LeadCard({ lead }: { lead: BacklinkLead }) {
  const strategyClass = STRATEGY_COLORS[lead.strategy] || 'bg-gray-500/15 text-gray-300 border-gray-500/30';
  const domain = new URL(lead.url).hostname.replace('www.', '');

  return (
    <div className="group relative bg-[#0f0d08] border border-[#2a2015] rounded-xl p-4 hover:border-[#C9A84C]/40 transition-all duration-200 hover:bg-[#131007]">
      {lead.relevanceScore >= 80 && (
        <div className="absolute top-3 right-3">
          <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full px-2 py-0.5 font-medium">
            ⭐ High Value
          </span>
        </div>
      )}

      <div className="flex items-start gap-3">
        <ScoreBadge score={lead.relevanceScore} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs border rounded-full px-2 py-0.5 font-medium ${strategyClass}`}>
              {lead.strategy}
            </span>
            <span className="text-xs text-[#5a4a30] flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {lead.city}, {lead.state}
            </span>
            {lead.da && (
              <span className="text-xs text-[#5a4a30]">DA: {lead.da}</span>
            )}
          </div>

          <h3 className="text-sm font-semibold text-[#F5EFE0] truncate mb-1 group-hover:text-[#C9A84C] transition-colors">
            {lead.title}
          </h3>

          <a
            href={lead.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#C9A84C] hover:text-[#E8C97A] flex items-center gap-1 mb-2 transition-colors"
          >
            <Globe className="w-3 h-3" />
            {domain}
            <ChevronRight className="w-3 h-3" />
          </a>

          <p className="text-xs text-[#7a6040] line-clamp-2 mb-2">{lead.snippet}</p>

          <p className="text-xs text-[#A89070] italic">
            💡 {lead.reasoning}
          </p>
        </div>
      </div>
    </div>
  );
}

function LogLine({ event }: { event: StreamEvent }) {
  const icon =
    event.type === 'complete'       ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> :
    event.type === 'fatal_error' || event.type === 'error'
                                    ? <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" /> :
    event.type === 'lead_found'     ? <Award className="w-3.5 h-3.5 text-[#C9A84C] flex-shrink-0" /> :
    event.type === 'city_start'     ? <MapPin className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" /> :
                                      <Activity className="w-3.5 h-3.5 text-[#5a4a30] flex-shrink-0" />;

  return (
    <div className="flex items-start gap-2 py-0.5">
      <div className="mt-0.5">{icon}</div>
      <span className={`text-xs font-mono ${
        event.type === 'complete' ? 'text-emerald-400' :
        event.type === 'lead_found' ? 'text-[#C9A84C]' :
        event.type.includes('error') ? 'text-red-400' :
        'text-[#5a4a30]'
      }`}>
        {event.message}
      </span>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function BacklinkAgentPage() {
  // Config
  const [selectedCities, setSelectedCities] = useState<string[]>(['Delhi', 'Mumbai', 'Bangalore', 'Jaipur']);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>(['wedding planning', 'shaadi planning tips', 'wedding budget']);
  const [maxResults, setMaxResults] = useState(20);
  const [filterScore, setFilterScore] = useState(0);
  const [filterStrategy, setFilterStrategy] = useState('all');

  // State
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [logs, setLogs] = useState<StreamEvent[]>([]);
  const [leads, setLeads] = useState<BacklinkLead[]>([]);
  const [stats, setStats] = useState({ total: 0, highValue: 0, searches: 0 });
  const [githubStatus, setGithubStatus] = useState<'idle' | 'pushing' | 'done' | 'error'>('idle');
  const [githubUrl, setGithubUrl] = useState('');

  const logsEndRef = useRef<HTMLDivElement>(null);
  const abortRef   = useRef<AbortController | null>(null);

  const addLog = useCallback((event: StreamEvent) => {
    setLogs(prev => [...prev.slice(-100), event]);
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  // ── RUN AGENT ────────────────────────────────────────────────────────────────
  const runAgent = async () => {
    if (status === 'running') {
      abortRef.current?.abort();
      setStatus('idle');
      return;
    }

    setStatus('running');
    setLogs([]);
    setLeads([]);
    setStats({ total: 0, highValue: 0, searches: 0 });
    setGithubStatus('idle');

    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cities: selectedCities,
          keywords: selectedKeywords,
          maxResults,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event: StreamEvent = JSON.parse(line.slice(6));
            addLog(event);

            if (event.type === 'lead_found' && event.lead) {
              setLeads(prev => [...prev, event.lead!]);
            }
            if (event.type === 'complete') {
              if (event.leads) setLeads(event.leads);
              setStats({
                total: event.totalLeads || 0,
                highValue: event.highValueLeads || 0,
                searches: event.totalSearches || 0,
              });
              setStatus('complete');
            }
            if (event.type === 'fatal_error') {
              setStatus('error');
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        addLog({ type: 'fatal_error', message: `❌ ${(err as Error).message}` });
        setStatus('error');
      }
    }
  };

  // ── PUSH TO GITHUB ───────────────────────────────────────────────────────────
  const pushToGitHub = async () => {
    if (leads.length === 0) return;
    setGithubStatus('pushing');

    try {
      const res = await fetch('/api/github-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leads,
          runDate: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGithubUrl(data.githubUrl || '');
        setGithubStatus('done');
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error(err);
      setGithubStatus('error');
    }
  };

  // ── FILTERED LEADS ───────────────────────────────────────────────────────────
  const filteredLeads = leads.filter(l => {
    if (l.relevanceScore < filterScore) return false;
    if (filterStrategy !== 'all' && l.strategy !== filterStrategy) return false;
    return true;
  }).sort((a, b) => b.relevanceScore - a.relevanceScore);

  const allStrategies = [...new Set(leads.map(l => l.strategy))];

  // ── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#09070E] text-[#F5EFE0]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#C9A84C]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-8">

        {/* ── HEADER ── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#C9A84C]/15 border border-[#C9A84C]/30 rounded-xl flex items-center justify-center">
              <Link2 className="w-5 h-5 text-[#C9A84C]" />
            </div>
            <div>
              <h1 style={{ fontFamily: "'Cormorant Garamond', serif" }}
                className="text-3xl font-bold text-[#F5EFE0]">
                SmartShaadi <em className="text-[#C9A84C] not-italic">Backlink Agent</em>
              </h1>
              <p className="text-sm text-[#7a6040]">
                AI-powered backlink discovery for smartshaadi.online — All India coverage
              </p>
            </div>
          </div>

          {/* Stats bar */}
          {(status === 'complete' || leads.length > 0) && (
            <div className="flex gap-4 mt-4 flex-wrap">
              {[
                { label: 'Total Leads', value: stats.total || leads.length, icon: Target, color: 'text-[#C9A84C]' },
                { label: 'High Value (70+)', value: stats.highValue || leads.filter(l => l.relevanceScore >= 70).length, icon: Award, color: 'text-emerald-400' },
                { label: 'Searches Done', value: stats.searches, icon: Search, color: 'text-blue-400' },
                { label: 'Cities Covered', value: selectedCities.length, icon: MapPin, color: 'text-purple-400' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2 bg-[#0f0d08] border border-[#2a2015] rounded-lg px-3 py-2">
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                  <span className={`text-lg font-bold ${s.color}`}>{s.value}</span>
                  <span className="text-xs text-[#5a4a30]">{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT: CONFIG ── */}
          <div className="space-y-4">

            {/* City Selector */}
            <div className="bg-[#0f0d08] border border-[#2a2015] rounded-xl p-4">
              <h3 className="text-xs font-bold text-[#C9A84C] uppercase tracking-wider mb-3 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" /> Cities ({selectedCities.length})
              </h3>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto custom-scroll">
                {INDIA_CITIES.map(city => (
                  <button
                    key={city.name}
                    onClick={() => setSelectedCities(prev =>
                      prev.includes(city.name)
                        ? prev.filter(c => c !== city.name)
                        : [...prev, city.name]
                    )}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                      selectedCities.includes(city.name)
                        ? 'bg-[#C9A84C]/15 border-[#C9A84C]/50 text-[#C9A84C]'
                        : 'bg-transparent border-[#2a2015] text-[#5a4a30] hover:border-[#C9A84C]/30 hover:text-[#A89070]'
                    }`}
                  >
                    {city.name}
                    {city.tier === 1 && <span className="ml-1 text-[#C9A84C]">•</span>}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => setSelectedCities(INDIA_CITIES.filter(c => c.tier === 1).map(c => c.name))}
                  className="text-xs text-[#C9A84C]/60 hover:text-[#C9A84C] transition-colors">
                  Metro Only
                </button>
                <span className="text-[#2a2015]">|</span>
                <button onClick={() => setSelectedCities(INDIA_CITIES.map(c => c.name))}
                  className="text-xs text-[#C9A84C]/60 hover:text-[#C9A84C] transition-colors">
                  All India
                </button>
                <span className="text-[#2a2015]">|</span>
                <button onClick={() => setSelectedCities([])}
                  className="text-xs text-[#C9A84C]/60 hover:text-[#C9A84C] transition-colors">
                  Clear
                </button>
              </div>
            </div>

            {/* Keywords */}
            <div className="bg-[#0f0d08] border border-[#2a2015] rounded-xl p-4">
              <h3 className="text-xs font-bold text-[#C9A84C] uppercase tracking-wider mb-3 flex items-center gap-2">
                <Search className="w-3.5 h-3.5" /> Keywords ({selectedKeywords.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {WEDDING_KEYWORDS.map(kw => (
                  <button
                    key={kw}
                    onClick={() => setSelectedKeywords(prev =>
                      prev.includes(kw) ? prev.filter(k => k !== kw) : [...prev, kw]
                    )}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                      selectedKeywords.includes(kw)
                        ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                        : 'bg-transparent border-[#2a2015] text-[#5a4a30] hover:border-purple-500/30 hover:text-[#A89070]'
                    }`}
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </div>

            {/* Settings */}
            <div className="bg-[#0f0d08] border border-[#2a2015] rounded-xl p-4">
              <h3 className="text-xs font-bold text-[#C9A84C] uppercase tracking-wider mb-3">
                ⚙️ Settings
              </h3>
              <div>
                <label className="text-xs text-[#7a6040] mb-1 block">
                  Max Results: <span className="text-[#C9A84C] font-bold">{maxResults}</span>
                </label>
                <input
                  type="range" min={5} max={50} step={5} value={maxResults}
                  onChange={e => setMaxResults(Number(e.target.value))}
                  className="w-full accent-[#C9A84C] h-1.5 rounded-full"
                />
                <div className="flex justify-between text-xs text-[#3a2a10] mt-1">
                  <span>5</span><span>50</span>
                </div>
              </div>
            </div>

            {/* Run Button */}
            <button
              onClick={runAgent}
              disabled={selectedCities.length === 0 || selectedKeywords.length === 0}
              className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                status === 'running'
                  ? 'bg-red-500/15 border border-red-500/40 text-red-300 hover:bg-red-500/20'
                  : 'bg-gradient-to-r from-[#C9A84C] to-[#E8C97A] text-[#09070E] hover:shadow-[0_0_30px_rgba(201,168,76,0.3)] hover:-translate-y-0.5'
              } disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none`}
            >
              {status === 'running' ? (
                <>
                  <XCircle className="w-4 h-4" />
                  Agent Band Karo
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Agent Chalao
                </>
              )}
            </button>

            {/* GitHub Push */}
            {leads.length > 0 && (
              <button
                onClick={pushToGitHub}
                disabled={githubStatus === 'pushing'}
                className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border transition-all ${
                  githubStatus === 'done'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-transparent border-[#2a2015] text-[#A89070] hover:border-[#C9A84C]/40 hover:text-[#C9A84C]'
                }`}
              >
                {githubStatus === 'pushing' ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> GitHub pe push ho raha hai...</>
                ) : githubStatus === 'done' ? (
                  <><CheckCircle className="w-4 h-4" /> GitHub pe push ho gaya!</>
                ) : (
                  <><Github className="w-4 h-4" /> GitHub pe Save Karo ({leads.length} leads)</>
                )}
              </button>
            )}

            {githubUrl && (
              <a href={githubUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-[#C9A84C] flex items-center gap-1 hover:text-[#E8C97A] transition-colors">
                <Globe className="w-3 h-3" />
                GitHub pe dekho →
              </a>
            )}
          </div>

          {/* ── CENTER+RIGHT: RESULTS ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Live Log */}
            <div className="bg-[#0f0d08] border border-[#2a2015] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2015]">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    status === 'running' ? 'bg-emerald-400 animate-pulse' :
                    status === 'complete' ? 'bg-emerald-400' :
                    status === 'error' ? 'bg-red-400' : 'bg-[#3a2a10]'
                  }`} />
                  <span className="text-xs font-semibold text-[#A89070]">
                    {status === 'running' ? 'Agent chal raha hai...' :
                     status === 'complete' ? 'Scan complete ✅' :
                     status === 'error' ? 'Error aaya ❌' : 'Ready'}
                  </span>
                </div>
                {status === 'running' && (
                  <div className="flex gap-1">
                    {[0, 0.15, 0.3].map((d, i) => (
                      <div key={i} className="w-1.5 h-1.5 bg-[#C9A84C] rounded-full animate-bounce"
                        style={{ animationDelay: `${d}s` }} />
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 h-48 overflow-y-auto font-mono space-y-0.5 custom-scroll">
                {logs.length === 0 ? (
                  <p className="text-xs text-[#3a2a10] italic">
                    Cities aur keywords select karo, phir &quot;Agent Chalao&quot; dabao...
                  </p>
                ) : (
                  logs.map((log, i) => <LogLine key={i} event={log} />)
                )}
                <div ref={logsEndRef} />
              </div>
            </div>

            {/* Leads */}
            {leads.length > 0 && (
              <div>
                {/* Filter Bar */}
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-[#5a4a30]" />
                    <span className="text-xs text-[#5a4a30]">Min Score:</span>
                    <div className="flex gap-1">
                      {[0, 40, 60, 70, 80].map(s => (
                        <button key={s}
                          onClick={() => setFilterScore(s)}
                          className={`text-xs px-2 py-0.5 rounded border transition-all ${
                            filterScore === s
                              ? 'bg-[#C9A84C]/20 border-[#C9A84C]/50 text-[#C9A84C]'
                              : 'border-[#2a2015] text-[#5a4a30] hover:border-[#C9A84C]/30'
                          }`}
                        >
                          {s === 0 ? 'All' : `${s}+`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <select
                    value={filterStrategy}
                    onChange={e => setFilterStrategy(e.target.value)}
                    className="text-xs bg-[#0f0d08] border border-[#2a2015] text-[#A89070] rounded-lg px-2 py-1 outline-none"
                  >
                    <option value="all">All Strategies</option>
                    {allStrategies.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>

                  <span className="text-xs text-[#5a4a30] ml-auto">
                    {filteredLeads.length} leads dikha raha hoon
                  </span>
                </div>

                {/* Lead Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto custom-scroll pr-1">
                  {filteredLeads.map(lead => (
                    <LeadCard key={lead.id} lead={lead} />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {status === 'idle' && leads.length === 0 && (
              <div className="bg-[#0f0d08] border border-[#2a2015] border-dashed rounded-xl p-12 text-center">
                <TrendingUp className="w-12 h-12 text-[#3a2a10] mx-auto mb-4" />
                <p className="text-[#5a4a30] text-sm mb-2">
                  Backlink opportunities dhundhne ke liye agent chalao
                </p>
                <p className="text-xs text-[#3a2a10]">
                  Groq AI + Serper se All India wedding backlinks milenge
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #2a2015; border-radius: 2px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: #C9A84C40; }
      `}</style>
    </div>
  );
}
