import { fetchJson } from './http.mjs';

const ENDPOINT = 'https://api.github.com/graphql';

const PROFILE_QUERY = `query ($login: String!) {
  user(login: $login) {
    login
    name
    createdAt
    followers { totalCount }
    pullRequests { totalCount }
    repositories(ownerAffiliations: OWNER, privacy: PUBLIC, isFork: false) { totalCount }
  }
}`;

const YEAR_QUERY = `query ($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      totalCommitContributions
      totalPullRequestContributions
      totalPullRequestReviewContributions
      totalIssueContributions
      restrictedContributionsCount
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

function headers(token) {
  return {
    authorization: `bearer ${token}`,
    'content-type': 'application/json',
    'user-agent': 'profile-readme-stats',
  };
}

async function graphql(token, query, variables) {
  const json = await fetchJson(
    ENDPOINT,
    { method: 'POST', headers: headers(token), body: JSON.stringify({ query, variables }) },
    { label: 'GitHub GraphQL' },
  );
  if (json.errors?.length) {
    throw new Error(`GitHub GraphQL: ${json.errors.map((e) => e.message).join('; ')}`);
  }
  return json.data;
}

/**
 * Profile, public repository count and the contribution calendar for every year since
 * the account was created. Only a count of public repositories is requested, so a token with
 * private scope cannot leak private repository names into the README.
 * Private *contribution counts* are still included when the user has enabled
 * "Include private contributions on my profile".
 */
export async function fetchGitHub({ login, token, now = new Date() }) {
  const { user } = await graphql(token, PROFILE_QUERY, { login });
  if (!user) throw new Error(`GitHub user "${login}" was not found`);

  const firstYear = new Date(user.createdAt).getUTCFullYear();
  const lastYear = now.getUTCFullYear();
  const years = [];
  for (let year = firstYear; year <= lastYear; year += 1) {
    const from = new Date(Date.UTC(year, 0, 1)).toISOString();
    const to = year === lastYear ? now.toISOString() : new Date(Date.UTC(year, 11, 31, 23, 59, 59)).toISOString();
    const data = await graphql(token, YEAR_QUERY, { login, from, to });
    const c = data.user.contributionsCollection;
    years.push({
      year,
      total: c.contributionCalendar.totalContributions,
      commits: c.totalCommitContributions,
      pullRequests: c.totalPullRequestContributions,
      reviews: c.totalPullRequestReviewContributions,
      issues: c.totalIssueContributions,
      restricted: c.restrictedContributionsCount,
      days: c.contributionCalendar.weeks
        .flatMap((week) => week.contributionDays)
        .filter((day) => day.date.startsWith(`${year}-`))
        .map((day) => ({ date: day.date, count: day.contributionCount })),
    });
  }

  return {
    login: user.login,
    name: user.name,
    createdAt: user.createdAt,
    followers: user.followers.totalCount,
    pullRequests: user.pullRequests.totalCount,
    publicRepoCount: user.repositories.totalCount,
    years,
  };
}

/** Top-level folders of a public repository (used to link LeetHub solution folders). */
export async function fetchRepoDirectories({ owner, repo, token }) {
  const items = await fetchJson(
    `https://api.github.com/repos/${owner}/${repo}/contents`,
    { headers: headers(token) },
    { label: `GitHub contents ${owner}/${repo}` },
  );
  return items.filter((item) => item.type === 'dir').map((item) => ({ name: item.name, url: item.html_url }));
}
