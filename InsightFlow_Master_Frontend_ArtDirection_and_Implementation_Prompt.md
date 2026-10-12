# INSIGHTFLOW — MASTER FRONTEND ART DIRECTION, UX, MOTION, DATA VISUALIZATION & BACKEND-INTEGRATION PROMPT

**For:** Google Antigravity, working in the existing InsightFlow repository  
**Design direction:** Customer Voice Editorial × Signal Observatory × Linear-level restraint × PostHog-level analytical interaction  
**Goal:** Replace the generic, over-styled dashboard aesthetic with a distinctive, coherent, highly usable customer-feedback intelligence product.  
**Execution mode:** Inspect → specify → implement → run → inspect actual browser output → correct → verify. Do not stop at a plan or a successful build.

---

# 0. READ THIS FIRST — THE CENTRAL PROBLEM

You are continuing an existing product. Do not start a new repository, do not throw away working features, and do not perform another superficial palette swap.

Previous iterations changed tokens, added more colours, added glass surfaces, added dashboard sections, and reported a complete redesign. The result still looks like a generated SaaS admin template. The problem is not simply that the hex codes are wrong. The deeper issues are visual hierarchy, visual restraint, composition, inconsistent use of effects, unclear analytical storytelling, and insufficiently verified motion.

Your task is a **deliberate art-direction reset and implementation pass**. It must result in a frontend that looks designed by one experienced product-design team—not an assortment of generated cards.

The direction combines:

