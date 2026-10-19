# tiny_cursive accessibility ticket proposal (2026-10-16)

**Audit mode:** Pre-Release Audit, **static source review only**, against `main` @ `382ac88` (tiny_cursive 3.1.0 / 2026100601). The live measured pass required by NFR-A11Y-09 (computed-style contrast, focus rings, screen-reader behaviour) was **not** run: Docker Desktop was down and the live test site needs Joe to log in. Every contrast figure below is computed from hex literals in source and must be confirmed live before a fix is closed. Standard: WCAG 2.2 AA + ARIA APG; ATAG 2.0 Part A for the editor-side surface.

**Filed 2026-10-16** as MOO-48 to MOO-71 (Moodle team, labels Accessibility + Plugin). Mapping: A1=MOO-48, A2=MOO-49, A3=MOO-50, A4=MOO-51, A5=MOO-52, A6=MOO-53, A7=MOO-54, A8=MOO-55, B1=MOO-56, B2=MOO-57, B3=MOO-58, C1=MOO-59, C2=MOO-60, D1=MOO-61, D2=MOO-62, D3=MOO-63, D4=MOO-64, D5=MOO-65, E1=MOO-66, E2=MOO-67, E3=MOO-68, E4=MOO-69, E5=MOO-70, E6=MOO-71.

**Tracker context:** Linear team `MOO` has no accessibility tickets apart from MOO-30 (notice gate, shipped and largely clean). The Browser Ext. team has a full a11y backlog (BRO-206 to BRO-373) in a consistent format; the tickets below use the same shape (Problem / Remediation / Acceptance criteria / WCAG) so they can be filed as-is. MOO-20 already tracks the unescaped `innerHTML` in replay.js that the replay audit also flagged, so no new security ticket is proposed.

**Severity key (Blackboard baseline):** Critical = prevents task completion or clear AA failure, not waivable. Major = likely AA failure. Minor = best practice. Suggested Linear priority: Critical → Urgent/High, Major → High/Medium, Minor → Low.

**Keyboard-parity verdict (static):** a sighted keyboard-only teacher can open Analytics, read the metrics, let the replay run and close with Escape, but hits dead controls (close button, paste-events toggle) and must Tab through the tab strip. A screen-reader user **cannot** complete the task: the dialog, tabs, play/pause, scrubber, authorship result and charts are all unnamed or unexposed. Parity fails.

---

## Suggested filing order

| # | Ticket | Severity | Surface |
|---|---|---|---|
| A1 (MOO-48) | Analytics modal: nameless dialog, pointer-only close, tabs without semantics | Critical | Teacher + student |
| A2 (MOO-49) | Analytics modal: authorship result, metrics table and status messages are silent to screen readers | Critical | Teacher + student |
| A3 (MOO-50) | Replay player: controls have no names, states or keyboard access | Critical | Teacher + student |
| A4 (MOO-51) | Replay playback: autoplay, no reduced-motion, colour-only attribution, no final-text alternative | Critical | Teacher + student |
| A6 (MOO-53) | Charts have no text alternative and differentiate series by colour alone | Critical | Teacher |
| B1 (MOO-56) | Injected Analytics/Replay pills: link-as-button, effort badge contrast and colour-only threshold | Critical | Every module |
| C1 (MOO-59) | Writing report filters and download controls are unlabelled or behave unexpectedly | Critical | Teacher |
| D1 (MOO-61) | Autosave indicator: unnamed button, silent state, colour-only, inside TinyMCE menubar | Critical | Student (editor) |
| D3 (MOO-63) | Cite-source modal and paste controls: unlabelled field, destructive validation, Redo hijack | Critical | Student (editor) |
| E3 (MOO-68) | Contrast sweep of the shared palette | Critical | All |
| A5 (MOO-52) | Difference tab and PDF export: attribution by colour only, heading misuse | Major | Teacher |
| A7 (MOO-54) | Learn More pane: hardcoded English and failing contrast | Major (+Critical contrast) | Teacher |
| A8 (MOO-55) | Full-page mode sidebar: pointer-only controls, hidden-but-focusable content, unlabelled timer | Major | Student |
| B2 (MOO-57) | Participants page: nameless icon link, misaligned column, inconsistent with other modules | Major | Teacher |
| B3 (MOO-58) | Assign grader reload drops focus; injection positions; silent remove-submission failure | Major | Teacher |
| C2 (MOO-60) | Report pages: titles, heading structure, dates, table semantics | Major | Teacher + student |
| D2 (MOO-62) | Saved Content panel: focus management, role, hardcoded relative times | Major | Student (editor) |
| D5 (MOO-65) | Admin settings page: anchors as buttons, unannounced and auto-clearing results | Major | Admin |
| E1 (MOO-66) | Respect `prefers-reduced-motion` across the plugin | Major | All |
| E2 (MOO-67) | i18n: remaining hardcoded English strings and locale-dependent selectors | Major | All |
| D4 (MOO-64) | Notice gate follow-ups | Minor/Major | Student |
| E4 (MOO-69) | Remove dead CSS that would fail if revived | Minor | All |
| E5 (MOO-70) | Verification: live measured pass, AT matrix, axe-core in CI | Process | All |
| E6 (MOO-71) | Policy: dictation and assistive-technology users vs paste controls and analytics heuristics | Specialist decision | Product |

---

## A. Analytics modal (teacher and student view)

### A1 (MOO-48). Analytics modal: nameless dialog, pointer-only close control, tabs without semantics
**Severity:** Critical. **WCAG:** 4.1.2 Name, Role, Value (A); 2.1.1 Keyboard (A); 2.4.7 Focus Visible (AA); 1.4.1 Use of Color (A). **APG:** Dialog (Modal), Tabs.

**Problem**
- `amd/src/analytic_modal.js:50` removes `.modal-header`, which holds the `h5` that core's `aria-labelledby` points at and core's labelled close button. The `role="dialog"` is left with no accessible name. The template also never supplies `{{$title}}`.
- The only visible close control is `<div class="tiny_cursive-close-btn" id="analytic-close"><span>&times;</span></div>` (`templates/analytics_modal.mustache:61`) bound to `click` only. Not focusable, no role, no name. Escape works only because core binds it.
- Metrics / Difference / Replay / Learn more are `<a href="#">` inside `<div>`s (`analytics_modal.mustache:65-113`): no `role="tablist|tab|tabpanel"`, no `aria-selected`, no `aria-controls`, click-only (`analytic_events.js:144,183,380`), no arrow-key navigation. Selected state is the `.active` colour swap only.
- `.prop('disabled', true)` on the anchor tabs (`analytic_events.js:117-126,145-146,184-185`) is a no-op: tabs stay focusable while styled grey with `cursor:not-allowed`.
- Each tab link carries `shadow-none`, which strips Boost's `box-shadow` focus indicator (`analytics_modal.mustache:67,75,83,96`; `styles.css:252-256`). Verify live.
- "Learn More" is announced as an external new-window link but its click is intercepted to open an in-modal panel (`analytics_modal.mustache:96-98`, `analytic_events.js:127-130`).
- Tab and replay state selectors are page-global (`$('.tiny_cursive-nav-tab').find('.active')`, `$('a[id^="rep"]')`), so two modals on one page (quiz, forum) desynchronise.

