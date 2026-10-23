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
 * Analytics for Student View option in Cursive editor plugin.
 *
 * @module     tiny_cursive/analytics_student_view
 * @copyright  2026 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {call} from 'core/ajax';
import analyticButton from 'tiny_cursive/analytic_button';
import replayButton from 'tiny_cursive/replay_button';
import AnalyticEvents from 'tiny_cursive/analytic_events';
import Replay from 'tiny_cursive/replay';
import templates from 'core/templates';

const replayInstances = {};
// eslint-disable-next-line camelcase
window.video_playback = function(mid, filepath, questionid = "") {
    if (filepath !== '') {
        const replay = new Replay(
            'content' + mid,
            filepath,
            10,
            false,
            'player_' + mid + questionid
        );
        replayInstances[mid] = replay;
    } else {

        templates.render('tiny_cursive/no_submission').then(html => {
            const contentElement = document.getElementById('content' + mid);
            if (contentElement) {
                contentElement.innerHTML = html;
            }
            return true;
        }).catch(e => window.console.error(e));
    }
    return false;
};

export const assignView = (scoreSetting, hasApiKey, userid) => {
    const target = Array.from(document.querySelectorAll('.generaltable th'))
        .find(th => th.textContent.trim().includes('Online text'));
    const cmid = M.cfg.contextInstanceId;
    const args = {id: userid, modulename: 'assign', cmid: cmid};
    const studentData = getStudentData('tiny_cursive_user_list_submission_stats', args);
    setStudentView(studentData, hasApiKey, userid, scoreSetting, target, "", "assign");
};

export const quizView = (scoreSetting, hasApiKey, userid) => {
    const queObjects = document.querySelectorAll('.que');
    if (queObjects.length > 0) {
        queObjects.forEach(queObject => {
            const questionid = getQuizQuestionId(queObject.querySelector('.questionflagpostdata'));
            const cmid = M.cfg.contextInstanceId;
            const attemptId = new URLSearchParams(window.location.search).get('attempt');
            const args = {id: attemptId, modulename: "quiz", cmid: cmid, questionid: questionid, userid: userid};
            const studentData = getStudentData('tiny_cursive_get_comment_link', args);
            const target = queObject.querySelector('.content .qtext');
            setStudentView(studentData, hasApiKey, userid, scoreSetting, target, questionid, "quiz");
        });
    }
};

export const forumView = (scoreSetting, hasApiKey, userid) => {
    const forumObject = document.querySelectorAll('[data-region="post"], .forumpost');
    if (forumObject.length) {
        forumObject.forEach(post => {
            const postUserId = getForumPostUserId(post);
            if (!postUserId || postUserId == userid) {
                const postId = post.dataset.postId || post.id?.replace('p', '');
                const cmid = M.cfg.contextInstanceId;
                const args = {id: postId, modulename: "forum", cmid: cmid};
                const studentData = getStudentData('tiny_cursive_get_forum_comment_link', args);
                const target = post.querySelector('#post-content-' + postId) || post.querySelector('.post-content');
                if (target) {
                    setStudentView(studentData, hasApiKey, postId, scoreSetting, target, "", "forum");
                }
            }
        });
    }
};

export const lessonView = (scoreSetting, hasApiKey, userid) => {
    const lessonForm = document.querySelector('form:has(.reviewessay) #fitem_id_submitbutton .felement');
    if (lessonForm) {
        const cmid = M.cfg.contextInstanceId;
        const args = {id: userid, modulename: "lesson", cmid: cmid};
        const studentData = getStudentData('tiny_cursive_get_lesson_submission_data', args);
        setStudentView(studentData, hasApiKey, userid, scoreSetting, lessonForm, "", "lesson");
    }
};

export const workshopView = (scoreSetting, hasApiKey, userid) => {
    const cmid = M.cfg.contextInstanceId;
    const subLinkEl = document.querySelector('#page-mod-workshop-submission div.submission-full div.title a');
    let submissionId = subLinkEl?.getAttribute('href');
    if (submissionId) {
        submissionId = new URL(submissionId, window.location.origin).searchParams.get('cmid');
    }

    const args = {resourceid: submissionId, userid: userid, modulename: "workshop", cmid: cmid};
    const studentData = getStudentData('tiny_cursive_get_workshop_submission', args);
    const target = document.querySelector('div[role="main"]');
    setStudentView(studentData, hasApiKey, userid, scoreSetting, target, "", "workshop");
};

export const workshopAssessmentView = (scoreSetting, hasApiKey, userid) => {
    const cmid = M.cfg.contextInstanceId;
    let assessmentId = 0;
    if (userid) {
        assessmentId = userid;
    } else {
        const assessmentEl = document.querySelector('#page-mod-workshop-submission div.assessment-full div.title a');
        const assessmentLink = assessmentEl?.getAttribute('href');
        assessmentId = assessmentLink ? new URL(assessmentLink, window.location.origin).searchParams.get('asid') : 0;
    }

    const reviewerEl = document.querySelector('#page-mod-workshop-submission div.assessment-full div.fullname a');
    const reviewerLink = reviewerEl?.getAttribute('href');
    const reviewerId = reviewerLink ? new URL(reviewerLink, window.location.origin).searchParams.get('id') : 0;

    const args = {resourceid: assessmentId, userid: reviewerId, modulename: "workshop", cmid: cmid};
    const studentData = getStudentData('tiny_cursive_get_workshop_submission', args);

    const target = document.querySelector('div[role="main"]');
    setStudentView(studentData, hasApiKey, assessmentId, scoreSetting, target, "", "workshopassessment");
};

