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
 * Module for handling PDF annotator functionality,
 *
 * @module     tiny_cursive/append_pdfannotator
 * @copyright  2025 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {call} from 'core/ajax';
import analyticButton from 'tiny_cursive/analytic_button';
import replayButton from 'tiny_cursive/replay_button';
import AnalyticEvents from 'tiny_cursive/analytic_events';
import templates from 'core/templates';
import Replay from 'tiny_cursive/replay';

let submissionLinkingInitialized = false;

/**
 * Link a newly-created PDF Annotator comment to its pending Cursive capture.
 *
 * This must be initialized independently from the optional student analytics view. The guard
 * prevents duplicate handlers when the analytics initializer is also loaded on the same page.
 */
const linkSubmission = () => {
    if (submissionLinkingInitialized) {
        return;
    }
    submissionLinkingInitialized = true;

    const container = document.querySelector('.comment-list-container');
    const moduleName = document.body.id.split('-')[2];
    let pendingSubmit = false;
    let buttonElement = '';

    document.addEventListener('click', event => {
        if (event.target.id === 'commentSubmit') {
            localStorage.removeItem('isEditing');
            buttonElement = event.target.value;
            pendingSubmit = true;
        }
        if (event.target.id === 'commentCancel') {
            localStorage.removeItem('isEditing');
            pendingSubmit = false;
        }
    });

    if (container) {
        const observer = new MutationObserver(() => {
            if (container?.lastChild?.id) {
                extractResourceId(container.lastChild.id);
            }
        });

        observer.observe(container, {
            subtree: true,
            childList: true
        });
    }

    /**
     * Extract the new comment ID and update the pending capture.
     *
     * @param {string} id Comment element ID in the form 'prefix_number'.
     */
    function extractResourceId(id) {
        // Do not relink an existing comment while it is being edited.
        if (buttonElement === 'Save') {
            pendingSubmit = false;
            return;
        }

        const resourceId = parseInt(id?.split('_')[1]);
        if (resourceId && pendingSubmit) {
            pendingSubmit = false;
            call([{
                methodname: 'tiny_cursive_update_pdf_annote_id',
                args: {
                    cmid: M.cfg.contextInstanceId,
                    userid: M.cfg.userId ?? 0,
                    courseid: M.cfg.courseId,
                    modulename: moduleName,
                    resourceid: resourceId
                },
            }])[0].catch(error => window.console.error('Updating PDF annotation entries:', error));
        }
    }
};

export const studentView = (scoreSetting, hasApiKey, userid) => {
    linkSubmission();
    init(scoreSetting, false, hasApiKey, userid, true);
};

