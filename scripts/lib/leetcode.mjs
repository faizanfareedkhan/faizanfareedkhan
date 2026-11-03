import { fetchJson } from './http.mjs';

const QUERY = `query ($username: String!) {
  allQuestionsCount { difficulty count }
  matchedUser(username: $username) {
    username
    profile { ranking }
    submitStatsGlobal {
      acSubmissionNum { difficulty count submissions }
      totalSubmissionNum { difficulty count submissions }
    }
    userCalendar { streak totalActiveDays }
    languageProblemCount { languageName problemsSolved }
  }
  recentAcSubmissionList(username: $username, limit: 20) { title titleSlug timestamp lang }
}`;

const byDifficulty = (list = [], key = 'count') =>
  Object.fromEntries(list.map((entry) => [entry.difficulty.toLowerCase(), entry[key]]));

/** Public LeetCode profile data from leetcode.com's GraphQL endpoint (no login needed). */
export async function fetchLeetCode({ username }) {
  const json = await fetchJson(
    'https://leetcode.com/graphql',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://leetcode.com',
        referer: `https://leetcode.com/u/${username}/`,
        'user-agent': 'Mozilla/5.0 (compatible; profile-readme-stats)',
      },
      body: JSON.stringify({ query: QUERY, variables: { username } }),
    },
    { label: 'LeetCode GraphQL' },
  );

  const data = json.data;
  if (!data?.matchedUser) {
    throw new Error(`LeetCode: ${json.errors?.map((e) => e.message).join('; ') || `user "${username}" not found`}`);
  }

  const user = data.matchedUser;
  const accepted = user.submitStatsGlobal.acSubmissionNum;
  const attempted = user.submitStatsGlobal.totalSubmissionNum;

  return {
    username: user.username,
    ranking: user.profile?.ranking ?? null,
    solved: byDifficulty(accepted),
    totals: byDifficulty(data.allQuestionsCount),
    acceptedSubmissions: accepted.find((x) => x.difficulty === 'All')?.submissions ?? 0,
    totalSubmissions: attempted.find((x) => x.difficulty === 'All')?.submissions ?? 0,
    maxStreak: user.userCalendar?.streak ?? 0,
    activeDays: user.userCalendar?.totalActiveDays ?? 0,
    languages: (user.languageProblemCount ?? [])
      .filter((lang) => lang.problemsSolved > 0)
      .sort((a, b) => b.problemsSolved - a.problemsSolved)
      .map((lang) => ({ name: lang.languageName, solved: lang.problemsSolved })),
    recent: (data.recentAcSubmissionList ?? []).map((submission) => ({
      title: submission.title,
      slug: submission.titleSlug,
      timestamp: Number(submission.timestamp),
      lang: submission.lang,
    })),
  };
}
