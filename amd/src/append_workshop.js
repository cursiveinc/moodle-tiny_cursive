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
 * TODO describe module append_workshop
 *
 * @module     tiny_cursive/append_workshop
 * @copyright  2026 Brain Station 23 <sales@brainstation-23.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Replay from './replay';
import $ from 'jquery';
import {call as getData} from 'core/ajax';
import templates from 'core/templates';
import AnalyticEvents from './analytic_events';
import analyticButton from './analytic_button';
import replayButton from './replay_button';

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
                $('#content' + mid).html(html);
                return true;
            }).catch(e => window.console.error(e));
        }
        return false;

    };


    var cmid = M.cfg.contextInstanceId;
    var assessments = $('#workshop-viewlet-assignedassessments_inner > .generalbox.assessment-summary');

    if(document.body.id === 'page-mod-workshop-submission') {
        const submission = $('#page-mod-workshop-submission div.author > div.fullname > a')?.attr('href');
        const authorid = submission ? new URL(submission, window.location.origin).searchParams.get('id') : 0;
        const buttonBox = $('div[role="main"]');

        if (authorid) {
            analytics(authorid, cmid, buttonBox);
        }
    }   else {

        assessments.each(function() {

                const assCard = $(this);
                const authorLink = assCard.find('.author a')?.attr('href');
                const submissionLink = assCard.find('.submission-summary a')?.attr('href');
                const assessmentButton = assCard.find('.singlebutton');

                // Extract authorid from authorLink
                let authorid = 0;
                if (authorLink) {
                    const authorUrl = new URL(authorLink, window.location.origin);
                    authorid = parseInt(authorUrl.searchParams.get('id')) || 0;
                }

                // Extract submission id from submissionLink
                let submissionid = 0;
                if (submissionLink) {
                    const submissionUrl = new URL(submissionLink, window.location.origin);
                    submissionid = parseInt(submissionUrl.searchParams.get('id')) || 0;
                }

                if (authorid && submissionid && assessmentButton) {
                    assessmentButton.addClass('d-flex align-items-center');
                    analytics(authorid, cmid, assessmentButton);
                }
            });
    }

    /**
     * Fetches and displays analytics data for lesson submissions
     * @param {number} userid - The ID of the user whose analytics to fetch
     * @param {number} cmid - The course module ID
     * @param {jQuery|string} assessmentButton - jQuery object of email link or empty string
     */
    function analytics(userid, cmid, assessmentButton) {

        let args = {id: userid, modulename: "workshop", cmid: cmid};
        let methodname = 'cursive_get_lesson_submission_data';
        let com = getData([{methodname, args}]);
        com[0].done(function(json) {

            var data = JSON.parse(json);
            var filepath = '';

            if (data.res.filename) {
                filepath = data.res.filename;
            }

            let analyticButtonDiv = document.createElement('div');

            if (!hasApiKey) {
                $(analyticButtonDiv).html(replayButton(userid));
            } else {
                analyticButtonDiv.append(analyticButton(data.res.effort_ratio, userid));
            }

            analyticButtonDiv.dataset.region = "analytic-div" + userid;

            $(analyticButtonDiv).addClass('box py-3 me-1 inline');
            $(analyticButtonDiv).find('#analytics'+userid).css('vertical-align', 'middle');
            $(analyticButtonDiv).find('#analytics' + userid + ' .tiny_cursive-analytics-left').css('padding', '4px 14px');
            $(analyticButtonDiv).find('#analytics' + userid + ' .tiny_cursive-replay-left').css('padding', '4px 14px');

            $(analyticButtonDiv).find('.tiny_cursive-analytics-left').css('padding', '4px 14px');
            $(analyticButtonDiv).find('.tiny_cursive-replay-left').css('padding', '4px 14px');


            assessmentButton.append(analyticButtonDiv);

            let myEvents = new AnalyticEvents();
            var context = {
                tabledata: data.res,
                formattime: myEvents.formatedTime(data.res),
                page: scoreSetting,
                userid: userid,
                apikey: hasApiKey
            };

            let authIcon = myEvents.authorshipStatus(data.res.first_file, data.res.score, scoreSetting);
            myEvents.createModal(userid, context, '', replayInstances, authIcon);
            myEvents.analytics(userid, templates, context, '', replayInstances, authIcon);
            myEvents.checkDiff(userid, data.res.file_id, '', replayInstances, filepath);
            myEvents.replyWriting(userid, filepath, '', replayInstances);

        });
        com[0].fail((error) => {
            window.console.error('Error getting cursive config:', error);
        });
    }
};