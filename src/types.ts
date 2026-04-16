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

export interface PipelineOutput {
  latest_updates: NormalizedUpdate[];
  top_highlights: NormalizedUpdate[];
  alerts: boolean;
  alert_reason: string;
  insights: string[];
}
