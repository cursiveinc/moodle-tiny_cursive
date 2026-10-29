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
 * Cursive analytics in the assign grader: the control is rendered for the user being graded
 * and re-rendered when the grader moves to another user, without reloading the page.
 *
 * @module     tiny_cursive/show_url_in_submission_grade
 * @copyright  CTI <info@cursivetechnology.com>
 * @author kuldeep singh <mca.kuldeep.sekhon@gmail.com>
 */

define(["jquery", "core/ajax", "core/str", "core/templates", "./replay", "./analytic_button", "./analytic_events",
    "./replay_button"], function(
    $,
    AJAX,
    str,
    templates,
    Replay,
    analyticButton,
    AnalyticEvents,
    replayButton,
) {
    const replayInstances = {};
    const REGION = 'tiny_cursive-grader-analytics';

    // eslint-disable-next-line
    window.video_playback = function (mid, filepath) {
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
                $('#content' + mid).html(html);
            }).catch(e => window.console.error(e));
        }
        return false;

    };

    var usersTable = {
        init: function(scoreSetting, showcomment, hasApiKey) {
            $(document).ready(function() {
                $('#page-mod-assign-grader').addClass('tiny_cursive_mod_assign_grader');
            });
            str
                .get_strings([
                    {key: "field_require", component: "tiny_cursive"},
                ])
                .done(function() {
                    usersTable.appendSubmissionDetail(scoreSetting, showcomment, hasApiKey);
                });
        },

        appendSubmissionDetail: function(scoreSetting, showcomment, hasApiKey) {
            $(document).ready(function($) {
                var divElement = $('.path-mod-assign [data-region="grade-panel"]')[0];
                var previousContextId = window.location.href;

                $('div[data-region="review-panel"]').addClass('cursive_review_panel_path_mod_assign');
                $('div[data-region="grading-navigation-panel"]').addClass('cursive_grading-navigation-panel_path_mod_assign');
                $('div[data-region="grade-panel"]').addClass('cursive_grade-panel_path_mod_assign');
                $('div[data-region="grade-actions-panel"]').addClass('cursive_grade-actions-panel_path_mod_assign');

                usersTable.renderForCurrentUser(scoreSetting, hasApiKey);

                // The grader swaps users in place (the URL changes without a page load). Re-render the
                // control for the new user instead of reloading, so focus stays where the grader put it (2.4.3).
                var observer = new MutationObserver(function() {
                    var currentContextId = window.location.href;
                    if (currentContextId !== previousContextId) {
                        previousContextId = currentContextId;
                        usersTable.renderForCurrentUser(scoreSetting, hasApiKey);
                    }
                });
                var config = {childList: true, subtree: true};
                if (divElement) {
                    observer.observe(divElement, config);
                }
            });
        },

        /**
         * Fetch the Cursive data for the user in the grader URL and place the control before the grade actions.
         *
         * @param {string} scoreSetting Authorship threshold.
         * @param {boolean} hasApiKey Whether the site has a Cursive API key.
         */
        renderForCurrentUser: function(scoreSetting, hasApiKey) {
            let parm = new URL(window.location.href);
            let userid = parm.searchParams.get('userid');
            var cmid = parm.searchParams.get('id');

            $(`[data-region="${REGION}"]`).remove();
            if (!userid) {
                return;
            }

            let args = {id: userid, modulename: "assign", 'cmid': cmid};
            let methodname = 'tiny_cursive_get_assign_grade_comment';
            let com = AJAX.call([{methodname, args}]);
            com[0].done(function(json) {
                // A later user change wins: drop a response that arrives for a user no longer shown.
                if (new URL(window.location.href).searchParams.get('userid') !== userid) {
                    return;
                }
                var data = JSON.parse(json);
                var filepath = '';
                if (data.data.filename) {
                    filepath = data.data.filename;
                }

                let analyticButtonDiv = document.createElement('div');
                analyticButtonDiv.classList.add('text-center', 'mt-2');
                analyticButtonDiv.dataset.region = REGION;

                $(`[data-region="${REGION}"]`).remove();
                $('div[data-region="grade-actions"]').before(analyticButtonDiv);

                if (!hasApiKey) {
                    $(analyticButtonDiv).html(replayButton(userid));
                } else {
                    analyticButtonDiv.append(analyticButton(data.data.effort_ratio, userid));
                }

                let myEvents = new AnalyticEvents();
                var context = {
                    tabledata: data.data,
                    formattime: myEvents.formatedTime(data.data),
                    page: scoreSetting,
                    userid: userid,
                    apikey: hasApiKey
                };

                let authIcon = myEvents.authorshipStatus(data.data?.user_agent,
                    data.data.first_file, data.data.score, scoreSetting);

                myEvents.createModal(userid, context, '', replayInstances, authIcon);
                myEvents.analytics(userid, templates, context, '', replayInstances, authIcon);
                myEvents.checkDiff(userid, data.data.file_id, '', replayInstances, filepath);
                myEvents.replyWriting(userid, filepath, '', replayInstances);
            }).fail(function(error) {
                window.console.error('Error getting cursive grade data:', error);
            });
        },
    };
    return usersTable;
});
