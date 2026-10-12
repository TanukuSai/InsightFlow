# INSIGHTFLOW — ANTIGRAVITY MASTER BUILD PROMPT

> **Use this prompt in the existing Antigravity workspace.** Before running it, add the reference bundle to the repository under `design-reference/insightflow/` (or tell Antigravity the exact location). The bundle contains reference HTML and PNGs for `dashboard_overview`, `kpi_flip_cards_ai_layout`, `feedback_table_drawer`, `csv_import_mapping`, `issues_triage_dossier`, `executive_report_export`, `auth_onboarding_wizard`, `marketing_landing_page`, `mobile_dashboard`, and a long `index.html` prototype with the animated data-dots idea.
>
> **Important:** The reference HTML files are design references, not the production app architecture. Do not embed the screens in iframes or ship the large standalone `index.html` as the finished product. Rebuild the experience as maintainable, modular application components and wire it to the actual backend.

---

# YOUR ROLE

Act as a principal product designer, senior frontend engineer, interaction designer, accessibility specialist, and full-stack integration engineer. Your task is to turn InsightFlow into a cohesive, premium, responsive, functional product—not a collection of AI-generated-looking cards.

Work in the existing repository. Inspect it before editing. Keep good working code, repair what is necessary, and avoid a destructive rewrite without a reason. You are responsible for the frontend experience and for connecting it correctly to the existing backend. If backend endpoints are missing or unsuitable, implement the smallest coherent backend/API changes needed to support the intended user journeys.

Do not stop after describing what should be done. Implement, run, inspect, test, and fix the application. Do not mark a screen or feature complete merely because it looks correct in a screenshot.

# 1. THE NON-NEGOTIABLE PRODUCT VISION

InsightFlow is an intelligent customer-feedback and decision platform. The experience should feel thoughtfully art-directed, confident, precise, calm, and premium. It should combine:

1. A distinctive **living data-dots / particle-field visual identity**.
2. Refined, selective **glassmorphism**.
3. Strong typography and editorial hierarchy.
4. Clear data visualization and evidence traceability.
5. Purposeful animations and interactions.
6. A conventional-enough information architecture that business users can operate without learning a gimmick.
7. Real data and honest system states—not fabricated AI results, fake activity, or made-up business metrics.

The dot field is a signature visual, not a decorative gimmick. It should communicate the journey from scattered feedback to discoverable patterns and decisions. It must be implemented deliberately, not copied mechanically from the reference HTML.

The product must NOT look like generic “vibe-coded SaaS”: no mass of interchangeable cards, no arbitrary giant gradients, no random glowing icons, no excessive pills, no meaningless micro-labels, no unsupported analytics, and no giant page full of equal-weight boxes.

# 2. FIRST: AUDIT THE ACTUAL REPOSITORY

Before writing code:

1. Inspect the complete repository structure, frontend framework, routing, styling system, current dependencies, environment variables, tests, backend entry points, database schema/migrations, authentication setup, and current API routes.
2. Determine which frontend code is currently running and which uploaded HTML files are isolated reference prototypes.
3. Inspect all available reference files, especially the screenshots and HTML for the nine named screens and the `index.html` that contains `#bgCanvas`, animated particles, and the proposed landing-page narrative.
4. Inspect the actual dataset file if present. Confirm its real columns and recompute all counts rather than relying on hardcoded values in a mockup.
5. Inspect the backend and its actual response models before making frontend API assumptions.
6. Report a concise audit to your own working notes, then proceed. Do not stop at the audit and wait for me unless you encounter a genuine blocker that cannot be resolved from the repository.

Preserve useful product ideas found in the reference bundle, but do not preserve bugs, unsupported claims, inaccessible layouts, contradictory data, or the monolithic single-file implementation simply because it is present.

# 3. EXPLICIT DESIGN DIRECTION

## 3.1 Core palette

Use the established InsightFlow identity as the foundation:

- Porcelain background: `#F8F8F5`
- White surface: `#FFFFFF`
- Primary ink: `#202821`
- Forest green: `#28644D`
- Soft sage: `#E7F0E9`
- Terracotta: `#B65F49`
- Ochre: `#A87522`

Use pale neutrals for secondary surfaces, borders, and helper text. Use forest green for primary actions and selected states. Use terracotta and ochre semantically and sparingly. Do not switch to the reference prototype’s bright cyan/ice-blue accent system as the default product identity; the animated data field may use restrained tonal glints, but the interface should remain cohesive with the forest/sage/porcelain palette.

Use consistent semantic colors for positive, neutral, negative, unknown, warning, critical, success, and failure states. Never convey important status by color alone.

## 3.2 Typography

Use Geist or Inter, with sensible fallbacks. Use a monospaced face only for IDs, technical metadata, and similar details. Establish a consistent hierarchy for display headings, page titles, section headings, card titles, body copy, labels, helper text, table content, and metadata. Avoid ultra-small typography: table labels and secondary copy must remain comfortably readable at realistic laptop sizes.

