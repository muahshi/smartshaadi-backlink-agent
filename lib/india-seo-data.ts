/**
 * SmartShaadi Backlink Agent — India SEO Data
 * All India cities, wedding keywords, and search query templates
 */

export const INDIA_CITIES = [
  // Metro Cities
  { name: 'Delhi', state: 'Delhi', tier: 1 },
  { name: 'Mumbai', state: 'Maharashtra', tier: 1 },
  { name: 'Bangalore', state: 'Karnataka', tier: 1 },
  { name: 'Hyderabad', state: 'Telangana', tier: 1 },
  { name: 'Chennai', state: 'Tamil Nadu', tier: 1 },
  { name: 'Kolkata', state: 'West Bengal', tier: 1 },
  { name: 'Pune', state: 'Maharashtra', tier: 1 },
  { name: 'Ahmedabad', state: 'Gujarat', tier: 1 },

  // Tier 2 Cities
  { name: 'Jaipur', state: 'Rajasthan', tier: 2 },
  { name: 'Lucknow', state: 'Uttar Pradesh', tier: 2 },
  { name: 'Chandigarh', state: 'Punjab', tier: 2 },
  { name: 'Bhopal', state: 'Madhya Pradesh', tier: 2 },
  { name: 'Indore', state: 'Madhya Pradesh', tier: 2 },
  { name: 'Nagpur', state: 'Maharashtra', tier: 2 },
  { name: 'Surat', state: 'Gujarat', tier: 2 },
  { name: 'Kochi', state: 'Kerala', tier: 2 },
  { name: 'Coimbatore', state: 'Tamil Nadu', tier: 2 },
  { name: 'Vadodara', state: 'Gujarat', tier: 2 },
  { name: 'Patna', state: 'Bihar', tier: 2 },
  { name: 'Varanasi', state: 'Uttar Pradesh', tier: 2 },

  // Wedding Destinations
  { name: 'Udaipur', state: 'Rajasthan', tier: 2 },
  { name: 'Goa', state: 'Goa', tier: 2 },
  { name: 'Rishikesh', state: 'Uttarakhand', tier: 2 },
  { name: 'Shimla', state: 'Himachal Pradesh', tier: 2 },
  { name: 'Jodhpur', state: 'Rajasthan', tier: 2 },
  { name: 'Agra', state: 'Uttar Pradesh', tier: 2 },

  // Tier 3
  { name: 'Amritsar', state: 'Punjab', tier: 3 },
  { name: 'Ranchi', state: 'Jharkhand', tier: 3 },
  { name: 'Bhubaneswar', state: 'Odisha', tier: 3 },
  { name: 'Guwahati', state: 'Assam', tier: 3 },
];

export const WEDDING_KEYWORDS = [
  'wedding planning',
  'shaadi planning',
  'wedding budget',
  'wedding photographer',
  'wedding venues',
  'bridal makeup',
  'wedding caterer',
  'wedding decoration',
  'destination wedding',
  'wedding checklist',
  'AI wedding planner',
  'wedding invitation',
  'wedding cost',
  'shaadi budget calculator',
  'wedding vendor',
];

export const SEARCH_TEMPLATES = [
  // Guest Post Opportunities
  (city: string) => `"write for us" wedding blog ${city} India`,
  (city: string) => `"guest post" wedding planning India ${city}`,
  (city: string) => `"submit article" shaadi wedding tips India`,

  // Directory Listings
  (city: string) => `wedding planner directory ${city} India submit listing`,
  (city: string) => `best wedding websites India directory 2026`,
  (city: string) => `wedding vendor directory ${city} free listing`,

  // Forum / Community
  (city: string) => `site:quora.com wedding planning ${city} India`,
  (city: string) => `site:reddit.com wedding planning India tips`,
  (city: string) => `wedding forum India ${city} discussion`,

  // Blog Comments / Mentions
  (city: string) => `top wedding blogs India ${city} 2026`,
  (city: string) => `best wedding planning websites India`,
  (city: string) => `AI wedding planner India review blog`,

  // Niche Opportunities
  (city: string) => `wedding budget India ${city} planning guide blog`,
  (city: string) => `shaadi tips India blog "AI" planning`,
  (city: string) => `Indian wedding photography blog ${city}`,
];

export const BACKLINK_STRATEGIES = [
  'Guest Post',
  'Directory Listing',
  'Forum Comment',
  'Resource Page',
  'Blog Comment',
  'Quora Answer',
  'Reddit Thread',
  'Broken Link',
  'Competitor Analysis',
  'Brand Mention',
] as const;

export type BacklinkStrategy = typeof BACKLINK_STRATEGIES[number];

export interface BacklinkLead {
  id: string;
  url: string;
  title: string;
  snippet: string;
  strategy: BacklinkStrategy;
  relevanceScore: number; // 0-100
  city: string;
  state: string;
  reasoning: string;
  da?: number; // Domain Authority estimate
  timestamp: string;
  status: 'new' | 'contacted' | 'published' | 'rejected';
}

export interface AgentRun {
  id: string;
  startedAt: string;
  completedAt?: string;
  citiesScanned: string[];
  totalLeads: number;
  highValueLeads: number;
  status: 'running' | 'completed' | 'error';
  leads: BacklinkLead[];
}
