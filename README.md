# Cursive Moodle TinyMCE Plugin #

At Cursive Technology, Inc., we're focused on the writing process. By capturing key event data (also known by the scary euphemism "key logging"), we can make new opportunities for teaching, learning, and research in a low-cost, low-effort way, all in the existing workflows of your course and site.

The plugin captures writing-process events in structured JSON for supported TinyMCE activity fields. Authorised users can review writing replays and reports or download the captured JSON by course, activity, student, and attempt.

## Features

- Captures typing, editing, paste, and revision events from supported TinyMCE writing activities.
- Replays the writing process for authorised students and teaching staff.
- Provides a focused full-page writing view with activity details, important dates, rubrics, a timer, and live word count where available.
- Provides course and activity reports plus personal writing reports linked from user profiles.
- Supports filtered reports, secure JSON downloads, and aggregate CSV exports.
- Provides per-activity paste policies: allow paste, block paste, or require a cite-source comment.
- Provides student-facing writing summaries when student view is enabled.
- Allows Cursive to be enabled or disabled by course and supported activity.

**Premium/Subscription:** The optional Cursive API integration adds:

1. Authorship identification across a student's submissions.
2. Automated writing analytics and submission-difference reports.
3. Analytics indicators on supported activity grading, review, report, and student pages.
4. Dashboard charts and metrics including effort, revision rate, active time, word count, WPM, and CPM.
5. Analytics PDF exports, interpretation guidance, and enhanced student writing summaries.
6. Resubmission of eligible payloads when remote analysis needs to be retried.

Ultimately, we believe in human contribution as captured through the writing process, the beautiful production of written work expressing your individual thoughts that cannot be completed by a third party nor replicated by generative AI. We're excited to work with you.

If you have questions, comments, or would like to request a trial API key, please reach out to us at contact@cursivetechnology.com


## Installation

### Install by downloading the ZIP file
- Install by downloading the ZIP file from the Moodle plugins directory
- Download the zip file from GitHub
- Unzip the zip file in /path/to/moodle/lib/editor/tiny/plugins/cursive folder or upload the zip file in the install plugins options from site administration: Site Administration -> Plugins -> Install Plugins -> Upload zip file

### Install using git clone

Go to Moodle Project `root/lib/editor/tiny/plugins/cursive` directory and clone code by using the following commands:

```
git clone https://github.com/cursiveinc/moodle-tinymce_cursive.git cursive
```
- In your Moodle site (as admin), Visit site administration to finish the installation.

**Alternatively, you can run**
``$ php admin/cli/upgrade.php``
to complete the installation from the command line.


## Configuration
After installing the plugin, you can update the settings.

To update the plugin settings, navigate to plugin settings: 

 `Site Administration->Plugins->Cursive`
  
![Screenshot 2024-10-24 132422](https://github.com/user-attachments/assets/f176ce08-37d7-4c52-8a09-cade09fcbb99)

If you want to use Analytics And Diff feature then you need to fill up that informations.
for subscription please reach out to us at **contact@cursivetechnology.com**.
There are several configuration options for the plugin. The free version allows you the following features: 
1. Enable or disable "Cite Source" student copy/paste comment features. 
2. Data Sync Interval with your moodle server to reduce the number of http requests.
3. Global settings for Enabling or Disabling cursive for all courses.

By entering an agreement with Cursive, an API URL and key will be provided to manage the premium ML features. A custom threshold for API-generated values of identify verification is also available to tune the threshold for displaying a green check verification. 

## Data transparency notice (acknowledgement gate)

Institutions processing keystroke-dynamics data need a defensible record that each user was informed before capture began. The plugin can require every user to acknowledge a fixed notice, in their own language, the first time they meet a Cursive-enabled editor. Until they do, the notice panel is rendered in place of the editor and no keystroke data is captured. The notice is a transparency notice, not consent capture: consent itself is obtained by the institution outside Moodle, and requests to withdraw it, or to object to processing, are for the institution to handle.

Settings under `Site Administration -> Plugins -> Text editors -> TinyMCE editor -> Cursive`:

| Setting | Default | Meaning |
|---|---|---|
| Require notice acknowledgement | On | Master switch. When on, users must acknowledge before the Cursive editor loads. There is no decline control; a user who will not acknowledge can switch to another text editor in their preferences, so keep at least one other editor enabled. The settings page warns you when Cursive is the only one. |
| Privacy policy URL | empty | Your institution's own privacy policy. When set, the notice links to it. |
| Acknowledgement retention period | 0 (keep indefinitely) | How long acknowledgement records are kept. When set, a daily scheduled task permanently deletes older records. |

Each acknowledgement is written to an append-only log (`tiny_cursive_notice`) with the user, a server timestamp, the notice version and a SHA-256 of the exact wording shown. The wording itself is stored once per distinct hash (`tiny_cursive_notice_text`), so every record stays resolvable to the text the user read even after the language strings change. The wording is shipped as language strings and versioned in code; it is not editable by administrators. A material change to the wording ships as a new version and re-prompts every user; a translation fix produces a new snapshot without re-prompting anyone.

The report at `Site administration -> Reports -> Cursive notice acknowledgements` (capability `tiny/cursive:viewnoticereport`, managers by default) lists acknowledgements with sorting, date, version and language filters, CSV/Excel/ODS download, links to the stored wording flagged where it has since been superseded, and a "not yet acknowledged" view scoped to a course or cohort.

**Retention on erasure.** GDPR data exports include the user's acknowledgements with the full wording they saw. Erasure requests clear every other Cursive table but deliberately leave the acknowledgement log and its wording snapshots in place: the record is the institution's evidence that a specific person was shown a specific wording on a specific date, which is exactly what it needs if that person later disputes the processing. GDPR Art. 17(3)(b) and (e) provide for retention where necessary to comply with a legal obligation or to establish, exercise or defend legal claims. Records are kept indefinitely unless you configure the retention period above, in which case the institution's own retention schedule applies.
### External data transmission

Premium analytics sends captured writing data to the configured Cursive API when an administrator configures and enables that integration. The **Share site information after upgrades** setting separately sends the site's public URL, Moodle version, and Cursive plugin version to that API after installation or upgrade. Site-information sharing is enabled by default and can be explicitly disabled by an administrator.

## Supported Activity Modules

Our plugin is designed to work with activities where students provide **written text responses**.  
It supports only text-based inputs such as **Online text** submissions and **Essay-type** questions.  
Other formats, like file uploads or multiple-choice questions, are not supported.

Currently supported Moodle activity modules:

| # | Activity  | Supported Type |
|:-:|-----------|----------------|
| 1 | Assignment | Online text submissions only |
| 2 | Quiz       | Essay question types only |
| 3 | Forum      | Posts and discussion entries |
| 4 | Lesson     | Essay-style lesson questions |
| 5 | PDF Annotator | Written annotation comments |
| 6 | Workshop | Written submissions and assessments |
| 7 | Diary | Written diary entries |

Only the written-text workflows shown above are supported. File uploads, multiple-choice questions, and other non-text response types are not captured.

PDF Annotator and Diary integrations require their respective Moodle activity plugins to be installed. Assignment, Quiz, Forum, Lesson, and Workshop are Moodle core activities.

OU Blog is not included in this plugin's direct activity list. Cursive support for OU Blog requires the separate companion support plugin; see https://cursivetechnology.com for availability and updates.

The plugin uses Moodle's database APIs and supports MySQL/MariaDB and PostgreSQL deployments.

## License
#### 2026 Cursive Technology, Inc.

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program. If not, see https://www.gnu.org/licenses/.
