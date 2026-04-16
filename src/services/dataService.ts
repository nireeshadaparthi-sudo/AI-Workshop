import { RawData, NormalizedUpdate, PipelineOutput, SourceType, PriorityType, UpdateType } from "../types";
import { summarizeUpdates, generateGlobalInsights } from "./geminiService";

export async function processDataPipeline(raw: RawData): Promise<PipelineOutput> {
  // STEP 1 & 2: Clean & Normalize
  let normalized: NormalizedUpdate[] = [];

  // Atom Feed
  if (raw.atom_feed) {
    raw.atom_feed.forEach((item, idx) => {
      if (!item.title) return;
      normalized.push({
        id: `atom-${idx}-${Date.now()}`,
        source: 'atom',
        priority: 'medium',
        type: 'news',
        title: item.title.trim(),
        summary: (item.summary || item.title).trim(),
        date: standardizeDate(item.published),
        url: item.link || '',
        key_data: { draw_number: null, crs_score: null, invitations: null }
      });
    });
  }

  // Express Entry
  if (raw.express_entry_html_parsed) {
    raw.express_entry_html_parsed.forEach((item, idx) => {
      normalized.push({
        id: `ee-${idx}-${Date.now()}`,
        source: 'express_entry',
        priority: 'high',
        type: 'draw',
        title: `Express Entry Draw #${item.draw_number || 'N/A'}`,
        summary: `Draw held on ${item.date}. CRS score: ${item.crs_score}. Invitations: ${item.invitations}.`,
        date: standardizeDate(item.date),
        url: '',
        key_data: {
          draw_number: item.draw_number || null,
          crs_score: item.crs_score || null,
          invitations: item.invitations || null
        }
      });
    });
  }

  // IRCC Main Updates
  if (raw.ircc_main_updates) {
    raw.ircc_main_updates.forEach((item, idx) => {
      normalized.push({
        id: `website-${idx}-${Date.now()}`,
        source: 'website',
        priority: 'high',
        type: item.type === 'policy' ? 'policy' : 'announcement',
        title: item.title.trim(),
        summary: item.summary?.trim() || item.title.trim(),
        date: standardizeDate(item.date),
        url: item.url || '',
        key_data: { draw_number: null, crs_score: null, invitations: null }
      });
    });
  }

  // Social Media
  if (raw.social_media_posts) {
    raw.social_media_posts.forEach((item, idx) => {
      normalized.push({
        id: `social-${idx}-${Date.now()}`,
        source: 'social',
        priority: 'low',
        type: 'news',
        title: item.text?.slice(0, 50) + '...',
        summary: item.text || '',
        date: standardizeDate(item.timestamp),
        url: item.link || '',
        key_data: { draw_number: null, crs_score: null, invitations: null }
      });
    });
  }

  // STEP 3: Deduplication
  normalized = deduplicate(normalized);

  // STEP 4: Prioritization Logic
  normalized.sort((a, b) => {
    const priorityMap: Record<PriorityType, number> = { high: 3, medium: 2, low: 1 };
    if (priorityMap[a.priority] !== priorityMap[b.priority]) {
      return priorityMap[b.priority] - priorityMap[a.priority];
    }
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // STEP 6: Alert Detection
  let alerts = false;
  let alertReason = "";
  
  const latestDraw = normalized.find(u => u.type === 'draw');
  if (latestDraw) {
    alerts = true;
    alertReason = `New Express Entry Draw detected: #${latestDraw.key_data.draw_number} with CRS ${latestDraw.key_data.crs_score}`;
  }

  const majorPolicy = normalized.find(u => u.type === 'policy' && u.priority === 'high');
  if (majorPolicy) {
    alerts = true;
    alertReason += alertReason ? ` | Major Policy Update: ${majorPolicy.title}` : `Major Policy Update: ${majorPolicy.title}`;
  }

  // STEP 5: Summarization (AI)
  const summarized = await summarizeUpdates(normalized);

  // STEP 7: Top Highlights
  const topHighlights = summarized.slice(0, 3);

  // STEP 8: Final Output
  const globalInsights = await generateGlobalInsights(summarized);

  return {
    latest_updates: summarized,
    top_highlights: topHighlights,
    alerts,
    alert_reason: alertReason,
    insights: globalInsights
  };
}

function standardizeDate(dateStr: string | undefined): string {
  if (!dateStr) return new Date().toISOString();
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function deduplicate(updates: NormalizedUpdate[]): NormalizedUpdate[] {
  const seen = new Set<string>();
  return updates.filter(u => {
    const key = `${u.title.toLowerCase()}-${u.date.split('T')[0]}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
