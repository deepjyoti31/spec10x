# Spec10x — Landing Page Design Specification

> **For:** Designer handoff  
> **Date:** February 19, 2026  
> **Status:** Pre-launch (waitlist phase)

---

## 1. Overview & Design Direction

**Product:** Spec10x — AI-native product intelligence platform ("Cursor for Product Management")  
**Goal of this page:** Communicate the product's value, build excitement, and capture waitlist signups.  
**Audience:** Product Managers at startups/mid-size companies, founders wearing the PM hat, engineering leads.

### Mood & Aesthetic

| Attribute | Description |
|---|---|
| **Feel** | Premium, intelligent, fast — *Linear meets Notion* |
| **Mode** | Dark mode first (optimized for long working sessions) |
| **Vibe** | Data-dense but clean, not cluttered. Sophisticated, not flashy |
| **Inspiration** | Linear.app, Vercel.com, Raycast.com — sleek dark SaaS landing pages with depth and subtle motion |

### Design Principles
1. **Data density without clutter** — show lots of information but keep it scannable
2. **Evidence everywhere** — the product is about trust & transparency, reflect that visually
3. **Keyboard-first** feel — clean, sharp, utilitarian beauty
4. **Progressive complexity** — simple at first glance, powerful on inspection
5. **Dark mode first** — deep, rich backgrounds with vibrant accents

---

## 2. Design Tokens

### Color Palette

#### Backgrounds (Dark → Light)
| Token | Hex | Usage |
|---|---|---|
| `bg-deepest` | `#0A0B10` | Page background, primary sections |
| `bg-primary` | `#0F1117` | Alternating section backgrounds |
| `bg-card` | `#1A1D27` | Cards, elevated surfaces |
| `bg-card-hover` | `#222633` | Card hover state |
| `bg-glass` | `rgba(15, 17, 23, 0.8)` | Glassmorphism navbar (with backdrop-filter) |

#### Brand / Accent Colors
| Token | Hex | Usage |
|---|---|---|
| `blue` | `#3B82F6` | Primary action color, CTAs, links, active states |
| `blue-light` | `#60A5FA` | Hover states on blue elements |
| `blue-glow` | `rgba(59, 130, 246, 0.3)` | Blue glow/shadow effects |
| `purple` | `#8B5CF6` | Secondary accent, gradients, "coming soon" badges |
| `purple-glow` | `rgba(139, 92, 246, 0.25)` | Purple glow effects |
| `emerald` | `#10B981` | Success states, status dots, positive indicators |
| `amber` | `#F59E0B` | Warning/caution, tertiary accent |

#### Text
| Token | Hex | Usage |
|---|---|---|
| `text-primary` | `#F8FAFC` | Headings, important text |
| `text-secondary` | `#94A3B8` | Body copy, descriptions |
| `text-muted` | `#64748B` | Tertiary text, fine print, labels |
| `text-accent` | `#3B82F6` | Links, highlighted text |

#### Borders
| Token | Value | Usage |
|---|---|---|
| `border-subtle` | `rgba(148, 163, 184, 0.08)` | Very faint dividers |
| `border-card` | `rgba(148, 163, 184, 0.1)` | Card borders |

#### Key Gradient
- **Text gradient:** `linear-gradient(135deg, #3B82F6, #8B5CF6)` — used on key headline words
- **Logo icon:** Same gradient as fill background

### Typography

| Element | Font | Weight | Size | Spacing |
|---|---|---|---|---|
| **UI text / body** | Inter | 400–500 | 16px base | normal |
| **Headings** | Inter | 700–900 | varies (see below) | -0.02em to -0.03em |
| **Code / data / labels** | JetBrains Mono | 400–500 | 13px | 2px (uppercase labels) |
| **Body line-height** | — | — | — | 1.7 |
| **Heading line-height** | — | — | — | 1.05–1.2 |

