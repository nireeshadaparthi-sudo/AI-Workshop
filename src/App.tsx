/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  RefreshCw, 
  TrendingUp, 
  FileText, 
  Users, 
  AlertTriangle, 
  ExternalLink,
  ChevronRight,
  Database,
  Info,
  CheckCircle2,
  Clock,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RawData, PipelineOutput, NormalizedUpdate } from './types';
import { processDataPipeline } from './services/dataService';
import { AdminPanel } from './components/AdminPanel';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';

const SAMPLE_DATA: RawData = {
  atom_feed: [
    {
      title: "IRCC increases permanent residence fees effective April 30, 2026",
      summary: "Immigration, Refugees and Citizenship Canada (IRCC) is increasing fees for all permanent residence applications.",
      published: "2026-04-10T10:00:00Z",
      link: "https://www.canada.ca/en/immigration-refugees-citizenship/news/notices.html"
    },
    {
      title: "New measures to support international students in Canada",
      summary: "IRCC announces new work authorization rules for international students enrolled in post-secondary programs.",
      published: "2026-04-12T14:30:00Z",
      link: "https://www.canada.ca/en/immigration-refugees-citizenship/news/2026/04/new-measures-to-support-international-students.html"
    }
  ],
  express_entry_html_parsed: [
    {
      draw_number: 294,
      date: "April 14, 2026",
      invitations: 2000,
      crs_score: 515
    },
    {
      draw_number: 293,
      date: "April 15, 2026",
      invitations: 4000,
      crs_score: 419
    }
  ],
  ircc_main_updates: [
    {
      title: "Proposed Merger of FSWP, CEC, and FST Programs",
      summary: "IRCC is consulting on a major overhaul of the Express Entry selection system to prioritize high-earning potential.",
      date: "2026-04-08",
      type: "policy",
      url: "https://www.cicnews.com/2026/04/breaking-express-entry-overhaul.html"
    }
  ],
  social_media_posts: [
    {
      text: "Hearing reports of faster processing times for citizenship applications in Ontario. #IRCC #CanadaImmigration",
      timestamp: "2026-04-15T09:00:00Z",
      link: "https://twitter.com/example"
    }
  ]
};

