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
import { call as getContent } from "core/ajax";
import { get_string as getString } from 'core/str';
import { get_strings as getStrings } from 'core/str';

export default class AnalyticEvents {

    constructor() {
        getString('notenoughtinfo', 'tiny_cursive').then(str => {
            localStorage.setItem('notenoughtinfo', str);
            return str;
        });
    }

    createModal(userid, context, questionid = '', replayInstances = null, authIcon) {
        const element = document.getElementById('analytics' + userid + questionid);
        if (element) {
            element.addEventListener('click', function (e) {
                e.preventDefault();

                myModal.create({ templateContext: context }).then(modal => {
                    const content = document.querySelector('#content' + userid +
                        ' .tiny_cursive_table tbody tr:first-child td:nth-child(2)');
                    if (content) {
                        content.innerHTML = authIcon.outerHTML;
                    }
                    modal.show();

                    const moreBtn = document.querySelector('body #more' + userid + questionid);

                    if (moreBtn) {
                        document
                            .querySelectorAll('.tiny_cursive-nav-tab .active')
                            .forEach(el => el.classList.remove('active'));

                        const analyticBtn = document.getElementById('analytic' + userid + questionid);
                        const diffBtn = document.getElementById('diff' + userid + questionid);

                        if (analyticBtn) {
                            analyticBtn.disabled = true;
                            analyticBtn.style.backgroundColor = 'rgba(168, 168, 168, 0.133)';
                            analyticBtn.style.cursor = 'not-allowed';
                        }

                        if (diffBtn) {
                            diffBtn.disabled = true;
                            diffBtn.style.backgroundColor = 'rgba(168, 168, 168, 0.133)';
                            diffBtn.style.cursor = 'not-allowed';
                        }

                        moreBtn.addEventListener('click', function () {
                            document
                                .querySelectorAll('.tiny_cursive-nav-tab .active')
                                .forEach(el => el.classList.remove('active'));

                            this.classList.add('active');

                            const repBtn = document.getElementById('rep' + userid + questionid);
                            if (repBtn) {
                                repBtn.disabled = false;
                            }
                            if (replayInstances && replayInstances[userid]) {
                                replayInstances[userid].stopReplay();
                            }
                        });
                    }

                }).catch(error => {
                    window.console.error("Failed to create modal:", error);
                });
            });
        }
    }

