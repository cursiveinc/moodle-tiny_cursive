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
import {call as getData} from 'core/ajax';
import templates from 'core/templates';
import AnalyticEvents from './analytic_events';
import analyticButton from './analytic_button';
import * as Str from 'core/str';

export const init = (scoreSetting, showcomment, hasApiKey) => {
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
                const contentElement = document.getElementById('content' + mid);
                if (contentElement) {
                    contentElement.innerHTML = html;
                }
                return contentElement;
            }).catch(e => window.console.error(e));
        }
        return false;
    };

    const cmid = M.cfg.contextInstanceId;
    const emailLinks = document.querySelectorAll('#page-content div[role="main"] td.lastcol a');
    const headColumns = document.querySelectorAll('#region-main div[role="main"] table thead tr');
    let url = new URL(window.location.href);
    let mode = url.searchParams.get('mode');
    let user = url.searchParams.get('user');

    Str.get_string('analytics', 'tiny_cursive').then((strs) => {
        headColumns.forEach(function(row) {
            const secondTh = row.querySelector('th:nth-child(2)');
            if (secondTh) {
                const newTh = document.createElement('th');
                newTh.className = 'header';
                newTh.innerHTML = strs;
                secondTh.insertAdjacentElement('afterend', newTh);
            }
        });
        return true;
    }).catch(e => window.console.error(e));

    if (mode && mode === "grade") {
        analytics(user, cmid, "", true);
    }

    emailLinks.forEach(function(emailLink) {
        const href = emailLink.getAttribute('href');
        let userid = 0;

        if (href) {
            const urlParams = new URLSearchParams(href.split('?')[1]);
            const useridParam = urlParams.get('userid');
            userid = useridParam ? parseInt(useridParam) : 0;

            if (!userid) {
                // For aligning the table column
                const closestTr = emailLink.closest('tr');
                const secondTd = closestTr.querySelector('td:nth-child(2)');
                if (secondTd) {
                    const emptyTd = document.createElement('td');
                    secondTd.insertAdjacentElement('afterend', emptyTd);
                }
            } else {
                document.querySelector('#region-main').addEventListener('click', e => {
                    const a = e.target.closest('table tbody tr td.cell.c1 a');
                    if (!a) {
                      return;
                    }

                    e.preventDefault();
                    const url = new URL(a.href);
                    url.searchParams.append('user', userid);
                    window.location.href = url;
                  });
                  analytics(userid, cmid, emailLink, false);
            }
        }
    });

    /**
     * Fetches and displays analytics data for lesson submissions
     * @param {number} userid - The ID of the user whose analytics to fetch
     * @param {number} cmid - The course module ID
     * @param {jQuery|string} emailLink - jQuery object of email link or empty string
     * @param {boolean} grade - Whether this is being called from grade view
     */
    function analytics(userid, cmid, emailLink, grade) {
        let args = { id: userid, modulename: "lesson", cmid: cmid };
        let methodname = 'cursive_get_lesson_submission_data';
        let com = getData([{ methodname, args }]);

        com[0].done(function (json) {
          var data = JSON.parse(json);
          var filepath = data.res.filename || '';

          let analyticButtonDiv = document.createElement('div');
          let analyticsColumn = document.createElement('td');
          analyticButtonDiv.append(
            analyticButton(hasApiKey ? data.res.effort_ratio : "", userid)
          );
          analyticButtonDiv.dataset.region = "analytic-div" + userid;
          analyticsColumn.append(analyticButtonDiv);

          if (grade) {
            analyticButtonDiv.classList.add('w-100');
            const felement = document.querySelector('#fitem_id_response_editor .felement');
            if (felement) {
              felement.insertBefore(analyticButtonDiv, felement.firstChild);
            }
          } else {
            const tr = emailLink.closest('tr');
            if (tr) {
              const cells = tr.querySelectorAll('td');
              if (cells[1]) {
                cells[1].insertAdjacentElement('afterend', analyticsColumn);
              }
            }
          }

          let myEvents = new AnalyticEvents();
          var context = {
            tabledata: data.res,
            formattime: myEvents.formatedTime(data.res),
            page: scoreSetting,
            userid: userid,
            apikey: hasApiKey
          };

          let authIcon = myEvents.authorshipStatus(
            data.res.first_file,
            data.res.score,
            scoreSetting
          );
          myEvents.createModal(userid, context, '', replayInstances, authIcon);
          myEvents.analytics(userid, templates, context, '', replayInstances, authIcon);
          myEvents.checkDiff(userid, data.res.file_id, '', replayInstances);
          myEvents.replyWriting(userid, filepath, '', replayInstances);
        });

        com[0].fail((error) => {
          window.console.error('Error getting cursive config:', error);
        });
      }

};