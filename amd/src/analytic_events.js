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
import $ from 'jquery';
import {get_string as getString} from 'core/str';
import {get_strings as getStrings} from 'core/str';
import template from 'core/templates';
import {setUserPreference} from 'core_user/repository';
import {announceNear} from './live_status';

/**
 * Build the loading placeholder shown while a tab fetches its content.
 *
 * @param {string} loadingText Translated "Loading" text for assistive technology.
 * @returns {JQuery}
 */
function loader(loadingText) {
    return $('<div>').addClass('d-flex justify-content-center my-5')
        .append($('<div>').addClass('tiny_cursive-loader').attr('aria-hidden', 'true'))
        .append($('<span>').addClass('sr-only visually-hidden').text(loadingText));
}

/**
 * Clear the selected state on every tab in the strip that contains a tab.
 *
 * @param {JQuery|HTMLElement} tab A tab inside the strip.
 */
function deselectTabs(tab) {
    $(tab).closest('.tiny_cursive-nav-tab').find('.active').removeClass('active');
}

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
        this.loadingText = 'Loading';
        this.nopayloadText = '';
        getStrings([
            {key: 'loading', component: 'core'},
            {key: 'nopaylod', component: 'tiny_cursive'},
        ]).then(([loading, nopayload]) => {
            this.loadingText = loading;
            this.nopayloadText = nopayload;
            return true;
        }).catch(error => window.console.log(error));

        // Persist + apply the guidance toggle. Delegated and namespaced so it binds
        // once across every analytics instance and survives table re-renders.
        $('body').off('change.tinycursiveguidance')
            .on('change.tinycursiveguidance', '.tiny_cursive-guidance-switch', function() {
                const on = $(this).is(':checked');
                if (guidanceState) {
                    guidanceState.showguidance = on;
                }
                $('.tiny_cursive-guidance').toggleClass('d-none', !on);
                $('.tiny_cursive-guidance-switch').prop('checked', on);
                setUserPreference('tiny_cursive_showguidance', on ? 1 : 0).catch(error => {
                    window.console.error('Failed to save guidance preference:', error);
                });
            });
    }

    createModal(userid, context, questionid = '', replayInstances = null, authIcon) {
        const self = this;
        $('#analytics' + userid + questionid).on('click', function(e) {
            e.preventDefault();

            const isReplayButton = $(this).find('.tiny_cursive-replay-button').length > 0;
            // Create the modal once guidance flags are known, so the inline analytics
            // table in the modal template is gated to staff and reflects the saved toggle.
            getGuidanceState().then(state => {
                context.canviewguidance = state.canviewguidance;
                context.showguidance = state.showguidance;
                // eslint-disable-next-line promise/no-nesting
                return myModal.create({templateContext: context}).then(modal => {
                $('#content' + userid + ' .tiny_cursive_table  tbody tr:first-child td:nth-child(2)').html(authIcon);
                modal.show();

                if (isReplayButton) {
                    setTimeout(() => {
                        const replayTab = $('#rep' + userid + questionid);
                        if (replayTab.length) {
                            deselectTabs(replayTab);
                            replayTab.trigger('click');
                            replayTab.addClass('active');
                        }
                    }, 50);
                }

                let moreBtn = $('body #more' + userid + questionid);
                if (moreBtn.length > 0) {
                    deselectTabs(moreBtn);
                    $('#analytic' + userid + questionid).prop('disabled', true);
                    $('#diff' + userid + questionid).prop('disabled', true);
                    $('#analytic' + userid + questionid).css({
                        'background-color': 'rgba(168, 168, 168, 0.133)',
                        'cursor': 'not-allowed'
                    });
                    $('#diff' + userid + questionid).css({
                        'background-color': 'rgba(168, 168, 168, 0.133)',
                        'cursor': 'not-allowed'
                    });
                    moreBtn.on('click', function(e) {
                        e.preventDefault();
                        self.learnMore($(this), context, userid, questionid, replayInstances);
                    });
                }

                    return true;
                });
            }).catch(error => {
                window.console.error("Failed to create modal:", error);
            });

        });
    }

    analytics(userid, templates, context, questionid = '', replayInstances = null, authIcon) {
        const self = this;
        $('body').on('click', '#analytic' + userid + questionid, function(e) {
            $('#rep' + userid + questionid).prop('disabled', false);
            $('#quality' + userid + questionid).prop('disabled', false);
            $('#content' + userid).attr('data-label', 'analytics');
            $('#player_' + userid + questionid).css({'display': 'none'});
            $('#content' + userid).removeClass('tiny_cursive_outputElement')
                .addClass('tiny_cursive').attr('data-label', 'analytics');
            e.preventDefault();
            $('#content' + userid).html(loader(self.loadingText));
            announceNear(this, self.loadingText);
            if (replayInstances && replayInstances[userid]) {
                replayInstances[userid].stopReplay();
            }
            deselectTabs(this);
            $(this).addClass('active'); // Add 'active' class to the clicked element

            getGuidanceState().then(function(state) {
                context.canviewguidance = state.canviewguidance;
                context.showguidance = state.showguidance;
                // eslint-disable-next-line promise/no-nesting
                return templates.render('tiny_cursive/analytics_table', context).then(function(html) {
                    $('#content' + userid).html(html);
                    $('#content' + userid + ' .tiny_cursive_table  tbody tr:first-child td:nth-child(2)').html(authIcon);
                    return true;
                });
            }).catch(function(error) {
                window.console.error("Failed to render template:", error);
            });
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
        $('body').on('click', '#diff' + userid + questionid, function(e) {
            $('#rep' + userid + questionid).prop('disabled', false);
            $('#quality' + userid + questionid).prop('disabled', false);
            $('#content' + userid).attr('data-label', 'diff');
            $('#player_' + userid + questionid).css({
                'display': 'none'
            });
            $('#content' + userid).removeClass('tiny_cursive_outputElement').addClass('tiny_cursive').attr('data-label', 'diff');
            e.preventDefault();
            $('#content' + userid).html(loader(self.loadingText));
            announceNear(this, self.loadingText);
            deselectTabs(this);
            $(this).addClass('active');
            if (replayInstances && replayInstances[userid]) {
                replayInstances[userid].stopReplay();
            }
            const tab = this;
            if (!fileid) {
                $('#content' + userid).html(nodata);
                announceNear(tab, self.nopayloadText);
                throw new Error('Missing file id or Difference Content not received yet');
            }
            getContent([{
                methodname: 'tiny_cursive_get_writing_differences',
                args: {fileid: fileid},
            }])[0].done(response => {
                let responsedata = JSON.parse(response.data);
                if (responsedata) {
                    let submittedText = atob(responsedata.submitted_text);

                    const getPasteCount = () => {
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
                            }).catch(() => responsedata.commentscount || 0);
                        }
                        return Promise.resolve(responsedata.commentscount || 0);
                    };

                    return getPasteCount().then(pasteCount => {
                        // eslint-disable-next-line
                        return getStrings([
                            {key: 'original_text', component: 'tiny_cursive'},
                            {key: 'replay_legend_pasted', component: 'tiny_cursive'},
                            {key: 'pastecount', component: 'tiny_cursive'},
                            {key: 'comments', component: 'tiny_cursive'},
                            {key: 'diff_prefix_pasted', component: 'tiny_cursive'},
                            {key: 'diff_prefix_ai', component: 'tiny_cursive'},
                            {key: 'diff_prefix_edited', component: 'tiny_cursive'},
                            {key: 'replay_legend_ai', component: 'tiny_cursive'},
                            {key: 'diff_legend_edited', component: 'tiny_cursive'}
                        ]).done(strings => {
                            const originalTextString = strings[0];
                            const pastedLegendString = strings[1];
                            const pasteCountString = strings[2];
                            const commentsString = strings[3];
                            const prefixes = {pasted: strings[4], ai: strings[5], edited: strings[6]};
                            const aiLegendString = strings[7];
                            const editedLegendString = strings[8];

                            const commentBox = $('<div class="p-2 border rounded mb-2">');
                            var pasteCountDiv = $('<div></div>');
                            pasteCountDiv.append('<div><strong>' + pasteCountString + ' :</strong> ' + pasteCount + '</div>');

                            commentBox.append(pasteCountDiv);

                            let comments = Object.values(responsedata.comments || {});

                            if (comments.length > 0) {

                                var commentsDiv = $('<div class="border-bottom"></div>');
                                commentsDiv.append('<strong>' + commentsString + '</strong>');

                                var commentsList = $('<div></div>');

                                for (let i = 0; i < comments.length; i++) {
                                    var commentDiv = $(`<div style="word-wrap: break-word; word-break: break-word"
                                                    class="shadow-sm p-1 my-1"></div>`).text(comments[i].usercomment);
                                    commentsList.append(commentDiv);
                                }

                                commentBox.append(commentsDiv).append(commentsList);
                            }

                            // Legend: one sample per kind, styled exactly like the marks in the text (1.4.1).
                            const $legend = $('<div class="d-flex flex-wrap p-2 border rounded mb-2 tiny_cursive-diff-legend">');
                            const legendItem = (tag, className, text) => {
                                const $item = $('<div>', {"class": 'tiny_cursive-legend-item'});
                                const $sample = $('<' + tag + '>', {"class": 'tiny_cursive-legend-sample ' + className}).text(text);
                                return $item.append($sample);
                            };
                            $legend.append(
                                legendItem('span', 'tiny_cursive-attributed', originalTextString),
                                legendItem('mark', 'tiny_cursive-pasted_content', pastedLegendString),
                                legendItem('ins', 'tiny_cursive-ai_inserted', aiLegendString),
                                legendItem('ins', 'tiny_cursive_added', editedLegendString)
                            );

                            let reconstructedText = document.createElement('div');
                            reconstructedText.id = 'tiny_cursive-reconstructed_text';
                            reconstructedText.style.whiteSpace = 'pre-wrap';
                            reconstructedText.appendChild(self.renderComparisonContent(JSON.parse(submittedText), prefixes));

                            let contents = $('<div>').addClass('tiny_cursive-comparison-content');
                            let textBlock2 = $('<div>').addClass('tiny_cursive-text-block').append(reconstructedText);

                            contents.append(commentBox, $legend, textBlock2);
                            $('#content' + userid).html(contents); // Update content.
                        }).catch(error => {
                            window.console.error("Failed to load language strings:", error);
                            $('#content' + userid).html(nodata);
                            announceNear(tab, self.nopayloadText);
                        });
                    });
                } else {
                    $('#content' + userid).html(nodata);
                    announceNear(tab, self.nopayloadText);
                }
                return responsedata;
            }).catch(error => {
                $('#content' + userid).html(nodata);
                announceNear(tab, self.nopayloadText);
                throw new Error('Error loading JSON file: ' + error.message);
            });
        });
    }

    /**
     * Builds safe comparison markup while retaining Cursive attribution highlights.
     *
     * Captured text can contain the span elements which identify typed, pasted, and
     * AI-assisted content. Rendering the value as text exposes those tags to users,
     * while assigning it directly to innerHTML would trust captured content. This
     * method copies text and a small allowlist of presentation elements only.
     *
     * Pasted text becomes <mark>, AI-inserted and edited text <ins>, each with a visually hidden
     * prefix, so attribution is conveyed by element and text as well as by colour (1.3.1, 1.4.1).
     *
     * @param {string} content Reconstructed submission content.
     * @param {{pasted: string, ai: string, edited: string}} prefixes Spoken prefixes per attribution.
     * @returns {DocumentFragment} Sanitised content ready to append to the report.
     */
    renderComparisonContent(content, prefixes = {}) {
        const allowedClasses = new Set([
            'tiny_cursive_added',
            'tiny_cursive-inserted',
            'tiny_cursive-pasted_content',
            'tiny_cursive-ai_inserted',
        ]);
        const allowedElements = new Set(['BR', 'DIV', 'P']);
        const template = document.createElement('template');
        const fragment = document.createDocumentFragment();
        template.innerHTML = String(content ?? '');

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
                    const pasted = classes.includes('tiny_cursive-pasted_content');
                    const ai = classes.includes('tiny_cursive-ai_inserted');
                    destination = document.createElement(pasted ? 'mark' : 'ins');
                    destination.classList.add(...classes);
                    let prefix = prefixes.edited;
                    if (pasted) {
                        prefix = prefixes.pasted;
                    } else if (ai) {
                        prefix = prefixes.ai;
                    }
                    if (prefix) {
                        const label = document.createElement('span');
                        label.className = 'sr-only visually-hidden';
                        label.textContent = `${prefix} `;
                        destination.appendChild(label);
                    }
                    target.appendChild(destination);
                } else if (allowedElements.has(node.tagName)) {
                    destination = document.createElement(node.tagName.toLowerCase());
                    target.appendChild(destination);
                }
                copyNodes(node, destination);
            });
        };

        copyNodes(template.content, fragment);
        return fragment;
    }

    replyWriting(userid, filepath, questionid = '', replayInstances = null) {
        const self = this;
        $('body').on('click', '#rep' + userid + questionid, function(e) {
            e.preventDefault();
            // Already showing: do not restart the replay (the tab stays enabled so focus is not lost).
            if ($(this).hasClass('active')) {
                return;
            }

            if (filepath) {
                $('#replayControls_' + userid + questionid).removeClass('d-none');
                $('#content' + userid).addClass('tiny_cursive_outputElement');
            }

            $('#quality' + userid + questionid).prop('disabled', false);
            $('#content' + userid).attr('data-label', 'replay');
            $('#player_' + userid + questionid).css({
                'display': 'block',
                'padding-right': '8px'
            });
            $('#content' + userid).html(loader(self.loadingText));
            announceNear(this, self.loadingText);
            deselectTabs(this);
            $(this).addClass('active'); // Add 'active' class to the clicked element
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
        });
    }

    learnMore(moreBtn, context, userid, questionid, replayInstances) {
        deselectTabs(moreBtn);
        moreBtn.addClass('active');
        $('#rep' + userid + questionid).prop('disabled', false);
        if (replayInstances && replayInstances[userid]) {
            replayInstances[userid].stopReplay();
        }
        $('#content' + userid + questionid).removeClass('tiny_cursive_outputElement');
        $('#replayControls_' + userid + questionid).addClass('d-none');
        template.render('tiny_cursive/learn_more', context).then(function(html) {
            $('#content' + userid + questionid).html(html);
            return true;
        }).fail(function(error) {
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

    /**
     * Build the authorship result cell: an icon for sighted users plus the equivalent text
     * for assistive technology (verified / not enough information / submitted by mobile).
     *
     * @param {string} agent User agent class ('mobile', 'tablet' or anything else).
     * @param {boolean} firstFile Whether this is the user's first capture (no baseline).
     * @param {number|string} score Authorship score.
     * @param {number} scoreSetting Site threshold for a verified result.
     * @returns {JQuery}
     */
    authorshipStatus(agent, firstFile, score, scoreSetting) {
        score = parseFloat(score);

        let icon = 'fa fa-circle-o';
        let color = 'font-size:32px;color:black';
        let stringKey = 'notenoughtinfo';

        if (agent === 'mobile' || agent === 'tablet') {
            const $container = $('<span>').addClass('d-flex align-items-center');
            const $icon = $('<i>').addClass('fas fa-mobile-alt').attr('style', 'font-size:42px; color: black;')
                .attr('aria-hidden', 'true');
            const $text = $('<span>').addClass('ms-2 text-start').css('line-height', '1.2');

            $container.append($icon).append($text);

            getString('submittedbtmobile', 'tiny_cursive').then(string => {
                $text.text(string);
                return string;
            }).catch(() => {
                $text.text('Submitted by mobile');
            });

            return $container;
        }

        if (score < scoreSetting) {
            icon = 'fa fa-question-circle';
            color = 'font-size:32px;color:var(--tiny-cursive-text-muted, #595959)';
        } else if (firstFile) {
            icon = 'fa fa-solid fa-info-circle';
            color = 'font-size:32px;color:#000000';
        } else {
            icon = 'fa fa-check-circle';
            color = 'font-size:32px;color:var(--tiny-cursive-success, #146c2e)';
            stringKey = 'verified';
        }

        const $container = $('<span>').addClass('d-inline-flex align-items-center');
        const $icon = $('<i>').addClass(icon).attr('style', color).attr('aria-hidden', 'true');
        const $text = $('<span>').addClass('sr-only visually-hidden');
        $container.append($icon).append($text);

        getString(stringKey, 'tiny_cursive').then(string => {
            $text.text(string);
            $icon.attr('title', string);
            return string;
        }).catch(error => window.console.error(error));

        return $container;
    }
}