#### Heading Scale
| Element | Size | Weight |
|---|---|---|
| Hero H1 | `clamp(42px, 7vw, 76px)` | 700+ |
| Section H2 | `clamp(32px, 5vw, 48px)` | 700 |
| Card H3 | 20px | 700 |
| Feature H3 | 20px+ | 700 |
| Small headings | 16px | 700 |
| Section labels | 13px uppercase mono | 500 |

**Google Fonts import:**
```
Inter: 400, 500, 600, 700, 800, 900
JetBrains Mono: 400, 500, 700
```

### Spacing & Layout

| Token | Value |
|---|---|
| **Grid base unit** | 4px |
| **Section vertical padding** | 120px top and bottom |
| **Container max-width** | 1200px |
| **Container side padding** | 24px |
| **Card padding** | 36px × 28px (typical) |
| **Card gap** | 24px |
| **Component gaps** | 8px, 12px, 16px, 24px, 32px, 48px, 64px, 80px |

### Radii
| Token | Value | Usage |
|---|---|---|
| `sm` | 6px | Small elements, tags |
| `md` | 8px | Buttons, inputs, logo icon |
| `lg` | 12px | Buttons |
| `xl` | 16px | Cards, containers |
| `full` | 9999px | Pill badges |

### Shadows & Effects
| Element | Shadow |
|---|---|
| **Primary button** | `0 0 20px rgba(59, 130, 246, 0.3), 0 4px 12px rgba(0, 0, 0, 0.3)` |
| **Primary button hover** | `0 0 30px rgba(59, 130, 246, 0.3), 0 6px 20px rgba(0, 0, 0, 0.4)` |
| **Hero mockup** | `0 0 60px rgba(59, 130, 246, 0.08), 0 25px 80px rgba(0, 0, 0, 0.5)` |
| **Card hover** | `0 12px 40px rgba(0, 0, 0, 0.3)` |
| **Glassmorphism nav** | `backdrop-filter: blur(20px) saturate(180%)` |

### Motion / Animation
| Animation | Timing | Usage |
|---|---|---|
| `transition-fast` | 150ms ease | Hover states, color changes |
| `transition-base` | 200ms ease | Card hovers, nav changes |
| `transition-slow` | 400ms ease | More dramatic reveals |
| `fadeInUp` | 0.6s ease (staggered) | Hero elements entrance |
| `float` | 8s ease-in-out infinite | Background gradient orbs |
| `pulse` | 2s ease-in-out infinite | Status dots |
| **Scroll reveal** | fade-in from below | Section elements on scroll |
| **Card hover** | translateY(-4px) | Cards lift on hover |
| **Button hover** | translateY(-1px) | Subtle lift |

---

## 3. Page Structure — Section by Section

Below is every section of the page in order, with its **exact content**, **layout**, and **design notes**.

---

### 3.1 Navigation Bar

**Behavior:** Fixed to top, transparent by default. On scroll (>50px), adds glassmorphism background with subtle bottom border and slightly reduced padding.

| Element | Details |
|---|---|
| **Logo** | "S" icon (32×32 rounded square with blue→purple gradient fill, white letter "S") + wordmark "Spec**10x**" (10x in blue) |
| **Nav Links** | `Features` · `How It Works` · `Pricing` · `FAQ` |
| **CTA Button** | "Join the Waitlist" → primary blue button (smaller variant) |
| **Mobile** | Hamburger menu (3 lines → animates to X), nav links stack vertically |

**Layout:** Horizontal bar, logo left, links center, CTA right. Flexbox, spaced between.

---

### 3.2 Hero Section

**Background:** 
- Full-viewport height, deepest background (`#0A0B10`)
- 3 floating gradient orbs (blurred circles):
  - Orb 1: Blue, 600px, top-right, 12% opacity
  - Orb 2: Purple, 400px, bottom-left, 10% opacity
  - Orb 3: Emerald, 300px, center, 6% opacity
- Faint grid overlay (60px spacing, ~3% opacity) with radial mask fading to edges