1. **Customer Voice Editorial (Dovetail/Chattermill-inspired principles):** a clear path from important finding → specific observation → verbatim customer evidence → action.
2. **Signal Observatory (InsightFlow's own identity):** the living data-dots visualisation as a recognisable brand signature, especially in the marketing narrative and a restrained dashboard focal element.
3. **Linear-level restraint:** excellent spacing, typography, navigation, alignment, state design, and low visual noise.
4. **PostHog-level analytical interaction:** charts answer real questions, filters behave consistently, and users can drill from an aggregate to the underlying records.

These are design principles, not instructions to copy another product's UI or assets. InsightFlow must have its own visual identity.

The outcome must feel **distinctive but not theatrical, analytical but not cold, expressive but not busy, glassmorphic but not translucent everywhere, animated but not distracting**.

## Non-negotiable outcomes

- The existing living-dot/bubble animation must visibly transform as the user scrolls through the landing-page story. Diagnose and fix the actual defect; do not merely claim the animation exists.
- The palette and visual system must be redesigned as a coherent system, not just edited token values.
- The dashboard must be recomposed, not just recoloured.
- Data visualisations must be analytically justified, legible, interactive where appropriate, and connected to real API data.
- All important pages and workflows must have finished, consistent layouts and usable states.
- The UI must use real backend responses. Do not silently substitute mock values when the API fails.
- The application must remain fast, accessible, responsive, and keyboard-usable.
- Verify actual rendered browser screens at desktop and mobile dimensions; build success alone is not sufficient.

---

# 1. EXECUTION PROTOCOL — INSPECT BEFORE EDITING

## 1.1 Inspect the current repository

Before changing code, inspect:

- The full current repository structure.
- `frontend/src/app/globals.css` and all current design tokens.
- `frontend/src/app/layout.tsx` and route-group layouts.
- `frontend/src/app/page.tsx` (marketing page).
- `frontend/src/app/(app)/dashboard/page.tsx`.
- Feedback, import, issues, recommendations, reports, and settings pages.
- Sign-in and sign-up pages.
- `frontend/src/components/background/DataFieldCanvas.tsx`.
- Navigation components.
- Shared UI components.
- `frontend/src/lib/api/client.ts` and `types.ts`.
- The actual FastAPI routes, schemas, service functions, database models, and tests.
- Existing screenshots/design reference files under `design-reference/insightflow/`.
- Current browser output, console errors, network errors, and responsive behavior.

Do not infer current behavior from an earlier generated report. Reports may be stale or overstate what is implemented. Read the actual code and exercise the real application.

## 1.2 Inspect Stitch MCP capabilities honestly

If Stitch MCP is available to Antigravity:

1. Discover the actual available MCP tools and read their schemas/descriptions.
2. Inspect the existing InsightFlow Stitch project and its screens/design tokens if access is provided.
3. Use available reference/design capabilities to compare the current UI with the art direction below.
4. If MCP can create/edit screens, create one high-quality reference frame for the dashboard and one for the landing hero before propagating styles.
5. Translate approved design ideas into the existing React components.

Do not invent MCP tool names or pretend a tool call succeeded. If Stitch is read-only, unavailable, or unable to produce a specific artifact, continue using the reference screenshots, browser screenshots, and actual source code.

## 1.3 Identify the actual backend contract

The current implementation report described these endpoints, but you must verify the actual routes in source code before using them:

- `GET /health`
- `GET /api/v1/datasets`
- `POST /api/v1/datasets/import`
- `GET /api/v1/datasets/{id}/dashboard`
- `GET /api/v1/datasets/{id}/feedback`
- `POST /api/v1/feedback`
- `GET /api/v1/datasets/{id}/issues`
- `PATCH /api/v1/issues/{id}`
- `GET /api/v1/datasets/{id}/recommendations`
- `POST /api/v1/datasets/{id}/reports`
- `GET /api/v1/reports`
- `GET /api/v1/reports/{id}/export`

Expected local development setup in the current project report:

- Next.js frontend: typically `http://localhost:3001` if port 3000 is occupied.
- FastAPI backend: `http://127.0.0.1:8001`.
- SQLite database: `backend/insightflow.db`.
- Frontend API setting: `NEXT_PUBLIC_API_BASE_URL`.
- Current development workspace setting: `NEXT_PUBLIC_DEFAULT_WORKSPACE`.

These are **reported expectations, not permission to assume they are still true**. Inspect `.env`, `.env.local`, backend config, running processes, and route definitions. Do not print secrets to logs or final output.

## 1.4 Establish a baseline

Before changing anything:

1. Start/use the current frontend and backend without killing unrelated processes.
2. Record which ports are actually in use.
3. Load the existing landing page and dashboard.
4. Capture screenshots at 1440×900 and 390×844.
5. Exercise the current dots animation from top to bottom and back up.
6. Visit every existing page.
7. Record any current runtime failures.

Do not delete a useful existing process or overwrite database contents to simplify testing.

## 1.5 Produce a short audit, then proceed

Create a concise internal checklist with:
- What already works.
- What is broken.
- Which current backend routes are verified.
- What frontend files will change.
- Which existing features must be preserved.

Then implement. Do not stop after writing the audit.

---

# 2. PRODUCT MISSION AND USER MODEL

InsightFlow helps a business understand customer feedback and decide what to investigate or improve next.

The product's core user journey is:

**Feedback arrives → patterns become visible → the user inspects evidence → an issue is prioritised → an action is chosen → a report communicates the finding.**

The interface is aimed at a business operator, product manager, customer-experience lead, support lead, or analyst. The user should not need to be an ML engineer to understand the output.

The product must answer five practical questions:

1. What data am I looking at?
2. What is the most useful thing to notice?
3. What evidence supports it?
4. What should I do next?
5. What are the limits of this conclusion?

Design every page and interaction around these questions. Never show a chart or AI-generated summary without enough context for a user to interpret it.

## 2.1 Important source-data constraints

The supplied Build Battle dataset has been reported to contain 7,000 rows and the columns `review` and `category`. Earlier inspection found 320 unique exact review strings and 6,680 additional repeated rows. Verify these facts in the actual dataset/backend and derive metrics dynamically; do not hardcode them.

The source CSV does not inherently provide verified timestamps, customer identifiers, original source platforms, ratings, or sentiment labels. Consequently:

- Do not invent customer counts.
- Do not invent source platform names.
- Do not invent dates or historical trends.
- Do not call source categories “sentiment”.
- Do not show `Positive / Neutral / Negative` results until the backend actually supplies a documented analysis output.
- Do not create confidence scores if no valid confidence field is returned.
- Do not interpret repeated rows as distinct customers.
- Do not claim a frequent string is automatically high severity.
- Clearly distinguish original source content from model-derived analysis and human-edited fields.

The four source categories known from the dataset are Product Feedback, Customer Service, Fraud and Scam, and Operational Issues. Verify names and counts from the source before displaying them.

If a field is unavailable, explain why and offer the next useful action rather than filling a blank with a made-up value.

---

# 3. ART DIRECTION — “CUSTOMER VOICE EDITORIAL × SIGNAL OBSERVATORY”

## 3.1 Overall aesthetic

Use an editorial data product, not a stock SaaS admin template.

The experience should combine:

- An understated, polished application shell.
- A distinctive landing-page narrative around the living dots.
- One clear focal insight region on the dashboard.
- Thoughtful typography and whitespace.
- Analytical charts that feel native to the product.
- Evidence excerpts integrated into issue/insight views.
- Selective glassmorphism for depth and focus.
- Sparse but characterful colour.
- Fast, controlled animations.

Use composition and typography to create impact before reaching for gradients, shadows, or colourful borders.

## 3.2 Explicit anti-patterns — DO NOT DO THESE

Do not:

- Make every section a rounded white rectangle.
- Use the same card design for KPIs, charts, quotes, issues, and settings.
- put a tiny uppercase micro-label above every title.
- make every card float with shadows.
- place an icon inside every heading.
- put every metric in a pill.
- use a dense dashboard “wall” with no main focal point.
- use a giant dark card merely because the dashboard needs drama.
- add purple/cyan/coral/amber/violet to every section at once.
- use high-chroma colours for both categories and sentiment interchangeably.
- use gradients behind every section.
- use constant shimmer, pulsing, zooming, or bobbing on all cards.
- animate chart values on every render.
- use pie/donut charts when a ranked comparison is easier to read.
- use a radar chart for ordinary categories.
- create fake activity indicators or fake “live” statuses.
- display “critical” claims unsupported by the backend.
- fabricate trends, confidence, percentages, or business impact.
- create arbitrary decorative particle blobs instead of fixing the current dot field.
- replace readable layouts with a flashy landing-page aesthetic inside dense operational pages.
- make long forms or tables translucent just to satisfy the glassmorphism request.
- solve a visual issue by changing token values only.

Any design decision must improve hierarchy, comprehension, actionability, brand character, or usability. If it does none of these, do not add it.

---

# 4. COLOUR SYSTEM — ONE BRAND ACCENT, QUIET NEUTRALS, STABLE DATA ENCODINGS

The most recent palette experiment used too many vivid accents together and still felt generated. Do not repeat that approach. The next palette must be more deliberate and less rainbow-like.

Use the following **starting token set**. Implement as centralized CSS variables/design tokens. You may adjust a token only when accessibility/contrast testing or actual visual inspection establishes a reason; document substantial changes. Do not invent local near-duplicate colours in individual components.

## 4.1 Foundation surfaces

- `--canvas`: `#F6F5F1` — warm editorial canvas, used as the overall app background.
- `--surface`: `#FFFFFF` — main readable surface.
- `--surface-muted`: `#EFEEE8` — quiet secondary background.
- `--surface-hover`: `#F2F4F6` — interactive neutral hover.
- `--border-subtle`: `#E2E3DD` — separators and table borders.
- `--border-strong`: `#C8CEC8` — stronger control borders and focus context.

Avoid making the background green-tinted. The canvas should feel warm/neutral rather than pale sage.

## 4.2 Typography and dark surfaces

- `--ink`: `#20252D` — primary text.
- `--ink-secondary`: `#505966` — secondary content.
- `--ink-muted`: `#727B86` — metadata only; still readable.
- `--midnight`: `#172033` — reserved for the signature hero/brief and selected high-priority focal surfaces.
- `--midnight-raised`: `#202C43` — secondary layer on the dark focal surface.
- `--text-on-dark`: `#F7F8FA`.
- `--text-on-dark-muted`: `#C5CCD7`.

Dark surfaces should be rare and purposeful. Do not turn the sidebar, every chart, and every card dark. Keep the primary app workspace light and focused.

## 4.3 Brand/action accent

Use one main brand colour, a confident but not neon blue:

- `--brand`: `#3656C8`.
- `--brand-hover`: `#2946B2`.
- `--brand-soft`: `#E9EDFC`.
- `--brand-ink`: `#263F9B` where a darker text-like version is needed.

Blue is for primary calls to action, focused states, selected navigation when appropriate, and selected analytical emphasis. Do not use it for every border and icon.

## 4.4 Semantic meaning (not interchangeable with category colours)

- Positive: `#2E7D68`.
- Neutral: `#6C7786`.
- Negative: `#C6534D`.
- Unknown/not analyzed: `#7A8088`.
- Attention/review: `#B87922`.
- Critical: `#B83D42` plus an explicit label/icon.
- Success operation: `#2E7D68`.
- Failure operation: `#B83D42`.

Use tinted backgrounds sparingly and pair them with text labels. Do not make all negative information bright red; use colour where it encodes a meaningful state.

## 4.5 Source-category chart palette

Source category colour is a distinct visualization dimension. Keep the same category colour consistent across the dashboard, filters, legend, and detail views.

Use a restrained, colour-blind-conscious set, reviewed in actual charts:

- Product Feedback: muted blue `#5876B8`.
- Customer Service: muted ochre `#B58A43`.
- Fraud and Scam: muted plum `#8B6E9B`.
- Operational Issues: muted teal `#398779`.

These colours identify source categories only. They do not represent the emotional sentiment of the review.

If they prove too vivid when placed together, reduce saturation/area rather than adding more colours. Do not apply category-colour fills to giant card backgrounds. Use small marks, legend swatches, or chart bars.

## 4.6 Chart-series palette

Use no more distinct colours than the data requires. A chart should ordinarily have one main series and one comparison/annotation series. Use neutral grey for secondary data. Keep sentiment colours fixed by meaning. Keep category colours fixed by category identity.

Do not give each card its own accent colour. Avoid rainbow chart palettes.

## 4.7 Token implementation requirements

- Define variables in `globals.css` or the existing central theme layer.
- Apply tokens across components; remove old conflicting colour values.
- Do not keep both the previous green palette and the last cobalt/cyan/orchid experiment active in different pages.
- Inspect all route screenshots for consistency.
- Test text contrast on both light and dark surfaces.
- Use colour, labels, shape, and icon together to communicate statuses.

---

# 5. TYPOGRAPHY, GRID, SPACING, AND VISUAL RHYTHM

## 5.1 Type

Inspect available fonts and reuse the installed font configuration where feasible. Prefer Inter or Geist for interface text; do not add fonts without an actual reason.

Suggested sizes:

- Marketing display heading: 52–68 px desktop, responsive down to 38–44 px tablet and 34–40 px mobile.
- App page heading: 28–34 px desktop, 25–30 px mobile.
- Insight statement: 20–26 px depending on hierarchy.
- KPI value: 32–42 px, with tabular numerals if available.
- Section title: 17–20 px.
- Body text: 14–16 px with comfortable line height.
- Dense table content: 13–14 px minimum for primary row content.
- Helper text/metadata: generally 12–13 px; never shrink important information into unreadable grey microcopy.

Use font weight and hierarchy deliberately. Do not uppercase everything. Avoid excessive tracking and too many tiny metadata labels.

## 5.2 Layout grid

Desktop reference viewport: 1440×900.  
Secondary desktop viewport: 1280×800.  
Tablet: 768–1024 px.  
Mobile reference: 390×844; also validate 360 px width.

Authenticated shell:
- Sidebar target width around 224–240 px expanded.
- Header around 64–72 px high.
- Main content has a strong left alignment and an intentional maximum width.
- Use a 12-column content grid on desktop when it helps composition.
- Use an 8 px spacing rhythm (8, 16, 24, 32, 40, 48, 64) and justified exceptions only.
- Maintain 24–32 px main gutters on desktop and 16–20 px on mobile.
- The main content should not spread to an uncomfortable line length on ultra-wide screens.

Do not force every section into a 3-column card grid. Vary the layout according to the question the section answers.

## 5.3 Surface radius and edges

Choose a consistent scale:
- Controls: 8–10 px radius.
- Standard panels: 12–16 px radius.
- Hero/feature surface: 18–24 px radius.
- Pills only for compact statuses/filters where a pill is appropriate.

Avoid turning every panel into a large round capsule. Use square/low-radius table layouts and unboxed editorial regions where they improve information density.

---

# 6. GLASSMORPHISM — SPECIFIC AND RESTRAINED

Glassmorphism remains part of the product, but must be applied as a material, not a universal component style.

## 6.1 Reusable variants

Create/update reusable classes or components, using the project conventions:

1. `GlassNavigation`: translucent surface, visible backdrop blur, subtle bright edge, quiet shadow.
2. `GlassPopover`: readable floating menus and filter panels.
3. `GlassDrawerOverlay`: dimmed/blurred underlying screen plus a highly readable drawer.
4. `GlassDarkHighlight`: light translucent layer over the signature midnight hero only when it improves depth.
5. `SolidDataSurface`: opaque surface for tables, chart plotting areas, long text, and dense content.
6. `EditorialSection`: unboxed content region defined by spacing and type rather than border/card.
7. `SignalBrief`: special focal panel for the living dot visualisation and evidence-linked insight.

Use real `backdrop-filter` / `-webkit-backdrop-filter` with sensible fallbacks. A possible nav starting point is white with 70–82% opacity and 16–22 px blur. Tune based on actual background and contrast. Do not apply identical blur/opacity everywhere.

## 6.2 Where to use glass

Use it for:
- Floating marketing navigation.
- Authenticated top header, if it floats above the background.
- Filter/search popovers.
- Dropdowns and profile menu.
- Modal/backdrop layers.
- Evidence drawer backdrop and top handle/control if relevant.
- A small number of dashboard context controls.
- A contained layer inside the dark Signal Brief if it helps communicate depth.

## 6.3 Where not to use glass

Do not use it for:
- Every chart container.
- Every KPI card.
- Large feedback tables.
- Long feedback excerpts.
- Forms whose legibility depends on a stable background.
- Every section on the landing page.

Do not fake glass with only a transparent fill and no depth relationship. Conversely, don't add blur where the element has no visible background content behind it. Verify it in the real browser.

---

# 7. SIGNATURE VISUAL — THE LIVING DATA DOTS

The bubbles/dots are InsightFlow's own brand asset. Their purpose is not to decorate the background; they communicate a transformation from messy feedback to patterns and actionable evidence.

Existing component reported: `frontend/src/components/background/DataFieldCanvas.tsx`. Inspect and repair the actual code. Preserve the HTML Canvas 2D approach unless there is evidence of a concrete limitation. Do not replace it with unrelated particle libraries or a generic gradient/blob illustration.

## 7.1 Four stages, tied to scroll progress

Implement a continuous, reversible scroll-driven story across the landing-page sections. The composition should interpolate between states rather than abruptly switching.

**Stage 1 — Scatter / incoming voice**
- A field of small, organic, low-noise particles spread around the visual region.
- Minimal slow drift; no frenetic motion.
- Use mainly neutral tones with a few restrained accent nodes.
- Conveys unstructured, incoming feedback.

**Stage 2 — Repetition / patterns emerge**
- Particles smoothly attract into several loose clusters.
- Repeated statements become visible as denser clusters.
- Some connecting lines may appear only for nearby particles.
- Do not represent cluster size as real counts unless based on actual data; marketing animation can be conceptual and should be labelled/treated as illustration where necessary.

**Stage 3 — Themes / categories**
- Clusters begin to organise into a small number of distinct groups.
- Category colours may be introduced according to the fixed category palette.
- Labels, if any, should be minimal, readable, and not cover particles.
- Do not imply these exact clusters are a live inference result unless sourced from the actual analysis.

**Stage 4 — Evidence / action**
- The composition resolves into an ordered constellation.
- A small number of connector filaments link selected nodes.
- One or two important nodes receive a quiet halo, not a neon pulse.
- Connect the concept to an evidence/issue/action card as the corresponding section enters view.

## 7.2 Scroll mechanism

- The stage/progress must actually respond to vertical scrolling.
- Use section progress, measured scroll progress, `IntersectionObserver`, or a coordinated mechanism that fits the existing page.
- Smoothly interpolate current progress toward target progress.
- Scrolling up must reverse the transitions.
- Fast scrolling must settle into the correct stage.
- A wheel-only event or a click control is not sufficient.
- Do not make a single global progress number depend on unreliable section height assumptions if the layout may change responsively.
- Test with dynamic fonts, resize, route transitions, and browser refresh.

## 7.3 Rendering and performance

- Draw within a single managed animation loop.
- Do not use per-frame React state updates.
- Clean up `requestAnimationFrame` on unmount.
- Prevent duplicate loops under React Strict Mode.
- Use `ResizeObserver` or reliable resize handling.
- Cap device pixel ratio sensibly (about 1.5–2 based on measured performance).
- Use fewer particles and fewer neighbour checks on mobile.
- Use `pointer-events: none` on decorative canvas.
- Ensure stacking contexts and overflow rules do not hide the canvas.
- Pause when hidden/offscreen; restart reliably when visible again.
- Respect document visibility and `prefers-reduced-motion`.
- With reduced motion, display a stable composition or discreet state changes; keep all copy and functionality accessible.
- Never let the particle field make text unreadable.

## 7.4 Landing-page placement

- The hero uses the dots as a key visual on the right or behind a contained visual region, not as a field that competes with text.
- The scroll story uses dedicated sections that drive the four stages.
- Keep the dot scene within the visual storytelling area; don't draw noisy particles over every paragraph or footer.
- Ensure mobile layout is intentional: dots may become a contained band/compact visual between sections instead of taking over the whole viewport.

## 7.5 Verify the animation

Actually scroll the page in the browser and capture screenshots at Stage 1, Stage 2, Stage 3, Stage 4, and while scrolling back up. Test mobile, resize, re-entry, and reduced motion. A screenshot of the initial state or reading the source code is not proof that the scroll animation works.

---

# 8. MOTION SYSTEM — FUNCTIONAL, COHERENT, AND QUICK

Define a central motion scale and reuse it:

- Micro feedback: 100–160 ms.
- Hover/focus transitions: 140–200 ms.
- Popover: 160–220 ms.
- Side drawer/modal: 200–280 ms.
- Layout rearrangement: 220–340 ms.
- KPI flip: 360–460 ms.
- Scroll-linked particle transitions: continuous interpolation driven by scroll progress with gentle easing, not a multi-second delay.

Use easing like a restrained ease-out/ease-in-out. Avoid bounce/spring effects unless there is a specific interaction that benefits from them.

## 8.1 Apply to interactions

- Buttons: immediate pressed state; tiny tonal/position feedback only.
- Links: clear hover and focus, no extravagant sliding underline on every item.
- Nav: clear active indicator, state change around 140–200 ms.
- Drawers: translate and fade with predictable timing; `Escape` closes; return focus to trigger.
- KPI flip: preserve same dimensions; front/back content must remain readable and focusable; accessible toggle via keyboard; don't hide critical actions behind the flip.
- Chart: tooltips appear quickly; no continuous bouncing.
- Dashboard custom layout: animate after a deliberate action, never while user is interacting with a widget.
- Loading: stable skeleton or honest spinner; no shimmer if it causes distraction or wasted work.
- Success/error feedback: informative, appropriately persistent, and not solely colour-coded.

## 8.2 Reduced motion and CPU

- Implement `prefers-reduced-motion: reduce` for all visual animations.
- No endless pulse on telemetry indicators.
- Avoid full-screen large blur surfaces on low-powered devices.
- Use transforms and opacity rather than layout-triggering animations where possible.
- Avoid an animation dependency if the project already has adequate CSS/Canvas mechanisms; use current installed libraries only when beneficial.
- Do not animate every card on page load.

---

# 9. INFORMATION ARCHITECTURE AND GLOBAL APP SHELL

Implement a clear split between public-facing routes and authenticated/working-app routes. Preserve the existing app-router conventions.

## 9.1 Primary navigation

Keep a compact navigation:

- Dashboard
- Feedback
- Issues
- Recommendations (can be combined under Issues only if existing product/navigation makes that clearer; don't create duplicate destinations)
- Reports
- Settings

Integrations should appear only if they are implemented and meaningful in this version. Avoid dead navigation items.

Feedback can have contextual quick filters (All, Positive, Negative, Neutral, Not analyzed) only when the data supports those states. These should be filters, not a sprawling separate navigation hierarchy.

## 9.2 Desktop shell

- Sidebar has a restrained neutral or midnight treatment; do not make the entire UI dark.
- Active navigation gets one consistent brand indicator, not multiple glows.
- Header includes workspace/dataset context, primary search if implemented, a meaningful import/report shortcut where appropriate, and user/workspace menu.
- Do not duplicate actions in both the global header and page hero unless there is a genuine use case.
- Keep the page title and primary task visible immediately.
- Use breadcrumbs only when hierarchy requires them.

## 9.3 Mobile shell

- Use a clean drawer or bottom navigation if that best matches the existing application; choose one primary pattern rather than several simultaneous navigation systems.
- Keep navigation touch targets comfortably large (around 44 px minimum where practical).
- Hide or relocate secondary controls, not primary actions.
- Ensure there is no horizontal overflow.
- Convert dense tables to accessible cards or a controlled horizontally scrollable table with clear affordance.

## 9.4 Global states

Create consistent reusable states for:
- Initial loading.
- Empty workspace.
- Empty dataset.
- No search results.
- Filtered zero results.
- Backend unavailable.
- Failed request with retry.
- Analysis not started.
- Analysis queued/running/completed/failed, if supported by the backend.
- Permission denied if authentication/authorization is real.
- Successful save/update.
- Unsaved changes if a settings or layout form supports them.

Errors must tell users what happened and the next action. Do not show stack traces or raw HTTP error objects.

---

# 10. LANDING PAGE — PAGE-BY-PAGE SPECIFICATION

Route: `/`

Goal: within a few seconds, explain what InsightFlow does and make the product feel distinctive and trustworthy. The landing page should not look like a generic AI SaaS template or a gigantic animated billboard.

## 10.1 Floating navigation

- Logo/wordmark “InsightFlow”.
- Links: Product, How it works, Insights (or Features if that fits the existing content), Sign in.
- Primary CTA: “Explore the demo” or “Get started”.
- Use selective glassmorphism for the floating navigation.
- On scroll, keep it legible; don't add a large blur layer that obscures content.
- Mobile: compact menu with clear open/close behavior.

## 10.2 Hero layout

Desktop uses an editorial split layout:

Left:
- Short eyebrow such as “Customer feedback intelligence” (not all-caps micro-label).
- Headline: **“Find the signal in what your customers say.”**
- Supporting copy: explain that InsightFlow helps discover recurring themes, inspect evidence, and decide what to address first.
- Primary CTA: “Explore the demo”.
- Secondary CTA: “See how it works”.
- A concise trust/data note only if accurate, such as “Trace findings back to source feedback.”

Right:
- The living dots composition.
- The visual should feel organic, precise, and ownable.
- Use a low-key midnight or neutral visual region only to support the dots; avoid a giant generic glowing blob.
- Add only one or two callouts, and only if they meaningfully show scatter → cluster → evidence.

Ensure headline line breaks are intentionally designed at desktop/tablet/mobile widths. Avoid text overlays intersecting the particles.

## 10.3 Product proof/preview

Show a believable UI preview based on the actual dashboard composition. Do not put fabricated percentages or unverified “AI found 87%” claims in a marketing mockup. Label illustrative previews as demos if not directly derived from current live data.

## 10.4 Four-step storytelling sequence

Use four visually related sections, each explaining:

1. Collect feedback.
2. Identify repetitions and themes.
3. Inspect evidence.
4. Decide what to do next.

The dot animation progresses with scroll between these exact phases. It should feel like one continuous system, not four disconnected background animations.

Keep each section concise. Use one main heading, one short explanatory paragraph, and a small proof/visual where helpful. Do not repeat the same claim in every section.

## 10.5 Capabilities

Present the core capabilities using varied but coherent layouts:
- Feedback exploration.
- Pattern and category analysis.
- Evidence-linked issue prioritisation.
- Action recommendations.
- Reporting/export.

Do not render five identical icon cards. Use one strong composition and a smaller secondary row or editorial list.

## 10.6 Data transparency

Include a succinct section that signals responsible handling: source feedback remains inspectable; unavailable fields are not invented; conclusions should be traceable. Avoid a long technical manifesto on the landing page.

## 10.7 CTA and footer

- Final CTA with clear next step.
- Minimal footer with necessary product/auth links.
- No invented enterprise logos, customer testimonials, awards, “trusted by X”, customer counts, or quantified performance claims.

## 10.8 Landing page responsive design

Mobile should not merely stack the desktop layout without changes. Recompose the hero, reduce particle count, keep the animation within a defined region, maintain readable text, and ensure the CTA appears early. No horizontal overflow.

---

# 11. AUTHENTICATION AND FIRST-RUN EXPERIENCE

Routes already reported: `/sign-in`, `/sign-up`. Confirm current route and authentication capability before changing UX.

## 11.1 Sign in

Content:
- InsightFlow brand.
- Headline: “Welcome back.”
- One line of explanatory copy.
- Email field.
- Password field with show/hide control.
- Forgot password route if backend auth supports it.
- Primary button “Sign in”.
- Link to create account.
- Clear inline field errors and top-level service errors.

Visual:
- Focused, calm, editorial form.
- Optional side illustration/mini dot field on desktop; it must not reduce form readability.
- On mobile, single-column and fast.

Behavior:
- Real auth integration if one exists.
- Loading state prevents duplicate submit.
- Validation before submit, but backend remains the authority.
- Clear invalid-credentials response.
- Do not show a successful login or protected dashboard when auth isn't actually implemented.

## 11.2 Sign up

- Name if supported by the auth model.
- Email.
- Password.
- Password visibility toggle.
- Terms acknowledgement only if required by implementation/product.
- Primary action “Create account”.
- Link to sign in.
- Inline validation; errors don't shift the whole layout unexpectedly.

Do not add Google/GitHub/SSO buttons unless genuinely implemented.

## 11.3 Password recovery

If supported:
- Forgot password request.
- Confirmation that the request was submitted without unnecessarily exposing account existence.
- Reset flow and invalid/expired token state if the underlying auth system supports it.

If recovery is not supported by the current backend, don't present a fake working form. Either implement it properly or clearly mark it unavailable in the UI and final report.

## 11.4 Demo/workspace entry

Because this is a hackathon demo, provide an obvious demo route/workspace only if it is genuinely implemented. Label it as demo/sample data. Do not silently pretend that a fixed workspace header is production-grade authentication.

## 11.5 Onboarding

After registration/sign-in, provide a short first-run journey where appropriate:

Step 1: Welcome and explain the product in one sentence.  
Step 2: Choose one path: Explore sample data, Upload CSV, or Add feedback manually.  
Step 3: Show progress/status.  
Step 4: Route to the relevant next screen/dashboard.

Do not force users through a long multi-step wizard if they simply want to view sample data. Persist entered information as appropriate. Back navigation should preserve valid input.

---

# 12. DASHBOARD — FULL COMPOSITION REDESIGN

Route: `/dashboard` (or the existing equivalent). This is the highest-priority screen and must be visually reinspected more than once.

## 12.1 Overall composition

Do not arrange every module in the same-size cards. The dashboard should tell a visual story in this order:

1. **Context:** which dataset/workspace is selected and whether it has been analyzed.
2. **Signal Brief:** one clear focal statement about an evidence-supported pattern, or a helpful “analysis not yet run” state.
3. **Core metrics:** a small number of meaningful indicators.
4. **Patterns:** source category distribution and completed sentiment analysis, kept separate.
5. **Recurring statements:** ranked evidence-backed repeated text.
6. **Issues requiring attention:** why they are listed and what to do.
7. **Recent source records:** a fast route into the feedback explorer.

The first viewport must have a clear hierarchy. There should be one dominant region, one secondary analytical region, and supporting content—not eight equal cards.

## 12.2 Page header and provenance

Show:
- Page title “Dashboard” or “Feedback overview” (choose one label consistently, not both as a competing title).
- Dataset selector/context and import/analysis status.
- Primary action “Import CSV” where appropriate.
- Secondary action “Build report”.
- Filters only when usable.

Do not write “7,000 verified telemetry records.” These are source rows, not verified telemetry or unique customers. Prefer “7,000 source rows” with a small explanation of the dataset and processing status.

## 12.3 Signal Brief focal panel

This is the one special dashboard brand surface.

When actual backend aggregates exist, show one concise, evidence-supported finding such as the concentration of exact repeated text. Example wording can be adapted only after checking the live data:

“7,000 source rows contain 320 unique exact review statements.”

If counts confirm it, an additional note can explain that many rows repeat existing text. Do not claim they represent distinct customers or verified cases.

Panel anatomy:
- One short section label (“Signal brief”, normal sentence case; no tiny uppercase string).
- Main insight sentence at readable size, not a full paragraph.
- One supporting metric or visual anchor.
- A concise limitation note if needed.
- A single CTA such as “Inspect recurring statements”.
- The living dots in a contained visual area, not covering all the content.

Use a controlled deep-midnight surface here. Do not apply a glowing blue gradient to the entire panel. Text remains left-aligned, high-contrast, and easy to scan. The panel should be visually distinctive but compact enough that the data starts within the first viewport on a 900 px-high desktop.

When analysis hasn't been run, use an “Analysis not run” variant with a clear “Prepare analysis” or relevant next action if the backend supports that operation. Do not show an invented insight summary.

## 12.4 KPI row

Use three or four metrics maximum, chosen from fields the backend genuinely returns:

- Total source rows.
- Unique exact statements.
- Additional repeated rows or repetition ratio (label definition clearly).
- Analysed records / issues needing review only if these are returned and meaningful.

Do not show an “Average sentiment” if sentiment hasn't been calculated. Do not show “Critical issues” unless the backend has a defensible critical classification; prefer “Issues to review” when the severity is proposed or unverified.

KPI card design:
- Strong large value.
- Clear label.
- One line of context where useful.
- Details action or accessible flip only if explanation adds genuine value.
- Not every card needs the same tinted background.
- Use one visual accent per selected state, not separate colours for every KPI.
- Do not animate numeric values on every render. Use a brief value update only when real data changes.

Flip cards may show calculation/source details on the back; front and back must remain the same dimensions. Keep buttons available without flipping. Implement accessible keyboard behavior and reduced-motion handling.

## 12.5 Source-category distribution

Question: “What categories exist in this source dataset, and how much feedback is in each?”

Use a ranked horizontal bar chart.

Requirements:
- Descending order by row count.
- Direct category labels.
- Bar length maps to count, with a common scale.
- Show exact count and percentage.
- Include denominator `N` and a subtle note that these are **source labels**.
- Stable category colour mapping.
- Tooltip can show count, percentage, and category.
- Clicking a bar or label filters/navigates to corresponding feedback, using the real API query parameters.
- On mobile, labels and values remain legible; do not squeeze this into a tiny side column.

Do not create a donut chart for these four categories unless a real usability reason outweighs the ranked-bar option. The horizontal bars allow faster comparison.

## 12.6 Sentiment distribution

Only display if a real analysis output exists in the backend.

Question: “Among analysed records, how are sentiment labels distributed?”

Requirements:
- Show analysed denominator explicitly.
- Keep Positive, Neutral, Negative, and Unknown/Not analyzed distinct.
- Do not silently include unanalysed records as neutral.
- Display count and percentage.
- Use fixed semantic colours.
- Include an “Analysis method” or status/detail affordance when feasible.
- If there is no sentiment output, show a helpful empty/ready state and a path to run analysis only if that operation exists.

Don't treat the source category breakdown as sentiment. Don't claim a numeric average rating if the model only returns polarity labels.

## 12.7 Top recurring statements

Question: “Which exact source statements repeat most often?”

Use ranked horizontal bars or a ranked text list with in-line bar lengths.

Each row:
- Frequency/count.
- Snippet of exact source text.
- A consistent compact intensity bar.
- A button or row click that opens a verbatim evidence drawer or filtered feedback view.

Important:
- Sort descending.
- Truncate text gracefully; show full text on detail.
- State clearly that repeat frequency is exact-text repetition, if that is the aggregation method.
- Don't use “Pareto” unless the chart actually provides a cumulative percentage and the implementation labels it correctly. If simply ranked bars, call it “Most repeated statements”.
- Do not colour all repeated statements red as if frequency implied severity.
- Do not imply repeated rows are distinct people.

## 12.8 Priority issues / issue dossiers

This region should contain fewer, richer items rather than a wall of small cards.

Each item includes:
- Issue title.
- Status.
- Priority, if returned by a defensible backend field.
- One-sentence reason it appears in the list.
- Supporting-record count and distinct statement count if available.
- One exact supporting excerpt.
- “Inspect evidence” and “Open issue” actions.

Distinguish “proposed”, “needs review”, and verified status. A frequently repeated phrase is a reason to investigate, not sufficient proof of severity. Never label every top repetition “Critical”.

## 12.9 Recent feedback/source stream

Display a short recent/source-order list (not “recent” by date when no timestamp exists). If the source lacks timestamps, label it “Source records” or “Latest imported rows” only if that ordering is accurate.

Each row should expose:
- Feedback excerpt.
- Source category.
- Analysis status.
- Sentiment only if present.
- A clear route to detail.

Avoid fake “24m ago” labels or third-party-source chips not in the CSV.

## 12.10 Temporal limitation

Because the source CSV lacks timestamps, do not show historical trend lines for this dataset.

Use a compact, helpful message such as:

“Historical trends aren't available for this dataset because it has no verified timestamps.”

The message should not dominate the dashboard. If another dataset has valid timestamps, the chart may appear for that dataset. The condition must be based on real schema/data metadata.

## 12.11 Dashboard states

Create real UI states:
- Loading: stable skeleton dimensions; no flashing or fake numbers.
- No dataset: explain how to import or use demo data.
- Dataset imported, analysis not run: category stats may be shown; sentiment and AI findings remain clearly unavailable.
- Analysis running: show actual job status; no invented progress percentages.
- Analysis completed: use actual backend result fields.
- Analysis failed: show message/retry path.
- No issues returned: neutral empty state, not a fake critical card.
- Backend unavailable: retain layout/workspace context but suppress stale/unconfirmed current numbers and provide Retry.
- Filtered dashboard: visible active filter and clear/reset option.

## 12.12 Dashboard layout modes

If the existing product implements Balanced / AI-prioritised / Custom modes, keep them only if functional and understandable.

- Balanced: fixed, stable default layout.
- AI-prioritised: proposes a validated layout; displays “why this layout”, preview, Apply, Keep current, and Undo after applying.
- Custom: drag/resize/hide controls appear only after explicit entry into customisation mode; provide Save, Cancel, Reset, Undo. Use a fixed grid and prevent overlap.

Do not have AI spontaneously rearrange the layout. Do not let cards move while a user is reading/dragging/interacting. If the underlying functionality is not implemented, do not fake it—either implement it fully or leave a clearly disabled/planned affordance and report that fact.

---

# 13. DATA VISUALIZATION STANDARD

Treat the charts as product features, not decoration. Every chart must answer one question and have a correct data mapping.

## 13.1 Chart design checklist

Every visualization must have:
- A clear title phrased around the question it answers.
- A one-line explanation when ambiguity exists.
- Units/denominator where relevant.
- Readable labels and tick marks.
- Meaningful ordering.
- A useful tooltip if interaction adds context.
- A legend only when the marks alone are insufficient.
- Accessible text summary or equivalent table/list where appropriate.
- Correct empty/unknown state.
- Responsive behavior.
- Consistent category/sentiment colors.

## 13.2 Chart choices

Prefer:
- Ranked horizontal bar for category counts and top repeated statements.
- Segmented bar for a simple sentiment distribution, only after valid analysis.
- Simple vertical time series only when valid timestamps and comparable time buckets exist.
- A small distribution histogram only if the backend returns a meaningful numerical score.
- A ranked list/dossier for issues.
- A compact evidence ledger for inspectable records.

Avoid:
- 3D charts.
- Gauges for ordinary metrics.
- Radar/spider charts.
- Pie charts with many categories.
- Decorative sparklines with invented series.
- Unlabelled area charts.
- Axisless bars that mislead comparisons.
- Cumulative/Pareto labels without cumulative calculation.
- Smooth curves implying continuity in non-continuous data.

## 13.3 Interaction

- Hover/focus reveals a tooltip with value, category, and denominator where applicable.
- Keyboard users can focus chart-linked controls or navigate a textual chart summary.
- Clicking a bar/row routes to a filtered record list if the backend supports it.
- Filters apply consistently and show their active state.
- Tooltips never obscure the only copy of a key value.
- Don't animate a full chart whenever unrelated component state changes.

## 13.4 Recharts or current chart library

Inspect the existing chart dependency. Reuse the current library if it can implement the required chart. Do not introduce another chart library unnecessarily. Use custom SVG only where it materially improves the visualization and remains accessible/testable.

---

# 14. FEEDBACK EXPLORER — COMPLETE SPECIFICATION

Route: `/feedback`.

Goal: let users find a relevant source record quickly, inspect it, understand its analysis state, and navigate to related issues.

## 14.1 Header

- Title “Feedback”.
- Dataset/source context.
- Count of records returned by the current query (from API pagination metadata).
- Primary action “Add feedback”.
- Secondary action “Import CSV”.

## 14.2 Toolbar

- Search field with debounce (roughly 250–350 ms) and clear button.
- Category selector based on real available categories.
- Sentiment selector only if sentiment data exists; include “Not analyzed” if relevant.
- Analysis status selector if supported.
- Sort selector only for valid fields.
- Clear all filters.
- Active-filter chips/list with removal affordance.

Filters must not require multiple unexpected dialogs. Preserve search when switching pages where reasonable.

## 14.3 Table

Use a clear data table with columns appropriate to actual API response:
- Feedback excerpt.
- Source category.
- Sentiment/analysis state.
- Source date only when present.
- Related issue/status only when actually linked.
- Action.

Do not show made-up sources such as “Intercom” or “Salesforce” when no source field is available. Do not show fabricated relative timestamps.

Use pagination based on API metadata. Never fetch all 7,000 rows just to render the table. Use server pagination and server search if supported; if the backend lacks a parameter, implement the required API capability deliberately rather than quietly filtering only the current page.

## 14.4 Detail drawer

Selecting a row opens a side drawer on desktop and an appropriate full-screen/near-full-screen detail view on mobile.

Show:
- Full verbatim review.
- Stable record ID.
- Source category.
- Derived sentiment, if available.
- Analysis status.
- Relevant topics/issues, if available.
- Evidence/provenance note.
- Useful next actions such as “View related issue” or “Track for review”.

Drawer requirements:
- 200–280 ms transition.
- Backdrop dim/blur only enough to focus the drawer.
- `Escape` closes.
- Clicking the backdrop closes where appropriate.
- Focus is managed and returned to trigger.
- Underlying scroll doesn't unexpectedly move.
- Drawer content remains readable and selectable.

## 14.5 Manual feedback

Provide a concise form:
- Feedback text required.
- Source category optional/required according to backend contract.
- Other fields only if the backend supports them.
- Submit, Cancel.
- Field validation, loading, success, and failure.

Do not provide a rating/date/source field if it would be silently ignored. If adding fields requires backend schema changes, confirm the need and add migration/API tests rather than only building frontend inputs.

## 14.6 Search/filter states

Design:
- Loading.
- No feedback in dataset.
- No result for query.
- Empty filtered result.
- Backend failure and retry.
- Selected row/drawer.
- Pagination transitions.

Keep the interface calm and responsive when typing. Prevent layout shifts during fetches; preserve prior rows only if the UI clearly communicates that results are updating.

---

# 15. CSV IMPORT — COMPLETE END-TO-END FLOW

Route: `/import`.

Goal: import a dataset without confusion, show exactly what was accepted/rejected, and then guide the user to the next step.

Use a short stepper. Do not create a giant complex wizard. Steps:

1. Choose file.
2. Map/validate columns.
3. Review preview and duplicates.
4. Import.
5. Results.

## 15.1 Step 1 — Choose file

- Heading “Import feedback”.
- One-sentence explanation.
- Drag-and-drop area with clear browse button.
- Supported file type and actual configured max size, derived from backend settings.
- Cancel/back navigation.
- Accessible keyboard-operable file input.
- Uploading state.

Don't invent upload limits; inspect server validation/config.

## 15.2 Step 2 — Map and validate

- Show detected header columns.
- Show a few sample values from the file.
- Map source text to required feedback field and categories to category field according to real schema.
- Mark optional/unmapped columns explicitly.
- Show missing required column errors and give correction guidance.
- Don't create mappings for unsupported fields by guessing.

The existing CSV is reported to use `review` and `category`, but inspect the file and backend model before finalising mapping behavior.

## 15.3 Step 3 — Preview and duplicate analysis

Show a compact table with a few preview rows and a summary:
- Total rows.
- Valid rows.
- Invalid rows.
- Unique exact review strings.
- Additional repeated rows.

Use the actual import/validation result. Do not treat duplicate count as distinct customers. If the backend preserves duplicates, communicate this. Don't drop rows without explicit logic and disclosure.

## 15.4 Step 4 — Import

- Show a clear import summary before confirmation.
- Primary button “Import feedback”.
- Disable duplicate submission.
- Display actual progress if available; otherwise use an indeterminate indicator.
- Cancellation only if the backend/job system supports it.

## 15.5 Step 5 — Results

Show actual counts returned by the backend:
- Imported rows.
- Skipped/invalid rows.
- Repeat statistics where available.
- Any row-level error report/download if supported.

Primary next action should be contextual:
- “View feedback” after successful import.
- “Prepare analysis” if that operation exists and analysis has not run.
- “Fix errors and retry” for recoverable failures.

Design partial-success and total-failure states separately. Do not show success when the API failed.

---

# 16. ANALYSIS WORKFLOW AND INSIGHT DETAIL

If the current product exposes an analysis workflow, design around the actual backend job semantics. If analysis is implicit/on dashboard today, inspect the existing backend and implement only capabilities that genuinely exist or can be added safely.

## 16.1 Start analysis

- Explain briefly what will be analysed.
- Make the operation explicit.
- Prevent duplicate start clicks while job creation is in progress.
- If an external provider or Adaption job may cost credits, show a confirmation/estimate only if the backend can obtain a real estimate.
- Do not require the user to understand internal ML infrastructure.

## 16.2 Progress page/panel

Show status accurately: queued, running, completed, failed, or other states only if backend supports them.

- If exact progress exists, show it.
- If not, use an indeterminate indicator and short stage text.
- Don't fake 62% progress.
- Poll or subscribe at a sensible interval, with backoff and cleanup.
- Provide navigation away from the page without killing a durable job.

## 16.3 Completed analysis

Show:
- Sentiment result only when stored/returned.
- Topics/clusters only when returned.
- Common complaint statements.
- Supporting feedback records.
- Method/limitations information.
- Clear route into issue or recommendation where available.

## 16.4 Failure

- Concise user-facing reason if safe.
- Retry only when supported.
- Preserve existing imported feedback.
- Don't silently convert failure to “no issues found”.

## 16.5 Insight detail

Each insight should separate:
- Observation (what records show).
- Interpretation (what analysis infers).
- Evidence (verbatim records).
- Suggested action (a recommendation, not a fact).
- Limitation/uncertainty.

Use typography and layout to make these categories distinguishable without giving each one a loud colour.

---

# 17. ISSUES AND TRIAGE

Route: `/issues`.

Goal: help users review, investigate, prioritise, and track problems based on actual evidence.

## 17.1 Overview

Header:
- “Issues”.
- Brief text explaining these are patterns/topics discovered or proposed from feedback.
- Filters for status, priority, category when these fields exist.
- Search if supported.

List/table:
- Issue title.
- Priority/status.
- Supporting record count.
- Short rationale.
- Updated time only when stored and real.

Do not use an arbitrary rank to create a false sense of urgency. If priorities are proposed, label them “Proposed priority” and show the rationale.

## 17.2 Issue dossier/details

Open via a dedicated route or side drawer consistent with the rest of the app.

Include:
1. Issue name.
2. Current status.
3. Priority and why.
4. Summary of what evidence supports it.
5. Exact source excerpts.
6. Supporting-row count and unique-statement count if available.
7. Related category/topic if actual.
8. Proposed next action/recommendation if linked.
9. Status update controls.

Don't expose an internal scoring number without explaining what it means. Don't claim customer impact or business severity based only on repeated strings.

## 17.3 Status transitions

Use only statuses supported by the backend. The prior implementation report mentioned open, investigating, and resolved; verify current schema before using those exact values.

- Dropdown/action menu with clear current state.
- Loading on mutation.
- Success toast/inline confirmation.
- Rollback or error message on failure.
- Refresh data after success; update optimistic UI only if rollback is handled properly.

## 17.4 Saved/tracked issues

If “sprint tracking” or “tracked” is implemented, make the state clear and persistent. Do not display a button that visually toggles without successfully persisting it.

---

# 18. RECOMMENDATIONS

Route: `/recommendations`.

Goal: move from an insight to a useful next action without exaggerating certainty.

## 18.1 Overview

Use a ranked action list/roadmap, not a generic card matrix.

Each recommendation should show:
- Action-oriented title.
- Related issue.
- Reason it was suggested.
- Evidence count or a compact excerpt.
- Priority/status only if backed by backend values.
- Effort/impact only if the source/model has actually returned or the product explicitly labels them as a user-entered qualitative estimate.

Do not invent dollar savings, ROI, percentage reductions, timelines, sprint points, or business-impact numbers.

## 18.2 Recommendation details

Use a clear structure:

**Recommended action** — one concise imperative.  
**Why** — reason grounded in the issue and records.  
**Evidence** — quoted customer text linked to the feedback record.  
**Limitations** — what is unknown or needs human validation.  
**Tracking** — save/plan/complete controls only if persisted by backend.

Avoid dense walls of AI-generated paragraphs. Make the first actionable sentence visible immediately.

## 18.3 Status/action behavior

- Show loading while saving.
- Confirm successful persistence.
- Handle failed updates and let users retry.
- If backend lacks tracking state, either implement it end-to-end or omit the false affordance; do not use client-only toggles.

---

# 19. REPORTS AND EXPORTS

Route: `/reports`.

Goal: generate a professional, business-friendly report from actual stored/derived results and make downloading simple.

## 19.1 Report page

- Heading “Reports”.
- One clear primary CTA “Build report”.
- Report configuration should ask only for options supported by the backend.
- History/list of reports only if the API returns report history.
- Clear statuses such as ready, generating, failed where supported.

## 19.2 Report contents

Include available fields:
- Dataset/context name.
- Source row count.
- Category distribution.
- Exact-repeat statistics.
- Sentiment only if analysis is complete.
- Issues and evidence.
- Recommendations.
- Method and data limitations.
- Reporting period only if valid timestamps exist.

Do not manufacture a reporting window for timestamp-less CSV data.

## 19.3 Export formats and download behavior

Inspect current backend support. The prior report described PDF, JSON, and CSV, but verify actual code/routes before presenting these as available formats.

- Make selected format visible.
- Disable invalid configurations.
- Show real generation status.
- Trigger download from the actual export response.
- Use correct blob/content disposition behavior in the browser.
- Handle authentication/authorization and download failure.
- Don't show “Export successful” until the download response is successful.

---

# 20. SETTINGS AND SERVICE STATUS

Route: `/settings`.

Keep settings small and genuinely useful.

Possible sections (only if implemented):
- Workspace/dataset context.
- Application/API status.
- Adaption configuration status (never expose a secret key).
- User/workspace preferences.
- Default data workspace.

Do not show a fake green “Connected” state if a health check failed or credentials are missing.

Backend status must come from the real health endpoint. Use a clear status label such as “Connected”, “Unavailable”, or “Not configured”. Avoid a constantly pulsing dot. A timestamp for “last checked” can only be shown if recorded.

Do not display or request the actual secret key in a browser UI unless there is a specifically designed secure secret-management system; configuration should normally remain server-side.

---

# 21. BACKEND INTEGRATION — KEEP IT REAL

The frontend must be a thin, typed client for the actual FastAPI backend, not a mock demo that merely looks connected.

## 21.1 Single API client

Use the existing `frontend/src/lib/api/client.ts` and `types.ts` as the likely starting point. Inspect and preserve their conventions where sound.

- All API calls should go through one typed client or clearly separated feature clients.
- Read `NEXT_PUBLIC_API_BASE_URL` from environment.
- Read development workspace configuration from the existing config if that is the actual auth model.
- Don't hardcode `http://127.0.0.1:8001` in individual pages.
- Don't put backend secrets in `NEXT_PUBLIC_*` variables.
- Centralize JSON parsing, error normalisation, request IDs if supported, and abort signal handling.
- Use `AbortController` to cancel stale search requests when appropriate.
- Type request/response payloads to the actual backend schemas, not an imaginary ideal schema.

## 21.2 Verify endpoint contracts

Inspect FastAPI route definitions, Pydantic schemas, and live OpenAPI `/docs` before relying on any endpoint. The endpoint list in this prompt is not a substitute for source-code verification.

If a required visual feature has no backend support:
1. Identify the missing endpoint/schema/operation.
2. Determine whether the capability is genuinely needed for the required product workflow.
3. If needed, implement the minimal compatible backend addition with tests/migrations where appropriate.
4. Update the TypeScript types/client and frontend.
5. Do not fake the missing data in the frontend.

Avoid changing the database or backend unnecessarily. Preserve all working APIs and existing tests.

## 21.3 Error handling

- Distinguish network failures, non-2xx responses, malformed response, validation errors, and empty results.
- Show a human-usable message.
- Offer Retry when safe.
- Don't swallow exceptions and return fake zeros.
- Don't log secrets or full raw customer reviews unnecessarily.
- Prevent stale results from overwriting newer filter/search results.

## 21.4 Loading and caching

- Avoid refetching identical data on every render.
- Preserve stable layouts during loading.
- Debounce search.
- Cancel stale requests.
- Refresh affected issue/feedback/report data after a mutation.
- Use polling only for real jobs and stop polling once complete/failed or after unmount.
- Handle slow backend response without blocking unrelated page interactions.

## 21.5 Authentication and workspace boundaries

The current report describes `X-Workspace-Id: ws-production-eval` as a development/hackathon setting, not production auth. Confirm the implementation before changing it.

- Do not claim fixed workspace header is secure user authentication.
- Don't create a false “secure login” if credentials are not verified.
- Keep demo mode visibly labelled and isolated.
- Preserve workspace context across routes only using the actual existing mechanism.
- Don't display data from one workspace as belonging to another.

## 21.6 Do not fake an AI or Adaption operation

If a backend job/API isn't configured or returns failure, show that honestly. Keep the rest of the interface usable and explain what isn't configured. Never create a green success toast for an operation that never ran.

---

# 22. SPEED, SIMPLICITY, AND HELPULNESS — UX CONTRACT

The interface must feel fast and easy for a first-time user. Design is not successful if it is visually attractive but operationally slow or confusing.

## 22.1 Minimize decision friction

- One clear primary action per major screen.
- Use progressive disclosure for secondary controls.
- Avoid long explanatory text when a concise label/help line will work.
- Don't make users open a modal for a simple filter.
- Avoid duplicate actions in nav, hero, and toolbars.
- Use sensible defaults.
- Keep prior form/file state when the user can correct an error without starting over.

## 22.2 Reduce cognitive load

- Group controls by purpose.
- Use plain language.
- Name source data and analysis results explicitly.
- Distinguish an observation from an interpretation.
- Put the next action near the relevant issue/evidence.
- Use a visible active-filter state and a one-click clear path.
- Keep table columns to the most useful fields; show secondary detail in a drawer.

## 22.3 Response feedback

Every action that may take time should show a clear state. Every successful mutation should visibly confirm the result. Every recoverable error should tell users how to recover.

Don't interrupt users with unnecessary confirmations. Ask for confirmation for destructive/irreversible actions or for a significant layout reset where unsaved changes matter.

## 22.4 Avoid unnecessary visual noise

Don't use decorative badges for information already present in headings. Don't show an icon and a label and a tooltip for every single button. Keep secondary metadata quiet but readable.

---

# 23. ACCESSIBILITY REQUIREMENTS

- Use semantic HTML landmarks and headings in logical order.
- Buttons must be buttons; navigation must be links.
- Inputs require persistent labels, not placeholder-only labels.
- All controls need visible keyboard focus.
- `Enter`/`Space` activation for custom interactive cards/controls.
- `Escape` closes dismissible overlays.
- Restore focus to a drawer/dialog trigger on close.
- Status must not rely only on colour.
- Chart information must have accessible text/summary/list equivalent.
- Provide meaningful aria labels for icon-only buttons.
- Respect reduced-motion preferences.
- Avoid low contrast for metadata.
- Ensure mobile tap targets are usable.
- Ensure the dot canvas is decorative (`aria-hidden`, pointer-events none) unless any part conveys content not represented elsewhere; in that case provide an equivalent textual explanation.

---

# 24. IMPLEMENTATION QUALITY — KEEP THE CODE MAINTAINABLE

- Use the existing Next.js App Router, React, TypeScript, and Tailwind setup.
- Inspect installed versions before using APIs. The current project report mentioned Next.js 16, React 19, TypeScript 5, and Tailwind v4; verify package files.
- Use current project conventions and avoid introducing dependencies without a good reason.
- Extract shared components for repeated patterns, but don't turn every trivial span into a component.
- Keep the app shell separate from individual route content.
- Separate data fetching/mutations from presentational components where practical.
- Keep API types central and aligned with Pydantic schemas.
- Avoid `any` where safe typing is practical.
- Don't disable lint rules or hide errors to pass a build.
- Remove dead code and unused design classes from prior palette iterations.
- Avoid duplicates of old and new token systems.
- Preserve the reference HTML files in `design-reference/`; don't import these static prototypes directly into production routes as the main architecture.
- Do not install large animation libraries if CSS/Canvas/current tools suffice.

---

# 25. BROWSER-BASED VISUAL VERIFICATION — MANDATORY

Use available browser automation/subagent tools or the project's browser workflow. Do not claim visual verification if you only ran a build.

## 25.1 Screenshots to capture

Capture actual rendered screenshots at minimum:

### Desktop 1440×900
- Landing page hero at top.
- Landing page Stage 2 scroll position.
- Landing page Stage 3 scroll position.
- Landing page Stage 4 scroll position.
- Landing page mid-page/final CTA.
- Sign in.
- Sign up.
- Dashboard first viewport.
- Dashboard analytical grid.
- Dashboard evidence drawer open.
- Feedback list.
- Feedback drawer open.
- CSV import in step 1 and preview/result state.
- Issues overview and issue detail.
- Recommendations page/detail.
- Reports page and export state.
- Settings/status page.

### Mobile 390×844
- Landing hero and dot field.
- Landing story mid-point.
- Sign in.
- Dashboard first viewport.
- Category/recurring-statements section.
- Feedback list/detail.
- CSV import.
- Issue details.

Also inspect 360 px width and a tablet viewport to catch layout breakage.

## 25.2 Three-pass visual critique

After implementation, perform at least three review passes:

**Pass 1 — Composition:** Is there a clear focal point? Are card grids repetitive? Are titles/actions visually ordered? Does the first viewport tell a coherent story?

**Pass 2 — Precision:** Check alignment, gutters, baseline, typography sizes, chart labels, overflow, widths, line wrapping, drawer behavior, and table density.

**Pass 3 — Motion and interaction:** Verify scroll-driven dots, card flip, drawer transitions, filters, search, pagination, status update, import, and export. Test reverse scroll and reduced motion.

For every issue found, fix it, refresh, and recapture the affected screen. Do not stop with a list of defects.

## 25.3 Actual functionality verification

- API call succeeds and data renders from backend.
- API failure shows a useful failure state rather than mock numbers.
- Search/filter results match the backend query.
- Feedback drawer displays verbatim source text.
- Issue status mutations persist after refresh.
- CSV upload uses the real backend and shows true results.
- Report build/export downloads the supported format.
- No fake timestamp/source/customer count appears.
- No console errors or avoidable React warnings.
- No horizontal overflow.
- Scroll dots stage changes are visible both down and up.

---

# 26. TESTING AND BUILD

Run the appropriate commands from the current package files, expected to include:

- Frontend lint command (likely `npm run lint`).
- Frontend production build (likely `npm run build`).
- Backend test suite (prior report used `python -m pytest backend/tests`).

Verify exact available scripts and test commands first. Run them after edits. Fix introduced failures. Do not downgrade tests, delete failing tests, disable lint rules, or change assertions merely to obtain a green result.

If existing tests fail because of pre-existing issues, report that clearly and separate it from any new regressions. Preserve backend route/schema contracts unless a necessary API improvement is implemented with tests.

---

# 27. PHASED EXECUTION ORDER

Execute these phases in sequence, with real changes and verification after each phase.

## Phase 1 — Code and visual audit
Inspect actual code, endpoints, screenshots, existing dot animation, and dataset constraints. Capture baseline screenshots.

## Phase 2 — Establish one central design system
Implement the palette, type scale, spacing, borders, surfaces, states, and motion tokens. Remove conflicting legacy palette definitions.

## Phase 3 — Fix the dot animation first
Diagnose why scrolling doesn't visibly drive the four-stage particle composition. Implement/recover scroll linkage, interpolation, visibility/resizing/reduced-motion support, and browser verification.

## Phase 4 — Recompose the dashboard
Start with the main 1440×900 dashboard. Implement the Signal Brief, focused KPIs, category chart, repeated statements, evidence-led issues, and records list. Avoid generic uniform cards.

Do not proceed to propagate styling until this page is visually convincing and verified against actual data.

## Phase 5 — Landing page
Carry the same art direction into the marketing page. Test the four-stage scrolling story at desktop and mobile.

## Phase 6 — Feedback explorer and CSV import
Implement fast search/filtering, record details, import validation, preview, duplicates, results, and error recovery.

## Phase 7 — Issues and recommendations
Build connected evidence/issue/action workflows with actual persistence.

## Phase 8 — Reports, auth, onboarding, settings
Finish remaining important routes and states without introducing a second visual system.

## Phase 9 — Responsive/accessibility audit
Fix desktop/tablet/mobile behavior and keyboard/reduced motion.

## Phase 10 — End-to-end verification
Exercise the main workflow: open app → import dataset → see result → view feedback → inspect an issue → inspect a recommendation → export report. Confirm all displayed values originate from actual backend responses or are explicitly identified as illustrative demo data.

If environment/tool limits require phases to run separately, finish one coherent phase, report it honestly, and continue with the next. Do not claim unimplemented screens are complete.

---

# 28. ACCEPTANCE CRITERIA — DO NOT MARK COMPLETE UNLESS VERIFIED

## Art direction
- [ ] The UI no longer resembles a generic grid of cards.
- [ ] The palette uses neutral foundations, one primary brand accent, and restrained semantic/data colours.
- [ ] Category and sentiment encodings are separate and consistent.
- [ ] Glassmorphism is visible where used and absent where it reduces readability.
- [ ] Typography, spacing, and alignment are consistent.
- [ ] The dashboard has a clear focal point and visual hierarchy.
- [ ] The landing page has a distinctive and polished visual identity.

## Dots
- [ ] Stage 1 is visible on initial load.
- [ ] Scrolling down moves through four continuous stages.
- [ ] Scrolling up reverses the visual progression.
- [ ] Fast scrolling ends in the correct stage.
- [ ] Re-entry/visibility/resize work.
- [ ] Mobile layout reduces density while preserving meaning.
- [ ] Reduced motion works.
- [ ] Canvas never blocks UI interactions.

## Dashboard/data visualisation
- [ ] Source category bars use actual API counts.
- [ ] Sentiment appears only when real analysis output exists.
- [ ] Repeated statements are ranked using actual aggregation.
- [ ] No false Pareto label without cumulative calculations.
- [ ] Issue details link to source evidence.
- [ ] No timestamps are invented.
- [ ] No duplicate rows are described as distinct customers.
- [ ] Empty/loading/error states are meaningful.

## UX and flow
- [ ] Each screen has one obvious primary action.
- [ ] Search is responsive and cancellable.
- [ ] Filters work and can be cleared easily.
- [ ] CSV import validates, shows results, and handles partial failure.
- [ ] Issue mutations persist.
- [ ] Recommendations are evidence-linked.
- [ ] Reports export from the actual backend.
- [ ] Auth UI reflects actual implemented auth behavior.
- [ ] No dead-end primary buttons.

## Quality
- [ ] Desktop, tablet, and mobile screenshots inspected.
- [ ] Three visual review passes completed.
- [ ] Frontend lint/build pass or any pre-existing failures are documented.
- [ ] Backend tests pass or any pre-existing failures are documented.
- [ ] Browser console is clean of newly introduced errors.
- [ ] No secrets were exposed.

---

# 29. FINAL REPORT REQUIRED FROM ANTIGRAVITY

When finished, provide an honest implementation report containing:

1. Art-direction changes made.
2. The final tokens/palette and why each colour is used.
3. Screens/routes changed.
4. Shared components changed or created.
5. Exact root cause of the scroll-linked dot failure.
6. How scroll progress maps to the four animation stages.
7. Backend endpoints verified and used.
8. Any API/backend changes made (with rationale/tests).
9. Visual screenshots captured and viewports inspected.
10. Interaction flows tested.
11. Lint/build/backend test results.
12. Remaining limitations, if any.

Do not use phrases like “production-grade”, “fully functional”, “verified”, or “complete” unless the corresponding verification actually occurred. Distinguish implementation from visual verification and mocked tests from real service tests.

---

# START NOW

Inspect the current repository, current backend, Stitch MCP availability, actual data, and actual browser output. Reproduce the current visual and scrolling-animation problems. Then execute the phases above.

The goal is not another palette swap. It is a complete, coherently art-directed InsightFlow frontend that lets users move quickly from customer voice to pattern to evidence to action—with a distinctive living-dot identity, rigorous data visualisation, honest backend integration, and no generic AI-dashboard look.
