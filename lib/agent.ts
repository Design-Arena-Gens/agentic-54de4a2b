import dayjs, { Dayjs } from 'dayjs';

export type CampaignInput = {
  goal: string;
  productName: string;
  productDescription: string;
  audience: string;
  tone: string;
  channels: Array<'Website' | 'Email' | 'LinkedIn' | 'X/Twitter' | 'Instagram' | 'Ads'>;
  budget: number;
  startDate: Dayjs;
  durationDays: number;
  landingUrl?: string;
};

export type Strategy = {
  primaryMessage: string;
  valueProps: string[];
  personaSummary: string;
  channelsPlan: Record<string, { objective: string; strategy: string; kpis: string[] }>;
};

export type Assets = {
  headlines: string[];
  adCopy: string[];
  emails: Array<{ subject: string; preview: string; body: string }>;
  social: Array<{ channel: string; text: string }>;
};

export type CalendarEvent = {
  date: string;
  channel: string;
  title: string;
  notes: string;
};

export type ExportBundle = {
  input: CampaignInput;
  strategy: Strategy;
  assets: Assets;
  calendar: CalendarEvent[];
  ics: string;
  csv: { calendar: string };
};

function sentenceCase(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }

export function buildStrategy(input: CampaignInput): Strategy {
  const valueProps = [
    `Set up in minutes, not weeks`,
    `Privacy-first by design`,
    `Crystal-clear funnels and cohort analysis`,
    `Actionable AI insights, not vanity metrics`,
  ];
  const personaSummary = `For ${input.audience}. They seek outcomes: ${sentenceCase(input.goal)}. They value credibility, proof, and time-to-value. Tone: ${input.tone}.`;
  const channelsPlan: Strategy['channelsPlan'] = {};
  input.channels.forEach((ch) => {
    const base = {
      Website: { objective: 'Convert qualified traffic', strategy: 'Update hero, add social proof, launch comparison page', kpis: ['Signup rate', 'Bounce rate'] },
      Email: { objective: 'Nurture and activate', strategy: '3-email sequence: insight, case study, offer', kpis: ['Open rate', 'CTR', 'Activations'] },
      'LinkedIn': { objective: 'Educate and build trust', strategy: 'Founder POV, carousel explainer, customer quote', kpis: ['Impressions', 'Engagement rate'] },
      'X/Twitter': { objective: 'Spark conversation', strategy: 'Thread on problem framing + micro-demos', kpis: ['Replies', 'Profile visits'] },
      Instagram: { objective: 'Show product visually', strategy: 'Short reels of ?before/after? analytics moments', kpis: ['Views', 'Saves'] },
      Ads: { objective: 'Capture demand', strategy: 'Search on intent + retargeting with proof', kpis: ['CPC', 'CVR'] },
    } as const;
    // @ts-ignore
    channelsPlan[ch] = base[ch];
  });
  const primaryMessage = `${input.productName}: ${sentenceCase(input.tone)} solution to ${input.goal.toLowerCase()} for ${input.audience.toLowerCase()}.`;
  return { primaryMessage, valueProps, personaSummary, channelsPlan };
}

function bullets(strings: string[]): string {
  return strings.map((s) => `? ${s}`).join('\n');
}

export function buildAssets(input: CampaignInput, strategy: Strategy): Assets {
  const brand = input.productName;
  const core = strategy.primaryMessage;
  const headlines = [
    `${brand} ? ${sentenceCase(input.goal)}`,
    `From guesswork to growth with ${brand}`,
    `${brand}: analytics that turns insight into action`,
  ];
  const adCopy = [
    `${brand} helps ${input.audience.toLowerCase()} ${input.goal.toLowerCase()}. ${strategy.valueProps[2]}. Start in minutes.`,
    `Stop drowning in dashboards. ${brand} surfaces what moves the needle. ${strategy.valueProps[3]}.`,
  ];
  const emails = [
    {
      subject: `${brand} in 3 minutes: see what matters`,
      preview: 'A quick walkthrough and a real case study',
      body: `Hi there,\n\nIf analytics feels noisy, you're not alone. ${brand} focuses on outcomes.\n\nWhy teams switch:\n${bullets(strategy.valueProps)}\n\nWant a 3-minute walkthrough? Reply with "demo" and I?ll share a short video.\n\nBest,\n${brand} Team`,
    },
    {
      subject: `How ${brand} users improved activation by 24%`,
      preview: 'A simple cohort insight changed their onboarding',
      body: `Quick story: a SaaS team found a 24% activation lift after seeing a drop-off cohort at Day 2. They added an in-app nudge based on our insight.\n\nIt took an afternoon. Results stuck.\n\nCurious what your data says? Happy to take a look and share a 1-pager.`,
    },
  ];
  const social: Assets['social'] = [];
  if (input.channels.includes('LinkedIn')) {
    social.push({ channel: 'LinkedIn', text: `Most analytics tools show everything. ${brand} shows what matters. ${strategy.valueProps[3]}. ${strategy.primaryMessage}` });
  }
  if (input.channels.includes('X/Twitter')) {
    social.push({ channel: 'X/Twitter', text: `Funnels, cohorts, activation. Keep it simple. ${brand} ? outcomes > dashboards. #saas #growth` });
  }
  if (input.channels.includes('Instagram')) {
    social.push({ channel: 'Instagram', text: `Before ? drowning in charts. After ? one insight, one action. ${brand}.` });
  }
  return { headlines, adCopy, emails, social };
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);
}