export const init = (scoreSetting, comments, hasApiKey, userid, studentOnly = false, linkOnly = false) => {
    linkSubmission();
    if (linkOnly) {
        return;
    }
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
                document.getElementById('content' + mid).innerHTML = html;
                return true;
            }).catch(e => window.console.error(e));
        }
        return false;
    };

    const overviewTable = document.querySelector('table[id^="mod-pdfannotator-"]');

    if (overviewTable) {
        let newChild = document.createElement('th');
        newChild.textContent = 'Analytics';
        let header = overviewTable.querySelector('thead>tr>th:first-child');
        header.insertAdjacentElement('afterend', newChild);
        setReplayButton(overviewTable);
    }

    /**
     * Sets up replay buttons and analytics for each row in the overview table
     * @param {HTMLTableElement} overviewTable - The table element containing the overview data
     * @description This function:
     * 1. Gets all rows from the table
     * 2. For each row:
     *    - Extracts comment ID and user ID from relevant links
     *    - Adds analytics column with replay/analytics buttons
     *    - Sets up cursive analytics functionality
     */
    function setReplayButton(overviewTable) {
        const rows = overviewTable.querySelectorAll('tbody > tr');
        let action = new URL(window.location.href).searchParams.get('action');
        if (action === 'overview') {
            action = 'overviewquestions';
        }

        rows.forEach(row => {
            const cols = {
                col1: row.querySelector('td:nth-child(1)'),
                col2: row.querySelector('td:nth-child(2)'),
                col3: row.querySelector('td:nth-child(3)')
            };

            const links = {
                link1: cols.col1?.querySelector('a'),
                link2: cols.col2?.querySelector('a'),
                link3: cols.col3?.querySelector('a')
            };

            // Extract comment ID safely
            const commentId = links.link1?.href ?
                new URL(links.link1.href).searchParams.get('commid') : null;
            const cmid = links.link1?.href ?
                new URL(links.link1.href).searchParams.get('id') : M.cfg.contextInstanceId;
            // Extract user ID based on action
            let userId = null;
            let userLink = null;

            switch (action) {
                case 'overviewquestions':
                    userLink = links.link2;
                    break;
                case 'overviewanswers':
                    userLink = links.link3;
                    break;
                default:
                    userId = userid;
            }

            if (userLink?.href) {
                try {
                    userId = new URL(userLink.href).searchParams.get('id');
                } catch (e) {
                    window.console.warn('Error parsing user URL:', e);
                }
            }

            const analyticsColumn = document.createElement('td');
            if (!cols.col1) {
                return;
            }
            cols.col1.insertAdjacentElement('afterend', analyticsColumn);

            if (studentOnly && userId !== null && String(userId) !== String(userid)) {
                return;
            }

            getCursiveAnalytics(userId, commentId, cmid, analyticsColumn, studentOnly);
        });
    }

    /**
     * Retrieves and displays cursive analytics for a given resource
     * @param {number} userid - The ID of the user
     * @param {number} resourceid - The ID of the resource to get analytics for
     * @param {number} cmid - The course module ID
     * @param {HTMLTableCellElement} analyticsColumn - The table cell where analytics should be placed
     * @param {boolean} requireOwnData - Whether to skip rows without current-user Cursive data
     * @description This function:
     * 1. Makes an AJAX call to get forum comment data
     * 2. Creates and inserts analytics/replay buttons
     * 3. Sets up analytics events and modal functionality
     * 4. Handles both API key and non-API key scenarios
     */
    function getCursiveAnalytics(userid, resourceid, cmid, analyticsColumn, requireOwnData = false) {
        if (!resourceid || !cmid || !analyticsColumn) {
            return;
        }
        let args = {id: resourceid, modulename: "pdfannotator", cmid: cmid};
        let methodname = 'tiny_cursive_get_forum_comment_link';
        let com = call([{methodname, args}]);
        com[0].done(function(json) {
            var data = JSON.parse(json);

            // Student requests are filtered by the external function. Do not render an empty
            // analytics control for another user's row or a comment without Cursive data.
            if (requireOwnData && !data.data.filename) {
                return;
            }

            var filepath = '';
            if (data.data.filename) {
                filepath = data.data.filename;
            }

            let analyticButtonDiv = document.createElement('div');

            if (!hasApiKey) {
                analyticButtonDiv.append(replayButton(resourceid));
            } else {
                analyticButtonDiv.append(analyticButton(data.data.effort_ratio, resourceid));
            }

            analyticButtonDiv.dataset.region = "analytic-div" + userid;
            analyticsColumn.append(analyticButtonDiv);

            let myEvents = new AnalyticEvents();
            var context = {
                tabledata: data.data,
                formattime: myEvents.formatedTime(data.data),
                page: scoreSetting,
                userid: resourceid,
                apikey: hasApiKey
            };

            let authIcon = myEvents.authorshipStatus(data.data?.user_agent, data.data.first_file, data.data.score, scoreSetting);
            myEvents.createModal(resourceid, context, '', replayInstances, authIcon);
            myEvents.analytics(resourceid, templates, context, '', replayInstances, authIcon);
            myEvents.checkDiff(resourceid, data.data.file_id, '', replayInstances, filepath);
            myEvents.replyWriting(resourceid, filepath, '', replayInstances);

        });
        com[0].fail((error) => {
            window.console.error('Error getting cursive config:', error);
        });
    }
};