**Content (center-aligned, stacked):**

1. **Status Badge** (pill)
   - Green pulsing dot + "Now accepting early access signups"
   - Blue-tinted background, blue border, rounded pill

2. **Headline**
   ```
   Know What to Build.
   Before You Build It.
   ```
   - Line 1: white, line 2: blue→purple gradient text
   - Massive type: clamp(42px, 7vw, 76px)

3. **Subtitle**
   ```
   AI-powered product intelligence that turns customer interviews, usage data, 
   and feedback into prioritized specs — ready for your team or your coding agent.
   ```
   - Secondary text color, max-width 620px

4. **CTA Buttons** (horizontal pair)
   - Primary: "Get Early Access →" (blue button with arrow icon)
   - Ghost: "See How It Works ↓" (text link in blue)

5. **Hero Product Mockup** (the centerpiece visual)
   - Max-width 1000px
   - Card container with dark background, subtle border, deep shadow + blue glow
   - **Faux window topbar:** 3 traffic-light dots (red, amber, green)
   - **3-column layout inside the mockup:**
     - **Left sidebar (180px):** List of interview participant names with green status dots
       - Sarah M. (active/highlighted), Mike T., Lisa K., James R., Priya S., David L., Anna W.
     - **Center main area:** 
       - Search bar: "✨ Ask your interviews..."
       - 2×2 grid of theme cards:
         - **Onboarding Friction** — 8/12 users — "I spent 20 minutes trying to figure out..."
         - **Search Performance** — 6/12 users — "Results take way too long to load when..."
         - **Pricing Confusion** — 5/12 users — "I couldn't tell the difference between..."
         - **Mobile Experience** — 4/12 users — "On my phone the dashboard just doesn't..."
       - First card has blue left border highlight
     - **Right detail panel (240px):** 
       - Heading: "Onboarding Friction"
       - Stat: "8 mentions across 12 interviews"
       - 3 user quotes with purple left-border accent:
         - "I spent 20 minutes trying to figure out where to start." — Sarah M.
         - "The setup wizard doesn't explain what each step does." — Mike T.
         - "I almost gave up during the initial config." — James R.

   > **Designer note:** This mockup is the most important visual on the page. It should look like a real, polished product screenshot. Consider making this a designed image/illustration rather than pure CSS — it needs to feel premium and tangible.

**Entrance animations:** Elements stagger in from below (badge → h1 → subtitle → buttons → mockup), 0.1s delay between each.

---

### 3.3 Problem Section

**Background:** `#0F1117` (bg-primary)

**Content:**

- **Label:** `— THE PROBLEM` (uppercase mono, blue, with leading dash)
- **Headline:** "Product decisions shouldn't be guesswork."
- **Subtitle:** "PMs spend more time wrangling data than making decisions. The tools weren't built for this."

- **3 cards** in a horizontal grid (3 columns, 24px gap):

| # | Icon | Title | Body |
|---|---|---|---|
| 1 | 📑 (red-tinted bg) | Data is everywhere | Customer interviews in Docs, analytics in Mixpanel, feedback in Intercom — none of it connected. You're constantly context-switching. |
| 2 | 🧠 (amber-tinted bg) | Synthesis takes days | Reading 20 interviews and manually tagging themes in spreadsheets is a full-time job. By the time you're done, new data has arrived. |
| 3 | 🎯 (purple-tinted bg) | Specs are stale on arrival | Writing PRDs, creating Figma mocks, breaking down tickets — all manual, all immediately outdated. And AI agents can't even read them. |

**Card style:** Dark card bg, subtle border, rounded-xl, left-aligned text. Hover: lift 4px + shadow + brighter border.

---

### 3.4 Solution / Flow Section

**Background:** `#0A0B10` (bg-deepest)

**Content:**

- **Label:** `— THE 10X SHIFT`
- **Headline:** "From raw signal to ready-to-build spec. *In minutes.*" (last two words in gradient)
- **Subtitle:** "Spec10x creates a continuous loop from customer voice to shipped product."

