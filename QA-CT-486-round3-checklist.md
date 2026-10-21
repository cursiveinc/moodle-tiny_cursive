# QA checklist: CT-486/Security-updates @ `8a49869` (round 3)

Tickets: MOO-33, MOO-35, MOO-39, MOO-43, plus MOO-41 (also touched by this branch).
Build under test: `tiny_cursive` 3.1.0 / **2026100601**.

| Site | URL | Use it for |
|---|---|---|
| Local | http://127.0.0.1:8000 (course 2) | MOO-33, MOO-35, MOO-41. No PDF Annotator installed. |
| Live test | http://bs44mdl.cursivetechnology.com (course 50) | MOO-43 and MOO-39 (needs PDF Annotator), plus a repeat of the others in real sessions. |

Local users: student45 (attacker), student41 (victim), student26 (teacher), admin.
Live users: student40, student44, bbteacher, admin.

## Already verified automatically on local (2026-10-06)

- PHPUnit plugin suite: 77/77 pass.
- MOO-33: student deleting another user is refused, rows untouched. Own delete removes the file, metrics, and **all** `assign` and `assign_autosave` comments; another assignment's drafts and the classmate's rows are untouched. Teacher delete works.
- MOO-35: student reading another user's forum post and diary entry gets no comments, filename or metrics; owner and teacher get everything.
- MOO-39: the service refuses any non PDF Annotator module (the cross-user branch cannot be reached locally).
- MOO-41: assign stats, lesson data and quiz comment link refuse a student asking for another user; owner and teacher allowed. Token generation refused for teacher and student.

The steps below are what still needs a person in a browser.

Console helper (paste once per page, used in the "exploit" steps):

```js
const ws = (methodname, args) => fetch('/lib/ajax/service.php?sesskey=' + M.cfg.sesskey, {
  method: 'POST', headers: {'Content-Type': 'application/json'},
  body: JSON.stringify([{index: 0, methodname, args}])
}).then(r => r.json()).then(r => console.log(JSON.stringify(r[0])));
```

---

## 0. Setup

- [ ] 0.1 **Local**: Site administration > Plugins > Plugins overview shows Cursive version 2026100601. (Done by Claude; confirm visually.)
- [ ] 0.2 **Live**: same page shows 2026100601. If it still shows 2026092402 the branch has not been deployed, and sections 3 and 5 cannot be run yet.
- [ ] 0.3 Expect the data transparency notice the first time each student opens an editor (on by default since MOO-45). Acknowledge it and carry on.

## 1. MOO-33: removing a submission also removes drafts (Local, then Live)

Student self-removal:

- [ ] 1.1 Log in as **student45**. Open an assignment in course 2, **Add submission**.
- [ ] 1.2 Type two or three sentences, pause about 10 seconds between them so autosave fires. Open the Cursive **Saved Content** panel in the editor: at least one draft is listed.
- [ ] 1.3 **Save changes**. Submission status page shows the text.
- [ ] 1.4 Click **Remove submission** > **Continue**.
- [ ] 1.5 Click **Add submission** again. Editor is empty and the **Saved Content** panel lists **no** drafts for this assignment. (Before the fix, the old drafts were still here.)
- [ ] 1.6 Tell Claude the assignment name; Claude confirms in the database that no `tiny_cursive_files` or `tiny_cursive_comments` rows remain for that user and assignment.

Other people's data is safe:

- [ ] 1.7 Still as student45, in the console (replace `CMID` with the assignment id from the URL, `9` is student41):
  `ws('tiny_cursive_remove_submission', {courseid: 2, userid: 9, cmid: CMID})`
  Expected: `"error":true` with `nopermissions`.
- [ ] 1.8 Log in as **student26** (teacher). Open the course Writing report: student41's entry for that assignment is still there.

