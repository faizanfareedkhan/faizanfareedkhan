import { formatDate, MONTHS } from './stats.mjs';

const SANS = `-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif`;
const MONO = `ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,'Liberation Mono',monospace`;

/** The README picks a palette with <picture> + prefers-color-scheme, so every card is rendered twice. */
export const PALETTES = {
  dark: {
    bg: '#0b1020', border: '#1e293b', title: '#f8fafc', text: '#e2e8f0', muted: '#94a3b8', faint: '#334155',
    track: '#1e293b', bar: 'url(#vg)', strong: 'url(#vg)', easy: '#2dd4bf', medium: '#fbbf24', hard: '#fb7185',
    gradient: ['#22d3ee', '#818cf8', '#c084fc'],
  },
  light: {
    bg: '#ffffff', border: '#e2e8f0', title: '#0f172a', text: '#1e293b', muted: '#64748b', faint: '#cbd5e1',
    track: '#f1f5f9', bar: 'url(#vg)', strong: 'url(#vg)', easy: '#0d9488', medium: '#d97706', hard: '#e11d48',
    gradient: ['#0891b2', '#6366f1', '#9333ea'],
  },
};

export const escapeXml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const fmt1 = (n) => (Math.round(n * 10) / 10).toLocaleString('en-US', { maximumFractionDigits: 1 });
const plural = (n, word) => `${fmt(n)} ${word}${Math.round(n) === 1 ? '' : 's'}`;
const r1 = (n) => Math.round(n * 10) / 10;

function stops(colors) {
  return colors
    .map((color, i) => `<stop offset="${Math.round((i / (colors.length - 1)) * 100)}%" stop-color="${color}"/>`)
    .join('');
}

/** Shared frame: background, border, title row, fonts and gradients. Cards are fully static. */
function card({ width, height, palette, title, subtitle, label, body }) {
  const p = palette;
  const gradient = `<defs>
  <linearGradient id="hg" x1="0" y1="0" x2="1" y2="1">${stops(p.gradient)}</linearGradient>
  <linearGradient id="vg" x1="0" y1="1" x2="0" y2="0">${stops(p.gradient)}</linearGradient>
</defs>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(label)}">
<title>${escapeXml(label)}</title>
${gradient}
<style>
  text{font-family:${SANS};fill:${p.text};font-variant-numeric:tabular-nums}
  .mono{font-family:${MONO}}
  .title{font-size:14px;font-weight:600;fill:${p.title}}
  .sub{font-size:12px;fill:${p.muted}}
  .big{font-weight:700;fill:url(#hg);letter-spacing:-.02em}
  .value{font-size:17px;font-weight:600;fill:${p.title}}
  .label{font-size:11px;fill:${p.muted}}
  .tiny{font-size:10px;fill:${p.muted}}
  .strong{fill:${p.title};font-weight:600}
</style>
<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="10" fill="${p.bg}" stroke="url(#hg)" stroke-opacity="0.55"/>
<text x="24" y="36" class="title">${escapeXml(title)}</text>
<text x="${width - 24}" y="36" class="sub" text-anchor="end">${escapeXml(subtitle)}</text>
${body}
</svg>
`;
}

/** All-time overview: total contributions, contributions per year, streaks, repos. */
export function renderOverviewCard(stats, mode) {
  const p = PALETTES[mode];
  const width = 420;
  const height = 220;
  const since = `${MONTHS[Number(stats.since.slice(5, 7)) - 1]} ${stats.since.slice(0, 4)}`;

  const years = stats.allTime.perYear.slice(-5);
  const max = Math.max(1, ...years.map((y) => y.total));
  const x0 = 232;
  const x1 = 396;
  const base = 120;
  const maxHeight = 56;
  const slot = (x1 - x0) / years.length;
  const barWidth = Math.min(20, slot * 0.6);
  const bars = years
    .map((y, i) => {
      const h = y.total > 0 ? Math.max(3, Math.round((y.total / max) * maxHeight)) : 1;
      const cx = r1(x0 + slot * i + slot / 2);
      const current = y.year === stats.year;
      const fill = current ? p.strong : p.bar;
      const opacity = current ? '' : ' fill-opacity="0.45"';
      return `<rect x="${r1(cx - barWidth / 2)}" y="${base - h}" width="${r1(barWidth)}" height="${h}" rx="3" fill="${fill}"${opacity}/>
<text x="${cx}" y="${base - h - 6}" class="tiny${current ? ' strong' : ''}" text-anchor="middle">${fmt(y.total)}</text>
<text x="${cx}" y="${base + 16}" class="tiny${current ? ' strong' : ''}" text-anchor="middle">${y.year}</text>`;
    })
    .join('\n');

  const columns = [
    [fmt(stats.thisYear.total), `in ${stats.year}`],
    [plural(stats.allTime.currentStreak, 'day'), 'current streak'],
    [plural(stats.allTime.longestStreak.length, 'day'), 'longest streak'],
    [fmt(stats.publicRepos), 'public repos'],
  ]
    .map(
      ([value, label], i) =>
        `<g><text x="${24 + i * 96}" y="180" class="value">${escapeXml(value)}</text>
<text x="${24 + i * 96}" y="198" class="label">${escapeXml(label)}</text></g>`,
    )
    .join('\n');

  const body = `<g>
<text x="24" y="96" class="big" font-size="38">${fmt(stats.allTime.total)}</text>
<text x="24" y="119" class="label">contributions since ${escapeXml(since)}</text>
</g>
${bars}
<line x1="24" y1="148.5" x2="396" y2="148.5" stroke="${p.track}"/>
${columns}`;

  return card({
    width, height, palette: p,
    title: 'GitHub', subtitle: `@${stats.login}`,
    label: `GitHub: ${fmt(stats.allTime.total)} contributions since ${since}, ${fmt(stats.thisYear.total)} in ${stats.year}, current streak ${stats.allTime.currentStreak} days, longest streak ${stats.allTime.longestStreak.length} days, ${stats.publicRepos} public repositories.`,
    body,
  });
}