- **5-step horizontal pipeline** connected by "→" arrows:

| Step | Icon | Title | Description |
|---|---|---|---|
| 1 | 📥 | Upload | Drop in interviews, transcripts, audio, or video files |
| 2 | 🔍 | Extract | AI identifies themes, pain points, and feature requests |
| 3 | 📊 | Prioritize | Evidence-backed scoring ranks what matters most |
| 4 | 📋 | Specify | Generate specs with user stories and acceptance criteria |
| 5 | 🚀 | Ship | Export agent-ready tasks to Cursor, Claude Code, or Jira |

**Layout:** Each step is a card (flex: 1), separated by "→" connector elements. Cards have same hover behavior (lift + blue border glow).

---

### 3.5 Features Section

**Background:** `#0F1117` (bg-primary)

**Content:**

- **Label:** `— FEATURES`
- **Headline:** "Everything you need to decide *what to build.*" (last words in gradient)
- **Subtitle:** "From interview upload to agent-ready task export — Spec10x covers the entire product discovery loop."

**6 feature blocks**, alternating left/right layout (2-column grid, 50/50, content on one side, visual on the other):

---

#### Feature 1: Interview Intelligence
- **Badge:** `✦ Available in v0.1` (green, emerald tint)
- **Headline:** "Upload interviews. Get insights in minutes."
- **Body:** "Drop in transcripts, audio, or video. Spec10x's AI extracts themes, pain points, and feature requests — with every insight linked to the exact user quote."
- **Checklist:**
  - ✓ Supports .txt, .pdf, .docx, .mp3, .wav, .mp4
  - ✓ Auto-transcribes audio and video
  - ✓ Cross-interview theme clustering
  - ✓ Every insight links to source quotes
- **Visual side:** Large 🎙️ icon + text block:
  ```
  12 interviews uploaded
  → 47 insights extracted
  → 8 key themes identified
  in 3 minutes (emerald text)
  ```
- **Layout:** Content LEFT, visual RIGHT

---

#### Feature 2: Cross-Source Synthesis
- **Badge:** `◈ Coming in v0.5` (purple tint)
- **Headline:** "Connect every signal."
- **Body:** "Combine interviews with support tickets, product analytics, and NPS surveys. AI finds the patterns humans miss — correlating qualitative pain with quantitative impact."
- **Checklist:**
  - ✓ Zendesk, Intercom, Freshdesk integration
  - ✓ Mixpanel, Amplitude, PostHog analytics
  - ✓ NPS and survey data import
  - ✓ Unified timeline across all sources
- **Visual side:** Large 🔗 icon + text block:
  ```
  Interviews + Support Tickets
  + Analytics + Surveys
  = Complete picture (purple text)
  ```
- **Layout:** Content RIGHT (reversed), visual LEFT

---

#### Feature 3: Prioritization
- **Badge:** `◈ Coming in v0.5` (purple tint)
- **Headline:** "Decide with data, not opinions."
- **Body:** "Every theme gets an impact score based on frequency, user segment, and revenue signals. See the evidence behind every recommendation — no more HiPPO-driven roadmaps."
- **Checklist:**
  - ✓ Evidence-backed impact scoring
  - ✓ Priority board with drag-to-adjust
  - ✓ User segment breakdown
  - ✓ Trend detection over time
- **Visual side:** Large 📊 icon + text block:
  ```
  #1 Onboarding friction — Score: 94 (blue)
  #2 Search performance — Score: 87 (blue)
  #3 Pricing clarity — Score: 72 (blue)
  ```
- **Layout:** Content LEFT, visual RIGHT

---

#### Feature 4: Spec Generation
- **Badge:** `◈ Coming in v0.8` (purple tint)
- **Headline:** "From insight to spec in one click."
- **Body:** "AI generates full feature briefs with user stories, acceptance criteria, UI suggestions, and risk flags — all grounded in customer evidence, not hallucination."
- **Checklist:**
  - ✓ Feature briefs with evidence trails
  - ✓ Wireframe-level UI suggestions
  - ✓ Acceptance criteria generation
  - ✓ Codebase-aware architecture hints
