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
 * @module     tiny_cursive/show_url_in_submission_grade
 * @category TinyMCE Editor
 * @copyright  CTI <info@cursivetechnology.com>
 * @author Brain Station 23 <elearning@brainstation-23.com>
 */

define([
    "core/ajax",
    "core/str",
    "core/templates",
    "./replay",
    "./analytic_button",
    "./analytic_events"
], function(
    AJAX,
    str,
    templates,
    Replay,
    analyticButton,
    AnalyticEvents
) {
    const replayInstances = {};
    // eslint-disable-next-line
    window.video_playback = function(mid, filepath) {
        if (filepath !== '') {
            const replay = new Replay(
                'content' + mid,
                filepath,
                10,
                false,
                'player_' + mid
            );
            replayInstances[mid] = replay;
        } else {
            // eslint-disable-next-line
            templates.render('tiny_cursive/no_submission').then(html => {
                const contentElement = document.getElementById('content' + mid);
                if (contentElement) {
                    contentElement.innerHTML = html;
                }
            }).catch(e => window.console.error(e));
        }
        return false;
    };

    var usersTable = {
        init: function(score_setting, showcomment, hasApiKey) {

            const graderElement = document.getElementById('page-mod-assign-grader');
            if (graderElement) {
                graderElement.classList.add('tiny_cursive_mod_assign_grader');
            }

            str.get_strings([{key: "field_require", component: "tiny_cursive"}])
                .then(() => {
                    usersTable.appendSubmissionDetail(score_setting, showcomment, hasApiKey);
                });
        },
        // eslint-disable-next-line
        appendSubmissionDetail: function(score_setting, showcomment, hasApiKey) {

            const divElement = document.querySelector('.path-mod-assign [data-region="grade-panel"]');
            let previousContextId = window.location.href;

            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function() {
                    let currentContextId = window.location.href;
                    if (currentContextId !== previousContextId) {
                        window.location.reload();
                        previousContextId = currentContextId;
                    }
                });
            });

            const config = {childList: true, subtree: true};
            observer.observe(divElement, config);

            const subUrl = window.location.href;
            const parm = new URL(subUrl);
            const userid = parm.searchParams.get('userid');
            var cmid = parm.searchParams.get('id');

            const args = {id: userid, modulename: "assign", cmid: cmid};
            const methodname = 'cursive_get_assign_grade_comment';
            const com = AJAX.call([{methodname, args}]);

            com[0].done(function(json) {
                const data = JSON.parse(json);
                let filepath = '';
                if (data.data.filename) {
                    filepath = data.data.filename;
                }

                const analytic_button_div = document.createElement('div');
                analytic_button_div.classList.add('text-center', 'mt-2');
                analytic_button_div.appendChild(analyticButton(hasApiKey ? data.data.effort_ratio : "", userid));

                const gradeActions = document.querySelector('div[data-region="grade-actions"]');
                gradeActions.parentNode.insertBefore(analytic_button_div, gradeActions);

                const reviewPanel = document.querySelector('div[data-region="review-panel"]');
                if (reviewPanel) {
                    reviewPanel.classList.add('cursive_review_panel_path_mod_assign');
                }

                const gradingNavigationPanel = document.querySelector('div[data-region="grading-navigation-panel"]');
                if (gradingNavigationPanel) {
                    gradingNavigationPanel.classList.add('cursive_grading-navigation-panel_path_mod_assign');
                }

                const gradePanel = document.querySelector('div[data-region="grade-panel"]');
                if (gradePanel) {
                    gradePanel.classList.add('cursive_grade-panel_path_mod_assign');
                }

                const gradeActionsPanel = document.querySelector('div[data-region="grade-actions-panel"]');
                if (gradeActionsPanel) {
                    gradeActionsPanel.classList.add('cursive_grade-actions-panel_path_mod_assign');
                }

                const myEvents = new AnalyticEvents();
                const context = {
                    tabledata: data.data,
                    formattime: myEvents.formatedTime(data.data),
                    page: score_setting,
                    userid: userid,
                };

                const authIcon = myEvents.authorshipStatus(data.data.first_file, data.data.score, score_setting);
                myEvents.createModal(userid, context, '', replayInstances, authIcon);
                myEvents.analytics(userid, templates, context, '', replayInstances, authIcon);
                myEvents.checkDiff(userid, data.data.file_id, '', replayInstances);
                myEvents.replyWriting(userid, filepath, '', replayInstances);
            });
            return com.usercomment;
        },
    };

    return usersTable;
});