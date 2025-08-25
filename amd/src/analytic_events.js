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

export default class AnalyticEvents {

    constructor () {
        getString('notenoughtinfo', 'tiny_cursive').then(str => {
            localStorage.setItem('notenoughtinfo', str);
        });
    }

    createModal(userid, context, questionid = '', replayInstances = null, authIcon) {
        $('#analytics' + userid + questionid).on('click', function(e) {
            e.preventDefault();

            // Create Moodle modal
            myModal.create({templateContext: context}).then(modal => {
                $('#content' + userid + ' .tiny_cursive_table  tbody tr:first-child td:nth-child(2)').html(authIcon);
                modal.show();

                let moreBtn = $('body #more' + userid + questionid);
                if (moreBtn.length > 0) {
                    $('.tiny_cursive-nav-tab').find('.active').removeClass('active');
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
                    moreBtn.on('click', function() {
                        $('.tiny_cursive-nav-tab').find('.active').removeClass('active');
                        $(this).addClass('active');
                        $('#rep' + userid + questionid).prop('disabled', false);
                        if (replayInstances && replayInstances[userid]) {
                            replayInstances[userid].stopReplay();
                        }
                    });
                }

                return true;
            }).catch(error => {
                window.console.error("Failed to create modal:", error);
            });

        });
    }

    analytics(userid, templates, context, questionid = '', replayInstances = null, authIcon) {

        $('body').on('click', '#analytic' + userid + questionid, function(e) {
            $('#rep' + userid + questionid).prop('disabled', false);
            $('#quality' + userid + questionid).prop('disabled', false);
            $('#content' + userid).attr('data-label', 'analytics');
            $('#player_' + userid + questionid).css({'display': 'none'});
            $('#content' + userid).removeClass('tiny_cursive_outputElement')
                                  .addClass('tiny_cursive').attr('data-label', 'analytics');
            e.preventDefault();
            $('#content' + userid).html($('<div>').addClass('d-flex justify-content-center my-5')
                .append($('<div>').addClass('tiny_cursive-loader')));
            if (replayInstances && replayInstances[userid]) {
                replayInstances[userid].stopReplay();
            }
            $('.tiny_cursive-nav-tab').find('.active').removeClass('active');
            $(this).addClass('active'); // Add 'active' class to the clicked element

            templates.render('tiny_cursive/analytics_table', context).then(function(html) {
                $('#content' + userid).html(html);
                $('#content' + userid + ' .tiny_cursive_table  tbody tr:first-child td:nth-child(2)').html(authIcon);
                return true;
            }).fail(function(error) {
                window.console.error("Failed to render template:", error);
            });
        });
    }

    checkDiff(userid, fileid, questionid = '', replayInstances = null) {
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
            $('#content' + userid).html($('<div>').addClass('d-flex justify-content-center my-5')
                .append($('<div>').addClass('tiny_cursive-loader')));
            $('.tiny_cursive-nav-tab').find('.active').removeClass('active');
            $(this).addClass('active');
            if (replayInstances && replayInstances[userid]) {
                replayInstances[userid].stopReplay();
            }
            if (!fileid) {
                $('#content' + userid).html(nodata);
                throw new Error('Missing file id or Difference Content not received yet');
            }
            getContent([{
                methodname: 'cursive_get_writing_differences',
                args: {fileid: fileid},
            }])[0].done(response => {
                let responsedata = JSON.parse(response.data);
                if (responsedata) {
                    let submittedText = atob(responsedata.submitted_text);

                    // Fetch the dynamic strings.
                    getStrings([
                        {key: 'original_text', component: 'tiny_cursive'},
                        {key: 'editspastesai', component: 'tiny_cursive'}
                    ]).done(strings => {
                        const originalTextString = strings[0];
                        const editsPastesAIString = strings[1];

                        const commentBox = $('<div class="p-2 border rounded mb-2">');
                        var pasteCountDiv = $('<div></div>');
                        getString('pastecount', 'tiny_cursive').then(str => {
                            pasteCountDiv.append('<div><strong>' + str + ' :</strong> ' + responsedata.commentscount + '</div>');
                            return true;
                        }).catch(error => window.console.log(error));

                        var commentsDiv = $('<div class="border-bottom"></div>');
                        getString('comments', 'tiny_cursive').then(str => {
                            commentsDiv.append('<strong>' + str + '</strong>');
                            return true;
                        }).catch(error => window.console.error(error));

                        var commentsList = $('<div></div>');

                        let comments = responsedata.comments;
                        for (let index in comments) {
                            var commentDiv = $(`<div style="word-wrap: break-word; word-break: break-word"
                                class="shadow-sm p-1 my-1"></div>`).text(comments[index].usercomment);
                            commentsList.append(commentDiv);
                        }
                        commentBox.append(pasteCountDiv).append(commentsDiv).append(commentsList);

                        const $legend = $('<div class="d-flex p-2 border rounded mb-2">');

                        // Create the first legend item
                        const $attributedItem = $('<div>', {"class": "tiny_cursive-legend-item"});
                        const $attributedBox = $('<div>', {"class": "tiny_cursive-box attributed"});
                        const $attributedText = $('<span>').text(originalTextString);
                        $attributedItem.append($attributedBox).append($attributedText);

                        // Create the second legend item
                        const $unattributedItem = $('<div>', {"class": 'tiny_cursive-legend-item'});
                        const $unattributedBox = $('<div>', {"class": 'tiny_cursive-box tiny_cursive_added'});
                        const $unattributedText = $('<span>').text(editsPastesAIString);
                        $unattributedItem.append($unattributedBox).append($unattributedText);

                        // Append the legend items to the legend container.
                        $legend.append($attributedItem).append($unattributedItem);

                        let contents = $('<div>').addClass('tiny_cursive-comparison-content');
                        let textBlock2 = $('<div>').addClass('tiny_cursive-text-block').append(
                            $('<div>').attr('id', 'tiny_cursive-reconstructed_text').html(JSON.parse(submittedText))
                        );

                        contents.append(commentBox, $legend, textBlock2);
                        $('#content' + userid).html(contents); // Update content.
                    }).fail(error => {
                        window.console.error("Failed to load language strings:", error);
                        $('#content' + userid).html(nodata);
                    });
                } else {
                    $('#content' + userid).html(nodata);
                }
            }).fail(error => {
                $('#content' + userid).html(nodata);
                throw new Error('Error loading JSON file: ' + error.message);
            });
        });
    }

    replyWriting(userid, filepath, questionid = '', replayInstances = null) {
        $('body').on('click', '#rep' + userid + questionid, function(e) {

            if (filepath) {
                $('#replayControls_' + userid + questionid).removeClass('d-none');
                $('#content' + userid).addClass('tiny_cursive_outputElement');
            }

            $(this).prop('disabled', true);
            $('#quality' + userid + questionid).prop('disabled', false);
            $('#content' + userid).attr('data-label', 'replay');
            $('#player_' + userid + questionid).css({
                'display': 'block',
                'padding-right': '8px'
            });
            e.preventDefault();
            $('#content' + userid).html($('<div>').addClass('d-flex justify-content-center my-5')
                .append($('<div>').addClass('tiny_cursive-loader')));
            $('.tiny_cursive-nav-tab').find('.active').removeClass('active');
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
        if (score < scoreSetting) {
            icon = 'fa fa-question-circle';
            color = 'font-size:32px;color:#A9A9A9';
            return $('<i>').addClass(icon).attr('style', color).attr('title', localStorage.getItem('notenoughtinfo'));
        } else {
            return $('<i>').addClass(icon).attr('style', color);
        }

    }
}
