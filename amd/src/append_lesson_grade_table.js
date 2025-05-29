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
 * Module to append analytics and grade table data for lesson submissions
 * Handles the display of analytics, replay functionality and grade information
 * for lesson submissions in the Moodle gradebook interface
 *
 * @module     tiny_cursive/append_lesson_grade_table
 * @copyright  2025  CTI <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Replay from './replay';
import $ from 'jquery';
import {call as getData} from 'core/ajax';
import templates from 'core/templates';
import AnalyticEvents from './analytic_events';
import analyticButton from './analytic_button';
import * as Str from 'core/str';
// eslint-disable-next-line
export const init = (scoreSetting, showcomment) => {
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
                $('#content' + mid).html(html);
                return true;
            }).catch(e => window.console.error(e));
        }
        return false;

    };


    var cmid = M.cfg.contextInstanceId;
    var emailLink = $('#page-content div[role="main"] td.lastcol a');
    var headcolumn = $('#region-main div[role="main"] table thead tr');

    Str.get_string('analytics', 'tiny_cursive').then((strs) => {
        headcolumn.each(function() {
            $(this).find('th:eq(1)').after(`<th class="header">${strs}</th>`);
        });
        return true;
    }).catch(e => window.console.error(e));

    emailLink.each(function() {
        let href = $(this).attr('href');
        const $emailLink = $(this);
        let userid = 0;
        if (href) {
            userid = parseInt(new URLSearchParams(href.split('?')[1]).get('userid'));
            if (!userid) {
                $emailLink.closest('tr').find('td:eq(1)').after("<td></td>"); // For aligning the table column
            } else {
                let args = {id: userid, modulename: "lesson", cmid: cmid};
                let methodname = 'cursive_get_lesson_submission_data';
                let com = getData([{methodname, args}]);
                com[0].done(function(json) {
                    var data = JSON.parse(json);
                    var filepath = '';
                    if (data.res.filename) {
                        filepath = data.res.filename;
                    }

                    let analyticButtonDiv = document.createElement('div');
                    let analyticsColumn = document.createElement('td');
                    analyticButtonDiv.append(analyticButton(userid));
                    analyticButtonDiv.dataset.region = "analytic-div" + userid;
                    analyticsColumn.append(analyticButtonDiv);


                    $emailLink.closest('tr').find('td:eq(1)').after(analyticsColumn);

                    let myEvents = new AnalyticEvents();
                    var context = {
                        tabledata: data.res,
                        formattime: myEvents.formatedTime(data.res),
                        page: scoreSetting,
                        userid: userid,
                    };

                    let authIcon = myEvents.authorshipStatus(data.res.first_file, data.res.score, scoreSetting);
                    myEvents.createModal(userid, context, '', authIcon);
                    myEvents.analytics(userid, templates, context, '', replayInstances, authIcon);
                    myEvents.checkDiff(userid, data.res.file_id, '', replayInstances);
                    myEvents.replyWriting(userid, filepath, '', replayInstances);
                    myEvents.quality(userid, templates, context, '', replayInstances, cmid);

                });
                com[0].fail((error) => {
                    window.console.error('Error getting cursive config:', error);
                });
            }
        }
    });
};