Use sentence case for most labels. Avoid overuse of all-caps telemetry labels, emoji icons, invented technical jargon, and phrases such as “Executive Cockpit”, “P0 Firestorm”, “100% entropy”, “100% auto-routing”, or “autonomous intelligence” unless a capability is real and genuinely requires that wording. Prefer plain, credible product language such as Dashboard, Feedback, Issues, Recommendations, Reports, and Analysis.

## 3.3 Layout and rhythm

Use a deliberate spacing scale and consistent corner radii. Use generous whitespace where it establishes hierarchy, but do not waste half the viewport. Align cards and columns carefully. Use asymmetry selectively in the marketing hero, not inconsistently throughout the application. Use clear section groupings rather than wrapping every paragraph and row in another card.

Use a practical desktop content grid around 12 columns and a consistent maximum width for public marketing pages. Dashboard cards should have meaningful differences in visual weight and size. Do not force all modules into identical cards.

## 3.4 Glassmorphism — actually implement it

Create reusable glass surfaces with controlled transparency, background blur, subtle specular borders, and soft shadows. Glass should visibly read as glass in the actual rendered UI—not just exist as token names.

Use glass selectively for:
- A floating or sticky public navigation bar.
- Authenticated app navigation where it does not reduce clarity.
- The landing-page hero visual/surface.
- The dot visualizer’s floating controls.
- Floating filters, dropdowns, popovers, tooltips, toasts, and drawers.
- The AI layout suggestion / preview panel.
- Selected KPI cards or contextual overlays.

Use solid or nearly solid surfaces for:
- Dense feedback tables.
- CSV mapping grids and data previews.
- Long feedback excerpts.
- Forms requiring focused reading.
- Detailed issue evidence.
- Report content.

Create explicit reusable styles/components for glass levels rather than applying one blanket rule everywhere. Suggested starting range: white backgrounds at roughly 68–90% opacity, 12–24 px blur depending on layer, subtle white hairline borders, and restrained shadows. Tune these based on contrast and the surface beneath them. Never blur the text itself. Avoid the old-fashioned “everything is transparent” look.

Build actual CSS with `backdrop-filter` and its WebKit fallback. Ensure graceful fallback where backdrop blur is unsupported. Do not assume a transparent background alone creates glassmorphism.

## 3.5 Depth, border, and shadow language

Use depth to clarify hierarchy: background → content surface → floating control → modal/drawer. Use one coherent shadow family. Borders should be quiet. Avoid multiple heavy shadows stacked on every component. Hover elevation should be subtle and consistent.

# 4. THE SIGNATURE DOT-FIELD EXPERIENCE

The living data dots are an important part of the original idea and must not be removed or replaced with a generic gradient blob.

Implement a reusable `DataFieldCanvas` (or equivalent) as a small, isolated client-side component using Canvas 2D or another lightweight technique already present in the repository. Do not add a large visualisation dependency unless necessary.

## 4.1 What the dots mean

The dots metaphorically represent items of feedback moving from unstructured material toward patterns and actionable findings. The visualization can have these stages:

1. **Scattered feedback:** restrained, dispersed particles with gentle motion.
2. **Repeated statements:** particles group only when valid data shows repeated identical text or a verified grouping result exists.
3. **Category/topic groups:** points settle into groups based on available source categories or completed model-derived topics.
4. **Actionable evidence:** selected groups illuminate a real or explicitly illustrative evidence panel.

The visual is not allowed to imply that a particle is a distinct customer unless a record includes a reliable distinct-customer identifier. The interface must not equate exact repeated text with semantic root causes. The landing page can use a conceptual illustration marked as illustrative; an authenticated workspace should base labels and group counts on actual data when available.

## 4.2 Visual implementation

- The landing hero gets the most visible particle-field treatment: delicate, luminous but restrained dots; slow drifting; occasional subtle connecting filaments between nearby points; soft depth; intentional compositional shape that leaves copy readable.
- The field should visually balance the hero copy, not obscure it. On a wide desktop, create an editorial split: copy on the left and the open dot field on the right. Do not put a large opaque card on top of all the particles.
- Use predominantly sage/forest/neutral points with restrained warm accent dots for selected categories or risk. Avoid neon cyan, rainbow colors, high-frequency flashing, and huge glow halos.
- The ambient field may carry through the app as an extremely subtle background texture or a contained visualization; it must not compete with chart labels, issue evidence, tables, or form fields.
- Keep the grid, if used, nearly imperceptible. Do not combine a strong coordinate grid, three enormous glowing orbs, and hundreds of bright particles in a way that makes the page feel like a generic AI concept demo.
- Hovering a real, interactive dot may reveal a restrained tooltip with only the relevant data the user is authorized to see. Tooltips must be keyboard-accessible through an alternative list or detail interaction. Do not make every dot a clickable item if it is only a conceptual visualization.
- Provide a clear animation toggle if useful; at minimum respect `prefers-reduced-motion`.
- Canvas uses `pointer-events: none` unless a specific interaction truly requires pointer handling. Controls must remain clickable and text selectable.
- Handle resizing and device pixel ratio; cap pixel ratio (for example at 1.5) to limit GPU/CPU use. Pause/reduce animation when the tab is hidden or the component is offscreen. Clean up animation frames, event listeners, resize observers, and observers on unmount.
- Do not cause React hydration mismatches: initialize browser-only canvas logic after mount.
- The visualization should be deterministic enough to avoid visible random layout jumps on every render.
- On mobile, simplify to fewer particles, a smaller height, or a static image-like composition. Never allow the dot canvas to create horizontal overflow or interfere with touch gestures.