- **Visual side:** Large 📐 icon + text block:
  ```
  Theme: "Onboarding Friction"
  → Feature Brief generated
  → 5 user stories
  → 12 acceptance criteria
  ready to review (amber text)
  ```
- **Layout:** Content RIGHT (reversed), visual LEFT

---

#### Feature 5: Ask Your Data
- **Badge:** `✦ Available in v0.1` (green, emerald tint)
- **Headline:** "Talk to your customers at scale."
- **Body:** "Ask natural language questions across all your feedback and get answers with inline citations. It's like having every customer in the room."
- **Checklist:**
  - ✓ Natural language Q&A interface
  - ✓ Inline source citations
  - ✓ Suggested follow-up questions
  - ✓ Grounded in your data — no hallucinations
- **Visual side:** Large 💬 icon + text block:
  ```
  You: "What do users think about onboarding?"

  Spec10x: "8 of 12 users reported friction..."
  [3 citations]
  ```
- **Layout:** Content LEFT, visual RIGHT

---

#### Feature 6: Agent-Ready Output
- **Badge:** `◈ Coming in v1.0` (purple tint)
- **Headline:** "Ship specs to your coding agent."
- **Body:** "Export structured, atomic tasks compatible with Cursor, Claude Code, Devin, or any AI coding agent. Each task ships with context bundles — relevant quotes, design refs, and acceptance criteria."
- **Checklist:**
  - ✓ Atomic, scoped task breakdown
  - ✓ Context bundles with each task
  - ✓ Export to Linear, Jira, GitHub Issues
  - ✓ Cursor / Claude Code compatible output
- **Visual side:** Large 🤖 icon + text block:
  ```
  Feature → 6 atomic tasks
  → context bundles attached
  → exported to Cursor (emerald text)
  ready to implement (emerald text)
  ```
- **Layout:** Content RIGHT (reversed), visual LEFT

---

> **Designer note on Feature Visuals:** The current right-side visuals are simple emoji icons with monospace text blocks. These should ideally be replaced with designed mini-illustrations, mini-mockups, or stylized representations of the feature in action. This is where design quality will make the biggest difference.

---

### 3.6 How It Works Section

**Background:** `#0A0B10` (bg-deepest)

**Content:**

- **Label:** `— HOW IT WORKS`
- **Headline:** "Three steps. *Zero setup.*" (last two words in gradient)
- **Subtitle:** "No integrations required to start. Upload files and get value immediately."

- **3 cards** in a horizontal grid:

| # | Icon | Title | Description |
|---|---|---|---|
| 1 (numbered circle) | 📤 | Upload your data | Drop in interview transcripts, audio recordings, or video files. Batch upload supported — process dozens at once. |
| 2 (numbered circle) | ⚡ | AI does the heavy lifting | Themes, patterns, and priorities surface automatically. Full evidence trails link every insight to its source. |
| 3 (numbered circle) | 🎯 | Ship with confidence | Export prioritized insights, feature specs, and atomic tasks — ready for your team or your coding agent. |

**Card style:** Each card has a numbered circle at the top (gradient blue→purple fill, white number). Same card style as elsewhere.

---

### 3.7 Social Proof Section

**Background:** Matches surrounding section bg

**Content (center-aligned, narrow):**

1. **YC Badge** (pill):
   - 🟠 "Inspired by Y Combinator's 2025 Request for Startups"

2. **Large Blockquote Card:**
   > "Imagine a tool where you upload customer interviews and product usage data, ask 'what should we build next?', and get the outline of a new feature complete with an explanation based on customer feedback as to why this is a change worth making."
   > 
   > — Y Combinator, Request for Startups 2025

3. **Waitlist Counter:**
   - Pulsing dot + "Join 500+ PMs on the early access list"