export const diaryView = (scoreSetting, hasApiKey, userid) => {
    const cmid = new URL(window.location.href).searchParams.get('id');
    const heading = document.querySelector('[role="main"] .box.generalbox h5');
    if (!heading) {
        return;
    }

    const args = {id: 0, modulename: "diary", cmid: cmid, userid: userid};
    const studentData = getStudentData('tiny_cursive_get_forum_comment_link', args);
    setStudentView(studentData, hasApiKey, userid, scoreSetting, heading, "", "diary");
};

/**
 * Retrieves student data by making an AJAX call to a Moodle web service.
 *
 * @param {string} methodname - The name of the web service method to call
 * @param {Object} arg - The arguments to pass to the web service method
 * @returns {Promise} A promise that resolves with the student data from the web service
 */
function getStudentData(methodname, arg) {
    const request = {
        methodname: methodname,
        args: arg
    };
    return call([request])[0];
}

/**
 * Sets up the student view by processing student data and creating appropriate UI elements.
 *
 * @param {Promise} data - Promise that resolves with student data from the web service
 * @param {boolean} hasApiKey - Whether the API key is available for analytics features
 * @param {string|number} userid - The ID of the user/student
 * @param {string} scoreSetting - The scoring configuration setting
 * @param {HTMLElement} target - The DOM element where the view should be attached
 * @param {string} questionid - Optional question ID for quiz contexts (default: "")
 * @param {string} module - The module type ("assign", "quiz", "forum", etc.) (default: "")
 */
function setStudentView(data, hasApiKey, userid, scoreSetting, target, questionid = "", module = "") {
    if (!target) {
        return;
    }

    data.done(function(studentData) {
        const parsed = JSON.parse(studentData);
        const analytics = parsed?.res ?? parsed.data;

        if (!analytics || (!analytics[0] && !analytics.filename)) {
            return;
        }

        const container = document.createElement('div');
        if (module === "assign") {
            container.className = 'mt-2';
        } else if (module === "lesson") {
            container.className = 'ms-2 text-center';
        } else if (module === "workshop" || module === "workshopassessment") {
            container.className = 'box me-1 inline';
        } else if (module === "diary") {
            container.className = 'mt-2 mb-2';
        } else {
            container.className = 'mt-2 text-center';
        }

        if (!hasApiKey) {
            container.appendChild(replayButton(userid + questionid));
        } else {
            container.appendChild(analyticButton(analytics.effort_ratio, userid, questionid));
        }

        document.querySelectorAll('div[role="main"] .assessment-full').forEach(el => el.classList.add('mt-3'));

        const analyticsEl = container.querySelector('#analytics' + userid);
        if (analyticsEl) {
            analyticsEl.style.verticalAlign = 'middle';
            if (module === 'workshopassessment') {
                analyticsEl.style.marginBottom = '1rem';
            }
            analyticsEl.querySelectorAll('.tiny_cursive-analytics-left, .tiny_cursive-replay-left').forEach(el => {
                el.style.padding = '4px 14px';
            });
        }

        if (module === "forum") {
            target.prepend(container);
        } else if (module === "workshop") {
            const subFull = target.querySelector('.submission-full');
            if (subFull) {
                subFull.insertAdjacentElement('afterend', container);
            } else {
                target.appendChild(container);
            }
        } else if (module === "workshopassessment") {
            const assFull = target.querySelector('.assessment-full');
            if (assFull) {
                assFull.insertAdjacentElement('afterend', container);
            } else {
                target.appendChild(container);
            }
        } else if (module === "diary") {
            target.insertAdjacentElement('afterend', container);
        } else {
            target.appendChild(container);
        }

        initEvents(analytics, hasApiKey, userid, scoreSetting, questionid);
    });
    data.fail(function(error) {
        window.console.error('failed to get student data:', error);
    });
}

/**
 * Initializes analytics events and creates the modal interface for student data visualization.
 *
 * @param {Object} data - The student analytics data containing file information, scores, and timestamps
 * @param {boolean} hasApiKey - Whether the API key is available for analytics features
 * @param {string|number} userid - The ID of the user/student
 * @param {string} scoreSetting - The scoring configuration setting
 * @param {string} questionid - Optional question ID for quiz contexts (default: "")
 */
function initEvents(data, hasApiKey, userid, scoreSetting, questionid = "") {
    const events = new AnalyticEvents();

    const context = {
        tabledata: data,
        formattime: events.formatedTime(data),
        page: scoreSetting,
        userid: userid,
        quizid: questionid,
        apikey: hasApiKey
    };

    const authIcon = events.authorshipStatus(data.user_agent, data.first_file, data.score, scoreSetting);
    events.createModal(userid, context, questionid, replayInstances, authIcon);
    events.analytics(userid, templates, context, questionid, replayInstances, authIcon);
    events.checkDiff(userid, data.file_id, questionid, replayInstances, data.filename);
    events.replyWriting(userid, data.filename, questionid, replayInstances);
}

/**
 * Extracts the question ID from a quiz question flag post data element.
 *
 * @param {HTMLElement} question - The question flag post data element containing the question parameters
 * @returns {string|null} The question ID (qid) extracted from the URL parameters, or null if not found
 */
function getQuizQuestionId(question) {
    if (!question) {
        return null;
    }
    const inputdata = question.value;
    const queryparams = new URLSearchParams(inputdata);
    return queryparams.get('qid');
}

/**
 * Extracts the user ID from a forum post element.
 *
 * @param {HTMLElement} post - The forum post element containing user information
 * @returns {string|null} The user ID extracted from the header link URL parameters, or null if not found
 */
function getForumPostUserId(post) {
    const authorLink = post.querySelector(
        '[data-region="author-name"][href], .author-name[href], .header a[href*="/user/"]'
    );
    if (!authorLink?.href) {
        return null;
    }
    return new URL(authorLink.href, window.location.origin).searchParams.get('id');
}