## 4.3 Interactive story section

On the public landing page, a short “From feedback to action” story may let the visitor switch among the four stages. Animate the field from scattered to grouped and show concise supporting copy. This is an explainer, not evidence that the backend performed those stages. Clearly identify demo/illustrative animation. Keep it short, skippable, and accessible.

Do not build the whole app as fake view-switching sections inside the landing page. Marketing and authenticated app routes must be separate real routes.

# 5. DATA HONESTY — REMOVE THE FABRICATED CLAIMS

The reference `index.html` contains specific claims that must not be carried forward unless verified by actual data and implemented logic. Examples include “7,000 real customer tickets”, “6,680 → 320 root causes”, “95.4% semantic deduplication”, “88x phishing outbreak”, “P0 security fire”, “100% auto routing”, fabricated team percentages, saved triage hours, integrations with Zendesk/Discord/Linear/Jira, and a cryptographic audit trail.

Do not show these claims unless the source data and implemented product explicitly support them. The supplied CSV has been observed to use `review` and `category` fields and to lack inherent timestamps. Previous inspection suggested around 7,000 rows and around 320 unique review strings, but re-verify against the actual CSV. Repeated text is not proof of distinct customers, severity, or a semantic “root cause.”

Use these rules everywhere:

- Category is different from sentiment. Keep the original category separate from model-generated sentiment.
- Do not invent ratings or average sentiment scores.
- Do not invent dates, time periods, or historical trend percentages where timestamps do not exist.
- Do not invent data sources, customers, user quotes, integrations, logos, testimonials, confidence scores, or business impact.
- Do not label an issue Critical solely because its statement repeats many times.
- Distinguish row count, unique exact statement count, and distinct customers. The latter is unavailable unless a reliable customer ID exists.
- Distinguish source data, deterministic calculations, model-derived analysis, human decisions, and illustrative demo content.
- When analysis has not run, show “Not analyzed” or “Awaiting analysis” instead of presenting fabricated labels.
- When a field is unavailable, show a meaningful reason rather than an invented default number.
- Demo content must be marked visibly with `DEMO DATA` or `Illustrative example` and must never silently appear as the user's actual dataset.
- Never silently fall back from a failed API request to fake data while showing a normal production-looking screen.

# 6. APPLICATION ARCHITECTURE

Follow the existing repository and stack where possible. The expected direction based on the project plan is Next.js App Router + TypeScript for the frontend, Tailwind CSS and reusable components for styling, FastAPI for the backend, Supabase PostgreSQL for persistence/authentication, and a background worker/Redis only if the existing architecture uses them. Do not introduce technologies blindly; inspect before deciding.

Create maintainable source boundaries. Do not implement the entire frontend in a single `page.tsx`, a giant component, or a single HTML file. Do not copy the whole reference `index.html` into production. Recreate its valuable design intent as reusable, tested components.

A plausible frontend structure, adapted to the existing project, is:

```text
src/
  app/
    (marketing)/page.tsx
    (auth)/sign-in/page.tsx
    (auth)/sign-up/page.tsx
    (auth)/forgot-password/page.tsx
    (app)/layout.tsx
    (app)/dashboard/page.tsx
    (app)/feedback/page.tsx
    (app)/feedback/[feedbackId]/page.tsx or drawer route
    (app)/import/page.tsx
    (app)/analysis/[jobId]/page.tsx
    (app)/issues/page.tsx
    (app)/issues/[issueId]/page.tsx
    (app)/recommendations/page.tsx
    (app)/reports/page.tsx
    (app)/reports/[reportId]/page.tsx
    (app)/integrations/page.tsx
    (app)/settings/page.tsx
  components/
    brand/
    background/
    layout/
    glass/
    navigation/
    dashboard/
    feedback/
    import/
    analysis/
    issues/
    recommendations/
    reports/
    forms/
    states/
  lib/
    api/
    auth/
    schemas/
    formatters/
    utils/
  hooks/
  types/
```

This is a guide, not a mandate to disrupt an already sensible structure. Organize public pages separately from authenticated pages. Use a shared authenticated shell. Use clear TypeScript types and schemas at data boundaries. Keep presentation components mostly separate from data retrieval and business logic.

# 7. REQUIRED ROUTES AND COMPLETE USER FLOWS

Implement real routes and functional navigation, not a mock app with buttons that just toggle visible sections.

