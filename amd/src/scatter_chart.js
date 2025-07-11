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

import Chart from 'core/chartjs'
export const init = (data) => {

    const ctx = document.getElementById('effortScatterChart').getContext('2d');


    new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: data,
        },
        options: {
            plugins: {
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
        }
    });

    function formatTime(value) {
        const minutes = Math.floor(value / 60);
        const seconds = value % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
}