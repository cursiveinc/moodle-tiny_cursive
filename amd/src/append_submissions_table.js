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
 * @module     tiny_cursive/append_submissions_table
 * @category TinyMCE Editor
 * @copyright  CTI <info@cursivetechnology.com>
 * @author Brain Station 23 <elearning@brainstation-23.com>
 */

define([
    "core/ajax",
    "core/str",
    "core/templates",
    "./replay",
    './analytic_button',
    './analytic_events',
    'core/str'], function (
        AJAX,
        str,
        templates,
        Replay,
        analyticButton,
        AnalyticEvents,
        Str
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
        init: function (score_setting, showcomment) {
            str
                .get_strings([
                    { key: "confidence_threshold", component: "tiny_cursive" },
                ]).done(function () {
                    usersTable.appendTable(score_setting, showcomment);
                });
        },
        appendTable: function (score_setting) {
            let sub_url = window.location.href;
            let parm = new URL(sub_url);
            let h_tr = document.querySelector('thead tr');
            Str.get_string('analytics', 'tiny_cursive')
                .then(analyticString => {
                    let th = document.createElement('th');
                    th.className = "header c4";
                    th.scope = "col";
                    th.innerHTML = analyticString + '<div class="commands">' +
                        '<i class="icon fa fa-minus fa-fw " aria-hidden="true"></i></div>';
                    h_tr.children[3].insertAdjacentElement('afterend', th);

                    document.querySelectorAll('tbody tr').forEach(function (tr) {
                        let td_user = tr.querySelector("td");
                        let userid = td_user.querySelector("input[type='checkbox']").value;
                        let cmid = parm.searchParams.get('id');

                        // Create the table cell element and append the anchor
                        const tableCell = document.createElement('td');
                        tableCell.appendChild(analyticButton(userid));
                        tr.children[3].insertAdjacentElement('afterend', tableCell);

                        let args = { id: userid, modulename: "assign", cmid: cmid };
                        let methodname = 'cursive_user_list_submission_stats';
                        let com = AJAX.call([{ methodname, args }]);

                        try {
                            com[0].done(function (json) {
                                var data = JSON.parse(json);
                                var filepath = '';
                                if (data.res.filename) {
                                    filepath = data.res.filename;
                                }

                                // Get Module Name from element
                                let element = document.querySelector('.page-header-headings h1');
                                let textContent = element.textContent; // Extracts the text content from the h1 element

                                let myEvents = new AnalyticEvents();
                                var context = {
                                    tabledata: data.res,
                                    formattime: myEvents.formatedTime(data.res),
                                    moduletitle: textContent,
                                    page: score_setting,
                                    userid: userid,
                                };

                                let authIcon = myEvents.authorshipStatus(data.res.first_file, data.res.score, score_setting);
                                myEvents.createModal(userid, context, '', authIcon);
                                myEvents.analytics(userid, templates, context, '', replayInstances, authIcon);
                                myEvents.checkDiff(userid, data.res.file_id, '', replayInstances);
                                myEvents.replyWriting(userid, filepath, '', replayInstances);
                            });
                        } catch (error) {
                            window.console.error(error);
                        }
                        return com.usercomment;
                    });
                });
        }
    };

    return usersTable;
});
