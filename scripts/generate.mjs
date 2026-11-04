#!/usr/bin/env node
/**
 * Builds the profile README and its stat cards.
 *
 *   GITHUB_TOKEN=… node scripts/generate.mjs
 *
 * 1. Fetches GitHub (profile, contribution calendar per year) and LeetCode data.
 * 2. Renders the static SVG cards in dark and light mode into assets/generated/.
 * 3. Renders README.md from templates/profile.md.
 *
 * If LeetCode cannot be reached, the last good LeetCode data in assets/data.json is reused,
 * so a temporary outage never blanks the card.
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { fetchGitHub, fetchRepoDirectories } from './lib/github.mjs';
import { fetchLeetCode } from './lib/leetcode.mjs';
import { contactBadges, leetcodeRecent, renderTemplate, techTable } from './lib/markdown.mjs';
import { computeGitHubStats, computeLeetCodeStats, dateIn, formatDate } from './lib/stats.mjs';
import { renderActivityCard, renderLeetCodeCard, renderOverviewCard } from './lib/svg.mjs';

const TEMPLATE = 'templates/profile.md';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const at = (...parts) => path.join(root, ...parts);
const log = (message) => console.log(`[profile] ${message}`);
// Shows up as a warning on the workflow run, so a silently frozen section gets noticed.
const warn = (message) => console.warn(`::warning::[profile] ${message}`);

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

async function writeIfChanged(file, content) {
  const previous = await readFile(file, 'utf8').catch(() => null);
  if (previous === content) return false;
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content);
  return true;
}

async function main() {
  const config = await readJson(at('profile.config.json'));
  if (!config) throw new Error('profile.config.json is missing or invalid');
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) throw new Error('Set GITHUB_TOKEN (or GH_TOKEN) to call the GitHub API');

  const now = new Date();
  const today = dateIn(config.timezone, now);
  const previous = await readJson(at('assets', 'data.json'));

  log(`fetching GitHub data for ${config.github}`);
  const github = await fetchGitHub({ login: config.github, token, now });
  const githubStats = computeGitHubStats(github, today);

  let leetcodeRaw = null;
  try {
    log(`fetching LeetCode data for ${config.leetcode}`);
    leetcodeRaw = await fetchLeetCode({ username: config.leetcode });
  } catch (error) {
    warn(`LeetCode unavailable, Recently solved is not fresh: ${error.message}`);
    if (previous?.leetcodeRaw) {
      log('reusing the last good LeetCode data');
      leetcodeRaw = { ...previous.leetcodeRaw, stale: true };
    }
  }

  let solutionDirs = [];
  if (config.leetcodeSolutionsRepo) {
    try {
      solutionDirs = await fetchRepoDirectories({ owner: config.github, repo: config.leetcodeSolutionsRepo, token });
    } catch (error) {
      warn(`could not list ${config.leetcodeSolutionsRepo}: ${error.message}`);
    }
  }
  const leetcodeStats = leetcodeRaw ? computeLeetCodeStats(leetcodeRaw, solutionDirs, config.timezone) : null;

  let changedCards = 0;
  for (const mode of ['dark', 'light']) {
    const cards = {
      overview: renderOverviewCard(githubStats, mode),
      leetcode: renderLeetCodeCard(leetcodeStats, mode),
      activity: renderActivityCard(githubStats, mode),
    };
    for (const [name, svg] of Object.entries(cards)) {
      if (await writeIfChanged(at('assets', 'generated', `${name}-${mode}.svg`), svg)) changedCards += 1;
    }
  }
  log(`${changedCards} card(s) changed`);

  const snapshot = {
    updated: today,
    github: {
      login: githubStats.login,
      since: githubStats.since,
      publicRepos: githubStats.publicRepos,
      allTime: githubStats.allTime,
      thisYear: githubStats.thisYear,
    },
    leetcode: leetcodeStats,
    leetcodeRaw: leetcodeRaw ? { ...leetcodeRaw, stale: undefined } : previous?.leetcodeRaw ?? null,
  };
  await writeIfChanged(at('assets', 'data.json'), `${JSON.stringify(snapshot, null, 2)}\n`);

  // Link the resume only once the PDF is in the repository, so the button can never 404.
  const { resume } = config.contact;
  const resumeUrl = resume && existsSync(at(resume))
    ? `https://github.com/${config.github}/${config.github}/blob/main/${resume}`
    : null;
  if (resume && !resumeUrl) warn(`${resume} is not in the repository, Resume button hidden`);

  const readme = renderTemplate(
    await readFile(at(TEMPLATE), 'utf8'),
    {
      LEETCODE: config.leetcode,
      LOCATION: config.contact.location,
      UPDATED: formatDate(today),
      CONTACT: contactBadges(config.contact, resumeUrl),
      TECH: techTable(config.techStack),
      LEETCODE_RECENT: leetcodeRecent(leetcodeStats),
      ALT_OVERVIEW: `GitHub: ${githubStats.allTime.total.toLocaleString('en-US')} contributions since ${githubStats.since.slice(0, 4)}, ${githubStats.thisYear.total.toLocaleString('en-US')} in ${githubStats.year}`,
      ALT_LEETCODE: leetcodeStats
        ? `LeetCode: ${leetcodeStats.solved.all} problems solved (Easy ${leetcodeStats.solved.easy}, Medium ${leetcodeStats.solved.medium}, Hard ${leetcodeStats.solved.hard})`
        : 'LeetCode stats',
      ALT_ACTIVITY: `${githubStats.year} activity: ${githubStats.thisYear.total.toLocaleString('en-US')} contributions, ${githubStats.thisYear.averages.perDay.toFixed(1)} per day on average`,
    },
    TEMPLATE,
  );
  const changed = await writeIfChanged(
    at('README.md'),
    `<!-- Generated by scripts/generate.mjs from ${TEMPLATE}. Edit the template, not this file. -->\n${readme}`,
  );
  log(`README.md ${changed ? 'updated' : 'unchanged'}`);
  log('done');
}

main().catch((error) => {
  console.error(`[profile] ${error.stack ?? error.message}`);
  process.exit(1);
});
