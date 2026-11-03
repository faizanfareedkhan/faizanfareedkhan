#!/usr/bin/env node
/**
 * Builds the profile README and its stat cards.
 *
 *   GITHUB_TOKEN=… node scripts/generate.mjs
 *
 * 1. Fetches GitHub (profile, public repos, contribution calendar per year) and LeetCode data.
 * 2. Renders SVG cards for every theme in dark and light mode into assets/generated/.
 * 3. Renders README.md from the template of the selected style, plus one preview per style in previews/.
 *
 * If LeetCode cannot be reached, the last good LeetCode data in assets/data.json is reused,
 * so a temporary outage never blanks the card.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { fetchGitHub, fetchRepoDirectories, fileExists } from './lib/github.mjs';
import { fetchLeetCode } from './lib/leetcode.mjs';
import {
  contactBadges, leetcodeRecent, renderTemplate, reposSection, techAccent, techMaximal, techMono,
} from './lib/markdown.mjs';
import { computeGitHubStats, computeLeetCodeStats, dateIn, formatDate } from './lib/stats.mjs';
import { renderActivityCard, renderLeetCodeCard, renderOverviewCard } from './lib/svg.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const at = (...parts) => path.join(root, ...parts);
const log = (message) => console.log(`[profile] ${message}`);

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
    console.warn(`[profile] LeetCode unavailable: ${error.message}`);
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
      console.warn(`[profile] could not list ${config.leetcodeSolutionsRepo}: ${error.message}`);
    }
  }
  const leetcodeStats = leetcodeRaw ? computeLeetCodeStats(leetcodeRaw, solutionDirs, config.timezone) : null;

  // The snake is drawn by the workflow onto the "output" branch. Until it exists, leave the section out
  // instead of showing a broken image.
  const snakeBase = `https://raw.githubusercontent.com/${config.github}/${config.github}/output`;
  const snakeReady = await fileExists({
    owner: config.github, repo: config.github, path: 'snake-dark.svg', ref: 'output', token,
  });
  log(`contribution snake ${snakeReady ? 'found' : 'not drawn yet, section hidden'}`);

  // Cards: every theme used by any style, in dark and light.
  const themes = [...new Set(Object.values(config.styles).map((style) => style.theme))];
  let changedCards = 0;
  for (const theme of themes) {
    for (const mode of ['dark', 'light']) {
      const cards = {
        overview: renderOverviewCard(githubStats, theme, mode),
        leetcode: renderLeetCodeCard(leetcodeStats, theme, mode),
        activity: renderActivityCard(githubStats, theme, mode),
      };
      for (const [name, svg] of Object.entries(cards)) {
        if (await writeIfChanged(at('assets', 'generated', `${name}-${theme}-${mode}.svg`), svg)) changedCards += 1;
      }
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

  // Markdown: README.md from the selected style, and one preview per style.
  const shared = {
    GITHUB: config.github,
    LEETCODE: config.leetcode,
    EMAIL: config.contact.email,
    UPDATED: formatDate(today),
    YEAR: String(githubStats.year),
    TECH_MONO: techMono(config.techStack),
    TECH_ACCENT: techAccent(config.techStack),
    TECH_MAXIMAL: techMaximal(config.techStack),
    CONTACT_ACCENT: contactBadges(config.contact, 'accent'),
    CONTACT_MAXIMAL: contactBadges(config.contact, 'maximal'),
    REPOS: reposSection(github.repos, config.repos),
    LEETCODE_RECENT: leetcodeRecent(leetcodeStats),
    SNAKE: snakeReady
      ? [
        '## 🐍 Contribution snake',
        '',
        '<p align="center">',
        '  <picture>',
        `    <source media="(prefers-color-scheme: dark)" srcset="${snakeBase}/snake-dark.svg">`,
        `    <img alt="Snake eating my contribution graph" src="${snakeBase}/snake-light.svg">`,
        '  </picture>',
        '</p>',
        '',
        '',
      ].join('\n')
      : '',
    ALT_OVERVIEW: `GitHub: ${githubStats.allTime.total.toLocaleString('en-US')} contributions since ${githubStats.since.slice(0, 4)}, ${githubStats.thisYear.total.toLocaleString('en-US')} in ${githubStats.year}`,
    ALT_LEETCODE: leetcodeStats
      ? `LeetCode: ${leetcodeStats.solved.all} problems solved (Easy ${leetcodeStats.solved.easy}, Medium ${leetcodeStats.solved.medium}, Hard ${leetcodeStats.solved.hard})`
      : 'LeetCode stats',
    ALT_ACTIVITY: `${githubStats.year} activity: ${githubStats.thisYear.total.toLocaleString('en-US')} contributions, ${githubStats.thisYear.averages.perDay.toFixed(1)} per day on average`,
  };

  const styleNames = Object.keys(config.styles);
  if (!config.styles[config.style]) throw new Error(`profile.config.json: unknown style "${config.style}"`);

  for (const name of styleNames) {
    const style = config.styles[name];
    const template = await readFile(at(style.template), 'utf8');
    const others = styleNames
      .filter((other) => other !== name)
      .map((other) => `[${config.styles[other].title}](${other}.md)`)
      .join(' · ');
    const preview = renderTemplate(
      template,
      {
        ...shared,
        ASSETS: '../assets/generated',
        PREVIEW_NOTE: `> [!NOTE]\n> **Style preview: ${style.title}.** Other styles: ${others} · [all styles](README.md)\n\n`,
      },
      style.template,
    );
    await writeIfChanged(
      at('previews', `${name}.md`),
      `<!-- Generated by scripts/generate.mjs from ${style.template}. Do not edit by hand. -->\n${preview}`,
    );

    if (name === config.style) {
      const readme = renderTemplate(template, { ...shared, ASSETS: 'assets/generated', PREVIEW_NOTE: '' }, style.template);
      const changed = await writeIfChanged(
        at('README.md'),
        `<!-- Generated by scripts/generate.mjs from ${style.template}. Edit the template, not this file. -->\n${readme}`,
      );
      log(`README.md (${name}) ${changed ? 'updated' : 'unchanged'}`);
    }
  }

  const index = [
    '<!-- Generated by scripts/generate.mjs. Do not edit by hand. -->',
    '# Profile README styles',
    '',
    'The same live data rendered three ways. Open each one and look at it in both light and dark mode',
    '(GitHub → Settings → Appearance), then pick one.',
    '',
    '| Style | Preview | Highlights |',
    '| :-- | :-- | :-- |',
    `| **${config.styles.mono.title}** | [Open](mono.md) | Self-generated mono cards, plain links, black badges. Fast, quiet, recruiter-friendly. |`,
    `| **${config.styles.accent.title}** | [Open](accent.md) | Waving gradient banner, typing intro, animated gradient cards, Skill Icons. |`,
    `| **${config.styles.maximal.title}** | [Open](maximal.md) | Everything: brand-colour badges, view counter, LeetCode heatmap card, contribution snake. |`,
    '',
    `The profile currently uses **${config.styles[config.style].title}**. To switch, change \`"style"\` in`,
    '[`profile.config.json`](../profile.config.json) to `mono`, `accent` or `maximal` and push. The workflow rebuilds `README.md`.',
    '',
  ].join('\n');
  await writeIfChanged(at('previews', 'README.md'), index);
  log('done');
}

main().catch((error) => {
  console.error(`[profile] ${error.stack ?? error.message}`);
  process.exit(1);
});
