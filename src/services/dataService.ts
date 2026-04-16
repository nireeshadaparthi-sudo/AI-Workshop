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

  // STEP 9: Process Last 7 Days Module
  const last7DaysModule = processLast7DaysUpdates(summarized);

  return {
    latest_updates: summarized,
    top_highlights: topHighlights,
    alerts,
    alert_reason: alertReason,
    insights: globalInsights,
    last_7_days: last7DaysModule
  };
}

function processLast7DaysUpdates(updates: NormalizedUpdate[]) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 1. Filter
  let filtered = updates.filter(u => {
    const d = new Date(u.date);
    return !isNaN(d.getTime()) && d >= sevenDaysAgo;
  });

  // 2. Sort & Prioritize
  const typePriority: Record<UpdateType, number> = {
    draw: 5,
    policy: 4,
    announcement: 3,
    news: 2
  };

  filtered.sort((a, b) => {
    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (Math.abs(dateDiff) > 3600000) return dateDiff; // If more than 1 hour apart, sort by date
    return typePriority[b.type] - typePriority[a.type];
  });

  // 3. Enrich & Limit
  const enriched = filtered.slice(0, 10).map(u => {
    let tag: "EXPRESS_ENTRY" | "POLICY" | "NEWS" | "ALERT" = "NEWS";
    if (u.type === 'draw') tag = "EXPRESS_ENTRY";
    else if (u.type === 'policy') tag = "POLICY";
    else if (u.alert) tag = "ALERT";

    let score = 5;
    if (u.type === 'draw') score = 9;
    else if (u.type === 'policy') score = 8;
    else if (u.priority === 'high') score = 7;

    return {
      title: u.title,
      date: u.date,
      short_summary: u.short_summary || u.summary.slice(0, 100) + '...',
      highlight_tag: tag,
      importance_score: score,
      url: u.url
    };
  });

  // 4. Trend Summary
  let trend = "Stable immigration activity observed.";
  const draws = filtered.filter(u => u.type === 'draw');
  const policies = filtered.filter(u => u.type === 'policy');

  if (draws.length > 1) trend = "High frequency of Express Entry draws detected.";
  else if (policies.length > 0) trend = "Significant policy activity noted this week.";
  
  if (draws.length > 0) {
    const latestDraw = draws[0];
    if (latestDraw.key_data.crs_score && latestDraw.key_data.crs_score > 500) {
      trend += " CRS scores remain elevated.";
    } else if (latestDraw.key_data.crs_score && latestDraw.key_data.crs_score < 450) {
      trend += " CRS scores showing downward trend.";
    }
  }

  return {
    last_7_days_updates: enriched,
    total_updates: filtered.length,
    top_update: enriched[0] || null,
    trend_summary: trend
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