**Remediation**
- Keep core's header (visually hidden if desired) or give the plugin `<h3>` an id and set `aria-labelledby` on the root in `show()`.
- Replace the close `<div>` with `<button type="button" aria-label="{{#str}}closebuttontitle, core{{/str}}">`; the saved-content template already does this correctly.
- Render the strip as Bootstrap `nav-tabs` with `role="tablist"`, `<button role="tab" aria-selected aria-controls>` and `role="tabpanel"` on the content container; use `data-bs-toggle="tab"` for arrow keys, or add a keydown handler.
- Use real `<button disabled>` for unavailable tabs, or `aria-disabled="true"` + `tabindex="-1"` + early return.
- Remove `shadow-none` or add `:focus-visible { outline: 2px solid; outline-offset: 2px }`.
- Make Learn more a tab; move the external link inside its panel.
- Scope selectors to `this.getRoot()`.

**Acceptance criteria**
- [ ] Screen reader announces "Analytics, dialog" on open
- [ ] Close button is in the Tab order, named, and activates with Enter and Space
- [ ] Tabs announce "tab, 1 of 4, selected"; Left/Right move between tabs; `aria-selected` matches the visual state at all times
- [ ] Disabled tabs are not focusable and announce as unavailable
- [ ] Visible focus ring on every control in the modal at ≥ 3:1
- [ ] Two analytics modals on a quiz review page keep independent state

### A2 (MOO-49). Analytics modal: authorship result, metrics table and status messages are silent to screen readers
**Severity:** Critical. **WCAG:** 1.1.1 Non-text Content (A); 1.3.1 Info and Relationships (A); 1.4.1 (A); 3.3.2 Labels or Instructions (A); 4.1.3 Status Messages (AA).

**Problem**
- Authorship result is an SVG checkmark (`analytics_modal.mustache:155-160`, `analytics_table.mustache:67-72`) later swapped for `<i class="fa fa-check-circle|fa-question-circle|fa-info-circle">` coloured green/grey/black (`analytic_events.js:441-483`). No text alternative. Only the "question" variant has a `title`, read from `localStorage`. Lang strings `verified`, `verified!`, `notenoughtinfo` exist but are unused here.
- Metrics table (`analytics_modal.mustache:127`, `analytics_table.mustache:44`) has no `<th>`, no `<caption>`, and `table-responsive` is on the `<table>` itself; with `styles.css:178-183` (`display:block`) and `:315-318` (`td:nth-child(1){display:inline-flex}`) the table loses its semantics and values are not associated with their labels.
- Notification bell (`analytics_modal.mustache:55`) is named only by `title="Notifications"` (hardcoded English); its "resubmit available" state is a red colour and a pulsing dot (`styles.css:1799-1813`) with no text or ARIA change.
- Loading state is an empty spinner `div` (`analytic_events.js:152-153,192-193,395-396`); "No payload data!" / no-submission text is injected with no live region (`analytic_events.js:177-182,200,314-322`; `replay.js:153-160`). `handleNoSubmission` also writes into every `.tiny_cursive` on the page via a global selector.
- Resubmit: `#cursive-resubmit` is `<a href="#">` (`modal_resubmit.mustache:29`) so `.prop('disabled', true)` (`analytics_modal.mustache:341`) does nothing; outcome text is swapped into `#ToastTextContent` with no `role="status"` (`:352-380`); spinner has no text.
- Decorative inline SVGs throughout lack `aria-hidden="true" focusable="false"`.
- `text-transform: uppercase` on "No payload data!" / freemium message (`styles.css:604-615`); `text-align: justify` on the modal pane (`styles.css:264-272`).

**Remediation**
- Render authorship as `<span><i aria-hidden="true"></i><span class="visually-hidden">{verified | not verified | not enough info}</span></span>` using the existing strings.
- `<th scope="row">` for metric names, visually-hidden `<caption>`, move `table-responsive` to a wrapper div, drop the display overrides.
- `aria-label` on the bell from a lang string that includes the state; update it when the alert clears.
- Persistent `<div role="status">` inside each tab panel for loading/empty/error text; use `core/loading` or visually-hidden "Loading" text on spinners; scope selectors to the instance.
- Make Resubmit a `<button>`; `role="status"` on the toast body before any update.
- `aria-hidden="true" focusable="false"` on every decorative SVG; drop the uppercase transform and justification.

**Acceptance criteria**
- [ ] Screen reader reads the authorship result as text in all three states
- [ ] Each metric row reads as "Metric name, value"
- [ ] Bell announces its pending-resubmission state and the change when it clears
- [ ] Loading, empty-state and resubmit results are announced without focus moving
- [ ] Resubmit cannot be activated while a request is in flight

### A3 (MOO-50). Replay player: controls have no names, states or keyboard access
**Severity:** Critical. **WCAG:** 4.1.2 (A); 3.3.2 (A); 2.1.1 (A); 2.5.8 Target Size (AA); 2.4.7 (AA). **APG:** Button, Slider, Disclosure.

**Problem (all in `amd/src/replay.js` unless noted)**
- Play/pause `<button>` (`:249-253`) contains an empty `<i>`, later an `<img>` with no `alt` (`:177-179,774-776`). No name, no playing/paused state.
- Scrubber `<input type="range">` (`:270-278,704-712`) has no label and no `aria-valuetext`; announces 0 to 100 while the visual shows mm:ss. Custom 16×16 thumb on an 8px track (`styles.css:1249-1291`) is below the 24px target minimum once `appearance:none` is applied.
- "Speed: " is hardcoded English (`:295-297`); speed buttons expose the active choice via `.active` class only, no `aria-pressed`, no `role="group"`; "1x" reads as "one ex" (`:302-317`).
- Paste-events disclosure toggle is a `<div>` with a click handler (`:329-364`): not focusable, no `aria-expanded`/`aria-controls`.
- Prev/next paste buttons contain only chevron icons (`:504,534`); the counter text is hardcoded English (`:508-515`); seek-to-paste button is an `<img>` with no alt (`:671-676`); comment/pasted-content toggle is named only by a hardcoded `title` (`:580-583,642-650`).
- Control labels are read from `localStorage` keys filled asynchronously (`:98-107,340,491`) and can be empty on first load.
- No `:focus-visible` authored for `.tiny_cursive_play_button`, `_speed_btn`, `_nav_button`, `_seekplay_button` (`styles.css:908-943,987-1010,1160-1166,1331-1353`); duplicate `.tiny_cursive_seekplay_button` rules (`:1160-1173` vs `:1402-1415`) leave a white icon on a near-white panel. Comment toggle is a white 12px icon on `#ffc107` (1.63:1, `styles.css:1083-1106`).
- `.tiny_cursive_replay_control { height: 115px }` with no wrap (`styles.css:822-835`) overflows at 320px or under text-spacing.

