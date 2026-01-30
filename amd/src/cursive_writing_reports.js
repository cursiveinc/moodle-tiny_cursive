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

define(["jquery", "core/ajax", "core/str", "core/templates", "./replay", './analytic_button', './replay_button',
"./analytic_events", "core/modal_events", 'core/modal_save_cancel', 'core/modal_factory', 'core/modal'],
    function(
    $,
    AJAX,
    str,
    templates,
    Replay,
    analyticButton,
    replayButton,
    AnalyticEvents,
    Events,
    Modal,
    Factory,
    Alert
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
        init: function(page, hasApiKey, csvOption) {
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
                    analyticsEvents(scoreSetting, hasApiKey, parseInt(csvOption));
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
             * @param {boolean} csvOption - csv option status
             */
            function analyticsEvents(scoreSetting, hasApiKey, csvOption) {

                $(".analytic-modal").each(function() {
                    var mid = $(this).data("id");
                    var filepath = $(this).data("filepath");
                    let context = {};
                    context.userid = mid;
                    let cmid = $(this).data("cmid");

                    AJAX.call([{
                        methodname: 'cursive_get_writing_statistics',
                        args: {
                            cmid: cmid,
                            fileid: mid,
                        },
                    }])[0].done(response => {
                        let data = JSON.parse(response.data);

                        // Show replay button if no API key, otherwise show analytics button
                        if (!hasApiKey) {
                            $(this).html(replayButton(mid));
                        } else {
                            $(this).html(analyticButton(data.effort_ratio, $(this).data('id')));
                        }

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

                $('.download-btn').on('click', async function(e) {
                    e.preventDefault();

                    const link1 = $(this).attr('href');
                    const link2 = $(this).data('link');

                    let type = Factory.types.SAVE_CANCEL;
                    let optionModal = Modal;
                    let select = document.createElement('select');
                    select.id = "download-type";
                    select.classList.add('form-control', 'inputUrl');

                    let title = await str.get_string('download', 'tiny_cursive');

                    // Add CSV option
                    if (csvOption) {
                        try {
                            const text = await str.get_string('payloadjson', 'tiny_cursive');
                            let option = document.createElement('option');
                            option.text = text;
                            option.value = 0;
                            select.appendChild(option);
                        } catch (error) {
                            window.console.error(error);
                        }
                    }

                    // Add API key option
                    if (hasApiKey) {
                        try {
                            const text = await str.get_string('analyticspdf', 'tiny_cursive');
                            let option2 = document.createElement('option');
                            option2.text = text;
                            option2.value = 1;
                            select.appendChild(option2);
                        } catch (error) {
                            window.console.error(error);
                        }
                    }

                    // If no options available
                    if (!hasApiKey && !csvOption) {
                        try {
                            const noOptionText = await str.get_string('no_option', 'tiny_cursive');
                            const messageText = await str.get_string('message', 'tool_dataprivacy');
                            title = messageText;
                            type = Factory.types.ALERT;
                            optionModal = Alert;
                            select = noOptionText;
                        } catch (error) {
                            window.console.error(error);
                        }
                    }

                    optionModal.create({
                        type: type,
                        title: title,
                        body: select,
                        removeOnClose: true,
                        buttons: type === Factory.types.SAVE_CANCEL ? [{
                            text: 'OK',
                            type: 'submit',
                            primary: true
                        }] : []
                    }).then(modal => {
                        modal.show();

                        if (type === Factory.types.SAVE_CANCEL) {
                            modal.getRoot().on(Events.save, function() {
                                const data = document.getElementById('download-type');
                                if (!data) {
                                    return;
                                }
                                if (parseInt(data.value)) {
                                    window.location.href = link2;
                                } else {
                                    window.location.href = link1;
                                }
                            });
                        }
                        return modal;
                    }).catch(error => {
                        window.console.error('failed to open modal', error);
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