Primary end-to-end journey:

Landing page → sign up/sign in → authentication result → welcome/onboarding → choose sample dataset, upload CSV, or add feedback manually → validate/map columns → preview → import → start analysis → view job status → dashboard → inspect feedback → inspect issue and evidence → view recommendation → track issue/recommendation → generate and export report.

Returning-user journey:

Sign in → workspace/dataset selection if applicable → current dashboard → feedback/issues/reports.

Error journey:

Invalid CSV, failed import, failed analysis, empty dataset, missing timestamps, external service failure, or unauthorized access must lead to a useful, recoverable UI state.

Every primary button must navigate, submit, open a meaningful panel, or visibly change a real state. Remove dead buttons and fake success toasts.

# 8. MARKETING LANDING PAGE

Create a strong public homepage that establishes the same brand as the authenticated app.

## Header
- InsightFlow wordmark and a restrained symbol if a proper mark exists.
- Product / How it works / Features, using anchors or routes that actually work.
- Sign in.
- Primary CTA such as “Explore the demo” or “Get started.”
- A refined glassmorphic sticky navigation bar where appropriate.
- Responsive mobile menu with actual open/close behavior.

## Hero
Use concise, clear copy. Suggested direction:
Headline: “Turn customer feedback into your next best decision.”
Supporting copy: “Find recurring complaints, understand customer sentiment, and prioritize improvements using evidence from your feedback.”
Primary CTA: “Explore the demo.”
Secondary CTA: “See how it works.”

Compose a high-end editorial hero: text and CTAs on one side, an expansive data-dots visualization on the other, with intentional negative space. Use forest green, porcelain, sage and restrained terracotta/ochre. The dot field is the visual signature. Do not use an enormous generic gradient, random floating cards, fake numbers, or an oversized dashboard screenshot that consumes the entire hero.

## Remaining sections
1. Problem / insight section.
2. How it works: Collect → Analyze → Prioritize.
3. Product screenshots/previews that match the real product.
4. Core capabilities: Feedback, analysis, issues, recommendations, reporting.
5. Evidence and transparency section.
6. Final CTA.
7. Compact footer with functioning navigation.

No fake customer logos, testimonials, performance metrics, source-platform integrations, or unsupported claims. Keep the landing page polished but appropriately short for a hackathon SaaS product. Every anchor must work.

# 9. AUTHENTICATION AND ONBOARDING

Use the repository’s actual authentication system, preferably Supabase Auth if it is already configured. Do not build a fake sign-in form that accepts arbitrary credentials. Never leak service keys to the browser.

Create:
- Sign in.
- Sign up.
- Inline validation and field errors.
- Password visibility toggle.
- Loading and disabled submit states.
- Forgot/reset password where supported by auth setup.
- Email confirmation states if required by actual configuration.
- Authentication failure and success states.
- Protected-route handling.
- Sign out.
- Onboarding welcome.
- Workspace creation/selection only if the backend supports it.
- Choose demo dataset / upload CSV / add feedback manually.
- Onboarding completion and failure/retry.

Make forms focused and clear; use glass as a surrounding/background layer, not to reduce form readability. Include mobile layouts. Do not invent social login providers or roles that are not implemented.

# 10. AUTHENTICATED APPLICATION SHELL

The app shell must feel stable and professional.

Sidebar destinations:
- Dashboard
- Feedback
- Issues
- Recommendations
- Reports
- Integrations, only if implemented
- Settings

Feedback filters such as All, Positive, Negative, Neutral, and Unclassified belong inside Feedback filters or a compact expandable sub-navigation. Do not overload the main sidebar.

Include a top bar with contextual search only if it functions, dataset/workspace selection if available, notifications only if functional, and a real user/profile menu. Do not invent a “live” status indicator.

Desktop uses a persistent sidebar. Tablet may use compact/collapsible navigation. Mobile uses an accessible compact navigation pattern. Current page, hover, focus, disabled, and open states must be defined. Preserve navigation and dataset context when opening drawers and returning from details.

Use a light-first glass/solid balance: navigation and floating controls can be glass; dense content remains readable. Do not make the whole app translucent.

# 11. DASHBOARD

The dashboard needs to be visually distinctive, but not crowded. Establish three levels of information:

1. **What do I know?** Key dataset/analysis KPIs.
2. **What needs attention?** Issues and evidence.
3. **What else should I explore?** Category distribution, feedback samples, and available analytics.

## Header
- Page title: “Dashboard” or “Feedback overview.”
- Current dataset/workspace context.
- Clear Import CSV action.
- Generate report action if supported.
- Demo data badge when showing sample data.
- A compact Balanced / AI-prioritized / Custom layout control only if behavior can be implemented.

## KPI cards
Possible metrics, depending on real API availability:
- Total feedback rows.
- Unique exact statement count / repeated-row summary.
- Analysis coverage or analyzed percentage, only if derivable.
- Sentiment summary, only after sentiment analysis exists.
- Open tracked issues, only from stored issue statuses.