---

### 3.8 Pricing Section

**Background:** `#0F1117` (bg-primary)

**Content:**

- **Label:** `— PRICING`
- **Headline:** "Simple, transparent pricing."
- **Subtitle:** "Start free during beta. Scale as your product intelligence grows."

**3 pricing cards** in horizontal grid:

| Tier | Icon | Price | Description | Features | CTA |
|---|---|---|---|---|---|
| **Starter** | 🟢 | Free during beta | For individual PMs and founders exploring product intelligence. | ✓ Up to 50 interviews/month · ✓ AI theme extraction · ✓ Cross-interview synthesis · ✓ Ask Your Interviews · ✓ Markdown & PDF export | "Get Started Free" (secondary btn) |
| **Pro** ⭐ | 🔵 | Early access pricing — TBD | For product teams who need the full intelligence stack. | ✓ Everything in Starter · ✓ Unlimited interviews · ✓ Support ticket & analytics integration · ✓ Priority board & impact scoring · ✓ Spec generation · ✓ Team collaboration (5 seats) | "Join the Waitlist" (primary btn) |
| **Enterprise** | 🟣 | Contact us | For organizations with custom requirements and scale. | ✓ Everything in Pro · ✓ Unlimited seats · ✓ SSO & advanced security · ✓ Custom integrations · ✓ Dedicated support & SLA · ✓ On-premise deployment option | "Contact Sales" (secondary btn) |

**Pro card is "featured"** — should have a visual distinction (brighter border, slight glow, or "Popular" badge).

---

### 3.9 FAQ Section

**Background:** `#0A0B10` (bg-deepest)

**Content:**

- **Label:** `— FAQ`
- **Headline:** "Frequently asked questions."
- **Subtitle:** "Everything you need to know about Spec10x."

**6 accordion items** (click to expand/collapse, only one open at a time):

| Question | Answer |
|---|---|
| What file formats do you support? | Spec10x supports text transcripts (.txt, .md, .pdf, .docx), audio recordings (.mp3, .wav), and video files (.mp4). Audio and video are automatically transcribed using state-of-the-art speech-to-text before analysis. |
| Is my data secure? | Absolutely. All data is encrypted in transit and at rest. We're on the SOC 2 compliance roadmap. Your data is never used for model training and is only accessible by your team. |
| How is this different from Dovetail or Productboard? | Unlike Dovetail (manual tagging) or Productboard (feedback management), Spec10x is AI-native from the ground up. We don't just organize feedback — we synthesize it, generate specifications, and output agent-ready tasks. Think of us as the full pipeline from user voice to shipped code. |
| Do I need to connect all my tools to get started? | Not at all. Start with just interview file uploads — zero integrations needed. When you're ready, connect your support tools, analytics, and project management systems to build a richer picture. |
| What coding agents are supported? | Spec10x outputs structured, context-rich task definitions that work with Cursor, Claude Code, Devin, and any tool that accepts structured markdown. We also export to Linear, Jira, and GitHub Issues for traditional workflows. |
| Can I use this solo or does my team need to be on it? | Spec10x works great for solo PMs and founders. The Starter plan is designed for individual use. Collaboration features (comments, reviews, shared boards) are available on Pro and Enterprise plans. |

**Accordion style:** Question has a ▼ chevron that rotates on open. Answer slides in below.

---

### 3.10 Final CTA / Waitlist Section

**Background:** `#0A0B10` with additional glow/gradient background effects

**Content (center-aligned):**

- **Label:** `— EARLY ACCESS`
- **Headline:** "Stop guessing. *Start knowing.*" (gradient on last two words)
- **Subtitle:** "Join the waitlist for early access to Spec10x. Be among the first to transform how you discover what to build."

- **Email form** (inline, horizontal):
  - Email input field: placeholder "Enter your work email"
  - Submit button: "Join the Waitlist" (primary blue)
  - On success: button turns green, text becomes "✓ You're on the list!"
  - On invalid email: input border flashes red briefly

