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
 * Module for handling analytics events in the Tiny Cursive plugin.
 * Provides functionality for displaying analytics data, replaying writing,
 * checking differences.
 *
 * @module     tiny_cursive/analytic_events
 * @copyright  2024 CTI <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import myModal from "./analytic_modal";
import {call as getContent} from "core/ajax";
import {get_string as getString} from 'core/str';
import {get_strings as getStrings} from 'core/str';

export default class AnalyticEvents {

    createModal(userid, context, questionid = '', authIcon) {
        const element = document.getElementById('analytics' + userid + questionid);
        if (element) {
            element.addEventListener('click', function(e) {
                e.preventDefault();

                // Create Moodle modal
                myModal.create({ templateContext: context }).then(modal => {
                    const content = document.querySelector('#content' + userid +
                        ' .tiny_cursive_table tbody tr:first-child td:nth-child(2)');
                    if (content) {
                        content.innerHTML = authIcon.outerHTML;
                    }
                    modal.show();
                }).catch(error => {
                    window.console.error("Failed to create modal:", error);
                });
            });
        }
    }

    analytics(userid, templates, context, questionid = '', replayInstances = null, authIcon) {
        document.body.addEventListener('click', function(e) {
            if (e.target && e.target.id === 'analytic' + userid + questionid) {

                const repElement = document.getElementById('rep' + userid + questionid);
                if (repElement.getAttribute('disabled') === 'true') {
                    repElement.setAttribute('disabled', 'false');
                }

                e.preventDefault();

                const content = document.getElementById('content' + userid);
                if (content) {
                    content.innerHTML = '';
                    const loaderDiv = document.createElement('div');
                    loaderDiv.className = 'd-flex justify-content-center my-5';
                    const loader = document.createElement('div');
                    loader.className = 'tiny_cursive-loader';
                    loaderDiv.appendChild(loader);
                    content.appendChild(loaderDiv);
                }

                if (replayInstances && replayInstances[userid]) {
                    replayInstances[userid].stopReplay();
                }

                document.querySelectorAll('.tiny_cursive-nav-tab .active').forEach(el => el.classList.remove('active'));
                e.target.classList.add('active');

                templates.render('tiny_cursive/analytics_table', context).then(function(html) {
                    const content = document.getElementById('content' + userid);
                    if (content) {
                        content.innerHTML = html;
                    }
                    const firstCell = document.querySelector('#content' + userid +
                        ' .tiny_cursive_table tbody tr:first-child td:nth-child(2)');
                    if (firstCell) {
                        firstCell.innerHTML = authIcon.outerHTML;
                    }
                }).catch(function(error) {
                    window.console.error("Failed to render template:", error);
                });
            }
        });
    }

