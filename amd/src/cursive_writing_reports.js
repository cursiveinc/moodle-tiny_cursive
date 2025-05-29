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
 * @author Brain Station 23 <elearning@brainstation-23.com>
 */

define(["core/ajax", "core/str", "core/templates", "./replay", './analytic_button', "./analytic_events"], function (
    AJAX,
    str,
    templates,
    Replay,
    analyticButton,
    AnalyticEvents
) {
    const replayInstances = {};

    window.video_playback = function (mid, filepath) {
        if (filepath !== '') {
            const replay = new Replay(
                'content' + mid,
                filepath,
                10,
                false,
                'player_' + mid
                'content' + mid,
                filepath,
                10,
                false,
                'player_' + mid
            );
            replayInstances[mid] = replay;
        } else {
            templates.render('tiny_cursive/no_submission').then(html => {
                document.getElementById('content' + mid).innerHTML = html;
            }).catch(e => window.console.error(e));
        }
        return false;
    };

    var usersTable = {
        init: function (page) {
            str.get_strings([{ key: "field_require", component: "tiny_cursive" }])
                .done(function () {
                    usersTable.getusers(page);
                });

            let myEvents = new AnalyticEvents();
            (async function() {
                try {
                    let scoreSetting = await str.get_string('confidence_threshold', 'tiny_cursive');
                    analyticsEvents(scoreSetting);
                } catch (error) {
                    window.console.error('Error fetching string:', error);
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
             */
            function analyticsEvents(score_setting) {
                const analyticModals = document.querySelectorAll(".analytic-modal");

                analyticModals.forEach(modalElement => {
                    var mid = modalElement.dataset.id;
                    var filepath = modalElement.dataset.filepath;
                    let context = {};
                    context.userid = mid;
                    let cmid = modalElement.dataset.cmid;
                    let analyticBtn = analyticButton(mid);
                    if (analyticBtn) {
                        modalElement.innerHTML = '';
                        modalElement.appendChild(analyticBtn);
                    }


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
                        let authIcon = myEvents.authorshipStatus(data.first_file, data.score, score_setting);
                        myEvents.createModal(mid, context, '', authIcon);
                        myEvents.analytics(mid, templates, context, '', replayInstances, authIcon);
                        myEvents.checkDiff(mid, mid, '', replayInstances);
                        myEvents.replyWriting(mid, filepath, '', replayInstances);
                        myEvents.quality(mid, templates, context, '', replayInstances, cmid);
                    }).fail(error => {
                        throw new Error('Error: ' + error.message);
                    });

                });
            }
        },

        getusers: function (page) {
            document.getElementById("id_coursename").addEventListener('change', function () {
                var courseid = this.value;

                AJAX.call([{
                    methodname: "cursive_get_user_list",
                    args: {
                        courseid: courseid,
                    },
                }])[0].done(function (json) {
                    var data = JSON.parse(json);
                    var context = {
                        tabledata: data,
                        page: page,
                    };
                    templates.render("tiny_cursive/user_list", context)
                        .then(function (html) {
                            document.getElementById("id_username").innerHTML = html;
                        });
                });

                AJAX.call([{
                    methodname: "cursive_get_module_list",
                    args: {
                        courseid: courseid,
                    },
                }])[0].done(function (json) {
                    var data = JSON.parse(json);
                    var context = {
                        tabledata: data,
                        page: page,
                    };
                    templates.render("tiny_cursive/module_list", context)
                        .then(function (html) {
                            document.getElementById("id_modulename").innerHTML = html;
                        });
                });
            });
        },
    };

    return usersTable;
});