- **Disclaimer:** "No spam. We'll notify you when it's your turn."

---

### 3.11 Footer

**Background:** Darkest, with subtle top border or visual separation

**Layout:** 4-column grid

| Column 1: Brand | Column 2: Product | Column 3: Company | Column 4: Legal |
|---|---|---|---|
| Logo (same as navbar) | Features | About | Privacy Policy |
| "AI-native product intelligence. Know what to build before you build it." | Pricing | Blog `SOON` | Terms of Service |
| Social icons: 𝕏 · in · ⌨ | Docs `SOON` | Careers | |
| | Changelog `SOON` | Contact | |

**Bottom bar:** "© 2025 Spec10x. All rights reserved." + Privacy · Terms links

**"SOON" tags** are small pill badges next to coming-soon links.

---

## 4. Component Inventory

Summary of all reusable components needed:

| Component | Variants | Notes |
|---|---|---|
| **Button** | Primary (blue glow), Secondary (outline), Ghost (text-only) | All have hover lift effect |
| **Card** | Problem card, Feature visual card, Step card, Pricing card, FAQ item | All share base styles + hover states |
| **Badge / Pill** | Status badge (hero), Feature badge (available/coming-soon), "SOON" tag, YC badge | Color-coded pill shapes |
| **Section Header** | Label (mono, uppercase) + H2 title + subtitle paragraph | Repeated pattern in every section |
| **Mockup** | Hero product mockup (3-column app preview) | Needs premium design treatment |
| **Flow Pipeline** | 5 step cards with arrow connectors | Horizontal on desktop |
| **Accordion** | FAQ item with expand/collapse | Chevron rotation animation |
| **Email Form** | Input + button (inline horizontal) | Success/error states |
| **Navbar** | Default (transparent) + Scrolled (glass) + Mobile (hamburger) | Position fixed |
| **Footer** | 4-column grid + bottom bar | Standard |

---

## 5. Responsive Breakpoints

| Breakpoint | Behavior |
|---|---|
| **Desktop** (>1024px) | Full layout as described above |
| **Tablet** (~768–1024px) | Problem grid → 2 columns, flow pipeline wraps, feature rows stack, pricing grid → 2+1 |
| **Mobile** (<768px) | Everything single-column, hamburger nav, flow pipeline stacks vertically (hide connectors), mockup simplifies or hides detail panel, pricing cards stack |

Key responsive notes:
- Hero mockup may need to simplify on mobile (hide the right detail panel or switch to a simpler visual)
- Flow pipeline arrow connectors hide on mobile, steps stack vertically
- Feature rows always stack to single column on mobile (visual above content)
- Pricing cards stack single column
- Footer columns stack to 2×2 or single column

---

## 6. Key Assets Needed from Designer

1. **Hero product mockup** — polished illustration/screenshot of the Spec10x insight dashboard (the most impactful visual on the page)
2. **Feature section visuals** — 6 designed illustrations or mini-mockups for each feature block (replacing the current emoji + text approach)
3. **Logo refinement** — the "S" gradient icon + "Spec10x" wordmark
4. **Favicon** — derived from the logo icon
5. **Social/OG image** — for link previews (1200×630)
6. **Icon set** — if replacing emojis with custom icons for problem cards, flow steps, how-it-works steps

---

## 7. Content Summary (All Copy)

All headlines, body text, button labels, FAQ answers, and pricing details are specified in the sections above. The copy is final unless the designer suggests layout changes that require rewording.

**Key messaging hierarchy:**
1. **Tagline:** "Know What to Build. Before You Build It."
2. **Positioning:** "Cursor for Product Management"
3. **Value prop:** AI turns customer interviews/data into prioritized, agent-ready specs
4. **Differentiator:** AI-native (not manual tagging), full pipeline (not just organization), agent-ready output
5. **CTA:** Join the Waitlist / Get Early Access
