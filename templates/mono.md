{{PREVIEW_NOTE}}# Faizan Fareed Khan

**Full Stack Engineer** · Lahore, Pakistan · open to new opportunities

I build web products end to end: React and Next.js on the front, Bun, Node.js, Elysia and NestJS behind them, PostgreSQL, Supabase and Redis underneath, and AI agents wired into real workflows. Over three years of shipping products for real users. Right now I'm a full-stack engineer on [SellAnyBiz.AI](https://sellanybiz.ai), an AI-powered marketplace for buying and selling businesses.

[LinkedIn](https://www.linkedin.com/in/faizan-fareed-khan-684208243/) · [Email](mailto:yosoylilnib@gmail.com) · [LeetCode](https://leetcode.com/u/{{LEETCODE}}/)

---

### Now

- Shipping **SellAnyBiz.AI**: messaging and realtime, meetings, KYC, data-room cloud imports, workspaces and onboarding
- Building **247ChatApp**: a multichannel B2B outreach inbox run by two AI agents
- Designing my **final year project** at Virtual University: a disease surveillance and early-warning platform
- Practising data structures and algorithms in C++ on LeetCode

### Featured work

#### [SellAnyBiz.AI](https://sellanybiz.ai) &nbsp;`live`

An AI-powered marketplace for buying and selling private businesses. It carries a deal from the first listing to closing: listings, NDAs, identity checks, data rooms, deal checklists, a multichannel inbox and nine AI agents. I'm one of four core engineers, with 430+ commits in 2026.

- Sole author of onboarding; main author of the chat dock, meetings (Zoom, Google Meet, Teams), the KYC identity pipeline, data-room cloud imports and workspace settings
- Found 145 permission guards that were silently not running and turned them on without an outage
- Made message sending idempotent, so a retry can never deliver a message twice

The platform runs on 189 Postgres tables, 106 background queues and about 3,900 automated tests, with three app replicas behind Cloudflare and Traefik.

`Bun` `Next.js 16` `React 19` `Elysia` `Supabase` `pgvector` `Redis` `BullMQ` `Vercel AI SDK` `Stripe` `Docker`

#### SellAnyBiz Admin Portal &nbsp;`private`

The internal portal for the SellAnyBiz team: workspaces, billing and credit plans, customer bug reports, and Google rankings tracked through DataForSEO on a weekly schedule. A Next.js 16 and Elysia app that shares the main product's Supabase project and ships as its own Docker deployment.

`Next.js 16` `Elysia` `Supabase` `TanStack Table` `Recharts` `Redis` `Docker`

#### 247ChatApp &nbsp;`private` `in development`

B2B outreach and a shared inbox for businesses that connect several WhatsApp numbers, LinkedIn accounts and email mailboxes. A Campaign Agent prepares outreach for human approval, and a Conversation Agent answers replies within each customer's rules, with human takeover. I own the ongoing engineering work.

`Next.js` `React 19` `Elysia` `Supabase` `Redis` `BullMQ` `Unipile` `Zod` `Playwright`

#### Disease surveillance and early-warning platform &nbsp;`final year project`

My final year project at Virtual University of Pakistan. Hospitals and labs share case records; the platform forecasts malaria and typhoid trends, flags geographic hotspots and alerts district health officers. Currently in research and system design.

`Turborepo` `NestJS` `Next.js` `TypeScript` `Bun` `Machine learning`

**Also built:** resumable Puppeteer scrapers with live progress dashboards and Excel export, a load tester that finds where an API starts rate limiting, and custom Elementor/WordPress UI for clients.

### Tech stack

{{TECH_MONO}}

### Stats

<p>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="{{ASSETS}}/overview-mono-dark.svg">
    <img alt="{{ALT_OVERVIEW}}" src="{{ASSETS}}/overview-mono-light.svg" width="49%">
  </picture>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="{{ASSETS}}/leetcode-mono-dark.svg">
    <img alt="{{ALT_LEETCODE}}" src="{{ASSETS}}/leetcode-mono-light.svg" width="49%">
  </picture>
</p>
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="{{ASSETS}}/activity-mono-dark.svg">
  <img alt="{{ALT_ACTIVITY}}" src="{{ASSETS}}/activity-mono-light.svg" width="100%">
</picture>

<sub>Built by this repository's GitHub Action from the GitHub and LeetCode APIs, refreshed every 6 hours. Contribution counts include private work. Last updated {{UPDATED}}.</sub>

### Recently solved on LeetCode

{{LEETCODE_RECENT}}

### Public repositories

{{REPOS}}
