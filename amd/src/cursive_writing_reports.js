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
 * @module     tiny_cursive/cursive_writing_reports
 * @category TinyMCE Editor
 * @copyright  CTI <info@cursivetechnology.com>
 * @author kuldeep singh <mca.kuldeep.sekhon@gmail.com>
 */

define(["jquery", "core/ajax", "core/str", "core/templates", "./replay", './analytic_button', "./analytic_events"], function(
    $,
    AJAX,
    str,
    templates,
    Replay,
    analyticButton,
    AnalyticEvents
) {
    const replayInstances = {};
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
        init: function(page, hasApiKey) {
            str
                .get_strings([
                    {key: "field_require", component: "tiny_cursive"},
                ])
                .done(function() {
                    usersTable.getusers(page);
                });

            let myEvents = new AnalyticEvents();
            (async function() {
                try {
                    let scoreSetting = await str.get_string('confidence_threshold', 'tiny_cursive');
                    analyticsEvents(scoreSetting, hasApiKey);
                } catch (error) {
                    window.console.error('Error fetching string:', error);
                }
            })();

            /**
             * Handles the analytics events for each modal on the page.
             *
             * This function iterates over each element with the class `analytic-modal`,
             * retrieves necessary data attributes, and makes an AJAX call to get writing
             * statistics. Once the data is retrieved, it processes and displays it within
             * the modal.
             *
             * @param {Object} scoreSetting - Configuration settings related to scoring.
             * @param {boolean} hasApiKey - api key status
             */
            function analyticsEvents(scoreSetting, hasApiKey) {

                $(".analytic-modal").each(function() {
                    var mid = $(this).data("id");
                    var filepath = $(this).data("filepath");
                    let context = {};
                    context.userid = mid;
                    let cmid = $(this).data("cmid");
                    $(this).html(analyticButton($(this).data('id')));

                    AJAX.call([{
                        methodname: 'cursive_get_writing_statistics',
                        args: {
                            cmid: cmid,
                            fileid: mid,
                        },
                    }])[0].done(response => {
                        let data = JSON.parse(response.data);

                        context.formattime = myEvents.formatedTime(data);
                        context.tabledata = data;
                        context.apikey = hasApiKey;
                        // Perform actions that require context.tabledata
                        let authIcon = myEvents.authorshipStatus(data.first_file, data.score, scoreSetting);
                        myEvents.createModal(mid, context, '', replayInstances, authIcon);
                        myEvents.analytics(mid, templates, context, '', replayInstances, authIcon);
                        myEvents.checkDiff(mid, mid, '', replayInstances);
                        myEvents.replyWriting(mid, filepath, '', replayInstances);

                    }).fail(error => {
                        throw new Error('Error: ' + error.message);
                    });

                });
            }
        },
        getusers: function(page) {
            $("#id_coursename").change(function() {
                var courseid = $(this).val();
                var promise1 = AJAX.call([
                    {
                        methodname: "cursive_get_user_list",
                        args: {
                            courseid: courseid,
                        },
                    },
                ]);
                promise1[0].done(function(json) {
                    var data = JSON.parse(json);
                    var context = {
                        tabledata: data,
                        page: page,
                    };
                    // eslint-disable-next-line
                    templates
                        .render("tiny_cursive/user_list", context)
                        .then(function(html) {

                            var filteredUser = $("#id_username");
                            filteredUser.html(html);
                            return true;
                        });
                });

                var promise2 = AJAX.call([
                    {
                        methodname: "cursive_get_module_list",
                        args: {
                            courseid: courseid,
                        },
                    },
                ]);
                promise2[0].done(function(json) {
                    var data = JSON.parse(json);
                    var context = {
                        tabledata: data,
                        page: page,
                    };
                    // eslint-disable-next-line
                    templates
                        .render("tiny_cursive/module_list", context)
                        .then(function(html) {

                            var filteredUser = $("#id_modulename");
                            filteredUser.html(html);
                            return true;
                        });
                });
            });
        },
    };
    return usersTable;
});
