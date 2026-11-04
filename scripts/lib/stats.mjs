const DAY_MS = 86_400_000;

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const toUtcMs = (iso) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
const fromUtcMs = (ms) => new Date(ms).toISOString().slice(0, 10);

/** Calendar date (YYYY-MM-DD) in the given IANA time zone. */
export function dateIn(timeZone, at = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
}

export const addDays = (iso, days) => fromUtcMs(toUtcMs(iso) + days * DAY_MS);
export const dayOfYear = (iso) => Math.round((toUtcMs(iso) - Date.UTC(Number(iso.slice(0, 4)), 0, 1)) / DAY_MS) + 1;
/** Monday = 0 … Sunday = 6 */
export const weekdayIndex = (iso) => (new Date(toUtcMs(iso)).getUTCDay() + 6) % 7;

/** "2026-11-03" -> "3 Nov 2026" */
export function formatDate(iso) {
  return `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
}

/** "2026-11-03T…" -> "Nov 2026" */
/** Longest run and the current run of days with at least one contribution. */
export function computeStreaks(series) {
  let longest = { length: 0, start: null, end: null };
  let run = 0;
  let runStart = null;
  for (const { date, count } of series) {
    if (count > 0) {
      if (run === 0) runStart = date;
      run += 1;
      if (run > longest.length) longest = { length: run, start: runStart, end: date };
    } else {
      run = 0;
    }
  }

  // Today without contributions yet does not break the streak.
  let i = series.length - 1;
  if (i >= 0 && series[i].count === 0) i -= 1;
  let current = 0;
  while (i >= 0 && series[i].count > 0) {
    current += 1;
    i -= 1;
  }
  return { longest, current };
}

/**
 * Derive everything the cards show from the raw GitHub data.
 * `today` is the YYYY-MM-DD date in the profile owner's time zone.
 */
export function computeGitHubStats(github, today) {
  const counts = new Map();
  for (const year of github.years) for (const day of year.days) counts.set(day.date, day.count);

  const series = [];
  for (let date = github.createdAt.slice(0, 10); date <= today; date = addDays(date, 1)) {
    series.push({ date, count: counts.get(date) ?? 0 });
  }

  const { longest, current } = computeStreaks(series);
  const year = Number(today.slice(0, 4));
  const raw = github.years.find((y) => y.year === year) ?? {
    total: 0, commits: 0, pullRequests: 0, reviews: 0, issues: 0, restricted: 0,
  };

  const currentMonth = Number(today.slice(5, 7)) - 1;
  const monthly = MONTHS.map((_, index) => (index > currentMonth ? null : 0));
  const weekdays = Array(7).fill(0);
  let activeDays = 0;
  let busiestDay = null;
  for (const day of series) {
    if (!day.date.startsWith(`${year}-`)) continue;
    monthly[Number(day.date.slice(5, 7)) - 1] += day.count;
    weekdays[weekdayIndex(day.date)] += day.count;
    if (day.count > 0) activeDays += 1;
    if (day.count > 0 && (!busiestDay || day.count > busiestDay.count)) busiestDay = day;
  }

  const elapsedDays = dayOfYear(today);
  const total = raw.total;
  let bestMonth = { index: 0, count: 0 };
  monthly.forEach((count, index) => {
    if (count !== null && count > bestMonth.count) bestMonth = { index, count };
  });
  const topWeekday = weekdays.reduce((best, count, index) => (count > weekdays[best] ? index : best), 0);

  return {
    login: github.login,
    since: github.createdAt.slice(0, 10),
    today,
    year,
    publicRepos: github.publicRepoCount,
    followers: github.followers,
    allTime: {
      total: github.years.reduce((sum, y) => sum + y.total, 0),
      perYear: github.years.map((y) => ({ year: y.year, total: y.total })),
      longestStreak: longest,
      currentStreak: current,
    },
    thisYear: {
      total,
      commits: raw.commits,
      pullRequests: raw.pullRequests,
      reviews: raw.reviews,
      issues: raw.issues,
      restricted: raw.restricted,
      monthly,
      weekdays,
      topWeekday: weekdays[topWeekday] > 0 ? WEEKDAYS[topWeekday] : null,
      activeDays,
      elapsedDays,
      busiestDay,
      bestMonth: bestMonth.count > 0 ? { name: MONTHS[bestMonth.index], count: bestMonth.count } : null,
      last30Days: series.slice(-30).reduce((sum, day) => sum + day.count, 0),
      averages: {
        perDay: total / elapsedDays,
        perWeek: total / (elapsedDays / 7),
        perMonth: total / (elapsedDays / (365.2425 / 12)),
        perActiveDay: activeDays ? total / activeDays : 0,
      },
    },
  };
}

const LANGUAGE_NAMES = {
  cpp: 'C++', c: 'C', java: 'Java', python: 'Python', python3: 'Python', javascript: 'JavaScript',
  typescript: 'TypeScript', csharp: 'C#', golang: 'Go', rust: 'Rust', kotlin: 'Kotlin', swift: 'Swift',
  ruby: 'Ruby', php: 'PHP', scala: 'Scala', mysql: 'MySQL', mssql: 'MS SQL', postgresql: 'PostgreSQL',
  dart: 'Dart', bash: 'Bash',
};
export const languageName = (lang) => LANGUAGE_NAMES[lang] ?? lang;

/** Normalise LeetCode data and attach links to LeetHub solution folders when they exist. */
export function computeLeetCodeStats(leetcode, solutionDirs = [], timeZone = 'UTC') {
  const pick = (source) => ({
    all: source?.all ?? 0, easy: source?.easy ?? 0, medium: source?.medium ?? 0, hard: source?.hard ?? 0,
  });
  const folderBySlug = new Map(solutionDirs.map((dir) => [dir.name.replace(/^\d+-/, ''), dir.url]));

  const seen = new Set();
  const recent = [];
  for (const submission of [...leetcode.recent].sort((a, b) => b.timestamp - a.timestamp)) {
    if (seen.has(submission.slug)) continue;
    seen.add(submission.slug);
    recent.push({
      title: submission.title,
      slug: submission.slug,
      lang: languageName(submission.lang),
      date: dateIn(timeZone, new Date(submission.timestamp * 1000)),
      solutionUrl: folderBySlug.get(submission.slug) ?? null,
    });
    if (recent.length === 5) break;
  }

  return {
    username: leetcode.username,
    ranking: leetcode.ranking,
    solved: pick(leetcode.solved),
    totals: pick(leetcode.totals),
    acceptance: leetcode.totalSubmissions ? (leetcode.acceptedSubmissions / leetcode.totalSubmissions) * 100 : null,
    maxStreak: leetcode.maxStreak,
    activeDays: leetcode.activeDays,
    languages: leetcode.languages.map((lang) => lang.name),
    recent,
    stale: Boolean(leetcode.stale),
  };
}
