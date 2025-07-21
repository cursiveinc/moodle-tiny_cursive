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
 * TODO describe module scatter_chart
 *
 * @module     tiny_cursive/scatter_chart
 * @copyright  2025 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Chart from 'core/chartjs';
import {get_strings as getStrings} from 'core/str';
export const init = async (data, apiKey) => {

    const ctx = document.getElementById('effortScatterChart').getContext('2d');
    let display = true;
    let isEmpty = "";
    var dataset = [];

    const [
            applyFilter,
            noSubmission,
            noPayload,
            freemium,
            caption
        ] = await getStrings([
            {key: 'apply_filter', component: 'tiny_cursive'},
            {key: 'no_submission', component: 'tiny_cursive'},
            {key: 'nopaylod', component: 'tiny_cursive'},
            {key: 'freemium', component: 'tiny_cursive'},
            {key: 'chart_result', component: 'tiny_cursive'}
        ]);

    if (Array.isArray(data) && !data.state && apiKey) {
        dataset = data;
        isEmpty = data.some(ds =>
            Array.isArray(ds.data) &&
            ds.data.some(point =>
                point && typeof point === 'object' && Object.keys(point).length > 0
            )
        );
    }

    if(!apiKey || data.length === 0 || !isEmpty || data === false) {
        display = false;
    }

    const fallbackMessagePlugin = {
        id: 'fallbackMessagePlugin',
        afterDraw(chart) {
            // ⚠ Case 1: Freemium user
            if (!apiKey) {
                drawMessage('⚠ '+freemium, chart);
                return;
            }
            // ⚠ Case 2: Apply filter (data is empty array)
            if (data.state == "apply_filter") {
                drawMessage('⚠ '+applyFilter, chart);
                return;
            }
            if(data.state === "no_submission") {
                drawMessage('⚠ '+noSubmission, chart);
                return;
            }
            // ⚠ Case 3: No payload data (all `data` arrays are empty or full of empty objects)
            if (!isEmpty && !data.state) {
                drawMessage('⚠ '+noPayload, chart);
            }

        }
    };

    new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: dataset,
        },
        options: {
            animation: {
                onComplete: () => {
                    document.getElementById('canvasloader').remove();
                }
            },
            plugins: {
                title: {
                    display: display,
                    text: caption,
                    font: {
                        size: 16,
                        weight: 'bold',
                    },
                    color: '#333',
                    padding: {
                        top: 10,
                        bottom: 20
                    },
                    align: 'center' // or 'start' / 'end'
                },
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 20
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(252, 252, 252, 0.8)',
                    titleColor: '#000',
                    bodyColor: '#000',
                    borderColor: '#cccccc',
                    borderWidth: 1,
                    displayColors: false,
                    callbacks: {
                        title: function(context) {
                            const d = context[0].raw;
                            return d.label; // this appears as bold title
                        },
                        label: function(context) {
                            const d = context.raw;
                            return [
                                `Time: ${formatTime(d.x)}`,
                                `Effort: ${d.effort * 100}%`,
                                `Words: ${d.words}`,
                                `WPM: ${d.wpm}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Time Spent (mm:ss)'
                    },
                    min: 0,
                    ticks: {
                    callback: function(value) {
                        return formatTime(value);
                    }
                }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Effort Score'
                    },
                    min: 0,
                    max: 2,
                    ticks: {
                        stepSize: 0.5
                    }
                }
            }
        },
        plugins: [fallbackMessagePlugin]
    });

    /**
     * Formats a time value in seconds to a mm:ss string format
     * @param {number} value - The time value in seconds
     * @returns {string} The formatted time string in mm:ss format
     */
    function formatTime(value) {
        const minutes = Math.floor(value / 60);
        const seconds = value % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    /**
     * Draws a message on the chart canvas
     * @param {string} text - The message to be displayed
     * @param {Chart} chart - The Chart.js chart object
     */
    function drawMessage(text, chart) {

        const { ctx, chartArea: { left, right, top, bottom } } = chart;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 16px "Segoe UI", Arial';
        ctx.fillStyle = '#666';

        const centerX = (left + right) / 2;
        const centerY = (top + bottom) / 2;

        ctx.fillText(text, centerX, centerY);
        ctx.restore();
    }
};