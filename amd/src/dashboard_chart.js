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
 * A module for creating and managing charts in the dashboard interface.
 * This module provides functionality for rendering, updating and interacting
 * with chart visualizations used in the Cursive dashboard.
 *
 * @module     tiny_cursive/dashboard_chart
 * @copyright  2025 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Chart from 'core/chartjs';
import { get_strings as getStrings } from 'core/str';
import { Color } from 'tiny_cursive/common';
export default class dhasboardChart {

    ctx = document.getElementById('CursvieMainChart');

    constructor(dataType, chartType, subType, dataset) {
        this.type = chartType;
        this.subType = subType;
        this.dataset = dataset;
        this.dataType = dataType;
        this.yMax = 0;

        if (Chart.getChart('CursvieMainChart')) {
            Chart.getChart('CursvieMainChart').destroy();
        }

        this.fetchStrings();
        this.prepareData();
        this.extendPointCapp();
        this.init();
    }

    init() {

        this.ctx.width = this.ctx.parentElement.offsetWidth;
        this.ctx.height = this.ctx.parentElement.offsetHeight;

        const hoverSegment = {
            id: 'hoverSegment',
            beforeDraw(chart) {
                if (chart.config.type === 'bar') {
                    const { ctx, chartArea, scales } = chart;
                    const active = chart.getActiveElements();

                    if (!active.length) {
                        return;
                    }

                    const xScale = scales.x;
                    const index = active[0].index;

                    // Calculate the full column width (entire section)
                    const columnWidth = xScale.width / xScale.ticks.length;
                    const left = xScale.getPixelForValue(index) - columnWidth / 2;
                    const right = xScale.getPixelForValue(index) + columnWidth / 2;

                    ctx.save();
                    ctx.fillStyle = 'rgba(150, 100, 255, 0.15)'; // column highlight
                    ctx.fillRect(left, chartArea.top, right - left, chartArea.bottom - chartArea.top);
                    ctx.restore();
                }
            },
            afterEvent(chart) {
                // Force redraw on any chart movement to update hover effect
                chart.draw();
            },
            afterDraw: (chart) => {
                this.drawMessage(this.getText(6), chart);
            }
        };

        // Create new chart.
        new Chart(this.ctx.getContext('2d'), {
            type: this.type,
            data: {
                labels: this.dataset.labels,
                datasets: this.dataset.data
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: this.dataType === 'speed' ? 'index' : 'nearest',
                    intersect: this.dataType === 'speed' ? false : true
                },
                plugins: {
                    title: {
                        display: false,
                    },
                    tooltip: {
                        enabled: true,
                        mode: this.dataType === 'speed' ? 'index' : 'nearest',
                        intersect: this.dataType === 'speed' ? false : true,
                        backgroundColor: Color.white,
                        titleColor: Color.black,
                        bodyColor: Color.black,
                        padding: 6,
                        usePointStyle: true,
                        borderColor: Color.tpGray,
                        borderWidth: 1,
                        font: {
                            size: 14
                        },
                        displayColors: false,
                    },
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                size: 16,
                                weight: 'bold'
                            },
                            generateLabels: (chart) => {
                                if (this.dataType !== 'effort') {
                                    return chart.data.datasets.map((dataset) => (
                                        {
                                            text: dataset.label,
                                            fillStyle: dataset.borderColor,
                                            strokeStyle: dataset.borderColor,
                                            fontColor: dataset.borderColor,
                                            pointStyle: this.createStyle(dataset.borderColor),
                                        }

                                    ));
                                } else {
                                    return chart.data.datasets.map((dataset) => (
                                        {
                                            text: dataset.label,
                                            fillStyle: dataset.backgroundColor,
                                            strokeStyle: dataset.backgroundColor,
                                            fontColor: dataset.backgroundColor,
                                            pointStyle: 'rectRounded',
                                        }

                                    ));
                                }
                            }
                        }
                    },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        suggestedMax: this.yMax
                    }
                }
            },
            plugins: [hoverSegment]
        });

    }

    extendPointCapp() {
        let allValues = this.dataset.data.flatMap(ds => ds.data);
        let maxValue = Math.max(...allValues);
        this.yMax = Math.ceil(maxValue * 1.1); // extend by 10%
    }

    prepareData() {

        const labels = [];
        const datasets = [];

        const dataValues = Object.values(this.dataset);
        dataValues.forEach((data) => {
            labels.push([data.title, ("("+data.cshortname+")")]);
        });



        if (this.dataType === 'progress' && this.subType) {

            const values = dataValues.map(data => data[this.subType] ?? 0);
            datasets.push({
                label: this.getText(this.subType),
                data: values,
                borderColor: Color.lineBlue,
                tension: 0.5
            });

        } else if (this.dataType === 'speed') {

            const wpm = dataValues.map(d => d.words_per_minute ?? 0); // Words per Min.
            const kpm = dataValues.map(d => d.keys_per_minute ?? 0); // Keys per Min.

            datasets.push({
                label: this.getText(4),
                data: wpm,
                borderColor: Color.lineBlue,
                backgroundColor: Color.lightCyan,
                fill: true,
                tension: 0.5
            }, {
                label: this.getText(3),
                data: kpm,
                borderColor: Color.lineOrange,
                backgroundColor: Color.lightOrange,
                fill: true,
                tension: 0.5
            });

        } else if (this.dataType === 'effort') {
            const effort = dataValues.map(d => d.effort ?? 0);
            datasets.push({
                label: this.getText(2),
                data: effort,
                backgroundColor: Color.Purple,
                borderRadius: 4
            });
        } else if (this.dataType === 'behavior_pattern') {
            const rr = dataValues.map(d => d.backspace_percent ?? 0); // Revision Rate.
            const cb = dataValues.map(d => d.copy_behavior ?? 0); // Copy Behavior.
            datasets.push(
                {
                    label: this.getText(1),
                    data: rr,
                    borderColor: Color.lineRed,
                    tension: 0.5
                },
                {
                    label: this.getText(0),
                    data: cb,
                    borderColor: Color.lineOrange,
                    tension: 0.5
                }
            );
        }
        this.dataset = {
            labels: labels,
            data: datasets
        };

    }

    async fetchStrings() {

        let component = 'tiny_cursive';

        await getStrings([
            { key: 'copybehavior', component: component },
            { key: 'backspace', component: component },
            { key: 'es', component: component },
            { key: 'keys_per_minute', component: component },
            { key: 'words_per_minute_desc', component: component },
            { key: 'rr', component: component },
            { key: 'freemium', component: component },
        ]).done((strings) => {
            localStorage.setItem('langString', strings);
        });
    }

    getText(text) {
        if (typeof text === 'number') {
            let strings = localStorage.getItem('langString');
            if (strings) {
                strings = strings.split(',');
                return strings[text];
            }

        } else {
            text = text === 'backspace_percent' ? this.getText(5) : String(text).charAt(0).toUpperCase() + String(text).slice(1);
            text = text === 'Effort' ? this.getText(2) : String(text).charAt(0).toUpperCase() + String(text).slice(1);
            return text.replace(/_/g, " ");
        }

    }

    createStyle(color) {
        const size = 20; // symbol size
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext('2d');
        const centerX = size / 2;
        const centerY = size / 2;
        const radius = 3;

        // Draw horizontal line
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(2, centerY);
        ctx.lineTo(size - 2, centerY);
        ctx.stroke();

        // Draw circle in middle
        ctx.fillStyle = 'white'; // White fill
        ctx.strokeStyle = color; // Blue outline (from your color variable)
        ctx.lineWidth = 2; // Outline thickness

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fill(); // Fill with white
        ctx.stroke(); // Stroke with blue outline

        return canvas;
    }

        /**
     * Draws a message on the chart canvas
     * @param {string} text - The message to be displayed
     * @param {Chart} chart - The Chart.js chart object
     */
