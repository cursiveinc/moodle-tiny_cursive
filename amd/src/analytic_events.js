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
import Chart from 'core/chartjs';

export default class AnalyticEvents {

    createModal(userid, context, questionid = '', authIcon) {
        const element = document.getElementById('analytics' + userid + questionid);
        if (element) {
            element.addEventListener('click', function (e) {
                e.preventDefault();

                // Create Moodle modal
                myModal.create({ templateContext: context }).then(modal => {
                    const content = document.querySelector('#content' + userid + ' .table tbody tr:first-child td:nth-child(2)');
                    if (content) content.innerHTML = authIcon.outerHTML;
                    modal.show();
                }).catch(error => {
                    window.console.error("Failed to create modal:", error);
                });
            });
        }
    }

    analytics(userid, templates, context, questionid = '', replayInstances = null, authIcon) {
        document.body.addEventListener('click', function (e) {
            if (e.target && e.target.id === 'analytic' + userid + questionid) {

                const repElement = document.getElementById('rep' + userid + questionid);
                if (repElement.getAttribute('disabled') === 'true') repElement.setAttribute('disabled', 'false');

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

                templates.render('tiny_cursive/analytics_table', context).then(function (html) {
                    const content = document.getElementById('content' + userid);
                    if (content) content.innerHTML = html;
                    const firstCell = document.querySelector('#content' + userid + ' .table tbody tr:first-child td:nth-child(2)');
                    if (firstCell) firstCell.innerHTML = authIcon.outerHTML;
                }).catch(function (error) {
                    window.console.error("Failed to render template:", error);
                });
            }
        });
    }

