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
 * checking differences and showing quality metrics.
 *
 * @module     tiny_cursive/analytic_events
 * @copyright  2024 CTI <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import myModal from "./analytic_modal";
import {call as getContent} from "core/ajax";
import {get_string as getString, get_strings as getStrings} from 'core/str';
import template from 'core/templates';
import {setUserPreference} from 'core_user/repository';

// Memoised per-page guidance state shared by every analytics modal instance.
let guidanceState = null;
let guidanceStateRequest = null;

/**
 * Resolve, once per page, whether the viewer may see analytics guidance and
 * whether they currently have it toggled on. The result is cached so the many
 * analytics entry points share a single web service round trip, and is mutated
 * in place when the user flips the toggle so later re-renders stay in sync.
 *
 * @returns {Promise<{canviewguidance: boolean, showguidance: boolean}>}
 */
function getGuidanceState() {
    if (!guidanceStateRequest) {
        const contextid = (window.M && M.cfg && M.cfg.contextid) ? M.cfg.contextid : 0;
        guidanceStateRequest = Promise.resolve(
            getContent([{methodname: 'tiny_cursive_get_guidance_state', args: {contextid}}])[0]
        ).then(state => {
            guidanceState = state;
            return state;
        }).catch(() => {
            guidanceState = {canviewguidance: false, showguidance: false};
            return guidanceState;
        });
    }
    return guidanceStateRequest.then(() => guidanceState);
}

export default class AnalyticEvents {

    constructor() {
        getString('notenoughtinfo', 'tiny_cursive').then(str => {
            localStorage.setItem('notenoughtinfo', str);
            return str;
        }).catch(error => window.console.log(error));

        // Persist + apply the guidance toggle. Delegated listener in pure Vanilla JS.
        document.body.addEventListener('change', function(e) {
            const target = e.target.closest('.tiny_cursive-guidance-switch');
            if (!target) {
                return;
            }
            const on = target.checked;
            if (guidanceState) {
                guidanceState.showguidance = on;
            }
            document.querySelectorAll('.tiny_cursive-guidance').forEach(el => {
                el.classList.toggle('d-none', !on);
            });
            document.querySelectorAll('.tiny_cursive-guidance-switch').forEach(el => {
                el.checked = on;
            });
            setUserPreference('tiny_cursive_showguidance', on ? 1 : 0).catch(error => {
                window.console.error('Failed to save guidance preference:', error);
            });
        });
    }