drawMessage(text, chart) {
    if (this.dataType !== 'draw') {
        return;
    }

    const {ctx, chartArea: {left, right, top, bottom}} = chart;
    ctx.save();

    const centerX = (left + right) / 2;
    const centerY = (top + bottom) / 2;

    if (text === undefined) {
        // Draw loading spinner animation
        const now = Date.now();
        const spinnerRadius = 20;
        const lineWidth = 4;
        const spinnerSpeed = 0.002; // Radians per millisecond

        // Calculate rotation based on time
        const rotation = (now * spinnerSpeed) % (Math.PI * 2);

        // Draw background circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, spinnerRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = lineWidth;
        ctx.stroke();

        // Draw spinning arc
        ctx.beginPath();
        ctx.arc(centerX, centerY, spinnerRadius, rotation, rotation + Math.PI * 1.5);
        ctx.strokeStyle = '#666';
        ctx.lineWidth = lineWidth;
        ctx.stroke();

        // Add loading text
        ctx.font = '14px "Segoe UI", Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // ctx.fillText('Loading...', centerX, centerY + spinnerRadius + 20);

        // Request animation frame to continue animation
        if (!this._animationFrame) {
            const animate = () => {
                if (this.dataType === 'draw' && text === undefined) {
                    chart.update();
                    this._animationFrame = requestAnimationFrame(animate);
                } else {
                    this._animationFrame = null;
                }
            };
            this._animationFrame = requestAnimationFrame(animate);
        }
    } else {
        // Draw regular text.
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 16px "Segoe UI", Arial';
        ctx.fillStyle = '#666';
        // Fill background with white
        const textMetrics = ctx.measureText(text);
        const textWidth = textMetrics.width;
        const textHeight = 16; // Approximate height based on font size
        const padding = 8;

        ctx.fillStyle = 'white';
        ctx.fillRect(
            centerX - textWidth/2 - padding,
            centerY - textHeight/2 - padding,
            textWidth + padding * 2,
            textHeight + padding * 2
        );

        // Reset fill style for text
        ctx.fillStyle = '#666';
        ctx.fillText(text, centerX, centerY);

        // Stop animation if it was running
        if (this._animationFrame) {
            cancelAnimationFrame(this._animationFrame);
            this._animationFrame = null;
        }
    }

    ctx.restore();
}
}