    checkDiff(userid, fileid, questionid = '', replayInstances = null) {
        const nodata = document.createElement('p');
        nodata.className = 'text-center p-5 bg-light rounded m-5 text-primary';
        nodata.style.verticalAlign = 'middle';
        nodata.style.textTransform = 'uppercase';
        nodata.style.fontWeight = '500';
        nodata.textContent = "no data received yet";

        document.body.addEventListener('click', function (e) {
            if (e.target && e.target.id === 'diff' + userid + questionid) {

                const repElement = document.getElementById('rep' + userid + questionid);
                if (repElement.getAttribute('disabled') === 'true') repElement.setAttribute('disabled', 'false');

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
                    if (content) content.innerHTML = nodata.outerHTML;
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
                        Str.get_strings([
                            { key: 'original_text', component: 'tiny_cursive' },
                            { key: 'editspastesai', component: 'tiny_cursive' }
                        ]).done(strings => {
                            const originalTextString = strings[0];
                            const editsPastesAIString = strings[1];

                            const commentBox = document.createElement('div');
                            commentBox.className = 'p-2 border rounded mb-2';

                            const pasteCountDiv = document.createElement('div');
                            pasteCountDiv.innerHTML = `<div><strong>Paste Count :</strong> ${responsedata.commentscount}</div>`;

                            const commentsDiv = document.createElement('div');
                            commentsDiv.className = 'border-bottom';
                            commentsDiv.innerHTML = '<strong>Comments :</strong>';

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
                            if (content) content.innerHTML = contents.outerHTML;
                        }).catch(error => {
                            window.console.error("Failed to load language strings:", error);
                            const content = document.getElementById('content' + userid);
                            if (content) content.innerHTML = nodata.outerHTML;
                        });
                    } else {
                        const content = document.getElementById('content' + userid);
                        if (content) content.innerHTML = nodata.outerHTML;
                    }
                }).catch(error => {
                    const content = document.getElementById('content' + userid);
                    if (content) content.innerHTML = nodata.outerHTML;
                    throw new Error('Error loading JSON file: ' + error.message);
                });
            }
        });
    }

    replyWriting(userid, filepath, questionid = '', replayInstances = null) {
        document.body.addEventListener('click', function (e) {
            if (e.target && e.target.id === 'rep' + userid + questionid) {
                let replyBtn = document.getElementById('rep' + userid + questionid);

                if (replyBtn.getAttribute('disabled') == 'true') return;
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
                    video_playback(userid, filepath, questionid);
                } else {
                    video_playback(userid, filepath);
                }
            }
        });
    }

    quality(userid, templates, context, questionid = '', replayInstances = null, cmid) {
        let metricsData = '';
        const nodata = document.createElement('p');
        nodata.classList.add('text-center', 'p-5', 'bg-light', 'rounded', 'm-5', 'text-primary');
        nodata.style.verticalAlign = 'middle';
        nodata.style.textTransform = 'uppercase';
        nodata.style.fontWeight = '500';
        getString('nopaylod', 'tiny_cursive').then(str => {
            nodata.textContent = str;
            return true;
        }).catch(error => window.console.error(error));

        $('body').on('click', '#quality' + userid + questionid, function(e) {

            $(this).prop('disabled', true);
            $('#rep' + userid + questionid).prop('disabled', false);
            e.preventDefault();
            $('.tiny_cursive-nav-tab').find('.active').removeClass('active');
            $(this).addClass('active'); // Add 'active' class to the clicked element

            let res = getContent([{
                methodname: 'cursive_get_quality_metrics',
                args: {"file_id": context.tabledata.file_id ?? userid, cmid: cmid},
            }]);

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

            templates.render('tiny_cursive/quality_chart', context).then(function(html) {
                const content = document.getElementById('content' + userid);

                res[0].done(response => {
                    if (response.status) {
                        metricsData = response.data;
                        let proUser = metricsData.quality_access;

                        if (!proUser) {
                            // eslint-disable-next-line promise/no-nesting
                            templates.render('tiny_cursive/upgrade_to_pro', []).then(function(html) {
                                $('#content' + userid).html(html);
                                return true;
                            }).fail(function(error) {
                                window.console.error(error);
                            });
                        } else {

                            if (content) {
                                content.innerHTML = html;
                            }
                            if (!metricsData) {
                                $('#content' + userid).html(nodata);
                            }
                            //  MetricsData.p_burst_cnt,'P-burst Count', metricsData.total_active_time, 'Total Active Time',
                            var originalData = [
                                metricsData.word_len_mean, metricsData.edits, metricsData.p_burst_mean,
                                metricsData.q_count, metricsData.sentence_count,
                                metricsData.verbosity, metricsData.word_count, metricsData.sent_word_count_mean
                            ];

                            // eslint-disable-next-line promise/no-nesting
                            Promise.all([
                                getString('word_len_mean', 'tiny_cursive'),
                                getString('edits', 'tiny_cursive'),
                                getString('p_burst_mean', 'tiny_cursive'),
                                getString('q_count', 'tiny_cursive'),
                                getString('sentence_count', 'tiny_cursive'),
                                getString('verbosity', 'tiny_cursive'),
                                getString('word_count', 'tiny_cursive'),
                                getString('sent_word_count_mean', 'tiny_cursive'),
                                getString('average', 'tiny_cursive'),
                            ]).then(([wordLength, edits, pBurstMean, qCount, sentenceCount, verbosity, wordCount,
                                sentWordCountMean, average]) => {
                                let chartvas = document.querySelector('#chart' + userid);
                                let levels = [wordLength, edits, pBurstMean, qCount, sentenceCount, verbosity, wordCount,
                                    sentWordCountMean];

                                const data = {
                                    labels: [
                                        levels
                                    ],
                                    datasets: [{
                                        data: originalData.map(d => {
                                            if (d > 100) {
                                                return 100;
                                            } else if (d < -100) {
                                                return -100;
                                            } else {
                                                return d;
                                            }
                                        }),
                                        backgroundColor: function(context) {
                                            // Apply green or gray depending on value.
                                            const value = context.raw;

                                            if (value > 0 && value < 100) {
                                                return '#43BB97';
                                            } else if (value < 0) {
                                                return '#AAAAAA';
                                            } else {
                                                return '#00432F'; // Green for positive, gray for negative.
                                            }

                                        },
                                        barPercentage: 0.75,
                                    }]
                                };

                                const drawPercentage = {
                                    id: 'drawPercentage',
                                    afterDraw: (chart) => {
                                        const {ctx, data} = chart;
                                        ctx.save();
                                        let value;
                                        chart.getDatasetMeta(0).data.forEach((dataPoint, index) => {
                                            value = parseInt(data.datasets[0].data[index]);
                                            if (!value) {
                                                value = 0;
                                            }
                                            value = originalData[index];

                                            ctx.font = "bold 14px sans-serif";

                                            if (value > 50 && value <= 100) {
                                                ctx.fillStyle = 'white';
                                                ctx.textAlign = 'right';
                                                ctx.fillText(value + '%', dataPoint.x - 5, dataPoint.y + 5);
                                            } else if (value <= 10 && value > 0) {
                                                ctx.fillStyle = '#43bb97';
                                                ctx.textAlign = 'left';
                                                if (value >= 1) {
                                                    ctx.fillText('0' + value + '%', dataPoint.x + 5, dataPoint.y + 5);
                                                } else {
                                                    ctx.fillText(value + '%', dataPoint.x + 5, dataPoint.y + 5);
                                                }
                                                // eslint-disable-next-line no-empty
                                            } else if (value == 0 || value == undefined) {
                                            } else if (value > 100) {
                                                ctx.fillStyle = 'white';
                                                ctx.textAlign = 'right';
                                                ctx.fillText(value + '%', dataPoint.x - 5, dataPoint.y + 5);
                                            } else if (value < -50 && value >= -100) {
                                                ctx.fillStyle = 'white';
                                                ctx.textAlign = 'left';
                                                ctx.fillText(value + '%', dataPoint.x + 5, dataPoint.y + 5);
                                            } else if (value < -100) {
                                                ctx.fillStyle = 'white';
                                                ctx.textAlign = 'left';
                                                ctx.fillText(value + '%', dataPoint.x + 5, dataPoint.y + 5);
                                            } else if (value > -50 && value < 0) {
                                                ctx.fillStyle = 'grey';
                                                ctx.textAlign = 'right';
                                                ctx.fillText(value + '%', dataPoint.x - 5, dataPoint.y + 5);
                                            } else {
                                                ctx.fillStyle = '#43bb97';
                                                ctx.textAlign = 'left';
                                                ctx.fillText(value + '%', dataPoint.x + 5, dataPoint.y + 5);
                                            }

                                        });
                                    }
                                };

                                const chartAreaBg = {
                                    id: 'chartAreaBg',
                                    beforeDraw: (chart) => {
                                        const {ctx, scales: {x, y}} = chart;
                                        ctx.save();

                                        const segmentPixel = y.getPixelForValue(y.ticks[0].value) -
                                            y.getPixelForValue(y.ticks[1].value);
                                        const doubleSegment = y.ticks[2].value - y.ticks[0].value;
                                        let tickArray = [];

                                        // Generate tick values.
                                        for (let i = 0; i <= y.max; i += doubleSegment) {
                                            if (i !== y.max) {
                                                tickArray.push(i);
                                            }
                                        }

                                        // Draw the background rectangles for each tick.
                                        tickArray.forEach(tick => {
                                            ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
                                            ctx.fillRect(0, y.getPixelForValue(tick) + 80, x.width + x.width + 21, segmentPixel);
                                        });
                                    }
                                };


                                return new Chart(chartvas, {
                                    type: 'bar',
                                    data: data,
                                    options: {
                                        responsive: false,
                                        maintainAspectRatio: false,
                                        indexAxis: 'y',
                                        elements: {
                                            bar: {
                                                borderRadius: 16,
                                                borderWidth: 0,
                                                zIndex: 1,
                                            }
                                        },
                                        scales: {
                                            x: {
                                                beginAtZero: true,
                                                min: -100,
                                                max: 100,
                                                ticks: {
                                                    callback: function(value) {
                                                        if (value === -100 || value === 100) {
                                                            return value + '%';
                                                        } else if (value === 0) {
                                                            return average;
                                                        }
                                                        return '';
                                                    },
                                                    display: true,
                                                    font: function(context) {
                                                        if (context && context.tick && context.tick.value === 0) {
                                                            return {
                                                                weight: 'bold',
                                                                size: 14,
                                                                color: 'black'
                                                            };
                                                        }
                                                        return {
                                                            weight: 'bold',
                                                            size: 13,
                                                            color: 'black'
                                                        };
                                                    },
                                                    color: 'black',

                                                },
                                                grid: {
                                                    display: true,
                                                    color: function(context) {
                                                        return context.tick.value === 0 ? 'black' : '#eaeaea';
                                                    },
                                                    tickLength: 0,
                                                },
                                                position: 'top'

                                            },
                                            y: {
                                                beginAtZero: true,
                                                ticks: {
                                                    display: true,
                                                    align: 'center',

                                                    crossAlign: 'far',
                                                    font: {
                                                        size: 18,
                                                    },
                                                    tickLength: 100,
                                                    color: 'black',
                                                },
                                                grid: {
                                                    display: true,
                                                    tickLength: 1000,
                                                },

                                            }
                                        },
                                        plugins: {
                                            legend: {
                                                display: false,
                                            },
                                            title: {
                                                display: false,
                                            },
                                            tooltip: {
                                                yAlign: 'bottom',
                                                xAlign: 'center',
                                                callbacks: {
                                                    label: function(context) {
                                                        const originalValue = originalData[context.dataIndex];
                                                        return originalValue; // Show the original value.
                                                    },
                                                },
                                            },
                                        }
                                    },
                                    plugins: [chartAreaBg, drawPercentage]
                                });
                            }).catch(error => {
                                window.console.log(error);
                            });

                        }
                    }
                }).fail(error => {
                    $('#content' + userid).html(nodata);
                    throw new Error('Error: no data received yet', error);
                });
                return true;
            }).catch(function(error) {
                window.console.error("Failed to render template:", error);
            });

            document.querySelectorAll('.tiny_cursive-nav-tab .active').forEach(el => el.classList.remove('active'));
            e.target.classList.add('active');
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