Do not show average sentiment, critical-issue counts, previous-period comparisons, percentage change, or historical values when data does not support them. Each KPI’s Details interaction should explain how it is computed and link to filtered records where possible.

## Analytics
- Category distribution from the source `category` field.
- Sentiment distribution only from completed model results.
- Topic/issue frequency only from stored analysis results.
- Trend chart only when real timestamps support a meaningful trend.
- If timestamps are absent, show a considered “Trends unavailable” state and use the space for a supported view rather than fabricating a chart.
- Chart tooltips, legends, focus states and text summaries.

## Priority issues
List the most relevant persisted issues, with:
- Title.
- Priority/status.
- Evidence-backed reason.
- Number of supporting rows and unique exact text count if meaningful.
- “Inspect evidence” / “View issue” action.

Do not automatically classify repeated statements as critical. Distinguish “suggested for review” from a verified severity determination.

## Recent feedback
Show source text, source category, analysis status, sentiment only when actually analyzed, and date/source only if present. When dates are missing, say “Source order” instead of “recent” or “X minutes ago.”

## Layout modes
- Balanced: stable default.
- AI-prioritized: recommend reordering using actual available findings; show why and preview changes before applying.
- Custom: allow reorder/resize/hide only if implemented.

Preview → Apply / Keep current; Undo after apply; Save / Cancel / Reset for custom editing. Never move cards unexpectedly without approval. Avoid implementing an elaborate drag-and-drop grid if time is better spent finishing core requirements; a working reorder/visibility customization is better than a fake one.

# 12. FEEDBACK MANAGEMENT

Create a functional feedback explorer with:
- Search text.
- Category filter.
- Sentiment filter only when analyzed.
- Analysis status filter.
- Sorting and pagination.
- Clear active filter chips and Reset/Clear.
- Proper empty, loading, error, and no-result states.
- Feedback details drawer or detail route.
- Add feedback form.

Table/list fields should match the schema: feedback text, source category, sentiment if present, analysis status, timestamp/source metadata only when provided, and linked issue when available. Use compact but readable row heights. Avoid a table with six tiny columns on mobile; reflow to cards or a deliberate horizontal scroller.

Feedback detail must display original source text and make it clear which fields are source-provided and which are derived. Show associated topics/issues and model information only if it exists. Provide an obvious path back to the filtered list without losing query state.

# 13. CSV IMPORT AND DATA PROCESSING

This is a core hackathon workflow. Implement all meaningful states:

1. Import introduction / choose file.
2. Drag-and-drop and file picker.
3. File selected.
4. Upload progress.
5. Parsing/validation.
6. Column mapping.
7. Data preview.
8. Duplicate/repeated-text summary.
9. Warnings vs fatal errors.
10. Import confirmation.
11. Import running.
12. Success/partial success.
13. Failure/retry/cancel.

Expected source columns include `review` and `category`, but inspect the actual CSV and backend importer. Do not hardcode column order. A mapping table should show source column, sample values, target field, and validation status. Allow correction of mapping when appropriate.

Handle wrong file type, empty CSV, missing required columns, malformed rows, encoding problems, missing values, duplicate rows, and unexpected columns. Make warnings recoverable. Keep source records and duplicates unless a user-visible policy explicitly says otherwise; duplicate text does not necessarily mean bad data. Report actual totals: parsed, imported, invalid, skipped, exact repeated rows, unique exact statements—only if correctly calculated by the backend.

Do not fabricate a file size limit; read it from configuration or the backend response. Send files using `FormData`; do not manually set multipart `Content-Type` if the browser must set the boundary.

# 14. ANALYSIS WORKFLOW

Create real views for:
- Analysis ready.
- Queued/running.
- Completed.
- Partially completed.
- Failed.
- Retry.
- Evidence/topic detail.

Start an analysis operation through the backend and display the real job ID/status. Poll at a sensible interval or use existing SSE/WebSocket support; stop polling after a terminal status and clean up on unmount. Do not invent percentage progress. If only `queued/running/completed/failed` is available, show stage-level/indeterminate progress, not a made-up number.

Results may contain sentiment, recurring topics, common complaints, issue groups, and recommendations if the analysis service genuinely generates them. Ensure each issue/topic has links to source feedback records. Clearly label unknown or low-confidence output if the backend provides such metadata; never invent confidence.

Failure should show a safe, helpful message and retry option. Preserve previous valid results while a new run is running if that is the established backend contract, and identify the run/version that produced displayed results.

# 15. ISSUE TRIAGE AND TRACKING

Create:
- Issues overview/list.
- Filter/sort/search.
- Issue detail.
- Evidence drawer/list.
- Status transitions actually supported by backend.
- Save/track and untrack if supported.
- Loading/error/empty states.

An issue includes title, summary, source/derived category, priority, explanation, status, related records, and timestamps only if recorded. Allow users to inspect the original text supporting a claim. Show row counts and unique text counts separately when available. Do not claim distinct affected customers without customer identifiers. A priority should have an explanation tied to available evidence (frequency, sentiment if calculated, severity signals if supported), not a mysterious number.