function buildUtmUrl(baseUrl: string, params: { source: string; medium: string; campaign: string; content?: string }): string {
  try {
    const u = new URL(baseUrl);
    u.searchParams.set('utm_source', params.source);
    u.searchParams.set('utm_medium', params.medium);
    u.searchParams.set('utm_campaign', params.campaign);
    if (params.content) u.searchParams.set('utm_content', params.content);
    return u.toString();
  } catch {
    return baseUrl;
  }
}

export function buildCalendar(input: CampaignInput, strategy: Strategy, assets: Assets) {
  const events: Array<CalendarEvent> = [];
  const start = input.startDate.startOf('day');
  const days = input.durationDays;
  const push = (offset: number, channel: string, title: string, notes: string) => {
    // Append UTM link if available
    let fullNotes = notes;
    if (input.landingUrl && channel !== 'Website') {
      const medium = channel.match(/Email/i) ? 'email' : channel.match(/Ads/i) ? 'cpc' : 'social';
      const link = buildUtmUrl(input.landingUrl, {
        source: channel.toLowerCase(),
        medium,
        campaign: slugify(input.goal),
        content: slugify(title),
      });
      fullNotes = `${notes}\nLink: ${link}`;
    }
    events.push({ date: start.add(offset, 'day').toISOString(), channel, title, notes: fullNotes });
  };
  // Kickoff
  push(0, 'Website', 'Hero + proof update', 'Add headline and 3 logos');
  // Spread posts
  let day = 1;
  assets.social.forEach((p) => { push(day, p.channel, 'Social post', p.text); day += 2; });
  // Emails cadence
  if (input.channels.includes('Email')) {
    push(2, 'Email', assets.emails[0].subject, assets.emails[0].preview);
    push(9, 'Email', assets.emails[1].subject, assets.emails[1].preview);
  }
  // Ads start
  if (input.channels.includes('Ads')) {
    push(1, 'Ads', 'Launch search + retargeting', 'Focus on high-intent terms');
  }
  // Weekly recap post
  push(7, 'LinkedIn', 'Carousel: what we learned', 'Founder POV, 5 slides');
  // Keep within duration
  return events.filter(ev => dayjs(ev.date).diff(start, 'day') <= days);
}

function csvEscape(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export function toCalendarCsv(events: CalendarEvent[]): string {
  const header = ['date', 'channel', 'title', 'notes'];
  const lines = [header.join(',')];
  for (const ev of events) {
    lines.push([ev.date, ev.channel, ev.title, ev.notes].map(csvEscape).join(','));
  }
  return lines.join('\n');
}

export function buildIcs(events: CalendarEvent[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Campaign Agent//EN',
  ];
  events.forEach((ev, idx) => {
    const dt = dayjs(ev.date).utc();
    const dtStart = dt.format('YYYYMMDD[T]HHmmss[Z]');
    const dtEnd = dt.add(1, 'hour').format('YYYYMMDD[T]HHmmss[Z]');
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${idx}-${dtStart}@campaign-agent`);
    lines.push(`DTSTAMP:${dtStart}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(`SUMMARY:${ev.channel}: ${ev.title}`);
    lines.push(`DESCRIPTION:${ev.notes.replace(/\n/g, ' ')}`);
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\n');
}

export function buildExportBundle(input: CampaignInput, strategy: Strategy, assets: Assets, calendar: CalendarEvent[]): ExportBundle {
  return {
    input,
    strategy,
    assets,
    calendar,
    ics: buildIcs(calendar),
    csv: { calendar: toCalendarCsv(calendar) },
  };
}
