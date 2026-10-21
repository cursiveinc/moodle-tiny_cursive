# QA checklist: accessibility batch 1 (branch `fix/a11y-batch1`, commits 54f5443 + 85df743)

Dev site: http://127.0.0.1:8000 (caches already purged). Tickets: MOO-48 (partial), MOO-56, MOO-57, MOO-65, MOO-66, MOO-68, MOO-69.

Keyboard notation: Tab = move focus, Space/Enter = activate. Screen reader optional (NVDA + Chrome is the quickest).

## Admin (MOO-65)
Site administration → Plugins → Text editors → TinyMCE → Cursive.
- [ ] "Test token", "Generate", "Disable", "Enable" render as buttons (blue; Generate as a link-styled button).
- [ ] Tab reaches each one; Space activates it; the page does **not** jump to the top.
- [ ] Test token with the saved key shows "Connected" (or the server's error text) next to the button, and the text **stays** (no 3-second auto-clear). Clicking again clears then re-shows.
- [ ] Disable then Enable show their success text under the buttons; each click replaces the previous message.
- [ ] Each section heading now has a small "Collapse"/"Expand" button directly after it (not inside the heading text). It still remembers state across reload.
- [ ] Newsletter link in the intro paragraph: screen reader reads "(Opens in new window)" after the link text; nothing visible changed.

## Teacher (MOO-56, MOO-57, MOO-48, MOO-68, MOO-66)
Course 2 (or course 50 on bs44mdl) as a teacher.

Participants page (MOO-57)
- [ ] "Stats" column header sits above its cells on every row.
- [ ] Each cell shows a chart icon plus the word "Stats" as a link; screen reader name is "Writing statistics for <student name>".
- [ ] Change page / sort by a column: the column comes back without a visible delay or duplicate columns.
- [ ] Link opens the student's writing report.

Analytics pills on assign grading, forum post, quiz review, lesson, workshop, diary (MOO-56)
- [ ] Pills look the same as before (blue "Analytics" / "Replay" with icon; green or amber effort badge).
- [ ] Badge text is now dark, not white; below 90% it shows a small ⚠ icon before the percentage on the amber fill.
- [ ] Tab reaches a pill; **Space** opens the modal (previously only Enter/click worked); focus ring is visible.
- [ ] Screen reader: "Analytics, button, has popup dialog" plus "Effort: 95%" (and ", Low effort" below 90%). No "Analytics Icon Analytics".
- [ ] Assign submission page (student view on, as student or in grader "View submission"): the pill sits inside the Online text cell, not in the row label column.

Analytics modal (MOO-48 partial, MOO-68)
- [ ] Opening the modal, screen reader announces "Analytics, dialog".
- [ ] Tab reaches the red × close button; Enter and Space close the modal; Escape still closes.
- [ ] Tab labels (Metrics / Difference / Replay / Learn more) are dark grey (#595959) instead of light grey; tabbing to one shows a blue focus ring (shadow-none removed).
- [ ] Metric descriptions under each value are darker grey; still readable, layout unchanged.
- [ ] Guidance tip boxes (Show guidance toggle on) still have the grey fill and the blue left bar (now via class, slightly darker blue).

Replay tab (MOO-66, MOO-68)
- [ ] Replay still autoplays with OS reduced-motion **off**.
- [ ] Windows: Settings → Accessibility → Visual effects → Animation effects **off** (macOS: Reduce motion). Reload, open Replay: nothing plays until you press Play; the caret does not blink; hovering pills/cards no longer scales or lifts them.
- [ ] Typed characters are dark green, deleted characters are dark red strike-through at full opacity (no longer faded), speed buttons/active state and paste counter are a darker blue.
- [ ] Paste events panel: comment toggle on the amber circle is now a dark icon.

Difference tab / PDF export (MOO-68)
- [ ] Analytics PDF: pasted text and legend swatch are dark orange-brown (#8a4b00) instead of light orange; section headings dark blue; "Verified" badge dark green; still legible when printed greyscale.
- [ ] Course writing report (Reports → Cursive): total-submissions number is dark orange-brown; profile avatar fallback gradient is darker blue→purple with white initials.

Learn More pane (no API key only, MOO-68)
- [ ] Header and "MOST POPULAR" badge gradient is dark blue; white text readable; price text darker blue.

## Student (MOO-66, MOO-68)
- [ ] Editor autosave indicator text ("saving"/"saved") is darker grey (#595959); otherwise unchanged.
- [ ] Saved Content dropdown timestamps darker grey.
- [ ] Full-page mode sidebar: red status text is a slightly darker red.
- [ ] With reduced motion on, the Saved Content panel appears without sliding.

## Regression sweep
- [ ] Browser console shows no errors on: settings page, participants, assign grading, quiz review, forum discussion, writing report.
- [ ] Nothing references the removed `input_mutation_detector` module (no 404 for it in the Network tab).

## Not in this batch (still open in Linear)
- MOO-48: tab list semantics, arrow keys, Learn More as a tab, selector scoping.
- MOO-56: callers passing a per-row label; locating the assign column without the English "Online text".
- MOO-68: live computed-style measurement + axe-core run (MOO-70).
- MOO-69: negative margins on the Learn More container (defer to MOO-54).

## Verified by Claude in the built-in browser, 2026-10-19 (admin session, Chromium, OS reduced motion on)
- Admin: Test token via Space → "Connected", no scroll jump, still shown after 8 s; section toggles named "Collapse, <heading>"; newsletter link reads "(Opens in new window)". Generate / Disable / Enable not pressed (they change site state), markup checked only.
- Participants: Stats header at index 7 with scope=col, 20/20 rows on page 1 and 4/4 real rows on page 2 get a named link; column survives sort and page change. (Two bugs found and fixed: th/td counting, default export of the core events module.)
- Assign grading: 10 pills are buttons with aria-haspopup=dialog, alt="" icon, dark badge text; Space opens the modal; low-effort probe badge shows amber + icon + "Low effort". No caller passes a per-row label yet (expected).
- Modal: role=dialog named "Analytics"; × is a labelled button, Space closes it and focus returns to the pill; tabs #595959 with blue focus ring; guidance boxes styled by class.
- Replay (reduced motion): loader cleared, Play icon shown, nothing plays until Play; caret does not blink; typed #146c2e, deleted #c5221f at opacity 1; pill hover transition none. (Bug found and fixed: vendor pseudo-element selector list voided the whole rule.)
- axe-core 4.10 (wcag2a/2aa/22aa): 0 violations on the grading page, participants table and plugin settings (one core Boost link-in-text-block in the notice description); modal shows only the 3 replay-control issues tracked in MOO-50.
- Not covered by this pass: PDF export print, course writing report, Learn More pane (no-key site), student editor surfaces, screen-reader announcements.
