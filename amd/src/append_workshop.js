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
 * Teacher and participant indicator injector for mod_workshop.
 *
 * @module     tiny_cursive/append_workshop
 * @copyright  2026 Brain Station 23 <sales@brainstation-23.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Replay from './replay';
import {call as getData} from 'core/ajax';
import templates from 'core/templates';
import AnalyticEvents from './analytic_events';
import analyticButton from './analytic_button';
import replayButton from './replay_button';
import {workshopAssessmentView} from 'tiny_cursive/analytics_student_view';

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
                const target = document.getElementById('content' + mid);
                if (target) {
                    target.innerHTML = html;
                }
                return true;
            }).catch(e => window.console.error(e));
        }
        return false;
    };

    const cmid = M.cfg.contextInstanceId;
    const assessments = document.querySelectorAll(
        '#workshop-viewlet-assignedassessments_inner > .generalbox.assessment-summary'
    );

    if (document.body.id === 'page-mod-workshop-submission') {
        const authorLink = document.querySelector(
            '#page-mod-workshop-submission div.author > div.fullname > a'
        )?.getAttribute('href');
        const authorid = authorLink ? new URL(authorLink, window.location.origin).searchParams.get('id') : 0;
        const buttonBox = document.querySelector('div[role="main"]');

        if (authorid && buttonBox) {
            analytics(authorid, cmid, buttonBox);
        }
        workshopAssessmentView(scoreSetting, hasApiKey, null);
    } else {
        assessments.forEach(function(assCard) {
            const authorLink = assCard.querySelector('.author a')?.getAttribute('href');
            const submissionLink = assCard.querySelector('.submission-summary a')?.getAttribute('href');
            const assessmentButton = assCard.querySelector('.singlebutton');

            // Extract authorid from authorLink
            let authorid = 0;
            if (authorLink) {
                const authorUrl = new URL(authorLink, window.location.origin);
                authorid = parseInt(authorUrl.searchParams.get('id'), 10) || 0;
            }

            // Extract submission id from submissionLink
            let submissionid = 0;
            if (submissionLink) {
                const submissionUrl = new URL(submissionLink, window.location.origin);
                submissionid = parseInt(submissionUrl.searchParams.get('id'), 10) || 0;
            }

            if (authorid && submissionid && assessmentButton) {
                assessmentButton.classList.add('d-flex', 'align-items-center');
                analytics(authorid, cmid, assessmentButton);
            }
        });
    }

    /**
     * Fetches and displays analytics data for workshop submissions
     * @param {number} userid - The ID of the user whose analytics to fetch
     * @param {number} cmid - The course module ID
     * @param {Element} assessmentButton - Container element to attach button to
     */
    function analytics(userid, cmid, assessmentButton) {
        const args = {resourceid: cmid, userid: userid, modulename: "workshop", cmid: cmid};
        const methodname = 'tiny_cursive_get_workshop_submission';
        const com = getData([{methodname, args}]);

        com[0].done(function(json) {
            const data = JSON.parse(json);
            let filepath = '';

            if (data.data && data.data.filename) {
                filepath = data.data.filename;
            }

            const analyticButtonDiv = document.createElement('div');

            if (!hasApiKey) {
                analyticButtonDiv.appendChild(replayButton(userid));
            } else {
                analyticButtonDiv.append(analyticButton(data.data.effort_ratio, userid));
            }

            analyticButtonDiv.dataset.region = "analytic-div" + userid;
            analyticButtonDiv.className = 'box py-3 me-1 inline';

            const analyticsEl = analyticButtonDiv.querySelector('#analytics' + userid);
            if (analyticsEl) {
                analyticsEl.style.verticalAlign = 'middle';
            }
            analyticButtonDiv.querySelectorAll('.tiny_cursive-analytics-left, .tiny_cursive-replay-left').forEach(el => {
                el.style.padding = '4px 14px';
            });

            const subFull = assessmentButton.querySelector('.submission-full');
            if (subFull) {
                subFull.insertAdjacentElement('afterend', analyticButtonDiv);
            } else {
                assessmentButton.appendChild(analyticButtonDiv);
            }

            const myEvents = new AnalyticEvents();
            const context = {
                tabledata: data.data,
                formattime: myEvents.formatedTime(data.data),
                page: scoreSetting,
                userid: userid,
                apikey: hasApiKey
            };

            const authIcon = myEvents.authorshipStatus(
                data.data?.user_agent, data.data.first_file, data.data.score, scoreSetting
            );
            myEvents.createModal(userid, context, '', replayInstances, authIcon);
            myEvents.analytics(userid, templates, context, '', replayInstances, authIcon);
            myEvents.checkDiff(userid, data.data.file_id, '', replayInstances, filepath);
            myEvents.replyWriting(userid, filepath, '', replayInstances);
        }).fail((error) => {
            window.console.error('Error getting workshop cursive data:', error);
        });
    }
};