    analytics(userid, templates, context, questionid = '', replayInstances = null, authIcon) {
        document.body.addEventListener('click', function (e) {
            if (e.target && e.target.id === 'analytic' + userid + questionid) {
                e.preventDefault();

                if (e.target.disabled) {
                    return;
                }

                const repBtn = document.getElementById('rep' + userid + questionid);
                if (repBtn) {
                    repBtn.disabled = false;
                }

                const qualityBtn = document.getElementById('quality' + userid + questionid);
                if (qualityBtn) {
                    qualityBtn.disabled = false;
                }

                const content = document.getElementById('content' + userid);
                if (content) {
                    content.setAttribute('data-label', 'analytics');
                    content.classList.remove('tiny_cursive_outputElement');
                    content.classList.add('tiny_cursive');
                    content.setAttribute('data-label', 'analytics');

                    const player = document.getElementById('player_' + userid + questionid);
                    if (player) {
                        player.style.display = 'none';
                    }

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

                templates.render('tiny_cursive/analytics_table', context).then(function (html) {
                    const content = document.getElementById('content' + userid);
                    if (content) {
                        content.innerHTML = html;
                    }
                    const table = document.querySelector('#content' + userid + ' .tiny_cursive_table');
                    const firstRow = table.querySelector('tbody tr:first-child');
                    const firstCell = firstRow.querySelector('td:nth-child(2)');

                    if (firstCell) {
                        firstCell.innerHTML = authIcon.outerHTML;
                    }
                    return true;
                }).catch(function (error) {
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

        document.body.addEventListener('click', function (e) {
            if (e.target && e.target.id === 'diff' + userid + questionid) {
                e.preventDefault();

            if (e.target.disabled) {
                return;
            }

                // Enable rep and quality elements
                const repElement = document.getElementById('rep' + userid + questionid);
                if (repElement) {
                    repElement.disabled = false;
                }

                const qualityElement = document.getElementById('quality' + userid + questionid);
                if (qualityElement) {
                    qualityElement.disabled = false;
                }

                // Update content element attributes and classes
                const content = document.getElementById('content' + userid);
                if (content) {
                    content.setAttribute('data-label', 'diff');
                    content.classList.remove('tiny_cursive_outputElement');
                    content.classList.add('tiny_cursive');
                    content.innerHTML = '';
                    const loaderDiv = document.createElement('div');
                    loaderDiv.className = 'd-flex justify-content-center my-5';
                    const loader = document.createElement('div');
                    loader.className = 'tiny_cursive-loader';
                    loaderDiv.appendChild(loader);
                    content.appendChild(loaderDiv);
                }

                // Hide player element
                const player = document.getElementById('player_' + userid + questionid);
                if (player) {
                    player.style.display = 'none';
                }

                // Update active tab
                document.querySelectorAll('.tiny_cursive-nav-tab .active').forEach(el => el.classList.remove('active'));
                e.target.classList.add('active');

                // Stop replay if applicable
                if (replayInstances && replayInstances[userid]) {
                    replayInstances[userid].stopReplay();
                }

                // Check for missing fileid
                if (!fileid) {
                    if (content) {
                        content.innerHTML = '';
                        content.appendChild(nodata);
                    }
                    throw new Error('Missing file id or Difference Content not received yet');
                }

                // Fetch content
                getContent([{
                    methodname: 'cursive_get_writing_differences',
                    args: { fileid: fileid },
                }])[0].then(response => {
                    let responsedata = JSON.parse(response.data);
                    if (responsedata) {
                        let submittedText = atob(responsedata.submitted_text);

                        // Fetch dynamic strings
                        getStrings([
                            { key: 'original_text', component: 'tiny_cursive' },
                            { key: 'editspastesai', component: 'tiny_cursive' }
                        ]).then(strings => {
                            const originalTextString = strings[0];
                            const editsPastesAIString = strings[1];

                            // Create comment box
                            const commentBox = document.createElement('div');
                            commentBox.className = 'p-2 border rounded mb-2';

                            // Paste count
                            const pasteCountDiv = document.createElement('div');
                            getString('pastecount', 'tiny_cursive').then(str => {
                                pasteCountDiv.innerHTML = `<div><strong>${str} :</strong> ${responsedata.commentscount}</div>`;
                                return true;
                            }).catch(error => window.console.log(error));

                            // Comments header
                            const commentsDiv = document.createElement('div');
                            commentsDiv.className = 'border-bottom';
                            getString('comments', 'tiny_cursive').then(str => {
                                commentsDiv.innerHTML = `<strong>${str}</strong>`;
                                return true;
                            }).catch(error => window.console.error(error));

                            // Comments list
                            const commentsList = document.createElement('div');
                            const comments = responsedata.comments;
                            for (let index in comments) {
                                const commentDiv = document.createElement('div');
                                commentDiv.style.cssText = 'word-wrap: break-word; word-break: break-word';
                                commentDiv.className = 'shadow-sm p-1 my-1';
                                commentDiv.textContent = comments[index].usercomment;
                                commentsList.appendChild(commentDiv);
                            }

                            commentBox.appendChild(pasteCountDiv);
                            commentBox.appendChild(commentsDiv);
                            commentBox.appendChild(commentsList);

                            // Create legend
                            const legend = document.createElement('div');
                            legend.className = 'd-flex p-2 border rounded mb-2';

                            // First legend item
                            const attributedItem = document.createElement('div');
                            attributedItem.className = 'tiny_cursive-legend-item';
                            const attributedBox = document.createElement('div');
                            attributedBox.className = 'tiny_cursive-box attributed';
                            const attributedText = document.createElement('span');
                            attributedText.textContent = originalTextString;
                            attributedItem.appendChild(attributedBox);
                            attributedItem.appendChild(attributedText);

                            // Second legend item
                            const unattributedItem = document.createElement('div');
                            unattributedItem.className = 'tiny_cursive-legend-item';
                            const unattributedBox = document.createElement('div');
                            unattributedBox.className = 'tiny_cursive-box tiny_cursive_added';
                            const unattributedText = document.createElement('span');
                            unattributedText.textContent = editsPastesAIString;
                            unattributedItem.appendChild(unattributedBox);
                            unattributedItem.appendChild(unattributedText);

                            legend.appendChild(attributedItem);
                            legend.appendChild(unattributedItem);

                            // Create content block
                            const contents = document.createElement('div');
                            contents.className = 'tiny_cursive-comparison-content';
                            const textBlock2 = document.createElement('div');
                            textBlock2.className = 'tiny_cursive-text-block';
                            const reconstructedText = document.createElement('div');
                            reconstructedText.id = 'tiny_cursive-reconstructed_text';
                            reconstructedText.innerHTML = JSON.parse(submittedText);
                            textBlock2.appendChild(reconstructedText);

                            contents.appendChild(commentBox);
                            contents.appendChild(legend);
                            contents.appendChild(textBlock2);

                            if (content) {
                                content.innerHTML = '';
                                content.appendChild(contents);
                            }
                        }).catch(error => {
                            window.console.error("Failed to load language strings:", error);
                            if (content) {
                                content.innerHTML = '';
                                content.appendChild(nodata);
                            }
                        });
                    } else {
                        if (content) {
                            content.innerHTML = '';
                            content.appendChild(nodata);
                        }
                    }
                }).catch(error => {
                    if (content) {
                        content.innerHTML = '';
                        content.appendChild(nodata);
                    }
                    throw new Error('Error loading JSON file: ' + error.message);
                });
            }
        });
    }

    replyWriting(userid, filepath, questionid = '', replayInstances = null) {
        document.body.addEventListener('click', function (e) {
          if (e.target && e.target.id === 'rep' + userid + questionid) {
            e.preventDefault();

            const replyBtn = document.getElementById('rep' + userid + questionid);
            const qualityBtn = document.getElementById('quality' + userid + questionid);
            const content = document.getElementById('content' + userid);
            const player = document.getElementById('player_' + userid + questionid);
            const replayControls = document.getElementById('replayControls_' + userid + questionid);

            if (filepath) {
              if (replayControls) {
                replayControls.classList.remove('d-none');
              }
              if (content) {
                content.classList.add('tiny_cursive_outputElement');
              }
            }

            if (replyBtn) {
                replyBtn.disabled = true;
            }
            if (qualityBtn) {
                qualityBtn.disabled = false;
            }

            if (content) {
                content.dataset.label = 'replay';
            }
            if (player) {
              player.style.display = 'block';
              player.style.paddingRight = '8px';
            }

            if (content) {
              content.innerHTML = `
                <div class="d-flex justify-content-center my-5">
                  <div class="tiny_cursive-loader"></div>
                </div>`;
            }

            document
              .querySelectorAll('.tiny_cursive-nav-tab .active')
              .forEach(el => el.classList.remove('active'));
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
        }

        const iconElement = document.createElement('i');
        iconElement.className = icon;
        iconElement.style = color;

        if (score < scoreSetting) {
            iconElement.className = 'fa fa-question-circle';
            iconElement.style = 'font-size:32px;color:#A9A9A9';
            iconElement.setAttribute('title', localStorage.getItem('notenoughtinfo'));
        }

        return iconElement;
    }
}
