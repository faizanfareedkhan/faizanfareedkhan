import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  addDays, computeGitHubStats, computeLeetCodeStats, computeStreaks, dayOfYear, formatDate, weekdayIndex,
} from './lib/stats.mjs';

const series = (counts, start = '2026-01-01') => counts.map((count, i) => ({ date: addDays(start, i), count }));

test('date helpers', () => {
  assert.equal(addDays('2026-02-28', 1), '2026-03-01');
  assert.equal(addDays('2024-02-28', 1), '2024-02-29');
  assert.equal(dayOfYear('2026-01-01'), 1);
  assert.equal(dayOfYear('2026-11-03'), 307);
  assert.equal(weekdayIndex('2026-11-02'), 0); // Monday
  assert.equal(formatDate('2026-11-03'), '3 Nov 2026');
});

test('streaks: longest run and current run', () => {
  const { longest, current } = computeStreaks(series([1, 2, 0, 3, 4, 5, 0, 1, 1]));
  assert.equal(longest.length, 3);
  assert.equal(longest.start, '2026-01-04');
  assert.equal(longest.end, '2026-01-06');
  assert.equal(current, 2);
});

test('streaks: an empty today does not break the current streak', () => {
  assert.equal(computeStreaks(series([1, 1, 1, 0])).current, 3);
  assert.equal(computeStreaks(series([1, 1, 0, 0])).current, 0);
  assert.equal(computeStreaks([]).current, 0);
});

test('GitHub stats: this-year totals, averages and monthly buckets', () => {
  const github = {
    login: 'someone',
    createdAt: '2025-12-30T10:00:00Z',
    publicRepoCount: 3,
    followers: 0,
    years: [
      { year: 2025, total: 2, commits: 2, pullRequests: 0, reviews: 0, issues: 0, restricted: 0,
        days: series([1, 1], '2025-12-30') },
      { year: 2026, total: 70, commits: 10, pullRequests: 1, reviews: 0, issues: 0, restricted: 59,
        days: [
          { date: '2026-01-01', count: 10 },
          { date: '2026-01-02', count: 20 },
          { date: '2026-02-10', count: 40 },
        ] },
    ],
  };
  const stats = computeGitHubStats(github, '2026-02-14');

  assert.equal(stats.allTime.total, 72);
  assert.equal(stats.thisYear.total, 70);
  assert.deepEqual(stats.thisYear.monthly.slice(0, 3), [30, 40, null]);
  assert.equal(stats.thisYear.activeDays, 3);
  assert.equal(stats.thisYear.elapsedDays, 45);
  assert.equal(stats.thisYear.bestMonth.name, 'Feb');
  assert.deepEqual(stats.thisYear.busiestDay, { date: '2026-02-10', count: 40 });
  assert.ok(Math.abs(stats.thisYear.averages.perDay - 70 / 45) < 1e-9);
  assert.ok(Math.abs(stats.thisYear.averages.perWeek - (70 / 45) * 7) < 1e-9);
  // 30 Dec, 31 Dec, 1 Jan, 2 Jan are consecutive.
  assert.equal(stats.allTime.longestStreak.length, 4);
  assert.equal(stats.allTime.currentStreak, 0);
});

test('LeetCode stats: dedupes recent solves and links LeetHub folders', () => {
  const stats = computeLeetCodeStats(
    {
      username: 'someone',
      ranking: 5_000_001,
      solved: { all: 3, easy: 2, medium: 1, hard: 0 },
      totals: { all: 4100, easy: 975, medium: 2138, hard: 987 },
      acceptedSubmissions: 3,
      totalSubmissions: 4,
      maxStreak: 2,
      activeDays: 3,
      languages: [{ name: 'C++', solved: 3 }],
      recent: [
        { title: 'Subsets', slug: 'subsets', timestamp: 1_792_499_355, lang: 'cpp' },
        { title: 'Subsets II', slug: 'subsets-ii', timestamp: 1_792_842_528, lang: 'cpp' },
        { title: 'Subsets', slug: 'subsets', timestamp: 1_787_000_000, lang: 'cpp' },
      ],
    },
    [
      { name: '0078-subsets', url: 'https://example.com/0078-subsets' },
      { name: '0090-subsets-ii', url: 'https://example.com/0090-subsets-ii' },
    ],
    'Asia/Karachi',
  );

  assert.equal(stats.acceptance, 75);
  assert.deepEqual(stats.recent.map((r) => r.slug), ['subsets-ii', 'subsets']);
  assert.equal(stats.recent[0].solutionUrl, 'https://example.com/0090-subsets-ii');
  assert.equal(stats.recent[1].solutionUrl, 'https://example.com/0078-subsets');
  assert.equal(stats.recent[0].lang, 'C++');
});
