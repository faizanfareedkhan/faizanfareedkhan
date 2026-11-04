import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { contactBadges, techTable } from './lib/markdown.mjs';
import { renderActivityCard, renderLeetCodeCard, renderOverviewCard } from './lib/svg.mjs';

const github = {
  login: 'someone',
  since: '2023-05-01',
  today: '2026-03-10',
  year: 2026,
  publicRepos: 3,
  allTime: {
    total: 72,
    perYear: [{ year: 2025, total: 2 }, { year: 2026, total: 70 }],
    currentStreak: 2,
    longestStreak: { length: 5 },
  },
  thisYear: {
    total: 70,
    commits: 10,
    pullRequests: 1,
    restricted: 60,
    monthly: [10, 20, 40, null, null, null, null, null, null, null, null, null],
    activeDays: 30,
    topWeekday: 'Monday',
    busiestDay: { date: '2026-03-01', count: 9 },
    bestMonth: { name: 'Mar', count: 40 },
    averages: { perDay: 1, perWeek: 7 },
  },
};
const leetcode = {
  username: 'someone',
  ranking: 5000001,
  solved: { all: 6, easy: 3, medium: 2, hard: 1 },
  totals: { all: 60, easy: 30, medium: 20, hard: 10 },
  languages: ['C++'],
  activeDays: 4,
  acceptance: 80,
};

test('cards are static in both colour schemes', () => {
  for (const mode of ['dark', 'light']) {
    const cards = [
      renderOverviewCard(github, mode),
      renderLeetCodeCard(leetcode, mode),
      renderLeetCodeCard(null, mode),
      renderActivityCard(github, mode),
    ];
    for (const svg of cards) assert.doesNotMatch(svg, /animation|@keyframes|<animate|undefined|NaN/);
  }
});

test('hero buttons follow the agreed order and skip anything without a link', () => {
  const contact = {
    portfolio: 'https://example.com',
    linkedin: 'https://linkedin.com/in/x',
    email: 'x@example.com',
    leetcode: 'https://leetcode.com/u/x/',
  };
  const labels = (html) => [...html.matchAll(/alt="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(labels(contactBadges(contact, 'https://example.com/cv.pdf')), ['Resume', 'Portfolio', 'LinkedIn', 'Email', 'LeetCode']);
  assert.deepEqual(labels(contactBadges({ ...contact, portfolio: null }, null)), ['LinkedIn', 'Email', 'LeetCode']);
});

test('tech table escapes badge labels and has one row per category', () => {
  const table = techTable([{ category: 'Languages', items: [{ name: 'C++', logo: 'cplusplus', color: '00599C' }, { name: 'shadcn/ui', color: '000000' }] }]);
  assert.match(table, /badge\/C%2B%2B-00599C/);
  assert.match(table, /badge\/shadcn%2Fui-000000/);
  assert.equal(table.split('\n').length, 3);
});

test('the template asks for no animated images', () => {
  const template = readFileSync(new URL('../templates/profile.md', import.meta.url), 'utf8');
  assert.match(template, /animation=false/);
  assert.doesNotMatch(template, /type=waving|type=venom|readme-typing-svg|komarev|skillicons/);
});

test('the footer is static', () => {
  assert.doesNotMatch(readFileSync(new URL('../assets/footer.svg', import.meta.url), 'utf8'), /<animate|animation|@keyframes/);
});

test('every tech badge has readable text', () => {
  const { techStack } = JSON.parse(readFileSync(new URL('../profile.config.json', import.meta.url), 'utf8'));
  const channels = (hex) => [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const luminance = (hex) => {
    const [r, g, b] = channels(hex).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  for (const { name, color } of techStack.flatMap((group) => group.items)) {
    // shields.io switches to dark text above this brightness.
    const [r, g, b] = channels(color);
    const dark = (r * 299 + g * 587 + b * 114) / 255000 > 0.69;
    const [hi, lo] = [luminance(color), luminance(dark ? '333333' : 'FFFFFF')].sort((x, y) => y - x);
    assert.ok((hi + 0.05) / (lo + 0.05) >= 3.5, `${name} (${color}) is hard to read`);
  }
});
