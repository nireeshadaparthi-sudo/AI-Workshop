export type SourceType = 'atom' | 'express_entry' | 'website' | 'social';
export type PriorityType = 'high' | 'medium' | 'low';
export type UpdateType = 'news' | 'draw' | 'policy' | 'announcement';

export interface RawData {
  atom_feed?: any[];
  express_entry_html_parsed?: any[];
  ircc_main_updates?: any[];
  social_media_posts?: any[];
}

export interface NormalizedUpdate {
  id: string;
  source: SourceType;
  priority: PriorityType;
  type: UpdateType;
  title: string;
  summary: string;
  date: string; // ISO 8601
  url: string;
  key_data: {
    draw_number: number | null;
    crs_score: number | null;
    invitations: number | null;
  };
  short_summary?: string;
  detailed_summary?: string;
  insight?: string;
  alert?: boolean;
}

export interface Last7DaysUpdate {
  title: string;
  date: string;
  short_summary: string;
  highlight_tag: "EXPRESS_ENTRY" | "POLICY" | "NEWS" | "ALERT";
  importance_score: number;
  url: string;
}

export interface Last7DaysModule {
  last_7_days_updates: Last7DaysUpdate[];
  total_updates: number;
  top_update: Last7DaysUpdate | null;
  trend_summary: string;
}

export type SourceStatus = 'active' | 'inactive';

export interface SourceConfig {
  id: string;
  name: string;
  type: 'atom' | 'html' | 'api' | 'social';
  url: string;
  status: SourceStatus;
  priority: PriorityType;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

export interface PipelineOutput {
  latest_updates: NormalizedUpdate[];
  top_highlights: NormalizedUpdate[];
  alerts: boolean;
  alert_reason: string;
  insights: string[];
  last_7_days?: Last7DaysModule;
}