Use “Suggested for review” or “Needs human review” when it has not been verified. Avoid sensational warning styles for unsupported “P0” claims.

# 16. RECOMMENDATIONS

Create recommendations overview and detail. Each recommendation must contain:
- Action to take.
- Problem addressed.
- Why the system recommends it.
- Supporting evidence and linked feedback.
- Related issue, where applicable.
- Priority/explanation, if backed by the implementation.
- Save/track state.
- Status transition only if supported.

Separate source evidence, model interpretation, proposed action, and expected outcomes. Do not invent dollar savings, percentages, improved retention, or measured impact. If no defensible expected-impact value exists, omit it and explain the uncertainty where needed.

# 17. REPORTS AND EXPORT

Implement a report builder or report preview with a real backend export.

Possible content based on available data:
- Dataset identity and row count.
- Exact-repetition summary.
- Source-category distribution.
- Sentiment distribution if analyzed.
- Recurring issues and supporting records.
- Recommendations.
- Analysis method/version and limitations.

Support only file formats that the backend actually produces. Include generating, ready, failed, and download states. Do not show a success toast until the server confirms the export. Protect downloads by authorization. A generated report should use the same data as the current workspace/dataset, not hardcoded values.

# 18. INTEGRATIONS AND SETTINGS

Implement these only according to actual backend capabilities:
- Integration status/configuration.
- Connection/reconnect/failure states.
- User profile.
- Workspace preferences.
- Relevant analysis/demo preferences.

Do not display fake connected accounts or status lights. If Adaption is integrated for dataset preparation/adaptation, clearly communicate what the integration actually does; do not portray it as an arbitrary live sentiment inference endpoint unless that exact workflow is verified and implemented. Keep API keys server-side. If no integration setting is implemented, show “Not configured” with instructions rather than fake data.

# 19. INTERACTION AND MOTION SYSTEM

Use the repository’s existing animation dependency if sensible; otherwise use small CSS transitions and avoid adding a library solely for minor effects.

- KPI flip: approximately 350–450 ms, 3D transform, stable dimensions, reduced-motion alternative.
- Drawers/dialogs: approximately 200–300 ms, with predictable focus/dismissal behavior.
- Layout transitions: approximately 250–350 ms.
- Hover: 100–220 ms, subtle elevation/lighting only.
- Button pressed states: immediate.
- Charts: useful tooltips and selection feedback.
- Dot field: slow, ambient motion; never constant frantic movement.
- Loading: stable skeleton dimensions or restrained progress; no indefinite shimmer.

Use animations to communicate hierarchy or state change. Respect `prefers-reduced-motion`. Avoid scroll hijacking, scroll-jacking pinned storytelling, automatic layout changes, distracting parallax, endless pulse effects, and motion that delays users from accessing their data.

# 20. RESPONSIVE BEHAVIOR

Test and design explicitly for:
- Desktop around 1440 px.
- Tablet around 768–1024 px.
- Mobile around 375–430 px.

Desktop: sidebar, multi-column analytics, data table, drawers.
Tablet: compact/collapsible navigation, reflowed KPI/chart layout.
Mobile: compact nav, stacked metrics, simplified charts, readable feedback cards, full-height/near-fullscreen details when needed, clear fixed/sticky action areas where appropriate, no accidental overflow.

Do not merely shrink desktop by scaling. Hide nonessential metadata behind details on mobile, but do not remove core actions or evidence. Check all routes, dialogs, toasts, menus, long text, tables, and the canvas on touch screens.

# 21. ACCESSIBILITY

- Semantic headings and landmarks.
- Visible keyboard focus.
- Keyboard-operable menus, tabs, drawers, filters, flip-card activation, and dialogs.
- Proper accessible names and labels.
- Form error text associated with fields.
- No color-only state indication.
- Adequate color contrast over glass backgrounds.
- Dialog focus management and restoration.
- ESC closes suitable overlays.
- Chart textual summary/table alternative for meaningful data.
- Reduced-motion support.
- Canvas is decorative unless meaningful data is surfaced through an accessible alternative.
- Touch targets sized appropriately.

# 22. BACKEND INTEGRATION — CRITICAL

Do not use hardcoded data as the default frontend. The frontend must consume the actual backend.

## 22.1 Inspect actual API contracts first

Inspect FastAPI route handlers, Pydantic schemas, auth middleware/dependencies, database models, and response shapes. Create a short API contract map and then implement frontend integration against it. Do not assume endpoint names or response fields from this prompt if the repository already defines them differently.

If required endpoints are missing, implement them in the backend consistently. Do not silently make the frontend call fictional endpoints. Avoid breaking existing API compatibility without a clear reason.

## 22.2 Create one typed API client layer

Centralize calls in a reusable API module. Do not scatter raw `fetch()` calls throughout every page.