**Remediation**
- `aria-label` "Play replay" / "Pause replay" toggled in `startReplay()`/`stopReplay()`; icons `aria-hidden`.
- `aria-label` on the scrubber and `aria-valuetext="{current} of {total}"` set in `setScrubberVal()`; thumb ≥ 24px.
- Lang-string label for speed, `role="group" aria-labelledby`, `aria-pressed` per button, `aria-label="Playback speed 1.5 times"`.
- Paste toggle → `<button aria-expanded aria-controls>`; prev/next/seek → `aria-label` from lang strings including position ("Jump to paste at 01:23").
- Resolve strings with `get_strings` before `buildControllerUI()`.
- Explicit `:focus-visible` outline on all replay controls; delete the duplicate seek rule; dark icon on amber.
- `min-height` + `flex-wrap` on the control bar.

**Acceptance criteria**
- [ ] Every replay control has a translated accessible name and, where stateful, exposes its state
- [ ] Scrubber announces time, not percent; thumb hit area ≥ 24×24
- [ ] Paste-events panel can be opened, navigated and closed with the keyboard alone
- [ ] Visible focus ring on every control; icon contrast ≥ 3:1
- [ ] Controls do not overflow at 320px or with 1.5 line-height / 0.12em letter-spacing

### A4 (MOO-51). Replay playback: autoplay, no reduced-motion, colour-only attribution, no final-text alternative, no announcements
**Severity:** Critical (1.4.1) / Major. **WCAG:** 1.4.1 (A); 2.2.2 Pause, Stop, Hide (A); 1.3.1 (A); 4.1.3 (AA); 1.4.3 (AA); reduced-motion requirement.

**Problem**
- Replay auto-starts the moment the Replay tab loads (`replay.js:89`, `:748`) and animates for the full capture duration; nothing checks `prefers-reduced-motion`. Caret blinks indefinitely (`styles.css:1227-1246`; 1 Hz, so 2.3.1 passes).
- Pasted characters (`#fff2cc`) and AI-inserted characters (`#ede9fe`) differ by background colour alone (`replay.js:2282-2297`; `styles.css:837-840,1187-1198`); no legend in the Replay tab. Typed vs untouched text differs by colour alone (`#34a853` on white, 3.06:1, `styles.css:1214-1218`). Deleted characters are `#ea4335` at `opacity:.5` ≈ 2.0:1 (`:1220-1225`).
- Replayed text is emitted as per-character `<span>`s into an unlabelled container (`replay.js:2220-2334`); no static "final text" view, so a screen-reader user has no usable way to read what was written.
- Play, pause, seek and end-of-replay produce no announcement; the time display changes every 100 ms silently (`replay.js:172-182,704-712,831-837`).

**Remediation**
- Never autoplay when `matchMedia('(prefers-reduced-motion: reduce)').matches` (preferably never autoplay; require Play); disable caret blink and opacity transitions under that media query.
- Distinct non-colour cue per class (e.g. `<mark>` for paste, dotted underline for AI) plus the Difference-tab legend; fix the typed/deleted colours (see E3).
- `role="region" aria-label` on the output; add a "Show final text" control rendering the end state as plain paragraphs.
- One polite live region updated only on state changes ("Replay paused at 01:23 of 04:56", "Replay finished"); never make the time display live.

**Acceptance criteria**
- [ ] With reduced motion on, nothing animates until Play is pressed and the caret does not blink
- [ ] Pasted, AI-inserted, typed and deleted text are distinguishable in greyscale
- [ ] A screen-reader user can read the final text as ordinary paragraphs
- [ ] Play/pause/seek/finish are announced once each; no chatter during playback

### A5 (MOO-52). Difference tab and PDF export: attribution by colour only, heading misuse, failing contrast
**Severity:** Major (Critical for the orange-on-white contrast). **WCAG:** 1.3.1 (A); 1.4.1 (A); 1.4.3 (AA); 1.4.10 Reflow (AA).

**Problem**
- Difference view marks attribution with `<span class="tiny_cursive_added|-inserted|-pasted_content|-ai_inserted">` styled bold + `#fff2cc` (`analytic_events.js:339-377`; `styles.css:530-547`). No `<ins>`/`<mark>` or text marker; paste and AI classes are visually identical. Legend swatches are empty coloured divs (`styles.css:564-572`).
- PDF export (`templates/export_pdf.mustache`): pasted text is `color: orange; font-weight: bold` on white, **1.98:1** (`styles.css:1478-1485,1678-1685`), lost in greyscale printing. Statistic values are `<h2>` (`:101-126`); heading levels run h2 → h6 → h5 → h3 → h2 → h4 (`:50-161`); `None` is hardcoded (`:146`). Authorship badge white on `#28a745` 3.13:1 / `gray` 3.95:1 (`:90-94`); `#007bff` 13px labels on `#f8f9fa` 3.98:1 (`:59-76`); h4 `#28a745` 3.13:1 (`:143`). Info row is four `flex:1` columns with no wrap (`styles.css:1521-1528`); `text-align: justify` on the submission box.

**Remediation**
- Emit `<mark>` (paste) / `<ins>` (AI) with a visually-hidden lang-string prefix ("pasted:", "AI:") and distinct non-colour styling in both the Difference tab and the PDF (underline/bracket markers survive greyscale).
- Descending heading outline; values as `<p class="value">`/`<strong>`; labels as `<dt>/<dd>`.
- `{{#str}}none, core{{/str}}`; darker fills per E3; `flex-wrap` on the info row; `text-align: start`.

**Acceptance criteria**
- [ ] Screen reader distinguishes typed, pasted and AI text in the Difference tab
- [ ] PDF printed in greyscale still shows attribution
- [ ] PDF heading outline is h2 → h3 → h4 with no numbers as headings
- [ ] All PDF text pairs ≥ 4.5:1 (large text ≥ 3:1)

### A6 (MOO-53). Charts have no text alternative and differentiate series by colour alone
**Severity:** Critical. **WCAG:** 1.1.1 (A); 1.4.1 (A); 2.1.1 (A); 4.1.3 (AA). Sibling of BRO-364.

