import { formatDate, formatMonthYear } from './stats.mjs';

// LinkedIn's mark is no longer in Simple Icons, so the badge carries it as a data URI.
const LINKEDIN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#fff" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>';
const LINKEDIN_LOGO = `data:image/svg+xml;base64,${Buffer.from(LINKEDIN_SVG).toString('base64')}`;

const escapeCell = (text) => String(text).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const escapeAttr = (text) => String(text).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** shields.io static badge. Dashes and underscores in the label must be doubled. */
export function badgeUrl({ label, logo, color, logoColor = 'white', style = 'flat-square' }) {
  const path = encodeURIComponent(label.replace(/-/g, '--').replace(/_/g, '__'));
  const params = new URLSearchParams({ style });
  if (logo) {
    params.set('logo', logo);
    params.set('logoColor', logoColor);
  }
  return `https://img.shields.io/badge/${path}-${color}?${params}`;
}

const allItems = (stack) => stack.flatMap((group) => group.items);

/** Monochrome: one row per area, black flat badges with white logos. */
export function techMono(stack) {
  const rows = stack.map((group) => {
    const badges = group.items
      .map((item) => `![${item.name}](${badgeUrl({ label: item.name, logo: item.logo, color: '000000' })})`)
      .join(' ');
    return `| **${group.category}** | ${badges} |`;
  });
  return ['| Area | Tools |', '| :-- | :-- |', ...rows].join('\n');
}

/** Accent: a skillicons.dev hero strip that follows the colour scheme, then the full list as text. */
export function techAccent(stack) {
  const withIcons = allItems(stack).filter((item) => item.skill);
  const src = (theme) =>
    `https://skillicons.dev/icons?i=${withIcons.map((item) => item.skill).join(',')}&perline=14&theme=${theme}`;
  const strip = `<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="${src('dark')}">
    <img alt="${escapeAttr(withIcons.map((item) => item.name).join(', '))}" src="${src('light')}">
  </picture>
</p>`;
  const rows = stack.map(
    (group) => `| **${group.category}** | ${group.items.map((item) => `\`${item.name}\``).join(' ')} |`,
  );
  return [strip, '', '| Area | Tools |', '| :-- | :-- |', ...rows].join('\n');
}

/** Maximal: colourful "for-the-badge" badges in brand colours, grouped by area. */
export function techMaximal(stack) {
  return stack
    .map((group) => {
      const badges = group.items
        .map((item) => {
          const src = badgeUrl({
            label: item.name, logo: item.logo, color: item.color ?? '000000', logoColor: item.logoColor ?? 'white',
            style: 'for-the-badge',
          });
          return `<img src="${src}" alt="${escapeAttr(item.name)}">`;
        })
        .join(' ');
      return `<b>${group.category}</b><br>\n${badges}`;
    })
    .join('\n<br><br>\n');
}

/** Contact badges for the accent (dark chips) and maximal (brand colours) styles. */
export function contactBadges(contact, variant) {
  const brand = variant === 'maximal';
  const items = [
    contact.linkedin && { label: 'LinkedIn', href: contact.linkedin, logo: LINKEDIN_LOGO, color: '0A66C2' },
    contact.email && { label: 'Email', href: `mailto:${contact.email}`, logo: 'gmail', color: 'EA4335' },
    contact.leetcode && { label: 'LeetCode', href: contact.leetcode, logo: 'leetcode', color: 'FFA116', logoColor: '000000' },
    contact.location && { label: contact.location, logo: 'googlemaps', color: '34A853' },
  ].filter(Boolean);

  return items
    .map((item) => {
      const src = badgeUrl({
        label: item.label,
        logo: item.logo,
        color: brand ? item.color : '1e293b',
        logoColor: brand ? item.logoColor ?? 'white' : 'white',
        style: 'for-the-badge',
      });
      const img = `<img src="${src}" alt="${escapeAttr(item.label)}">`;
      return item.href ? `<a href="${item.href}">${img}</a>` : img;
    })
    .join('&nbsp;\n');
}

function repoTable(repos, overrides) {
  const rows = repos.map((repo) => {
    const override = overrides[repo.name] ?? {};
    const description = override.description ?? repo.description ?? '—';
    const homepage = 'homepage' in override ? override.homepage : repo.homepage;
    const stack = override.stack ?? repo.language ?? '—';
    const stars = repo.stars ? ` ★${repo.stars}` : '';
    const live = homepage ? ` [Live ↗](${homepage})` : '';
    return `| [**${repo.name}**](${repo.url})${stars} | ${escapeCell(description)}${live} | ${escapeCell(stack)} | ${formatMonthYear(repo.pushedAt)} |`;
  });
  return ['| Repository | About | Stack | Last push |', '| :-- | :-- | :-- | :-- |', ...rows].join('\n');
}

/**
 * Public repositories grouped as configured. Any public repository that is not
 * listed in a group shows up automatically under "Recently added".
 */
export function reposSection(repos, config) {
  const hidden = new Set(config.hidden ?? []);
  const visible = repos.filter((repo) => !hidden.has(repo.name));
  const byName = new Map(visible.map((repo) => [repo.name, repo]));
  const listed = new Set(config.groups.flatMap((group) => group.repos));

  const groups = [];
  const unlisted = visible.filter((repo) => !listed.has(repo.name));
  if (unlisted.length) groups.push({ title: 'Recently added', repos: unlisted });
  for (const group of config.groups) {
    const members = group.repos.map((name) => byName.get(name)).filter(Boolean);
    if (members.length) groups.push({ ...group, repos: members });
  }

  return groups
    .map((group) => {
      const table = repoTable(group.repos, config.overrides ?? {});
      if (group.collapsed) {
        return `<details>\n<summary><b>${group.title}</b> · ${group.repos.length} repositories</summary>\n\n${table}\n\n</details>`;
      }
      return `#### ${group.title}\n\n${table}`;
    })
    .join('\n\n');
}

/** The five most recent distinct accepted LeetCode problems. */
export function leetcodeRecent(lc) {
  if (!lc?.recent?.length) return '_No accepted submissions yet._';
  return lc.recent
    .map((s) => {
      const solution = s.solutionUrl ? ` · [solution](${s.solutionUrl})` : '';
      return `- [${s.title}](https://leetcode.com/problems/${s.slug}/) · ${s.lang} · ${formatDate(s.date)}${solution}`;
    })
    .join('\n');
}

/** Replace {{TOKEN}} placeholders. Unknown tokens fail loudly so typos never reach the profile. */
export function renderTemplate(template, tokens, name) {
  return template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key) => {
    if (!(key in tokens)) throw new Error(`${name}: unknown template token {{${key}}}`);
    return tokens[key];
  });
}
