"use client";

import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { z } from 'zod';
import { buildCalendar, buildStrategy, buildAssets, buildExportBundle, type CampaignInput, type ExportBundle } from '@/lib/agent';
import { downloadFile } from '@/lib/export';

const inputSchema = z.object({
  goal: z.string().min(3),
  productName: z.string().min(2),
  productDescription: z.string().min(10),
  audience: z.string().min(3),
  tone: z.string().min(3),
  channels: z.array(z.string()).min(1),
  budget: z.string().optional(),
  startDate: z.string().optional(),
  durationDays: z.string().optional(),
  landingUrl: z.string().url().optional().or(z.literal('')),
});

const defaultChannels = ["Website", "Email", "LinkedIn", "X/Twitter", "Instagram", "Ads"];

export default function CampaignAgent() {
  const [form, setForm] = useState({
    goal: 'Increase signups by 30% in 30 days',
    productName: 'Acme Analytics',
    productDescription: 'A privacy-first analytics platform for SaaS with funnels, cohorts, and AI insights.',
    audience: 'SaaS founders and growth teams at early to mid-stage startups',
    tone: 'Confident, clear, value-oriented',
    channels: ["Website", "Email", "LinkedIn", "X/Twitter"],
    budget: '5000',
    startDate: dayjs().format('YYYY-MM-DD'),
    durationDays: '21',
    landingUrl: '',
  });
  const [activeTab, setActiveTab] = useState<'plan' | 'assets' | 'calendar' | 'export' | 'ingest'>('plan');
  const [bundle, setBundle] = useState<ExportBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [ingested, setIngested] = useState<{ title?: string; description?: string; text?: string } | null>(null);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onToggleChannel = (channel: string) => {
    setForm((f) => {
      const exists = f.channels.includes(channel);
      return { ...f, channels: exists ? f.channels.filter(c => c !== channel) : [...f.channels, channel] };
    });
  };

  const generate = async () => {
    setLoading(true);
    try {
      const validated = inputSchema.parse({ ...form, channels: form.channels });
      const input: CampaignInput = {
        goal: validated.goal,
        productName: validated.productName,
        productDescription: validated.productDescription,
        audience: validated.audience,
        tone: validated.tone,
        channels: validated.channels as CampaignInput['channels'],
        budget: Number(form.budget || 0),
        startDate: form.startDate ? dayjs(form.startDate) : dayjs(),
        durationDays: Number(form.durationDays || 14),
        landingUrl: form.landingUrl || undefined,
      };
      const strategy = buildStrategy(input);
      const assets = buildAssets(input, strategy);
      const calendar = buildCalendar(input, strategy, assets);
      const b = buildExportBundle(input, strategy, assets, calendar);
      setBundle(b);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const ingestFromUrl = async (url: string) => {
    if (!url) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/fetch-url?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error('Failed to fetch URL');
      const data = await res.json();
      setIngested(data);
      if (data?.text) {
        setForm((f) => ({ ...f, productDescription: `${f.productDescription}\n\nWebsite summary:\n${data.text.slice(0, 1800)}` }));
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const channelBadges = useMemo(() => (
    <div className="row" style={{ flexWrap: 'wrap' }}>
      {defaultChannels.map((c) => (
        <button key={c} type="button" onClick={() => onToggleChannel(c)} className="badge" style={{ borderColor: form.channels.includes(c) ? '#0ea5e9' : undefined, background: form.channels.includes(c) ? '#e0f2fe' : undefined }}>
          {form.channels.includes(c) ? '?' : '+'} {c}
        </button>
      ))}
    </div>
  ), [form.channels]);

  return (
    <div className="grid" style={{ gap: 24 }}>
      <div className="grid grid-2">
        <div>
          <label className="label">Goal</label>
          <input className="input" name="goal" value={form.goal} onChange={onChange} placeholder="e.g., Increase signups by 30%" />
        </div>
        <div>
          <label className="label">Tone</label>
          <input className="input" name="tone" value={form.tone} onChange={onChange} placeholder="e.g., Confident, clear" />
        </div>
      </div>
      <div className="grid grid-2">
        <div>
          <label className="label">Product Name</label>
          <input className="input" name="productName" value={form.productName} onChange={onChange} />
        </div>
        <div>
          <label className="label">Target Audience</label>
          <input className="input" name="audience" value={form.audience} onChange={onChange} />
        </div>
      </div>
      <div>
        <label className="label">Product Description</label>
        <textarea className="textarea" name="productDescription" value={form.productDescription} onChange={onChange} />
        <div className="small">Tip: Use the Ingest tab to pull your website summary.</div>
      </div>
      <div>
        <label className="label">Channels</label>
        {channelBadges}
      </div>
      <div className="grid grid-2">
        <div>
          <label className="label">Budget (USD)</label>
          <input className="input" name="budget" value={form.budget} onChange={onChange} />
        </div>
        <div className="grid grid-2">
          <div>
            <label className="label">Start Date</label>
            <input type="date" className="input" name="startDate" value={form.startDate} onChange={onChange} />
          </div>
          <div>
            <label className="label">Duration (days)</label>
            <input className="input" name="durationDays" value={form.durationDays} onChange={onChange} />
          </div>
        </div>
      </div>
      <div>
        <label className="label">Landing URL (for UTM links)</label>
        <input className="input" name="landingUrl" value={form.landingUrl} onChange={onChange} placeholder="https://yourdomain.com/landing" />
        <div className="small">Used to auto-generate UTM links in calendar notes.</div>
      </div>

      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="tabs">
          <button className={`tab ${activeTab === 'plan' ? 'active' : ''}`} onClick={() => setActiveTab('plan')}>Plan</button>
          <button className={`tab ${activeTab === 'assets' ? 'active' : ''}`} onClick={() => setActiveTab('assets')}>Assets</button>
          <button className={`tab ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>Calendar</button>
          <button className={`tab ${activeTab === 'export' ? 'active' : ''}`} onClick={() => setActiveTab('export')}>Export</button>
          <button className={`tab ${activeTab === 'ingest' ? 'active' : ''}`} onClick={() => setActiveTab('ingest')}>Ingest</button>
        </div>
        <button className="button" onClick={generate} disabled={loading}>{loading ? 'Generating?' : 'Generate Plan & Assets'}</button>
      </div>

      {activeTab === 'plan' && (
        <div className="card">
          {!bundle && <div className="small">Generate to view the strategy plan.</div>}
          {bundle && (
            <div>
              <div className="section-title">Persona</div>
              <div>{bundle.strategy.personaSummary}</div>
              <div className="section-title">Core Message</div>
              <div>{bundle.strategy.primaryMessage}</div>
              <div className="section-title">Value Propositions</div>
              <ul className="list">
                {bundle.strategy.valueProps.map((v, i) => <li key={i}>{v}</li>)}
              </ul>
              <div className="section-title">Channel Plan</div>
              <ul className="list">
                {Object.entries(bundle.strategy.channelsPlan).map(([ch, plan]) => (
                  <li key={ch}><strong>{ch}</strong>: {plan.objective} ? {plan.strategy} ? KPIs: {plan.kpis.join(', ')}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {activeTab === 'assets' && (
        <div className="card">
          {!bundle && <div className="small">Generate to view assets.</div>}
          {bundle && (
            <div className="grid">
              <div>
                <div className="section-title">Headlines</div>
                <ul className="list">{bundle.assets.headlines.map((h, i) => <li key={i}>{h}</li>)}</ul>
              </div>
              <div>
                <div className="section-title">Ad Copy</div>
                <ul className="list">{bundle.assets.adCopy.map((h, i) => <li key={i}>{h}</li>)}</ul>
              </div>
              <div>
                <div className="section-title">Emails</div>
                <ul className="list">{bundle.assets.emails.map((e, i) => <li key={i}><strong>{e.subject}</strong> ? {e.preview} <details><summary>View</summary><div className="code">{e.body}</div></details></li>)}</ul>
              </div>
              <div>
                <div className="section-title">Social Posts</div>
                <ul className="list">{bundle.assets.social.map((p, i) => <li key={i}><strong>{p.channel}</strong>: {p.text}</li>)}</ul>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="card">
          {!bundle && <div className="small">Generate to view calendar.</div>}
          {bundle && (
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Channel</th>
                  <th>Title</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {bundle.calendar.map((ev, i) => (
                  <tr key={i}>
                    <td>{dayjs(ev.date).format('YYYY-MM-DD')}</td>
                    <td>{ev.channel}</td>
                    <td>{ev.title}</td>
                    <td>{ev.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'export' && (
        <div className="card">
          {!bundle && <div className="small">Generate to enable exports.</div>}
          {bundle && (
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button className="button" onClick={() => downloadFile('campaign.json', JSON.stringify(bundle, null, 2), 'application/json')}>Download JSON</button>
              <button className="button secondary" onClick={() => downloadFile('calendar.csv', bundle.csv.calendar, 'text/csv')}>Download Calendar CSV</button>
              <button className="button secondary" onClick={() => downloadFile('calendar.ics', bundle.ics, 'text/calendar')}>Download .ics</button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'ingest' && (
        <div className="card">
          <div className="grid">
            <div className="row">
              <input className="input" placeholder="https://example.com" id="ingest-url" />
              <button className="button" onClick={() => {
                const el = document.getElementById('ingest-url') as HTMLInputElement | null;
                ingestFromUrl(el?.value || '');
              }} disabled={loading}>{loading ? 'Fetching?' : 'Fetch URL'}</button>
            </div>
            {ingested && (
              <div>
                <div className="section-title">Fetched Summary</div>
                {ingested.title && <div><strong>Title:</strong> {ingested.title}</div>}
                {ingested.description && <div><strong>Description:</strong> {ingested.description}</div>}
                {ingested.text && <details><summary>Text</summary><div className="code">{ingested.text}</div></details>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
