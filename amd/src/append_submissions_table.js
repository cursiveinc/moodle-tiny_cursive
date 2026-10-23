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
    "./analytic_button",
    './replay_button',
    './analytic_events',
    'core/str'], function(
        AJAX,
        str,
        templates,
        Replay,
        analyticButton,
        replayButton,
        AnalyticEvents,
        Str
    ) {
    const replayInstances = {};
    // eslint-disable-next-line camelcase
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
            templates.render('tiny_cursive/no_submission').then(html => {
                const el = document.getElementById('content' + mid);
                if (el) {
                    el.innerHTML = html;
                }
                return true;
            }).catch(e => window.console.error(e));
        }
        return false;
    };

    var usersTable = {
        init: function(scoreSetting, showcomment, hasApiKey) {
            str
                .get_strings([
                    {key: "confidence_threshold", component: "tiny_cursive"},
                ]).done(function() {
                    usersTable.appendTable(scoreSetting, showcomment, hasApiKey);
                });
        },
        appendTable: function(scoreSetting, showComment, hasApiKey) {
            let subUrl = window.location.href;
            let parm = new URL(subUrl);
            let hTr = document.querySelector('table#submissions thead tr') || document.querySelector('thead tr');
            if (!hTr) {
                return;
            }

            Str.get_string('analytics', 'tiny_cursive')
                .then(analyticString => {
                    let th = document.createElement('th');
                    th.className = "header c4";
                    th.scope = "col";
                    th.innerHTML = analyticString + '<div class="commands">' +
                        '<i class="icon fa fa-minus fa-fw " aria-hidden="true"></i></div>';
                    if (hTr.children[3]) {
                        hTr.children[3].insertAdjacentElement('afterend', th);
                    }

                    const rows = document.querySelectorAll('table#submissions tbody tr, tbody tr');
                    rows.forEach(function(tr) {
                        let tdUser = tr.querySelector("td");
                        if (!tdUser) {
                            return;
                        }
                        let userid = tdUser.querySelector("input[type='checkbox']")?.value;
                        let cmid = parm.searchParams.get('id');

                        let args = {id: userid, modulename: "assign", cmid: cmid};
                        let methodname = 'tiny_cursive_user_list_submission_stats';
                        let com = AJAX.call([{methodname, args}]);

                        try {
                            com[0].done(function(json) {
                                var data = JSON.parse(json);
                                var filepath = '';
                                if (data.res.filename) {
                                    filepath = data.res.filename;
                                }

                                const tableCell = document.createElement('td');
                                if (!hasApiKey) {
                                    tableCell.innerHTML = replayButton(userid).outerHTML;
                                } else {
                                    tableCell.appendChild(analyticButton(data.res.effort_ratio, userid));
                                }
                                if (tr.children[3]) {
                                    tr.children[3].insertAdjacentElement('afterend', tableCell);
                                }

                                // Get Module Name from element
                                let element = document.querySelector('.page-header-headings h1');
                                let textContent = element ? element.textContent : '';

                                let myEvents = new AnalyticEvents();
                                var context = {
                                    tabledata: data.res,
                                    formattime: myEvents.formatedTime(data.res),
                                    page: scoreSetting,
                                    name: textContent,
                                    apikey: hasApiKey
                                };

                                let authIcon = myEvents.authorshipStatus(data.res?.user_agent,
                                    data.res.first_file, data.res.score, scoreSetting);
                                myEvents.createModal(userid, context, '', replayInstances, authIcon);
                                myEvents.analytics(userid, templates, context, '', replayInstances, authIcon);
                                myEvents.checkDiff(userid, data.res.file_id, '', replayInstances, filepath);
                                myEvents.replyWriting(userid, filepath, '', replayInstances);
                            });
                        } catch (e) {
                            window.console.error(e);
                        }
                    });
                    return true;
                })
                .catch(error => {
                    window.console.error('Failed to get analytics string:', error);
                });
        }
    };

    return usersTable;
});
