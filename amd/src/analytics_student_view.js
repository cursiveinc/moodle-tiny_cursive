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
import $ from 'jquery';

const replayInstances = {};
// eslint-disable-next-line camelcase
window.video_playback = function (mid, filepath, questionid = "") {
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
        // eslint-disable-next-line
        templates.render('tiny_cursive/no_submission').then(html => {
            $('#content' + mid).html(html);
        }).catch(e => window.console.error(e));
    }
    return false;
};

export const assignView = (scoreSetting, hasApiKey, userid) => {
    const target = Array.from(document.querySelectorAll('.generaltable th'))
        .find(th => th.textContent.trim().includes('Online text'));
    let cmid = M.cfg.contextInstanceId;
    let args = {id: userid, modulename: 'assign', cmid: cmid};
    let studentData = getStudentData('cursive_user_list_submission_stats', args);
    setStudentView(studentData, hasApiKey, userid, scoreSetting, target, "", "assign");

};

export const quizView = (scoreSetting, hasApiKey, userid) => {

    let queObjects = document.querySelectorAll('.que');
    if (queObjects.length > 0) {
        queObjects.forEach(queObject => {
            let questionid = getQuizQuestionId(queObject.querySelector('.questionflagpostdata'));
            let cmid = M.cfg.contextInstanceId;
            let attemptId = new URLSearchParams(window.location.search).get('attempt');
            let args = {id: attemptId, modulename: "quiz", cmid: cmid, questionid: questionid, userid: userid};
            let studentData = getStudentData('cursive_get_comment_link', args);
            let target = queObject.querySelector('.content .qtext');
            setStudentView(studentData, hasApiKey, userid, scoreSetting, target, questionid, "quiz");

        });
    }
};

export const forumView = (scoreSetting, hasApiKey, userid) => {
    let forumObject = document.querySelectorAll('.forumpost');
    if (forumObject) {
        forumObject.forEach(post => {
            let userId = getForumPostUserId(post);
            if (userId == userid) {
                let postId = post.dataset.postId;
                let cmid = M.cfg.contextInstanceId;
                let args = {id: postId, modulename: "forum", cmid: cmid};
                let studentData = getStudentData('cursive_get_forum_comment_link', args);
                let target = post.querySelector('#post-content-' + postId);
                setStudentView(studentData, hasApiKey, postId, scoreSetting, target, "", "forum");
            }
        });
    }
};

export const lessonView = (scoreSetting, hasApiKey, userid) => {
    const lessonForm = document.querySelector('form:has(.reviewessay) #fitem_id_submitbutton .felement');
    if (lessonForm) {
            let cmid = M.cfg.contextInstanceId;
            let args = {id: userid, modulename: "lesson", cmid: cmid};
            let studentData = getStudentData('cursive_get_lesson_submission_data', args);
            setStudentView(studentData, hasApiKey, userid, scoreSetting, lessonForm, "", "lesson");
    }
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
    data.done(function(studentData) {
        let data = JSON.parse(studentData);
        let analytics = data?.res ?? data.data ;

        if (!analytics[0] && !analytics.filename) {
            return;
        }

        let container = document.createElement('div');
        if (module === "assign") {
            container.className = 'mt-2';
        } else if (module === "lesson"){
            container.className = 'ms-2 text-center';
        } else {
            container.className = 'mt-2 text-center';
        }
        if (!hasApiKey) {
            container.appendChild(replayButton(userid+questionid));
        } else {
            container.appendChild(analyticButton(analytics.effort_ratio, userid, questionid));
        }
        if (module === "forum") {
            target.prepend(container);
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
    let events = new AnalyticEvents();

    var context = {
        tabledata: data,
        formattime: events.formatedTime(data),
        page: scoreSetting,
        userid: userid,
        quizid: questionid,
        apikey: hasApiKey
    };

    let authIcon = events.authorshipStatus(data.first_file, data.score, scoreSetting);
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
    let inputdata = question.value;
    let queryparams = new URLSearchParams(inputdata);
    return queryparams.get('qid');
}

/**
 * Extracts the user ID from a forum post element.
 *
 * @param {HTMLElement} post - The forum post element containing user information
 * @returns {string|null} The user ID extracted from the header link URL parameters, or null if not found
 */
function getForumPostUserId(post) {
    let header = post.querySelector('.header a');
    let url = header.getAttribute('href');
    let queryparams = new URLSearchParams(url.split('?')[1]);
    return queryparams.get('id');
}