    checkDiff(userid, fileid, questionid = '', replayInstances = null) {
        const nodata = document.createElement('p');
        nodata.classList.add('tiny_cursive_nopayload', 'bg-light');

        getString('nopaylod', 'tiny_cursive').then(str => {
            nodata.textContent = str;
            return true;
        }).catch(error => window.console.log(error));

        document.body.addEventListener('click', function(e) {
            if (e.target && e.target.id === 'diff' + userid + questionid) {

                const repElement = document.getElementById('rep' + userid + questionid);
                if (repElement.getAttribute('disabled') === 'true') {
                    repElement.setAttribute('disabled', 'false');
                }

                e.preventDefault();

                const content = document.getElementById('content' + userid);
                if (content) {
                    content.innerHTML = '';
                    const loaderDiv = document.createElement('div');
                    loaderDiv.className = 'd-flex justify-content-center my-5';
                    const loader = document.createElement('div');
                    loader.className = 'tiny_cursive-loader';
                    loaderDiv.appendChild(loader);
                    content.appendChild(loaderDiv);
                }

                document.querySelectorAll('.tiny_cursive-nav-tab .active').forEach(el => el.classList.remove('active'));
                e.target.classList.add('active');

                if (replayInstances && replayInstances[userid]) {
                    replayInstances[userid].stopReplay();
                }

                if (!fileid) {
                    const content = document.getElementById('content' + userid);
                    if (content) {
                        content.innerHTML = nodata.outerHTML;
                    }
                    throw new Error('Missing file id or Difference Content not received yet');
                }

                getContent([{
                    methodname: 'cursive_get_writing_differences',
                    args: { fileid: fileid },
                }])[0].done(response => {
                    let responsedata = JSON.parse(response.data);
                    if (responsedata) {
                        let submittedText = atob(responsedata.submitted_text);

                        // Fetch the dynamic strings
                        getStrings([
                            { key: 'original_text', component: 'tiny_cursive' },
                            { key: 'editspastesai', component: 'tiny_cursive' }
                        ]).done(strings => {
                            const originalTextString = strings[0];
                            const editsPastesAIString = strings[1];

                            const commentBox = document.createElement('div');
                            commentBox.className = 'p-2 border rounded mb-2';

                            const pasteCountDiv = document.createElement('div');
                            getString('pastecount', 'tiny_cursive').then(str => {
                                pasteCountDiv.innerHTML = ('<div><strong>' + str +
                                    ' :</strong> ' + responsedata.commentscount + '</div>');
                                return true;
                            }).catch(error => window.console.log(error));

                            const commentsDiv = document.createElement('div');
                            getString('comments', 'tiny_cursive').then(str => {
                                commentsDiv.innerHTML = ('<strong>' + str + '</strong>');
                                return true;
                            }).catch(error => window.console.error(error));

                            const commentsList = document.createElement('div');

                            const comments = responsedata.comments;
                            for (let index in comments) {
                                const commentDiv = document.createElement('div');
                                commentDiv.className = 'shadow-sm p-1 my-1';
                                commentDiv.textContent = comments[index].usercomment;
                                commentsList.appendChild(commentDiv);
                            }

                            commentBox.appendChild(pasteCountDiv);
                            commentBox.appendChild(commentsDiv);
                            commentBox.appendChild(commentsList);


                            const legend = document.createElement('div');
                            legend.className = 'd-flex p-2 border rounded mb-2';

                            // Create the first legend item
                            const attributedItem = document.createElement('div');
                            attributedItem.className = 'tiny_cursive-legend-item';
                            const attributedBox = document.createElement('div');
                            attributedBox.className = 'tiny_cursive-box attributed';
                            const attributedText = document.createElement('span');
                            attributedText.textContent = originalTextString;
                            attributedItem.appendChild(attributedBox);
                            attributedItem.appendChild(attributedText);

                            // Create the second legend item
                            const unattributedItem = document.createElement('div');
                            unattributedItem.className = 'tiny_cursive-legend-item';
                            const unattributedBox = document.createElement('div');
                            unattributedBox.className = 'tiny_cursive-box tiny_cursive_added';
                            const unattributedText = document.createElement('span');
                            unattributedText.textContent = editsPastesAIString;
                            unattributedItem.appendChild(unattributedBox);
                            unattributedItem.appendChild(unattributedText);

                            // Append the legend items to the legend container
                            legend.appendChild(attributedItem);
                            legend.appendChild(unattributedItem);

                            let contents = document.createElement('div');
                            contents.className = 'tiny_cursive-comparison-content';
                            let textBlock2 = document.createElement('div');
                            textBlock2.className = 'tiny_cursive-text-block';
                            textBlock2.innerHTML = `<div id="tiny_cursive-reconstructed_text">${JSON.parse(submittedText)}</div>`;

                            contents.appendChild(commentBox);
                            contents.appendChild(legend);
                            contents.appendChild(textBlock2);

                            const content = document.getElementById('content' + userid);
                            if (content) {
                                content.innerHTML = contents.outerHTML;
                            }
                        }).catch(error => {
                            window.console.error("Failed to load language strings:", error);
                            const content = document.getElementById('content' + userid);
                            if (content) {
                                content.innerHTML = nodata.outerHTML;
                            }
                        });
                    } else {
                        const content = document.getElementById('content' + userid);
                        if (content) {
                            content.innerHTML = nodata.outerHTML;
                        }
                    }
                }).catch(error => {
                    const content = document.getElementById('content' + userid);
                    if (content) {
                        content.innerHTML = nodata.outerHTML;
                    }
                    throw new Error('Error loading JSON file: ' + error.message);
                });
            }
        });
    }

    replyWriting(userid, filepath, questionid = '', replayInstances = null) {
        document.body.addEventListener('click', function(e) {
            if (e.target && e.target.id === 'rep' + userid + questionid) {
                let replyBtn = document.getElementById('rep' + userid + questionid);

                if (replyBtn.getAttribute('disabled') == 'true') {
                    return;
                }
                replyBtn.setAttribute('disabled', 'true');

                e.preventDefault();

                const content = document.getElementById('content' + userid);
                if (content) {
                    content.innerHTML = '';
                    const loaderDiv = document.createElement('div');
                    loaderDiv.className = 'd-flex justify-content-center my-5';
                    const loader = document.createElement('div');
                    loader.className = 'tiny_cursive-loader';
                    loaderDiv.appendChild(loader);
                    content.appendChild(loaderDiv);
                }

                document.querySelectorAll('.tiny_cursive-nav-tab .active').forEach(el => el.classList.remove('active'));
                e.target.classList.add('active');

                if (replayInstances && replayInstances[userid]) {
                    replayInstances[userid].stopReplay();
                }

                if (questionid) {
                     // eslint-disable-next-line
                    video_playback(userid, filepath, questionid);
                } else {
                     // eslint-disable-next-line
                    video_playback(userid, filepath);
                }
            }
        });
    }

    formatedTime(data) {
        if (data.total_time_seconds) {
            let totalTimeSeconds = data.total_time_seconds;
            let hours = Math.floor(totalTimeSeconds / 3600).toString().padStart(2, 0);
            let minutes = Math.floor((totalTimeSeconds % 3600) / 60).toString().padStart(2, 0);
            let seconds = (totalTimeSeconds % 60).toString().padStart(2, 0);
            return `${hours}h ${minutes}m ${seconds}s`;
        } else {
            return "0h 0m 0s";
        }
    }

    authorshipStatus(firstFile, score, scoreSetting) {
        var icon = 'fa fa-circle-o';
        var color = 'font-size:32px;color:black';
        score = parseFloat(score);

        if (firstFile) {
            icon = 'fa fa-solid fa-info-circle';
            color = 'font-size:32px;color:#000000';
        } else if (score >= scoreSetting) {
            icon = 'fa fa-check-circle';
            color = 'font-size:32px;color:green';
        } else if (score < scoreSetting) {
            icon = 'fa fa-question-circle';
            color = 'font-size:32px;color:#A9A9A9';
        }

        const iconElement = document.createElement('i');
        iconElement.className = icon;
        iconElement.style = color;
        return iconElement;
    }
}
