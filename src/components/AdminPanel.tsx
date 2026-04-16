import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Edit2, Trash2, Power, Search, Globe, 
  Hash, Link as LinkIcon, AlertCircle, CheckCircle,
  X, Save, Loader2, Database
} from 'lucide-react';
import { SourceConfig, SourceStatus, PriorityType, RawData } from '../types';
import { processDataPipeline } from '../services/dataService';
import { RefreshCw, CheckCircle2, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';

const SAMPLE_DATA: RawData = {
  atom_feed: [
    {
      title: "IRCC increases permanent residence fees effective April 30, 2026",
      summary: "Immigration, Refugees and Citizenship Canada (IRCC) is increasing fees for all permanent residence applications.",
      published: "2026-04-10T10:00:00Z",
      link: "https://www.canada.ca/en/immigration-refugees-citizenship/news/notices.html"
    }
  ],
  express_entry_html_parsed: [],
  ircc_main_updates: [],
  social_media_posts: []
};

export const AdminPanel: React.FC = () => {
  const [sources, setSources] = useState<SourceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Ingestion State
  const [rawDataInput, setRawDataInput] = useState<string>(JSON.stringify(SAMPLE_DATA, null, 2));
  const [isProcessing, setIsProcessing] = useState(false);
  const [processSuccess, setProcessSuccess] = useState(false);
  
  // Newsletter State
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [isSendingUpdate, setIsSendingUpdate] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    subject: '',
    content: ''
  });
  
  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<SourceConfig | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'atom' as const,
    url: '',
    priority: 'medium' as PriorityType
  });

  const fetchSources = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/sources');
      if (!response.ok) throw new Error('Failed to fetch sources');
      const data = await response.json();
      setSources(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    try {
      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .select('email');
      if (error) throw error;
      setSubscribers(data || []);
    } catch (err: any) {
      console.error('Error fetching subscribers:', err.message);
    }
  };

  const handleSendUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateForm.subject || !updateForm.content || subscribers.length === 0) {
      alert("Please provide subject, content, and ensure there are subscribers.");
      return;
    }

    setIsSendingUpdate(true);
    setUpdateSuccess(false);
    try {
      const token = localStorage.getItem('token'); // Assuming token is stored here
      const response = await fetch('/api/newsletter/send-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subject: updateForm.subject,
          content: updateForm.content,
          subscribers: subscribers.map(s => s.email)
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to send updates');
      }

      setUpdateSuccess(true);
      setUpdateForm({ subject: '', content: '' });
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSendingUpdate(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/sources/${id}/toggle`, {
        method: 'PATCH'
      });
      if (!response.ok) throw new Error('Toggle failed');
      fetchSources();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this source?')) return;
    try {
      const response = await fetch(`/api/admin/sources/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Delete failed');
      fetchSources();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingSource ? 'PUT' : 'POST';
    const url = editingSource ? `/api/admin/sources/${editingSource.id}` : '/api/admin/sources';

    try {
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      if (!response.ok) throw new Error('Operation failed');
      setIsModalOpen(false);
      setEditingSource(null);
      setFormData({ name: '', type: 'atom', url: '', priority: 'medium' });
      fetchSources();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openEditModal = (source: SourceConfig) => {
    setEditingSource(source);
    setFormData({
      name: source.name,
      type: source.type,
      url: source.url,
      priority: source.priority
    });
    setIsModalOpen(true);
  };

  const handleIngest = async () => {
    setIsProcessing(true);
    setProcessSuccess(false);
    try {
      const parsed = JSON.parse(rawDataInput);
      await processDataPipeline(parsed);
      setProcessSuccess(true);
      setTimeout(() => setProcessSuccess(false), 3000);
    } catch (e) {
      alert("Invalid JSON input or processing failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredSources = sources.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Source Management</h2>
          <p className="text-sm text-text-muted">Configure and manage IRCC data ingestion points.</p>
        </div>
        <button 
          onClick={() => {
            setEditingSource(null);
            setFormData({ name: '', type: 'atom', url: '', priority: 'medium' });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-xl font-bold text-sm hover:bg-accent-blue/90 transition-all shadow-lg shadow-accent-blue/20"
        >
          <Plus size={18} />
          ADD NEW SOURCE
        </button>
      </div>

      {/* Search & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <input 
            type="text"
            placeholder="Search sources by name or URL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card-bg border border-card-border rounded-xl py-3 pl-12 pr-4 text-sm text-text-main focus:ring-1 focus:ring-accent-blue outline-none transition-all"
          />
        </div>
        <div className="bg-card-bg border border-card-border rounded-xl p-3 flex items-center justify-between">
          <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Active Sources</span>
          <span className="text-xl font-bold text-accent-green">{sources.filter(s => s.status === 'active').length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bento-card overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-card-border">
                <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Source Name</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Priority</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin mx-auto text-accent-blue" size={24} />
                  </td>
                </tr>
              ) : filteredSources.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-text-muted italic text-sm">
                    No sources found matching your criteria.
                  </td>
                </tr>
              ) : filteredSources.map((source) => (
                <tr key={source.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-sm">{source.name}</div>
                    <div className="text-[10px] text-text-muted font-mono truncate max-w-[200px]">{source.url}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-text-muted uppercase bg-card-border px-2 py-1 rounded">
                      {source.type === 'atom' && <Hash size={10} />}
                      {source.type === 'html' && <Globe size={10} />}
                      {source.type === 'social' && <LinkIcon size={10} />}
                      {source.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold uppercase ${
                      source.priority === 'high' ? 'text-accent-red' :
                      source.priority === 'medium' ? 'text-accent-blue' : 'text-text-muted'
                    }`}>
                      {source.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase ${
                      source.status === 'active' ? 'text-accent-green' : 'text-text-muted'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${source.status === 'active' ? 'bg-accent-green animate-pulse' : 'bg-text-muted'}`} />
                      {source.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleToggle(source.id)}
                        className={`p-2 rounded-lg transition-colors ${source.status === 'active' ? 'text-text-muted hover:text-accent-red' : 'text-accent-green hover:bg-accent-green/10'}`}
                        title={source.status === 'active' ? 'Disable' : 'Enable'}
                      >
                        <Power size={16} />
                      </button>
                      <button 
                        onClick={() => openEditModal(source)}
                        className="p-2 text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(source.id)}
                        className="p-2 text-text-muted hover:text-accent-red hover:bg-accent-red/10 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ingestion Section */}
      <div className="bento-card p-8 mt-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">Manual Data Ingestion</h2>
            <p className="text-sm text-text-muted mt-1">Paste pre-fetched IRCC data in JSON format to process through the pipeline.</p>
          </div>
          <button 
            onClick={handleIngest}
            disabled={isProcessing}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg ${
              processSuccess 
              ? 'bg-accent-green text-white shadow-accent-green/20' 
              : 'bg-accent-blue text-white hover:bg-accent-blue/90 shadow-accent-blue/20'
            } disabled:opacity-50`}
          >
            {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : processSuccess ? <CheckCircle2 size={16} /> : <Database size={16} />}
            {isProcessing ? 'Processing...' : processSuccess ? 'Success!' : 'Process Data'}
          </button>
        </div>
        <textarea 
          value={rawDataInput}
          onChange={(e) => setRawDataInput(e.target.value)}
          className="w-full h-[300px] p-6 font-mono text-sm bg-bg border border-card-border rounded-xl focus:ring-1 focus:ring-accent-blue focus:border-transparent outline-none resize-none text-text-main"
          placeholder='{ "atom_feed": [...], ... }'
        />
      </div>

      {/* Newsletter Management Section */}
      <div className="bento-card p-8 mt-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">Newsletter Management</h2>
            <p className="text-sm text-text-muted mt-1">Send updates to all {subscribers.length} subscribers.</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={fetchSubscribers}
              className="p-2 text-text-muted hover:text-accent-blue transition-colors"
              title="Refresh subscriber list"
            >
              <RefreshCw size={18} />
            </button>
            <button 
              form="newsletter-form"
              type="submit"
              disabled={isSendingUpdate || subscribers.length === 0}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg ${
                updateSuccess 
                ? 'bg-accent-green text-white shadow-accent-green/20' 
                : 'bg-accent-blue text-white hover:bg-accent-blue/90 shadow-accent-blue/20'
              } disabled:opacity-50`}
            >
              {isSendingUpdate ? <RefreshCw className="animate-spin" size={16} /> : updateSuccess ? <CheckCircle2 size={16} /> : <Send size={16} />}
              {isSendingUpdate ? 'Sending...' : updateSuccess ? 'Sent Successfully!' : 'Send Update to All'}
            </button>
          </div>
        </div>

        <form id="newsletter-form" onSubmit={handleSendUpdate} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Update Subject</label>
            <input 
              type="text" 
              required
              value={updateForm.subject}
              onChange={(e) => setUpdateForm({...updateForm, subject: e.target.value})}
              className="w-full bg-bg border border-card-border rounded-xl py-2.5 px-4 text-sm text-text-main focus:ring-1 focus:ring-accent-blue outline-none"
              placeholder="e.g. New Express Entry Draw Results - April 2026"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Email Content (HTML supported)</label>
            <textarea 
              required
              value={updateForm.content}
              onChange={(e) => setUpdateForm({...updateForm, content: e.target.value})}
              className="w-full h-[200px] p-4 font-sans text-sm bg-bg border border-card-border rounded-xl focus:ring-1 focus:ring-accent-blue focus:border-transparent outline-none resize-none text-text-main"
              placeholder="Write your update message here... <p>HTML is supported</p>"
            />
          </div>
        </form>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-bg/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bento-card w-full max-w-lg p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">{editingSource ? 'Edit Data Source' : 'Add New Data Source'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-text-main">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Source Name</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-bg border border-card-border rounded-xl py-2.5 px-4 text-sm text-text-main focus:ring-1 focus:ring-accent-blue outline-none"
                    placeholder="e.g. IRCC News Feed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Type</label>
                    <select 
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                      className="w-full bg-bg border border-card-border rounded-xl py-2.5 px-4 text-sm text-text-main focus:ring-1 focus:ring-accent-blue outline-none appearance-none"
                    >
                      <option value="atom">Atom Feed</option>
                      <option value="html">HTML Scraper</option>
                      <option value="api">JSON API</option>
                      <option value="social">Social Media</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Priority</label>
                    <select 
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
                      className="w-full bg-bg border border-card-border rounded-xl py-2.5 px-4 text-sm text-text-main focus:ring-1 focus:ring-accent-blue outline-none appearance-none"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Source URL</label>
                  <input 
                    type="url" 
                    required
                    value={formData.url}
                    onChange={(e) => setFormData({...formData, url: e.target.value})}
                    className="w-full bg-bg border border-card-border rounded-xl py-2.5 px-4 text-sm text-text-main focus:ring-1 focus:ring-accent-blue outline-none font-mono"
                    placeholder="https://..."
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2.5 bg-card-border text-text-main rounded-xl font-bold text-sm hover:bg-card-border/80 transition-all"
                  >
                    CANCEL
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-xl font-bold text-sm hover:bg-accent-blue/90 transition-all shadow-lg shadow-accent-blue/20"
                  >
                    <Save size={18} />
                    {editingSource ? 'UPDATE SOURCE' : 'SAVE SOURCE'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
