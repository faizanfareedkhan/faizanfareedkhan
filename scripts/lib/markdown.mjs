import { formatDate } from './stats.mjs';

// Simple Icons has no LinkedIn mark and no generic document or globe, so these badges carry theirs as data URIs.
const svgLogo = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
const LINKEDIN_LOGO = svgLogo(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#fff" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
);
const RESUME_LOGO = svgLogo(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/></svg>',
);
const PORTFOLIO_LOGO = svgLogo(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>',
);

const escapeAttr = (text) => String(text).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** shields.io static badge. Dashes and underscores in the label must be doubled. */
export function badgeUrl({ label, logo, color, logoColor = 'white' }) {
  const path = encodeURIComponent(label.replace(/-/g, '--').replace(/_/g, '__'));
  const params = new URLSearchParams({ style: 'flat-square' });
  if (logo) {
    params.set('logo', logo);
    params.set('logoColor', logoColor);
  }
  return `https://img.shields.io/badge/${path}-${color}?${params}`;
}

/** One row per category, small badges in brand colours. */
export function techTable(stack) {
  const rows = stack.map((group) => {
    const badges = group.items.map((item) => `![${item.name}](${badgeUrl({ ...item, label: item.name })})`).join(' ');
    return `| **${group.category}** | ${badges} |`;
  });
  return ['| Category | Technologies |', '| :-- | :-- |', ...rows].join('\n');
}

/** The hero buttons. Anything without a link is left out, so a button never goes nowhere. */
export function contactBadges(contact, resumeUrl) {
  return [
    contact.email && { label: 'Email', href: `mailto:${contact.email}`, logo: 'gmail', color: 'EA4335' },
    contact.linkedin && { label: 'LinkedIn', href: contact.linkedin, logo: LINKEDIN_LOGO, color: '0A66C2' },
    contact.leetcode && { label: 'LeetCode', href: contact.leetcode, logo: 'leetcode', color: 'BC7710' },
    contact.portfolio && { label: 'Portfolio', href: contact.portfolio, logo: PORTFOLIO_LOGO, color: '0891B2' },
    resumeUrl && { label: 'Resume', href: resumeUrl, logo: RESUME_LOGO, color: '4F46E5' },
  ]
    .filter(Boolean)
    .map((item) => `<a href="${escapeAttr(item.href)}"><img src="${badgeUrl(item)}" alt="${escapeAttr(item.label)}"></a>`)
    .join('\n  ');
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