**Problem**
- Effort scatter `<canvas>` (`tiny_cursive_report.php:116-119`, `scatter_chart.js:253-257`) and dashboard `<canvas id="CursvieMainChart">` (`writing_report.mustache:191`, `dashboard_chart.js:31,90-169`) have no `role="img"`, no `aria-label`, no fallback content, no data table.
- Freemium / "apply filter" / no-submission / no-payload / loading messages are painted onto the canvas with `fillText` or rAF and never exist in the DOM (`scatter_chart.js:194-203,366-390`; `dashboard_chart.js:323-376`).
- Every scatter dataset uses `pointStyle:'circle'` (`scatter_chart.js:408-413`); line series share style and differ by colour only (`dashboard_chart.js:286-316`, `common.js:50-57`).
- Per-point values exist only in hover tooltips; no keyboard access (`scatter_chart.js:415-451`).
- Legend/bucket labels `'Low effort (<0.5)'` etc. are hardcoded English (`classes/local/page/visualization.php:287-295`); dashboard labels are stored comma-joined in `localStorage` and split on `,`, so any translation with a comma shifts every label (`dashboard_chart.js:265-275`).
- `.cursive-cws-chart-container { height: 500px; overflow: hidden }` (`styles.css:102-108`).

**Remediation**
- `role="img"` + `aria-labelledby` (title + description) on each canvas; render the plotted series as a visually-hidden or toggleable `<table>` from the same data (Moodle core charts do this).
- State messages in a DOM `role="status"` element beside the canvas.
- Distinct `pointStyle` / `borderDash` per dataset; tier names in legend labels; lang strings; JSON instead of comma-join.
- `min-height`/aspect-ratio container.

**Acceptance criteria**
- [ ] Every chart has a name and an equivalent data table reachable by keyboard
- [ ] Series are distinguishable without colour
- [ ] Empty/loading/filter messages are announced and present in the DOM

### A7 (MOO-54). Learn More pane: hardcoded English and failing contrast
**Severity:** Major (i18n), Critical (contrast). **WCAG:** 1.4.3 (AA); 1.3.1 (A); 2.4.4 (A); NFR-A11Y-10/11.

**Problem**
- Every string in `templates/learn_more.mustache:31-88` is hardcoded English; `MOST POPULAR` is CSS `content` (`styles.css:2195-2207`), untranslatable, 11px white on a `#4facfe→#00f2fe` gradient (2.42:1 to 1.39:1).
- Header white h1 on the same gradient 2.42:1 / 2.05:1 (`styles.css:2160-2177`); `.tiny_cursive-card-price` `#4facfe` 13px on white 2.42:1 (`:2209-2218`).
- `<h1>` inside a modal on a page that already has one, followed by `<h3>` (`learn_more.mustache:31,43,64,83`); two new-window links with no indication and no `rel="noopener"` (`:51-53,71-72`).

**Remediation:** move copy to lang strings; render the badge as a real `<span>`; darken the gradient (e.g. `#0b5ed7→#0a58ca`) or use dark text; `<h2>`/`<h3>`; visually-hidden "(opens in a new window)" as `notice_para3` already does.

**Acceptance criteria:** all text translated; all pairs ≥ 4.5:1 (large ≥ 3:1); one h1 per page; new-window links say so.

### A8 (MOO-55). Full-page mode sidebar: pointer-only controls, hidden-but-focusable content, unlabelled timer
**Severity:** Major (Critical for the close/reopen controls). **WCAG:** 2.1.1 (A); 4.1.2 (A); 2.4.3 Focus Order (A); 1.4.1 (A); 1.4.3 (AA); NFR-A11Y-12.

**Problem (`amd/src/document_view.js`)**
- Sidebar close is a `<span class="btn">` and the reopen hamburger a `<div>`, both click-only with no role or name (`:110-125,809-812`).
- Collapsing sets `width:0` but leaves links in the DOM and Tab order (`:118-119,124`).
- The activity countdown is mirrored into the sidebar with no `role="timer"` and no keyboard-reachable hide; red `text-danger` alone marks the warning state (`:496-548`); `.tiny_cursive-status-red { color: red }` 14px on white 4.00:1 (`styles.css:2093-2095`).
- Hardcoded English: "N/A", "Overdue", "N days, N hours", "PDF Annotator", "Diary", "Page"; `toLocaleString('en-US')` (`:433,674,705,710,881-887`).
- Rubric levels colour-coded by background only (`:388-396`; `styles.css:2069-2079`); card `<h4>` containing rubric `<h3>` (`:355-368,378`); `svg_repo.js` icons lack `aria-hidden`.

**Remediation:** `<button aria-label aria-expanded aria-controls>` for both controls; toggle `hidden`/`inert` when collapsed; `role="timer"` + text cue for warning; lang strings and `userdate`-style formatting; icon or label per rubric band; fix heading order; `aria-hidden="true" focusable="false"` on icons.

**Acceptance criteria:** sidebar opens/closes by keyboard; no focus stops inside a collapsed sidebar; countdown announced as a timer and warning state has a text cue; no English literals on a non-English site.

---

## B. Controls injected into Moodle pages

### B1 (MOO-56). Injected Analytics/Replay pills: link-as-button, effort badge contrast and colour-only threshold, identical names
**Severity:** Critical (contrast) / Major. **WCAG:** 1.4.3 (AA); 1.4.1 (A); 4.1.2 (A); 1.1.1 (A); 2.4.6 Headings and Labels (AA); 1.3.1 (A). Sibling of BRO-216 / BRO-362.

**Problem**
- `amd/src/analytic_button.js:27-36` and `replay_button.js:27-36` build `<a href="#">` wrapping a `<div>` styled as a button whose only job is to open a modal. Announced as a link that does not navigate; Space does nothing.
- `icon.alt = 'Analytics Icon'` / `'Replay Icon'` (`:45`): hardcoded English and redundant, so the name reads "Analytics Icon Analytics".
- Effort badge: white 14px bold on `#28c76f` **2.21:1** (`styles.css:1770-1778`); below 90% the JS swaps the fill to `#EAB308`, white on amber **≈1.9:1** (`analytic_button.js:70-72`). The threshold is signalled by colour alone, and the badge's meaning is conveyed only by `title="Effort"` (hardcoded English).
- Every pill in a table has the identical name "Analytics NN%"; row context is not in the name.
- `analytics_student_view.js:53-54,240`: for assign, the pill is appended inside the "Online text" `<th>` (so it becomes header text for the column) and the column is located by matching the English string `'Online text'`, so it never appears on localised sites.
- Hover `transform: scale(1.05)` without reduced-motion guard (`styles.css:766-774`).

**Remediation:** `<button type="button" aria-haspopup="dialog">`; `alt=""`; dark text (`#1d2125`) on both fills; visually-hidden translated "Effort:" prefix and a non-colour cue (icon or "Low") below threshold; optional label argument so callers set `aria-label="Analytics: {student}"`; insert the assign pill in the cell/row and locate the column by class/data attribute.

**Acceptance criteria:** pills announce as buttons and activate with Space; badge text ≥ 4.5:1 in both states; low-effort state visible without colour; pills appear on a Spanish-language assign submission page.