Admin removal (teachers cannot remove others' submissions in stock Moodle):

- [ ] 1.9 As **student41**, type and save a submission in the same assignment (leave at least one autosave draft).
- [ ] 1.10 As **admin**, assignment > Submissions > student41 row > **Remove submission** > Continue.
- [ ] 1.11 As student41, **Add submission**: Saved Content panel is empty.

Known gap to decide on (found by Claude, not fixed on the branch):

- [ ] 1.12 If a student has autosave drafts but no capture file for the assignment, removal returns `false` and the drafts stay. Decide: fix now, or accept and note on the ticket.

## 2. MOO-35: forum / diary analytics are private to the author (Local, then Live)

- [ ] 2.1 As **student41**, post a reply in a course 2 forum (type it, do not paste). Note the post id from the permalink (`#p123`).
- [ ] 2.2 As **student45**, open the same discussion. You see an **Analytics** button on your own posts only, none on student41's post.
- [ ] 2.3 As student45, console (replace `POSTID`, and `CMID` with the forum id from the URL):
  `ws('tiny_cursive_get_forum_comment_link', {id: POSTID, modulename: 'forum', cmid: CMID})`
  Expected: `"error":false` and data with no `filename`, no `score`, and `"usercomment":"comments"`.
- [ ] 2.4 As **student26** (teacher), same discussion: Analytics button on every student post; opening student41's shows metrics and replay.
- [ ] 2.5 Repeat 2.2 to 2.4 on the **Diary** activity (teacher view is the diary report page).
- [ ] 2.6 **Live only**: repeat 2.2 to 2.4 on the **Workshop** (course 50, cmid 436). There is no workshop data locally.

## 3. MOO-43 and MOO-39: PDF Annotator linking (Live only, cmid 443)

Student view **Off** (the case that was broken):

- [ ] 3.1 As **bbteacher** or admin, confirm Cursive "student view" is **Off** for the PDF Annotation activity.
- [ ] 3.2 As **student40**, open the PDF Annotation. Open dev tools > Network, filter `service.php`.
- [ ] 3.3 Drop a pin, **type** a question of 20+ words in the editor (Cursive indicator active), click **Create Annotation**.
- [ ] 3.4 Network shows a call to `tiny_cursive_update_pdf_annote_id` returning `"error":false,"data":true`. (Before the fix there was no such call.)
- [ ] 3.5 Without reloading, create a **second** annotation on another spot with different text. A second `tiny_cursive_update_pdf_annote_id` call appears with a different `resourceid`.
- [ ] 3.6 Add an **answer** to an existing question (a comment rather than a new pin). Another link call appears with that comment's id.
- [ ] 3.7 **Edit** your first question and save. No new link call is fired (edits must not re-link).
- [ ] 3.8 The student sees **no** Analytics buttons (student view is Off).
- [ ] 3.9 Wait about 5 minutes for cron. As **bbteacher**: PDF Annotation > Overview. Each of student40's new entries has an Analytics button showing real metrics, Difference and Replay, not "NO PAYLOAD DATA!" / "NO SUBMISSION".
- [ ] 3.10 The two annotations show **different** text in Replay (two separate capture files, not one merged file).

Student view **On**:

- [ ] 3.11 Turn student view **On** for the activity. As **student44**, create an annotation. Link call fires **once** (not twice), and the student sees their own Analytics button.

Teacher-authored:

- [ ] 3.12 As **bbteacher**, create an annotation. Link call fires once and returns true.

MOO-39 protection still holds:

- [ ] 3.13 As **student40**, console (1034 is student44):
  `ws('tiny_cursive_update_pdf_annote_id', {cmid: 443, userid: 1034, courseid: 50, modulename: 'pdfannotator', resourceid: 999})`
  Expected: `"error":true` with `nopermissions`.
- [ ] 3.14 As student40, wrong module (432 is an assignment):
  `ws('tiny_cursive_update_pdf_annote_id', {cmid: 432, userid: 1030, courseid: 50, modulename: 'assign', resourceid: 999})`
  Expected: `"error":true` with `invalidparameter`.

## 4. MOO-41: other analytics services (Live, real session)

Run as **student40**; 1034 is student44. Every call should return `"error":true` with `nopermissions`.

- [ ] 4.1 `ws('tiny_cursive_user_list_submission_stats', {id: 1034, modulename: 'assign', cmid: 433})`
- [ ] 4.2 `ws('tiny_cursive_get_lesson_submission_data', {id: 1034, modulename: 'lesson', cmid: 442})`
- [ ] 4.3 `ws('tiny_cursive_get_comment_link', {id: 1, modulename: 'quiz', cmid: 435, questionid: 1, userid: 1034})`
- [ ] 4.4 Workshop: open a peer's submission you are assessing, take the submission id from the URL:
  `ws('tiny_cursive_get_workshop_submission', {resourceid: SUBMISSIONID, modulename: 'workshop', cmid: 436})`
- [ ] 4.5 Replace 1034 with your own id (1030) in 4.1: returns your own data, no error.
- [ ] 4.6 As **bbteacher**: assignment grading page, lesson essay grading, quiz review and workshop submission pages still show Analytics buttons with data for every student.

## 5. Regression smoke (both sites, about 10 minutes)

The branch also changed replay, autosave, the PDF export and the cron upload, so check the basics.

- [ ] 5.1 Student: type an assignment submission; Cursive indicator shows saving; submit.
- [ ] 5.2 Student with student view On: own Analytics opens with Metrics / Difference / Replay; Replay plays.
- [ ] 5.3 Teacher: grading page Analytics for that submission; Replay plays to the end and the speed and scrub controls work.
- [ ] 5.4 Teacher: Writing report for the course lists the submission; **Download** JSON works; PDF export opens.
- [ ] 5.5 Student: quiz essay attempt captures and the teacher sees its analytics on the review page.
- [ ] 5.6 Admin: plugin settings page loads and saves; "Generate token" still works for admin.
- [ ] 5.7 Browser console shows no red errors from `tiny_cursive` modules on any of the pages above.

---

## Results log

| Step | Site | Result | Notes |
|---|---|---|---|
|  |  |  |  |