    createModal(userid, context, questionid = '', replayInstances = null, authIcon) {
        const self = this;
        const element = document.getElementById('analytics' + userid + questionid);
        if (element) {
            element.addEventListener('click', function(e) {
                e.preventDefault();

                const isReplayButton = element.querySelector('.tiny_cursive-replay-button') !== null;

                getGuidanceState().then(state => {
                    context.canviewguidance = state.canviewguidance;
                    context.showguidance = state.showguidance;

                    return myModal.create({templateContext: context});
                }).then(modal => {
                    const content = document.querySelector('#content' + userid +
                        ' .tiny_cursive_table tbody tr:first-child td:nth-child(2)');
                    if (content && authIcon) {
                        content.innerHTML = authIcon.outerHTML;
                    }
                    modal.show();

                    if (isReplayButton) {
                        setTimeout(() => {
                            document.querySelectorAll('.tiny_cursive-nav-tab .active')
                                .forEach(el => el.classList.remove('active'));

                            const replayTab = document.getElementById('rep' + userid + questionid);
                            if (replayTab) {
                                replayTab.click();
                                replayTab.classList.add('active');
                            }
                        }, 50);
                    }

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

                        moreBtn.addEventListener('click', function(ev) {
                            ev.preventDefault();
                            self.learnMore(this, context, userid, questionid, replayInstances);
                        });
                    }
                    return modal;
                }).catch(error => {
                    window.console.error("Failed to create modal:", error);
                });
            });
        }
    }

    analytics(userid, templates, context, questionid = '', replayInstances = null, authIcon) {
        document.body.addEventListener('click', function(e) {
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

                getGuidanceState().then(function(state) {
                    context.canviewguidance = state.canviewguidance;
                    context.showguidance = state.showguidance;

                    return templates.render('tiny_cursive/analytics_table', context);
                }).then(function(html) {
                    if (content) {
                        content.innerHTML = html;
                    }
                    const table = document.querySelector('#content' + userid + ' .tiny_cursive_table');
                    if (table) {
                        const firstRow = table.querySelector('tbody tr:first-child');
                        if (firstRow) {
                            const firstCell = firstRow.querySelector('td:nth-child(2)');
                            if (firstCell && authIcon) {
                                firstCell.innerHTML = authIcon.outerHTML;
                            }
                        }
                    }
                    return true;
                }).catch(function(error) {
                    window.console.error("Failed to render template:", error);
                });
            }
        });
    }

    checkDiff(userid, fileid, questionid = '', replayInstances = null, filepath = null) {
        const self = this;
        const nodata = document.createElement('p');
        nodata.classList.add('tiny_cursive_nopayload', 'bg-light');

        getString('nopaylod', 'tiny_cursive').then(str => {
            nodata.textContent = str;
            return true;
        }).catch(error => window.console.log(error));

        document.body.addEventListener('click', function(e) {
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
                    methodname: 'tiny_cursive_get_writing_differences',
                    args: {fileid: fileid},
                }])[0].then(response => {
                    const responsedata = JSON.parse(response.data);
                    if (!responsedata) {
                        if (content) {
                            content.innerHTML = '';
                            content.appendChild(nodata);
                        }
                        return null;
                    }

                    const pastePromise = self.fetchPasteCount(filepath, responsedata.commentscount || 0);
                    const stringsPromise = getStrings([
                        {key: 'original_text', component: 'tiny_cursive'},
                        {key: 'editspastesai', component: 'tiny_cursive'},
                        {key: 'pastecount', component: 'tiny_cursive'},
                        {key: 'comments', component: 'tiny_cursive'}
                    ]);

                    return Promise.all([pastePromise, stringsPromise, Promise.resolve(responsedata)]);
                }).then(results => {
                    if (!results) {
                        return null;
                    }

                    const [pasteCount, strings, responsedata] = results;
                    const submittedText = atob(responsedata.submitted_text);
                    const originalTextString = strings[0];
                    const editsPastesAIString = strings[1];
                    const pasteCountString = strings[2];
                    const commentsString = strings[3];

                    // Create comment box
                    const commentBox = document.createElement('div');
                    commentBox.className = 'p-2 border rounded mb-2';

                    // Paste count
                    const pasteCountDiv = document.createElement('div');
                    pasteCountDiv.innerHTML = `<div><strong>${pasteCountString} :</strong> ${pasteCount}</div>`;
                    commentBox.appendChild(pasteCountDiv);

                    // Comments header & list
                    const comments = Object.values(responsedata.comments || {});
                    if (comments.length > 0) {
                        const commentsDiv = document.createElement('div');
                        commentsDiv.className = 'border-bottom';
                        commentsDiv.innerHTML = `<strong>${commentsString}</strong>`;

                        const commentsList = document.createElement('div');
                        for (let i = 0; i < comments.length; i++) {
                            const commentDiv = document.createElement('div');
                            commentDiv.style.cssText = 'word-wrap: break-word; word-break: break-word';
                            commentDiv.className = 'shadow-sm p-1 my-1';
                            commentDiv.textContent = comments[i].usercomment;
                            commentsList.appendChild(commentDiv);
                        }

                        commentBox.appendChild(commentsDiv);
                        commentBox.appendChild(commentsList);
                    }

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
                    reconstructedText.style.whiteSpace = 'pre-wrap';
                    reconstructedText.appendChild(self.renderComparisonContent(JSON.parse(submittedText)));
                    textBlock2.appendChild(reconstructedText);

                    contents.appendChild(commentBox);
                    contents.appendChild(legend);
                    contents.appendChild(textBlock2);

                    if (content) {
                        content.innerHTML = '';
                        content.appendChild(contents);
                    }

                    return true;
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

    /**
     * Resolves the paste count from replay logs or fallback.
     *
     * @param {string|null} filepath The replay log path.
     * @param {number} fallbackCount Fallback count if log is unavailable.
     * @return {Promise<number>}
     */
    fetchPasteCount(filepath, fallbackCount) {
        if (filepath) {
            return getContent([{
                methodname: 'tiny_cursive_get_reply_json',
                args: {filepath: filepath}
            }])[0].then(replayResponse => {
                let pasteCount = 0;
                if (replayResponse && replayResponse.status && replayResponse.data) {
                    let logData = JSON.parse(replayResponse.data);
                    if ('data' in logData) {
                        logData = logData.data;
                    }
                    if ('payload' in logData) {
                        logData = logData.payload;
                    }
                    if (Array.isArray(logData)) {
                        for (let i = 0; i < logData.length; i++) {
                            const event = logData[i];
                            if (event.event === 'Paste' &&
                                typeof event.pastedContent === 'string' &&
                                event.pastedContent.trim() !== '') {
                                pasteCount++;
                            }
                        }
                    }
                }
                return pasteCount;
            }).catch(() => fallbackCount);
        }
        return Promise.resolve(fallbackCount);
    }

    /**
     * Builds safe comparison markup while retaining Cursive attribution highlights.
     *
     * Captured text can contain the span elements which identify typed, pasted, and
     * AI-assisted content. Rendering the value as text exposes those tags to users,
     * while assigning it directly to innerHTML would trust captured content. This
     * method copies text and a small allowlist of presentation elements only.
     *
     * @param {string} content Reconstructed submission content.
     * @returns {DocumentFragment} Sanitised content ready to append to the report.
     */
    renderComparisonContent(content) {
        const allowedClasses = new Set([
            'tiny_cursive_added',
            'tiny_cursive-inserted',
            'tiny_cursive-pasted_content',
            'tiny_cursive-ai_inserted',
        ]);
        const allowedElements = new Set(['BR', 'DIV', 'P']);
        const templateEl = document.createElement('template');
        const fragment = document.createDocumentFragment();
        templateEl.innerHTML = String(content ?? '');

        const copyNodes = (source, target) => {
            source.childNodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE) {
                    target.appendChild(document.createTextNode(node.textContent));
                    return;
                }
                if (node.nodeType !== Node.ELEMENT_NODE) {
                    return;
                }

                const classes = Array.from(node.classList).filter(className => allowedClasses.has(className));
                let destination = target;
                if (node.tagName === 'SPAN' && classes.length > 0) {
                    destination = document.createElement('span');
                    destination.classList.add(...classes);
                    target.appendChild(destination);
                } else if (allowedElements.has(node.tagName)) {
                    destination = document.createElement(node.tagName.toLowerCase());
                    target.appendChild(destination);
                }
                copyNodes(node, destination);
            });
        };

        copyNodes(templateEl.content, fragment);
        return fragment;
    }

    replyWriting(userid, filepath, questionid = '', replayInstances = null) {
        document.body.addEventListener('click', function(e) {
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

    learnMore(moreBtn, context, userid, questionid, replayInstances) {
        document.querySelectorAll('.tiny_cursive-nav-tab .active')
            .forEach(el => el.classList.remove('active'));
        moreBtn.classList.add('active');

        const repBtn = document.getElementById('rep' + userid + questionid);
        if (repBtn) {
            repBtn.disabled = false;
        }

        if (replayInstances && replayInstances[userid]) {
            replayInstances[userid].stopReplay();
        }

        const contentEl = document.getElementById('content' + userid + questionid);
        if (contentEl) {
            contentEl.classList.remove('tiny_cursive_outputElement');
        }

        const replayControls = document.getElementById('replayControls_' + userid + questionid);
        if (replayControls) {
            replayControls.classList.add('d-none');
        }

        template.render('tiny_cursive/learn_more', context).then(function(html) {
            if (contentEl) {
                contentEl.innerHTML = html;
            }
            return true;
        }).catch(function(error) {
            window.console.error("Failed to render template:", error);
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

    authorshipStatus(agent, firstFile, score, scoreSetting) {
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

        if (agent === 'mobile' || agent === 'tablet') {
            icon = 'fas fa-mobile-alt';
            color = 'font-size:42px; color: black;';

            const container = document.createElement('span');
            container.className = 'd-flex align-items-center';
            const iconEl = document.createElement('i');
            iconEl.className = icon;
            iconEl.style = color;
            const textEl = document.createElement('span');
            textEl.className = 'ms-2 text-start';
            textEl.style.lineHeight = '1.2';
            container.appendChild(iconEl);
            container.appendChild(textEl);

            // Load string asynchronously
            getStrings([{key: 'submittedbtmobile', component: 'tiny_cursive'}])
                .then(function(strings) {
                    textEl.textContent = strings[0];
                    return strings[0];
                })
                .catch(function() {
                    textEl.textContent = 'Submitted by mobile';
                });

            return container;
        }

        const iconElement = document.createElement('i');
        iconElement.className = icon;
        iconElement.style = color;

        if (score < scoreSetting) {
            iconElement.className = 'fa fa-question-circle';
            iconElement.style = 'font-size:32px;color:#A9A9A9';
            iconElement.setAttribute('title', localStorage.getItem('notenoughtinfo') || '');
        }

        return iconElement;
    }
}