### B2 (MOO-57). Participants page: nameless icon link, misaligned column, inconsistent with every other module
**Severity:** Major (Critical for the nameless link). **WCAG:** 3.3.2 (A) / 4.1.2 (A); 1.3.1 (A); 3.2.4 Consistent Identification (AA).

**Problem (`amd/src/append_participants_table.js`)**
- Injected link contains only `<i class="fa fa-area-chart" aria-hidden="true">` (`:57-58`): no accessible name, one per participant row.
- Header inserted after `th:eq(6)` but cells after `td:eq(5)` (`:39` vs `:59`), so the "Stats" header may not sit above its cells; injected `<th>` lacks `scope="col"`.
- Every other module uses the labelled blue "Analytics" pill that opens a modal; Participants uses a bare black icon that navigates to the writing report.
- After pagination/sort the column is re-injected on a fixed 1800 ms timer (`:65-72`).

**Remediation:** reuse `analyticButton` with a label (or visible text + `aria-label` including the participant's name); use the same index for header and cells; `scope="col"`; hook the table reload event or a `MutationObserver` instead of a timer.

### B3 (MOO-58). Assign grader reload drops focus; injection positions inside other content; silent failures
**Severity:** Major. **WCAG:** 2.4.3 (A); 1.3.1 (A); 3.3.1 Error Identification (A); 4.1.3 (AA); 1.4.4 (AA).

**Problem**
- `amd/src/show_url_in_submission_grade.js:76-89`: a `MutationObserver` calls `window.location.reload()` whenever the grader URL changes, so every Next/Previous user action does a full reload and drops focus to the top of the document. `:111-117` + `styles.css:657-662` force `height:100px !important` on the grade-actions panel.
- `amd/src/remove_submission.js:32-47`: the confirm form's submit is intercepted; on AJAX failure only `console.error` runs, so "Remove submission" appears to do nothing.
- Injection inside other content: forum pill prepended inside `#post-content-{id}` before the first word (`append_fourm_post.js:88-99`); lesson pill inside `#fitem_id_response_editor .felement` between label and editor (`append_lesson_grade_table.js:130-132`); quiz pill appended inside `.qtext` (`show_url_in_quiz_detail.js:119`); lesson `<th>` without `scope` (`:68`); `append_submissions_table.js:82-84` adds a fake `fa-minus` collapse icon and skips the `<td>` on AJAX failure (`:94-135`); `user_report_addition.js:36-45` uses `<label>` without `for` as static text and silently calls `history.back()` (`:28-30,50`).

**Remediation:** re-run `appendSubmissionDetail` for the new user instead of reloading; `min-height`; on `.fail` either submit the original form or render a translated error in a live region; move pills into action/footer regions or before the form item; always insert the cell; replace the labels with `<dt>/<dd>`; show a message instead of navigating back.

---

## C. Report pages

### C1 (MOO-59). Writing report filters and download controls are unlabelled or behave unexpectedly
**Severity:** Critical. **WCAG:** 3.3.2 (A); 3.2.2 On Input (A); 4.1.2 (A); 2.1.1 (A); 2.4.4 (A).

**Problem**
- Course filter `<label>` has no `for` and the select has no `aria-label` (`templates/writing_report.mustache:164-166`, `renderer.php:225-229`). `module_list.mustache:38` and `user_list.mustache:35` render bare `<select>`s with no `id`, `name` or label; `cursive_writing_reports.js:290-320` injects them **inside** the existing `<select id="id_moduleid">` (nested select) and targets `#id_username`, which does not exist (field is `id_userid`), so the user filter never refreshes after a course change.
- Course select navigates on `onchange` (`renderer.php:225-229`) with no Go button; arrow-key browsing in Chrome fires navigation on every keystroke.
- Download control is `<a href role="button">` with `aria-describedby` set to the literal string "Download attempt JSON" (invalid IDREF) (`renderer.php:127-129,308-310`); anchors do not activate on Space.
- Download-type `<select id="download-type">` inside the modal has no label; modal button text `'OK'` is hardcoded (`cursive_writing_reports.js:137-139,182-192`).
- `locallib.php:399-407`: CSV link opens in a new tab with no warning, carries `role="button"`, and the icon alt duplicates the link text. `key_logger.js:37-47` opens hand-rolled modals with jQuery `.show()` (no focus move, no Escape, no dialog role) and hides the filter form's button group (`:53`).

**Remediation:** `<label for>` on every select; templates render only `<option>`s and target `#id_userid`; add a Go/submit button (or only navigate on keyboard confirmation); real `<button>` for download with the URL in `data-*`; `<label for="download-type">`; `get_string('ok')`; drop `target="_blank"` and `role="button"` on the CSV link; replace hand-rolled modals with `core/modal`.

**Acceptance criteria:** every filter and the download-type select announce a label; changing course by keyboard does not navigate until confirmed; user filter repopulates after course change; download controls are buttons activatable with Space.

### C2 (MOO-60). Report pages: titles, heading structure, dates, table semantics, contrast
**Severity:** Major. **WCAG:** 2.4.2 Page Titled (A); 1.3.1 (A); 1.4.3 (AA); 4.1.2 (A); NFR-A11Y-10.

**Problem**
- `writing_report.php:87`, `my_writing_report.php:96`, `tiny_cursive_report.php:99,101` all set the same title "Authorship and Analytics"; the per-user pages call no `set_heading()`.
- `tiny_cursive_report.php:123,134,159`: "Filters", "Analytics Chart", "Writing statistics" are `<span>`s styled as headings.
- `writing_report.mustache:81,93,105,117`: statistic values are `<h3>`; heading order h2 → h4 → h3 (`:50,183,199`); `{{avg_spd}} WPM` hardcodes the unit (also `analytics_modal:233`, `analytics_table:132`, `export_pdf:114`) although `$string['wpm']` exists; inline `color:#f57c00` on the 28px total is 2.70:1 (`:117`); Show/Hide Chart button has no `aria-expanded`/`aria-controls` (`:170-173`); tables lack `<caption>` and `scope="col"` (`:202-209`; `writing_activity_report.mustache:42-52`).
- `renderer.php:107,286,337` formats dates with PHP `date()` (English, server timezone) instead of `userdate()`; `pix_icon('download','download')` hardcoded lowercase alt (`:66-71,171-176`); dead `analytics icon` pix (`:167-169`); the Analytics cell is a plain `<div>` until a per-row AJAX call replaces it, with no fallback on failure (`:108-116,287-298`; `cursive_writing_reports.js:123-125`).
- `pdfexport.js:66-76`: status shown for 4 s then `history.back()` fires automatically; `#loadermessage` has no `role="status"` (`classes/local/page/pdfexport.php:137`).
- `writing_report.mustache` mixes Bootstrap 4 and 5 utilities; avatar fallback gradient 2.65:1 (`styles.css:46-58`).

**Remediation:** distinct titles ("Writing statistics: {fullname}, {course}"); `$OUTPUT->heading(..., 2)` for sections; values as `<p class="h3">`; `{{#str}}wpm{{/str}}`; `userdate()`; `aria-expanded`; captions and scope; server-render a disabled button and enable on success; replace auto-back with a "Back to report" link; `role="status"` on the loader.

---

## D. Editor-side (ATAG Part A applies)

### D1 (MOO-61). Autosave indicator: unnamed button, silent state changes, colour-only state, placed inside TinyMCE's menubar
**Severity:** Critical. **WCAG:** 4.1.2 (A); 3.3.2 (A); 4.1.3 (AA); 1.4.1 (A); 1.1.1 (A); 1.4.13 Content on Hover or Focus (AA); 1.4.3 (AA). **ATAG:** A.3.1.

**Problem**
- The indicator is hand-injected DOM, not an `editor.ui.registry` button. `cursive_autosave.js:105-134` creates a `<button>` with an empty text span and empty icon span: no accessible name. After a save it is named "saving"/"saved" and `:180-182` blanks the text 5 s later.
- State text is written with `textContent` into a plain span with no `role="status"` (`:170-171,180-182`), so "saved"/"offline" are never announced.
- "saving" and "saved" share the same `cloudSave` icon; connected vs no-API-key is conveyed by `iconUrl` vs `iconGrayUrl` only (`autosaver.js:799`). The Cursive `<img>` has no `alt` (`autosaver.js:798-801`).
- The "Cursive is active: your drafting and editing are now being captured" disclosure is a custom tooltip on `mouseenter` of a non-focusable span, `display:none` otherwise, not Escape-dismissable (`autosaver.js:814-821,941-967`; `common.js:33-47`). With notice gating off this is the only in-editor disclosure of capture.
- The button and image are appended inside TinyMCE's `div[role="menubar"]` (`autosaver.js:914`), whose owned elements must be `menuitem`s; TinyMCE's arrow-key menubar navigation does not include them. Verify live that Tab still reaches it.
- Toggles the Saved Content popover with no `aria-expanded`/`aria-controls` (`cursive_autosave.js:79,225-234`).
- State text `color: gray` at 12px on white 3.95:1 (`:111-113`; `styles.css:1924-1928`).
- Strings cached in `localStorage['state']` once and never invalidated (`:454-463,472-474`): shows the previously cached language after a language switch; `getText` returns `null` on first run and the destructuring at `:193` throws.
- Duplicate ids `#tiny_cursive_savingState`/`#savedDropdown` when a non-quiz page has two editors (`:60-61,73-75,425`). Inline `margin-left` on the wrapper (`autosaver.js:863-870`).

**Remediation:** stable `aria-label` ("Saved content") + `aria-expanded`/`aria-controls`; a persistent `<span role="status">` for save state, keeping "offline" until reconnected; distinct icons and a text alternative for connected state; `alt` on the image; `aria-describedby` for the disclosure, shown on focus and Escape-dismissable (or TinyMCE's native tooltip); move the indicator out of `role="menubar"` (sibling container or statusbar) or register it via `editor.ui.registry`; `#6c757d` or darker; drop the localStorage cache; suffix ids with `editor.id`.

**Acceptance criteria:** indicator has a name at all times; "Saving", "Saved", "Offline" are announced; state is distinguishable without colour; disclosure reachable by keyboard; no element with a non-menuitem role inside the menubar; strings follow the user's current language.

### D2 (MOO-62). Saved Content panel: focus management, missing role, hardcoded relative times
**Severity:** Major (Critical for focus loss). **WCAG:** 2.4.3 (A); 4.1.2 (A); 1.3.1 (A); 1.4.3 (AA); NFR-A11Y-10.

**Problem (`amd/src/cursive_autosave.js`, `templates/saved_content.mustache`)**
- Opening (`:283-297`) does not move focus into the panel; closing via Escape, close button, outside click or item selection removes it from the DOM without restoring focus (`:305-316`), landing on `<body>`; after inserting a draft (`:488-492`) focus is not returned to the editor.
- The panel is a bare `<div>` appended to `document.body` with no role or `aria-labelledby` (`:421-432`); the title "Saved Content" is a `<div>` (`saved_content.mustache:38-40`); items are not grouped in a list.
- "just now", "5 min ago", "2 hours ago" are hardcoded English with English pluralisation and no absolute time (`:372-409`).
- No empty-state text when the service returns no drafts (`:246-254`).
- Timestamp `color: gray !important` at 12px 3.95:1 (`styles.css:1924-1929`); decorative clock SVG not `aria-hidden`; items have `overflow-y: auto` inside a `<button>` (`styles.css:1931-1948`); no `:focus-visible` on items or close; panel slide transition has no reduced-motion guard (`styles.css:1846`).

**Remediation:** focus the heading (`tabindex="-1"`) or first item on open, store the trigger and `.focus()` it on close, `editor.focus()` after insertion; `role="dialog"` (non-modal) + `aria-labelledby` on an `<h2 class="h6">`; `<ul><li>` wrapping; server-side `userdate()`/`format_time()` or `core/str` plurals with `<time datetime>`; empty-state string; `#6c757d`; `aria-hidden` on the SVG; line-clamp instead of scrolling buttons; explicit focus ring.

### D3 (MOO-63). Cite-source modal and paste controls: unlabelled field, destructive validation, Redo hijack, silent undo
**Severity:** Critical. **WCAG:** 3.3.2 (A); 3.3.1 (A); 3.3.3 (AA); 2.1.1 (A); 3.2.2 (A); 4.1.3 (AA); 1.4.12 Text Spacing (AA).

**Problem (`amd/src/autosaver.js`)**
- The cite-source `<textarea id="inputUrl">` has only a placeholder (`:162`); the instruction is in the modal title div (`:160-161`), not a `<label>`. `.tiny-cursive-title-text { line-height: 0.5 }` (`styles.css:664-668`) makes wrapped title lines overlap and fights the text-spacing test.
- Submitting with an empty comment undoes the paste, fires a native `alert()`, destroys the modal (`:174-177,210`) and still posts the empty comment (`:199-207`): the user loses the paste and gets no inline error.
- Every TinyMCE Redo opens the cite-source modal whenever intervention is on, regardless of whether the redone action was a paste, and cancelling then runs Undo (`:353-358,212-220`), so keyboard redo is hijacked and reverted.
- In block mode, pastes arriving through `mceInsertContent` (context menu, some mobile and AT paths) are silently undone with no message (`:440-454,458-471`), unlike the `Paste`-event path which shows the `paste_blocked` alert (`:321-328`).
- In TinyMCE fullscreen the modal's close button is hidden by `body.tox-fullscreen .tiny-cursive-modal .modal-dialog .close { display: none }` (`styles.css:804-806`) and the dialog is capped at `max-height: 300px` with no overflow (`:793-797`).

**Remediation:** `<label for="inputUrl">` from `tiny_cursive_srcurl`, placeholder as hint only, description via `aria-describedby`; keep the modal open on empty submit with an inline error (`aria-invalid`, `aria-describedby`) and never post empty; only open the modal when the redone undo level is the pending paste; show the same `paste_blocked` message on the execCommand path; do not hide the close button in fullscreen, reposition it; remove `line-height: 0.5` and the `max-height`.

**Acceptance criteria:** the comment field announces its label; an empty submit keeps the paste and shows an inline error; Ctrl+Y after ordinary typing redoes without a dialog; a blocked paste always produces a text message; the modal is fully usable in fullscreen at 200% zoom.

### D4 (MOO-64). Notice gate follow-ups
**Severity:** Minor (one Major). **WCAG:** 2.1.1 (A); 2.4.3 (A); 1.3.1 (A); ATAG A.3.1 / A.4.2.

The gate itself is well built (landmark + heading, real button, error region present before injection, focus moves to the editor on success and back to the button on failure, server-side persistence). Remaining items:
- **Major:** if `renderGate` or the template fails, the editor stays hidden and read-only with only `console.error` (`plugin.js:91-95`, `notice_gate.js:106-111`). Release the editor or render a text error with instructions.
- `button.disabled = true` during the AJAX call (`notice_gate.js:157`) drops focus to `<body>` in Chromium; use `aria-disabled` plus a `role="status"` "Recording your acknowledgement" message.
- Heading levels are hardcoded `<h3>`/`<h4>` (`notice_gate.mustache:39,45`); pass the level from the host context.
- The read-only existing-text box (`:46`, `styles.css:2430-2433`) is `overflow:auto` with no `tabindex="0"` or label, so Safari keyboard users cannot scroll it.
- The student-facing gate does not tell a non-consenting user how to switch editors, although the admin help text (`lang/en/tiny_cursive.php:179`) relies on that path. MOO-30 §4 specified a link to editor preferences; confirm it shipped. Policy aspect: see E6.

### D5 (MOO-65). Admin settings page: anchors as buttons, unannounced and auto-clearing results
**Severity:** Major. **WCAG:** 4.1.2 (A); 2.4.3 (A); 4.1.3 (AA); 2.2.1 Timing Adjustable (A); 3.3.1 (A); 2.4.6 (AA); NFR-A11Y-10.

**Problem**
- "Test token", "Generate", "Disable", "Enable" are `<a href="#">` (`settings.php:80-81,142-143,164-167`); `token_approve.js` does not `preventDefault()`, so activation also jumps the page to the top, away from the result.
- Results are injected as brand-new `<span role="alert">` elements via `.html()` (`token_approve.js:49-58,85-107,131-154,177-199`), so the live region does not exist before content is added; success uses `alert` rather than `status`.
- Success and error messages are wiped after 3000 ms with no control (`:90-92,105-107,137-139,152-154,183-185,197-199`).
- "Connected" is hardcoded English (`:48-51`); error output concatenates the raw `textStatus.error` object (`:299,346,391`).
- `settings_collapse.js:107-118`: every section toggle is named just "Collapse"/"Expand" and is appended inside the `<h3>`, so the heading reads "Section title Collapse". HubSpot link opens a new tab unannounced (`settings.php:51-53`).

**Remediation:** `<button type="button">`; persistent `role="status"` (errors `role="alert"`) containers in `settings.php`, updated with `textContent`; do not auto-clear; lang string for "Connected"; translated message only, raw error to console; `aria-labelledby` on toggles referencing the heading and place them after it; new-window text on the external link.

---

## E. Cross-cutting

### E1 (MOO-66). Respect `prefers-reduced-motion` across the plugin
**Severity:** Major. **Requirement:** NFR-A11Y-03 additional (reduced motion); WCAG 2.2.2 (A), 2.3.3 (AAA). Sibling of BRO-213.

`styles.css` contains **zero** `prefers-reduced-motion` queries. Five infinite keyframe animations (loader spin `:588-595`, skeleton shimmer `:892-899`, cursor blink `:1232-1247`, notification pulse-dot `:1812-1830`, unused `pulse` `:1109-1121`) and roughly 25 transform/transition hover effects (`:61,106,220,751,766-774,782-785,1093-1101,1255,1270-1290,1846,1941,2117,2180-2187` and others) run regardless of OS preference; replay autoplays (A4).

**Remediation:** one `@media (prefers-reduced-motion: reduce)` block disabling the animations and transitions; `matchMedia` check before autoplay in replay.js; prefer opacity over transform for hover.

**Acceptance criteria:** with the OS preference set, no element animates or moves on hover anywhere in the plugin; replay waits for Play.

### E2 (MOO-67). i18n: remaining hardcoded English strings and locale-dependent selectors
**Severity:** Major. **Requirement:** NFR-A11Y-10/11 (translated programmatic strings); WCAG 3.1.2 by implication.

Items not owned by another ticket above:
- `lib.php:196` form section header `'Cursive'` literal.
- `append_pdfannotator.js:139` column header `'Analytics'` literal; `:82` edit detection compares the button value to the English word `'Save'`.
- `settings.js:39` selects the forum reply link by `title="Reply"`.
- `analytics_student_view.js:240` matches `'Online text'` (also in B1).
- `cursive_writing_reports.js:173`, `pdfexport.js:40` borrow `message` from `tool_dataprivacy`.
- `lang/en/tiny_cursive.php`: `expand`/`expandshow` keys inverted relative to meaning; `download`/`analytics` reused as per-row names with no `{$a}` variant; `freemium` all-caps in source; typos `uneditd`, `thresold_description`, trailing space in `authorship`; bare lowercase `offline`/`saved`/`saving` give no guidance ("Offline. Changes will be saved when you reconnect.").
- Missing strings to add: notifications, nocomments, mostpopular, learnmore_*, chart alt/title, effort prefix, replay control labels, relative-time plurals.

**Acceptance criteria:** `grep` for English literals in `amd/src`, `templates`, `classes` and `styles.css` `content:` finds none; behaviour that keys off visible text is replaced by ids/data attributes; switching the site to `es` shows no English in any Cursive surface.

### E3 (MOO-68). Contrast sweep of the shared palette (confirm live, then fix)
**Severity:** Critical (several pairs), Major. **WCAG:** 1.4.3 Contrast (Minimum) (AA); 1.4.11 Non-text Contrast (AA). Sibling of BRO-211 / BRO-357.

Computed from source hex; all need confirmation from computed styles on the live site before closing.

| Where | Pair | Ratio | Needs |
|---|---|---|---|
| Effort badge (`styles.css:1770`, `analytic_button.js:70`) | white on `#28c76f` / `#EAB308` | 2.21 / ≈1.9 | 4.5 |
| Learn More header/price/badge (`styles.css:2160-2218`) | white on `#4facfe→#00f2fe`; `#4facfe` on white | 1.39 to 2.42 | 4.5 (3 large) |
| PDF pasted text (`styles.css:1478,1678`) | `orange` on white | 1.98 | 4.5 |
| PDF labels/h4/badge (`styles.css:1530,1576,1652`) | `#007bff` 13px on `#f8f9fa`; white on `#28a745`; `#28a745` h4 | 3.98 / 3.13 / 3.13 | 4.5 |
| Tab labels (`styles.css:237-250`) | `gray` on `#f3f3f3` | 3.56 | 4.5 |
| Metric descriptions, title description (`styles.css:361-368,670-677`) | `gray` 14px on white | 3.95 | 4.5 |
| Autosave state text, saved timestamps (`cursive_autosave.js:113`, `styles.css:1924`) | `gray` 12px on white | 3.95 | 4.5 |
| Paste-event timestamp (`styles.css:1073-1081`) | `#6c757d` 13px on `#e9ecef` | 3.95 | 4.5 |
| Active speed button, counter, paste toggle (`styles.css:1007,1023,1293,1321`) | white on `#4285f4`; `#4285f4` on white/`#f8f9fa` | 3.56 / 3.3 | 4.5 |
| Replay typed chars (`styles.css:1214`) | `#34a853` on white | 3.06 | 4.5 |
| Replay deleted chars (`styles.css:1220`) | `#ea4335` @ 0.5 opacity on white | ≈2.0 | 4.5 |
| AI-suggested highlighted / triple-combination chars (`styles.css:851-863`) | `#388e3c` on `#e8f5e8`; `#f57c00` on `#fff3e0` | 3.66 / 2.47 | 4.5 |
| Report total (`writing_report.mustache:117`) | `#f57c00` 28px bold on white | 2.70 | 3 |
| Full-page status red (`styles.css:2093`) | `red` 14px on white | 4.00 | 4.5 |
| Comment toggle icon (`styles.css:1083-1106`) | white icon on `#ffc107` | 1.63 | 3 (non-text) |
| Avatar fallback initials (`styles.css:46-58`) | white on `#42a5f5→#9c27b0` | 2.65 at light end | 3 large |

Passing pairs for reference: `#306ab3` on white 5.47; `#6c757d` on white 4.69; `#7b1fa2` 8.2; close × on `#ff3737` 3.59 (24px bold, large).

**Remediation:** define a small token set in `styles.css` (text-muted `#595959`/`#6c757d`, link/action `#0b57d0`, success `#146c2e`, warning text `#8a4b00`, danger `#c5221f`) and replace the literals; dark text on the amber/green badges.

### E4 (MOO-69). Remove dead CSS that would fail if revived
**Severity:** Minor. **WCAG:** 2.4.7 (AA); 2.1.1 (A); 1.4.10 (AA).

- `styles.css:375-512` chatbox block: `outline: 0` with no replacement (`:448`); no markup uses `tiny_cursive-chatbox*`.
- `styles.css:1427-1476` scatter toggle: `input[type="checkbox"] { display: none }` leaves a mouse-only label control; `height: 44px; white-space: nowrap; overflow: hidden` clips under text spacing; no markup uses `tiny_cursive_scatter`.
- `styles.css:679-687` `.tiny_cursive-content { width: 400px }`; `:2152` negative hardcoded margins; physical properties throughout (`:36,266-268,412,...`) are flipped by Moodle's RTLCSS pass, so only inline template styles (`analytics_modal.mustache:147,176,199,225,248,274` `border-left`) are a real RTL exposure.
- `amd/src/input_mutation_detector.js` is never instantiated (`autosaver.js:589-594` only disconnects a non-existent instance).

### E5 (MOO-70). Verification: live measured pass, AT matrix and axe-core in CI
**Severity:** Process (NFR-A11Y-03a, -04, -09). Sibling of BRO-369.

- Run the live measured pass this audit could not: computed-style contrast for every pair in E3, focus-ring visibility on the modal tabs and replay controls, Tab reachability of the autosave indicator inside TinyMCE's menubar, 320px reflow of the replay control bar and PDF info row, 200% zoom of the cite-source modal in fullscreen.
- Human AT matrix for the two new-component-grade surfaces (analytics modal with replay; autosave indicator + Saved Content panel): JAWS/Edge, NVDA/Chrome, VoiceOver/Safari, plus a keyboard-only pass. Record pass/fail per combination and the parity verdict.
- Add a Behat `@javascript` scenario per surface that runs axe-core (`wcag2a`, `wcag2aa`, `wcag22aa`, `best-practice`) against: assign submission editor (indicator open), analytics modal on each tab, writing report, course report, PDF export, settings page. Gate `moodle-plugin-ci` on zero violations; waivers per NFR-A11Y-05.
- Add the Blackboard AX CLAUDE.md anchor to this repo so future UI PRs run the stage questions.

### E6 (MOO-71). Policy decision: dictation and assistive-technology users vs paste controls and analytics heuristics
**Severity:** Specialist / product decision (escalation matrix: AX specialist). Related to BRO-177 (voice to text), BRO-368.

- Speech input that reaches the editor as `input`/`insertText` events (Windows Voice Typing, macOS Dictation, Gboard, most word-prediction tools) is recorded as per-character keystrokes (`autosaver.js:526-551`) and is not treated as paste. But AT that transfers text via the clipboard (Dragon Dictation Box, several AAC and switch-access apps, screen-reader "paste from clipboard" workflows) is blocked outright in block mode or forced through the cite-source modal and logged as a paste.
- Shipped guidance strings will systematically flag these users: `lang/en/tiny_cursive.php:405` (">80 WPM suggests copying"), `:55` ("perfect first drafts with almost no edits"), `:119` (effort below 100% = pasted). MOO-44 already notes inserted text counts as verified effort.
- Screen-reader navigation keystrokes inflate "Edits" counts (`autosaver.js:248-251` filters most but not modifier-heavy usage).

**Decide:** whether the existing `tiny/cursive:bypasspastecontrols` capability via a role override is the accommodation mechanism and must be documented for institutions; whether reports should show an "alternative input / accommodation" marker so teachers do not misread the metrics; whether the guidance strings need an accommodation caveat; and whether the gate (D4) must name the editor-preferences route. Frame for the specialist: question, what is blocked, provisional approach (capability override + report marker + string caveat).

---

## Not proposed (already tracked or out of scope)
- Unescaped keystroke data in `replay.js` `innerHTML` (`:2276-2323`): **MOO-20**.
- Quiz review analytics button missing when the teacher cannot edit the question: **MOO-42**.
- Inserted text counted as verified effort: **MOO-44** (E6 cross-references it).
- Notice gate skipped in PDF Annotator: **MOO-47**.