function Header() {
  return (
    <header className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-xl font-bold tracking-tighter flex items-center gap-1">
          IRCC<span className="text-accent-red">.MONITOR</span>
        </Link>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-[#14532d] text-[#4ade80] rounded-full border border-[#166534] text-[11px] font-mono font-bold">
          <span className="w-1.5 h-1.5 bg-[#4ade80] rounded-full animate-pulse" />
          PIPELINE ACTIVE
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-card-border mt-12 flex flex-col md:flex-row justify-between items-center gap-6">
      <div className="flex items-center gap-2 text-text-muted">
        <TrendingUp size={16} />
        <span className="text-xs font-bold tracking-widest uppercase">IRCC Monitor Pro v1.0</span>
      </div>
      <p className="text-[11px] text-text-muted font-medium">© 2026 IRCC MONITORING SYSTEMS. DATA SOURCED FROM OFFICIAL CHANNELS.</p>
      <div className="flex gap-6">
        <a href="#" className="text-[11px] font-bold text-text-muted hover:text-text-main transition-colors">PRIVACY</a>
        <a href="#" className="text-[11px] font-bold text-text-muted hover:text-text-main transition-colors">TERMS</a>
        <a href="#" className="text-[11px] font-bold text-text-muted hover:text-text-main transition-colors">API</a>
      </div>
    </footer>
  );
}

function Dashboard() {
  const [rawDataInput, setRawDataInput] = useState<string>(JSON.stringify(SAMPLE_DATA, null, 2));
  const [pipelineOutput, setPipelineOutput] = useState<PipelineOutput | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'raw'>('dashboard');

  const runPipeline = async (data: RawData) => {
    setIsProcessing(true);
    try {
      const result = await processDataPipeline(data);
      setPipelineOutput(result);
    } catch (error) {
      console.error("Pipeline execution failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    runPipeline(SAMPLE_DATA);
  }, []);

  const handleIngest = () => {
    try {
      const parsed = JSON.parse(rawDataInput);
      runPipeline(parsed);
    } catch (e) {
      alert("Invalid JSON input");
    }
  };

  const latestDraw = pipelineOutput?.latest_updates.find(u => u.type === 'draw');

  return (
    <div className="min-h-screen bg-bg text-text-main font-sans selection:bg-accent-blue/30">
      <Header />

      <main className="max-w-7xl mx-auto px-6 pb-12">
        {/* Tabs */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex gap-1 p-1 bg-card-bg border border-card-border rounded-xl w-fit">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'dashboard' ? 'bg-card-border text-text-main shadow-sm' : 'text-text-muted hover:text-text-main'}`}
            >
              DASHBOARD
            </button>
            <button 
              onClick={() => setActiveTab('raw')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'raw' ? 'bg-card-border text-text-main shadow-sm' : 'text-text-muted hover:text-text-main'}`}
            >
              INGESTION
            </button>
          </div>

          {activeTab === 'dashboard' && (
            <button 
              onClick={() => runPipeline(JSON.parse(rawDataInput))}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-1.5 bg-card-bg border border-card-border rounded-xl text-xs font-bold text-text-muted hover:text-text-main transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} className={isProcessing ? 'animate-spin' : ''} />
              REFRESH FEED
            </button>
          )}
        </div>

        {activeTab === 'dashboard' ? (
          <div className="bento-grid">
            {/* Latest Updates Section */}
            <div className="bento-card lg:col-span-2 lg:row-span-2">
              <div className="bento-label">
                <span>Primary Feed</span> 
                <span>ATOM / WEBSITE</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                {isProcessing ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-20 bg-card-border/30 animate-pulse rounded-xl mb-2" />
                  ))
                ) : (
                  pipelineOutput?.latest_updates.map((update) => (
                    <div key={update.id} className="py-3 border-b border-card-border last:border-0 group">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          update.type === 'draw' ? 'text-accent-blue bg-accent-blue/10' : 'text-accent-green bg-accent-green/10'
                        }`}>
                          {update.type.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-mono text-text-muted">{new Date(update.date).toLocaleDateString()}</span>
                      </div>
                      <h3 className="text-sm font-semibold group-hover:text-accent-blue transition-colors">{update.title}</h3>
                      <p className="text-xs text-text-muted mt-1 line-clamp-2 leading-relaxed">{update.short_summary}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Last 7 Days Section (Moved) */}
            <div className="bento-card lg:col-span-2">
              <div className="bento-label">
                <span>Last 7 Days Immigration Updates</span>
                <span className="text-accent-blue font-bold">{pipelineOutput?.last_7_days?.total_updates || 0} UPDATES</span>
              </div>
              
              {pipelineOutput?.last_7_days?.trend_summary && (
                <div className="mb-4 p-3 bg-accent-blue/5 border border-accent-blue/20 rounded-xl text-xs text-accent-blue flex items-center gap-3">
                  <TrendingUp size={16} />
                  <span className="font-medium">{pipelineOutput.last_7_days.trend_summary}</span>
                </div>
              )}

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar max-h-[300px]">
                {pipelineOutput?.last_7_days?.last_7_days_updates.length === 0 ? (
                  <div className="py-8 text-center text-text-muted italic text-sm">
                    No updates in last 7 days.
                  </div>
                ) : (
                  pipelineOutput?.last_7_days?.last_7_days_updates.map((update, i) => (
                    <div 
                      key={i} 
                      className={`p-3 rounded-xl border transition-all ${
                        update === pipelineOutput.last_7_days?.top_update 
                        ? 'bg-accent-blue/10 border-accent-blue/40' 
                        : 'bg-white/5 border-card-border'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                          update.highlight_tag === 'EXPRESS_ENTRY' ? 'bg-accent-blue text-white' :
                          update.highlight_tag === 'POLICY' ? 'bg-accent-red text-white' :
                          update.highlight_tag === 'ALERT' ? 'bg-yellow-500 text-black' :
                          'bg-card-border text-text-muted'
                        }`}>
                          {update.highlight_tag}
                        </span>
                        <span className="text-[9px] font-mono text-text-muted">
                          {new Date(update.date).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold mb-1 line-clamp-1">{update.title}</h4>
                      <p className="text-[11px] text-text-muted line-clamp-2 mb-2 leading-relaxed">
                        {update.short_summary}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-text-muted">SCORE: {update.importance_score}/10</span>
                        {update.url && (
                          <a 
                            href={update.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[9px] font-bold text-accent-blue hover:underline flex items-center gap-1"
                          >
                            SOURCE <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Featured Draw Section */}
            <div className="bento-card lg:col-span-2 border-l-4 border-l-accent-red">
              <div className="bento-label">LATEST EXPRESS ENTRY DRAW</div>
              <div className="flex items-baseline gap-10 mt-2">
                <div>
                  <div className="text-4xl font-bold tracking-tight">{latestDraw?.key_data.crs_score || '---'}</div>
                  <div className="text-xs text-text-muted font-medium mt-1">CRS Cut-off Score</div>
                </div>
                <div className="border-l border-card-border pl-10">
                  <div className="text-4xl font-bold tracking-tight">{latestDraw?.key_data.invitations?.toLocaleString() || '---'}</div>
                  <div className="text-xs text-text-muted font-medium mt-1">Invitations Issued</div>
                </div>
              </div>
            </div>

            {/* Alerts Section */}
            <div className="bento-card lg:col-span-1">
              <div className="bento-label">SYSTEM ALERTS</div>
              <AnimatePresence mode="wait">
                {pipelineOutput?.alerts ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-accent-red/10 border border-accent-red/20 p-3 rounded-xl text-red-300 text-[13px] leading-relaxed"
                  >
                    <div className="flex items-center gap-2 mb-1 font-bold text-accent-red">
                      <AlertTriangle size={14} />
                      NEW DRAW DETECTED
                    </div>
                    {pipelineOutput.alert_reason}
                  </motion.div>
                ) : (
                  <div className="text-xs text-text-muted italic">No active alerts.</div>
                )}
              </AnimatePresence>
            </div>

            {/* Metric Section */}
            <div className="bento-card lg:col-span-1">
              <div className="bento-label">CRS TREND</div>
              <div className="text-5xl font-mono font-bold tracking-tighter text-accent-green mt-2">↘ 1.2%</div>
              <div className="text-[11px] text-text-muted mt-auto opacity-60">Monthly average decline</div>
            </div>

            {/* Insights Section */}
            <div className="bento-card lg:col-span-2">
              <div className="bento-label">AI INSIGHTS & TRENDS</div>
              <div className="space-y-2">
                {pipelineOutput?.insights.map((insight, i) => (
                  <div key={i} className="bg-white/5 border-l-2 border-accent-blue p-2.5 rounded-r-lg text-[13px] text-text-main leading-snug">
                    {insight}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bento-card p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">Data Ingestion Engine</h2>
                <p className="text-sm text-text-muted mt-1">Paste pre-fetched IRCC data in JSON format to process through the pipeline.</p>
              </div>
              <button 
                onClick={handleIngest}
                disabled={isProcessing}
                className="px-6 py-2.5 bg-accent-blue text-white rounded-xl font-bold text-sm hover:bg-accent-blue/90 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-accent-blue/20"
              >
                {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                Process Data
              </button>
            </div>
            <textarea 
              value={rawDataInput}
              onChange={(e) => setRawDataInput(e.target.value)}
              className="w-full h-[400px] p-6 font-mono text-sm bg-bg border border-card-border rounded-xl focus:ring-1 focus:ring-accent-blue focus:border-transparent outline-none resize-none text-text-main"
              placeholder='{ "atom_feed": [...], ... }'
            />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

function AdminPage() {
  return (
    <div className="min-h-screen bg-bg text-text-main font-sans selection:bg-accent-blue/30">
      <Header />
      <main className="max-w-7xl mx-auto px-6 pb-12">
        <AdminPanel />
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}
