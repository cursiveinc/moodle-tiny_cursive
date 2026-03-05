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
export const init = (scoreSetting, comments, hasApiKey, userid) => {
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

    let container = document.querySelector('.comment-list-container');
    const overviewTable = document.querySelector('table[id^="mod-pdfannotator-"]');

    document.addEventListener('click', handleSubmit);
    const moduleName = document.body.id.split('-')[2];
    var pendingSubmit = false;
    var buttonElement = "";

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
        const action = new URL(window.location.href).searchParams.get('action');

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

            getCursiveAnalytics(userId, commentId, cmid, cols.col1);
        });
    }

    /**
     * Handles the submission and cancellation of comments
     * @param {Event} e - The click event object
     * @description When comment is submitted or cancelled:
     * - Removes 'isEditing' flag from localStorage
     * - Sets pendingSubmit flag appropriately (true for submit, false for cancel)
     */
    function handleSubmit(e) {
        if (e.target.id === 'commentSubmit') {
            localStorage.removeItem('isEditing');
            buttonElement = e.target.value;
            pendingSubmit = true;
        }
        if (e.target.id === 'commentCancel') {
            localStorage.removeItem('isEditing');
            pendingSubmit = false;
        }
    }

    const updateEntries = async(methodname, args) => {
        try {
            const response = await call([{
                methodname,
                args,
            }])[0];
            return response;
        } catch (error) {
            window.console.error('updating Entries:', error);
            throw error;
        }
    };

    /**
     * Extracts the resource ID from a comment ID and updates entries if submission is pending
     * @param {string} id - The ID string to extract resource ID from, expected format: 'prefix_number'
     * @description This function:
     * 1. Parses the resource ID from the given ID string
     * 2. If resource ID exists and there's a pending submission:
     *    - Resets the pending submission flag
     *    - Constructs arguments with context info
     *    - Calls updateEntries to process the PDF annotation
     */
    function extractResourceId(id) {

        // Prevent updating ID while editing a existing entry.
        if (buttonElement === 'Save') {

            pendingSubmit = false;
            return;
        }

        let resourceId = parseInt(id?.split('_')[1]);
        if (resourceId && pendingSubmit) {
            pendingSubmit = false;
            let args = {
                cmid: M.cfg.contextInstanceId,
                userid: M.cfg.userId ?? 0,
                courseid: M.cfg.courseId,
                modulename: moduleName,
                resourceid: resourceId
            };
            updateEntries('cursive_update_pdf_annote_id', args);
        }
    }

    /**
     * Retrieves and displays cursive analytics for a given resource
     * @param {number} userid - The ID of the user
     * @param {number} resourceid - The ID of the resource to get analytics for
     * @param {number} cmid - The course module ID
     * @param {HTMLElement} place - The DOM element where analytics should be placed
     * @description This function:
     * 1. Makes an AJAX call to get forum comment data
     * 2. Creates and inserts analytics/replay buttons
     * 3. Sets up analytics events and modal functionality
     * 4. Handles both API key and non-API key scenarios
     */
    function getCursiveAnalytics(userid, resourceid, cmid, place) {
        let args = {id: resourceid, modulename: "pdfannotator", cmid: cmid};
        let methodname = 'cursive_get_forum_comment_link';
        let com = call([{methodname, args}]);
        com[0].done(function(json) {
            var data = JSON.parse(json);

            var filepath = '';
            if (data.data.filename) {
                filepath = data.data.filename;
            }

            let analyticButtonDiv = document.createElement('div');
            let analyticsColumn = document.createElement('td');

            if (!hasApiKey) {
                analyticButtonDiv.append(replayButton(resourceid));
            } else {
                analyticButtonDiv.append(analyticButton(data.data.effort_ratio, resourceid));
            }

            analyticButtonDiv.dataset.region = "analytic-div" + userid;
            analyticsColumn.append(analyticButtonDiv);
            place.insertAdjacentElement('afterend', analyticsColumn);

            let myEvents = new AnalyticEvents();
            var context = {
                tabledata: data.data,
                formattime: myEvents.formatedTime(data.data),
                page: scoreSetting,
                userid: resourceid,
                apikey: hasApiKey
            };

            let authIcon = myEvents.authorshipStatus(data.data.first_file, data.data.score, scoreSetting);
            myEvents.createModal(resourceid, context, '', replayInstances, authIcon);
            myEvents.analytics(resourceid, templates, context, '', replayInstances, authIcon);
            myEvents.checkDiff(resourceid, data.data.file_id, '', replayInstances);
            myEvents.replyWriting(resourceid, filepath, '', replayInstances);

        });
        com[0].fail((error) => {
            window.console.error('Error getting cursive config:', error);
        });
    }
};