- Configure the API base URL with an environment variable such as `NEXT_PUBLIC_API_BASE_URL`, following the existing project convention.
- Validate/normalize responses where sensible (for example with existing Zod schemas or typed API contracts).
- Handle JSON and file/download responses correctly.
- Normalize errors to a stable UI-friendly shape.
- Add request timeouts/abort support where appropriate.
- Include auth credentials/tokens using the existing supported auth mechanism.
- Never place backend secrets, Supabase service-role keys, or Adaption API keys in public variables.
- Do not bypass the backend from the browser to call protected third-party APIs.

Use feature-oriented service functions such as:
- `datasetsApi.list/create/get`
- `feedbackApi.list/get/create/update`
- `importsApi.upload/getStatus/getErrors`
- `analysisApi.start/getStatus/retry`
- `dashboardApi.get`
- `issuesApi.list/get/update/track`
- `recommendationsApi.list/get/update/track`
- `reportsApi.create/list/get/download`
- `adaptionApi.getConfiguration/estimate/start/getStatus`

Rename these to reflect the actual API contract. Do not create fake methods that are never backed by an implemented route.

## 22.3 Authentication and workspace isolation

Use the current auth provider. Include verified bearer tokens or supported server-side session forwarding in API calls. Protect app routes, but remember frontend route protection is not security by itself—the backend must enforce authorization. Do not trust a workspace/dataset ID supplied by a client without checking it against the authenticated user’s access. Do not put access tokens or secrets in localStorage unless the existing provider explicitly requires a well-considered approach. Do not log tokens or raw customer feedback.

## 22.4 Do not silently use mock data

If the backend is unavailable, show an honest API error state with Retry. Do not replace failed API calls with hardcoded demo data while leaving the usual dashboard label. Demo mode must be an explicit workspace or user-selected option with a visible badge and isolated data source. Keep any fixtures in a separate, clearly named demo module. Do not mix demo records into real database responses.

## 22.5 CSV and long-running jobs

Use multipart `FormData` for the CSV import endpoint. Show upload and server-processing states separately when the API supports that distinction. After import, retrieve the actual import result. Start analysis through the backend; display real job states and poll using a documented endpoint or existing event stream. Stop polling on terminal state. Handle cancellation/unmounting and avoid duplicate submissions.

## 22.6 Dashboard aggregation

Dashboard KPIs, category counts, sentiment counts, issue counts, and recent feedback must come from backend results. Avoid fetching all 7,000 rows into the browser just to calculate the dashboard. Add or use a dashboard aggregation endpoint. Apply filters consistently and make sure chart totals match list counts. Explain missing metrics with an `available`/`reason` field or the actual API schema—not misleading zero values.

## 22.7 Reports

Generate reports through the backend, then use the returned status/download URL or authorized download endpoint. Do not create a fake report in the browser and claim it came from the backend. Handle long-running report-generation state and retry correctly.

# 23. STATE MODEL FOR EVERY MAJOR SCREEN

For each route/data operation, deliberately design and implement applicable states:

- Initial/idle.
- Loading.
- Populated success.
- Empty (valid but no records).
- No search/filter results.
- Validation error.
- Recoverable warning/partial success.
- Server/API failure.
- Permission denied.
- Not found.
- Retry.
- Disabled action.

Do not represent an API failure as an empty dataset. Do not show `0` for a count that is simply unavailable. Keep error text useful and safe. Preserve user input after recoverable failures where feasible.

# 24. CODE QUALITY AND IMPLEMENTATION RULES

- Keep components cohesive and appropriately sized.
- Avoid giant files and duplicated design code.
- Reuse a real component system; customize components rather than leaving default shadcn look everywhere.
- Use TypeScript strictly; avoid `any` for convenience.
- Use stable keys and handle loading/error/empty data in component code.
- Keep server/client component boundaries correct for the existing Next.js version.
- Do not place browser-only canvas logic in a server component.
- Prevent hydration mismatches.
- Avoid excessive dependencies.
- Remove dead buttons and unreachable markup.
- Avoid inline event handlers in JSX when a structured callback/component makes the behavior clearer.
- Do not create multiple competing CSS token systems.
- Avoid hardcoded API URLs.
- Keep secrets out of git.
- Ensure all forms have real submit handlers.
- Add database/backend changes only where needed to support the feature; use migrations and tests.
- Keep reference prototypes separate from runtime routes.

# 25. TESTING AND VISUAL QA

After implementation:

1. Run the project’s lint, type check, tests, and production build.
2. Fix errors rather than merely listing them.
3. Run frontend/backend integration tests where feasible.
4. Test unauthenticated, authenticated, empty, loading, success, and failure paths.
5. Test real CSV upload, mapping, import summary, analysis start/status, dashboard metrics, issue evidence, and report export against the actual backend.
6. Confirm there is no silent mock-data fallback.
7. Confirm category is not rendered as sentiment.
8. Confirm no fake trend chart appears without timestamps.
9. Confirm dot canvas cannot block clicks or select text.
10. Test reduced motion, mobile overflow, and keyboard navigation.
11. Check the app at 1440 px, tablet width, and 390 px.
12. Capture screenshots of the implemented real app (not reference mockups) and inspect them. Refine spacing, typography, surface opacity, and visual hierarchy if the result still looks generic.