/** LeetCode-style ring: three arcs sized by question count, filled by solved share. */
export function renderLeetCodeCard(lc, mode) {
  const p = PALETTES[mode];
  const width = 420;
  const height = 220;

  if (!lc) {
    return card({
      width, height, palette: p, title: 'LeetCode', subtitle: '', label: 'LeetCode stats are unavailable right now.',
      body: `<text x="24" y="120" class="label">LeetCode stats are unavailable right now.</text>`,
    });
  }

  const cx = 92;
  const cy = 122;
  const radius = 54;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const gap = 5;
  const difficulties = ['easy', 'medium', 'hard'];
  const totalQuestions = difficulties.reduce((sum, d) => sum + lc.totals[d], 0) || 1;
  const usable = circumference - gap * difficulties.length;

  let offset = gap / 2;
  const arcs = difficulties
    .map((d) => {
      const length = (usable * lc.totals[d]) / totalQuestions;
      const share = lc.totals[d] ? lc.solved[d] / lc.totals[d] : 0;
      const common = `cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke-width="${strokeWidth}" transform="rotate(-90 ${cx} ${cy})"`;
      const track = `<circle ${common} stroke="${p.track}" stroke-dasharray="${r1(length)} ${r1(circumference - length)}" stroke-dashoffset="${r1(-offset)}"/>`;
      // Round caps add half a stroke at each end, so the dash is shortened by one stroke width
      // and shifted by half of one. Tiny progress becomes a dot, like the bars on the right.
      const dash = Math.max(0.01, Math.min(length, length * share) - strokeWidth);
      const fill = lc.solved[d] > 0
        ? `<circle ${common} stroke="${p[d]}" stroke-linecap="round" stroke-dasharray="${r1(dash) || 0.01} ${r1(circumference - dash)}" stroke-dashoffset="${r1(-(offset + strokeWidth / 2))}"/>`
        : '';
      offset += length + gap;
      return track + fill;
    })
    .join('\n');

  const label = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
  const barX = 180;
  const barWidth = 216;
  const rows = difficulties
    .map((d, i) => {
      const y = 80 + i * 40;
      const share = lc.totals[d] ? lc.solved[d] / lc.totals[d] : 0;
      const w = lc.solved[d] > 0 ? Math.max(6, barWidth * share) : 0;
            return `<text x="${barX}" y="${y}" font-size="12.5" font-weight="600" style="fill:${p[d]}">${label[d]}</text>
<text x="${barX + barWidth}" y="${y}" class="label mono" text-anchor="end"><tspan class="strong">${fmt(lc.solved[d])}</tspan> / ${fmt(lc.totals[d])}</text>
<rect x="${barX}" y="${y + 9}" width="${barWidth}" height="6" rx="3" fill="${p.track}"/>
${w ? `<rect x="${barX}" y="${y + 9}" width="${r1(w)}" height="6" rx="3" fill="${p[d]}"/>` : ''}`;
    })
    .join('\n');

  const footer = [
    lc.languages.slice(0, 3).join(', '),
    lc.activeDays ? plural(lc.activeDays, 'active day') : null,
    lc.acceptance !== null ? `${Math.round(lc.acceptance)}% acceptance` : null,
  ]
    .filter(Boolean)
    .join('  ·  ');

  const subtitle = [
    `@${lc.username}`,
    lc.ranking && lc.ranking < 5_000_000 ? `rank ${fmt(lc.ranking)}` : null,
    lc.stale ? 'cached' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const body = `${arcs}
<g>
<text x="${cx}" y="${cy - 19}" class="label" text-anchor="middle">solved</text>
<text x="${cx}" y="${cy + 9}" class="big" font-size="28" text-anchor="middle">${fmt(lc.solved.all)}</text>
<text x="${cx}" y="${cy + 27}" class="tiny" text-anchor="middle">of ${fmt(lc.totals.all)}</text>
</g>
${rows}
<text x="24" y="204" class="label">${escapeXml(footer)}</text>`;

  return card({
    width, height, palette: p,
    title: 'LeetCode', subtitle,
    label: `LeetCode: ${lc.solved.all} of ${lc.totals.all} problems solved (Easy ${lc.solved.easy}, Medium ${lc.solved.medium}, Hard ${lc.solved.hard}).`,
    body,
  });
}

/** This year's contributions: total, averages and a month-by-month bar chart. */
export function renderActivityCard(stats, mode) {
  const p = PALETTES[mode];
  const width = 860;
  const height = 272;
  const y = stats.thisYear;

  const minis = [
    [fmt1(y.averages.perDay), 'avg per day'],
    [fmt1(y.averages.perWeek), 'avg per week'],
    [fmt(y.activeDays), 'active days'],
    [y.bestMonth ? `${y.bestMonth.name} · ${fmt(y.bestMonth.count)}` : '—', 'best month'],
  ]
    .map(([value, label], i) => {
      const x = 24 + (i % 2) * 124;
      const top = 160 + Math.floor(i / 2) * 46;
      return `<g><text x="${x}" y="${top}" class="value">${escapeXml(value)}</text>
<text x="${x}" y="${top + 17}" class="label">${escapeXml(label)}</text></g>`;
    })
    .join('\n');

  const x0 = 304;
  const x1 = 836;
  const base = 204;
  const maxHeight = 118;
  const slot = (x1 - x0) / 12;
  const barWidth = 24;
  const currentMonth = Number(stats.today.slice(5, 7)) - 1;
  const max = Math.max(1, ...y.monthly.filter((v) => v !== null));
  const bars = y.monthly
    .map((count, i) => {
      const cx = r1(x0 + slot * i + slot / 2);
      const x = r1(cx - barWidth / 2);
      const isCurrent = i === currentMonth;
      const monthLabel = `<text x="${cx}" y="${base + 19}" class="tiny${isCurrent ? ' strong' : ''}" text-anchor="middle"${count === null ? ` style="fill:${p.faint}"` : ''}>${MONTHS[i]}</text>`;
      if (count === null) {
        return `<rect x="${x}" y="${base - 2}" width="${barWidth}" height="2" rx="1" fill="${p.track}"/>\n${monthLabel}`;
      }
      const h = count > 0 ? Math.max(3, Math.round((count / max) * maxHeight)) : 1;
      const fill = isCurrent ? p.strong : p.bar;
      const opacity = isCurrent ? '' : ' fill-opacity="0.5"';
      const value = count > 0 ? `<text x="${cx}" y="${base - h - 6}" class="tiny${isCurrent ? ' strong' : ''}" text-anchor="middle">${fmt(count)}</text>` : '';
      return `<rect x="${x}" y="${base - h}" width="${barWidth}" height="${h}" rx="3" fill="${fill}"${opacity}/>\n${value}\n${monthLabel}`;
    })
    .join('\n');

  const footer = [
    y.restricted ? `${fmt(y.restricted)} in private repositories` : null,
    `${plural(y.commits, 'public commit')}`,
    y.pullRequests ? plural(y.pullRequests, 'pull request') : null,
    y.busiestDay ? `busiest day ${formatDate(y.busiestDay.date).slice(0, -5)} (${fmt(y.busiestDay.count)})` : null,
    y.topWeekday ? `most active on ${y.topWeekday}s` : null,
  ]
    .filter(Boolean)
    .join('  ·  ');

  const body = `<g>
<text x="24" y="98" class="big" font-size="46">${fmt(y.total)}</text>
<text x="24" y="122" class="label">contributions in ${stats.year} so far</text>
</g>
${minis}
<line x1="276.5" y1="62" x2="276.5" y2="226" stroke="${p.track}"/>
<line x1="${x0}" y1="${base + 0.5}" x2="${x1}" y2="${base + 0.5}" stroke="${p.track}"/>
${bars}
<line x1="24" y1="236.5" x2="836" y2="236.5" stroke="${p.track}"/>
<text x="24" y="257" class="label">${escapeXml(footer)}</text>`;

  return card({
    width, height, palette: p,
    title: `${stats.year} activity`,
    subtitle: `updated ${formatDate(stats.today)}`,
    label: `${stats.year}: ${fmt(y.total)} contributions so far, ${fmt1(y.averages.perDay)} per day and ${fmt1(y.averages.perWeek)} per week on average, ${y.activeDays} active days.`,
    body,
  });
}
