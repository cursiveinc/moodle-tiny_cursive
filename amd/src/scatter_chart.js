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
export const init = () => {
    const ctx = document.getElementById('effortScatterChart').getContext('2d');

    new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: 'Low Effort (<0.5)',
                    data: [
                        { x: 8, y: 0.3, label: "Student A", effort: 30, words: 150, wpm: 10 },
                        { x: 9, y: 0.4, label: "Student B", effort: 40, words: 180, wpm: 12 }
                    ],
                    backgroundColor: '#f7941d',
                    pointRadius: 8,
                    pointStyle: 'circle',
                },
                {
                    label: 'Medium Effort (0.5–1.0)',
                    data: [
                        { x: 15, y: 0.8, label: "Mia Thomas", effort: 48, words: 190, wpm: 13.4 },
                        { x: 20, y: 0.7, label: "Student C", effort: 55, words: 210, wpm: 14 }
                    ],
                    backgroundColor: '#3fa9f5',
                    pointRadius: 8,
                    pointStyle: 'circle',
                },
                {
                    label: 'High Effort (1.0–1.3)',
                    data: [
                        { x: 30, y: 1.2, label: "Student D", effort: 75, words: 300, wpm: 15 }
                    ],
                    backgroundColor: '#39b54a',
                    pointRadius: 8,
                    pointStyle: 'circle',
                },
                {
                    label: 'Very High Effort (>1.3)',
                    data: [
                        { x: 35, y: 1.6, label: "Student E", effort: 90, words: 350, wpm: 17 }
                    ],
                    backgroundColor: '#007a33',
                    pointRadius: 8,
                    pointStyle: 'circle',
                },
            ]
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
                    callbacks: {
                        label: function (context) {
                            const d = context.raw;
                            return [
                                    `${d.label}`,
                                    `Time: ${d.x} min`,
                                    `Effort: ${d.effort}%`,
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
                        text: 'Time Spent (minutes)'
                    },
                    min: 0,
                    max: 50
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
}