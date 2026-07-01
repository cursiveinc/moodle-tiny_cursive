// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Teacher-facing authorship indicators for the Diary report pages.
 *
 * Diary has its own teacher report (report.php = most recent entry per user, reportsingle.php =
 * every entry for one user) rather than the assign grader, and it stores multiple entries per
 * (cmid, userid). Both pages render each entry through diary_print_user_entry(), which always
 * emits a "<td>ID {entryid}, ...</td>" heading cell, so we anchor one indicator per entry off
 * that cell and key every request/element on the diary_entries id.
 *
 * @module     tiny_cursive/append_diary_report
 * @category   TinyMCE Editor
 * @copyright  2026 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define([
    "jquery",
    "core/ajax",
    "core/str",
    "core/templates",
    "./replay",
    "./analytic_button",
    "./replay_button",
    "./analytic_events",
], function($, AJAX, str, templates, Replay, analyticButton, replayButton, AnalyticEvents) {

    const replayInstances = {};

    // eslint-disable-next-line camelcase
    window.video_playback = function(mid, filepath) {
        if (filepath !== '') {
            replayInstances[mid] = new Replay('content' + mid, filepath, 10, false, 'player_' + mid);
        } else {
            templates.render('tiny_cursive/no_submission').then(html => {
                $('#content' + mid).html(html);
                return true;
            }).catch(e => window.console.error(e));
        }
        return false;
    };

    const diaryReport = {
        init: function(scoreSetting, showcomment, hasApiKey) {
            str.get_strings([
                {key: "confidence_threshold", component: "tiny_cursive"},
            ]).done(function() {
                diaryReport.appendIndicators(scoreSetting, hasApiKey);
            });
        },

        appendIndicators: function(scoreSetting, hasApiKey) {
            const cmid = new URL(window.location.href).searchParams.get('id');
            const moduleTitle = document.querySelector('.page-header-headings h1')?.textContent ?? '';

            // Each entry heading cell reads "ID {entryid}, {date} ...". The "ID " prefix is
            // hardcoded (not localised) in mod_diary, so the pattern is stable across languages.
            document.querySelectorAll('[role="main"] table.diaryuserentry td').forEach(function(td) {
                const match = td.textContent.match(/^\s*ID\s+(\d+),/);
                if (!match) {
                    return;
                }
                // Guard against double-injection if the module initialises more than once.
                if (td.querySelector('.tiny_cursive-diary-indicator')) {
                    return;
                }
                const entryId = parseInt(match[1], 10);
                const args = {id: entryId, modulename: "diary", cmid: cmid};

                AJAX.call([{methodname: 'cursive_get_forum_comment_link', args}])[0].done(function(json) {
                    const parsed = JSON.parse(json);
                    const data = parsed.data;

                    // No capture record for this entry -> no indicator.
                    if (!data || !data.filename) {
                        return;
                    }

                    const container = document.createElement('span');
                    container.className = 'tiny_cursive-diary-indicator ms-2';

                    if (!hasApiKey) {
                        container.appendChild(replayButton(entryId));
                    } else {
                        container.appendChild(analyticButton(data.effort_ratio, entryId));
                    }
                    td.appendChild(container);

                    // Wire the same modal/analytics/replay used by the assign grader. The entry id
                    // is the per-item identifier (so a user's multiple entries never collide).
                    const events = new AnalyticEvents();
                    const context = {
                        tabledata: data,
                        formattime: events.formatedTime(data),
                        moduletitle: moduleTitle,
                        page: scoreSetting,
                        userid: entryId,
                        apikey: hasApiKey,
                    };

                    const authIcon = events.authorshipStatus(
                        data.user_agent, data.first_file, data.score, scoreSetting);
                    events.createModal(entryId, context, '', replayInstances, authIcon);
                    events.analytics(entryId, templates, context, '', replayInstances, authIcon);
                    events.checkDiff(entryId, data.file_id, '', replayInstances, data.filename);
                    events.replyWriting(entryId, data.filename, '', replayInstances);
                }).fail(function(error) {
                    window.console.error('Failed to get diary entry analytics:', error);
                });
            });
        },
    };

    return diaryReport;
});