If a browser automation/screenshot tool is available in the workspace, use it. Otherwise run the app and state which visual checks could not be automated. Do not claim testing that was not performed.

# 26. ACCEPTANCE CRITERIA — DO NOT CALL IT COMPLETE UNTIL THESE PASS

## Visual identity
- [ ] The dots/data-field motif is recognizable and feels integral to InsightFlow.
- [ ] Dots are subtle on app pages and compelling on the public hero.
- [ ] Glassmorphism is actually visible on the intended surfaces.
- [ ] Design uses porcelain/forest/sage/white with restrained warm accents.
- [ ] Main content remains high-contrast and readable.
- [ ] The screen does not look like a generic grid of identical cards.
- [ ] Typography and spacing are consistent across routes.
- [ ] Mobile layouts are deliberately designed, not merely shrunk.

## Product coverage
- [ ] Landing page.
- [ ] Sign in/sign up/recovery supported by auth configuration.
- [ ] Onboarding and demo/import/manual choice.
- [ ] Shared authenticated shell.
- [ ] Dashboard.
- [ ] Feedback list/detail/create/search/filter.
- [ ] CSV import/mapping/preview/results.
- [ ] Analysis progress/results/failure.
- [ ] Issues/detail/evidence/tracking.
- [ ] Recommendations/detail/tracking.
- [ ] Reports/export.
- [ ] Settings/integrations only as actually supported.
- [ ] Empty/loading/error/permission states.

## Data integrity
- [ ] No unsupported historical trend.
- [ ] No fabricated sentiment or confidence.
- [ ] No fabricated root-cause or customer-count claim.
- [ ] Exact repeats are distinct from semantic grouping.
- [ ] Source category and derived sentiment remain separate.
- [ ] Demo data is clearly labeled and isolated.

## Functional/backend integration
- [ ] Every primary button works.
- [ ] API base URL is configured through environment variables.
- [ ] API calls use a central typed client.
- [ ] Auth/workspace authorization is preserved.
- [ ] CSV goes to the actual backend.
- [ ] Job states reflect real backend status.
- [ ] Dashboard values come from actual API/database results.
- [ ] Issues link to actual evidence.
- [ ] Reports are generated by the backend and really download.
- [ ] API failure does not silently show fake data.

## Reliability
- [ ] Lint/typecheck/build succeed, or remaining blockers are explicit.
- [ ] Core paths have tests.
- [ ] No visible console/runtime errors on primary paths.
- [ ] No severe responsive overflow.
- [ ] Accessibility/reduced motion has been checked.

# 27. EXECUTION ORDER

Work in the following sequence; complete each coherent increment before moving on:

**Phase 1 — Audit and contract:** inspect repository, reference bundle, backend, dataset, auth, APIs, and running app.

**Phase 2 — Design foundation:** tokens, typography, glass primitives, page background, the reusable dots canvas, buttons/forms/feedback states, responsive shell.

**Phase 3 — App architecture:** route structure, navigation, centralized API client, auth/session integration, shared error/loading states.

**Phase 4 — Signature landing page:** build the refined dot-field hero and a concise, accurate marketing story.

**Phase 5 — First complete vertical slice:** real CSV upload → mapping/validation → import result → analysis job → status/result → dashboard. This must use real backend calls.

**Phase 6 — Feedback explorer:** search, filters, detail, manual feedback submission, pagination.

**Phase 7 — Issues and recommendations:** evidence links, status/track state, reliable prioritization explanation.

**Phase 8 — Reports/export:** real server-side report generation and download.

**Phase 9 — Auth/onboarding/settings:** complete the supported authentication and first-run journey.

**Phase 10 — Finishing pass:** mobile layouts, loading/error/empty states, accessibility, motion/reduced motion, testing, visual screenshot inspection.

Do not spend excessive time polishing a marketing animation while the core flow fails. Conversely, do not leave the visual system until after every feature is built: the shared visual foundation must exist early so the application remains coherent.

# 28. FINAL REPORT REQUIRED

When done, provide an honest report with:

1. What was in the repository before changes.
2. What frontend architecture and routes were created or changed.
3. How the dot visualizer works and where it appears.
4. How glassmorphism is implemented and which components use it.
5. Which backend endpoints were connected.
6. Which API/backend endpoints or schema changes had to be added.
7. How auth and workspace isolation are handled.
8. Which features are fully functional versus visually implemented only.
9. Commands used for lint, type checks, tests, and build, with actual outcomes.
10. Environment variables that I must configure, without revealing secret values.
11. Any features still incomplete and why.
12. Exact commands to run the frontend and backend locally.

Never report a mock as a real integration, a static frame as an interaction, or an untested build as verified.

**Begin now by auditing the current repository and the available reference bundle, then implement this plan in the existing project.**
