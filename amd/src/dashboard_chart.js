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
 * Dashboard chart for the writing statistics page.
 *
 * Renders the Chart.js line/bar chart and keeps an accessible equivalent in sync:
 * a status message in the DOM for empty states, and a data table built from the
 * same values. Series differ by shape and dash as well as colour.
 *
 * @module     tiny_cursive/dashboard_chart
 * @copyright  2025 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Chart from 'core/chartjs';
import {get_strings as getStrings} from 'core/str';
import {Color} from 'tiny_cursive/common';

/** @type {string[]} Lang string keys the chart needs. */
const STRING_KEYS = [
    'copybehavior',
    'backspace',
    'es',
    'keys_per_minute',
    'words_per_minute_desc',
    'rr',
    'freemium',
    'module_name',
    'characters_per_minute',
    'word_count',
];

/** @type {Promise<object>|null} Strings are fetched once per page. */
let stringsPromise = null;

/**
 * Resolves the chart strings as a keyed map (never a comma-joined cache).
 *
 * @returns {Promise<object>}
 */
const loadStrings = () => {
    if (!stringsPromise) {
        stringsPromise = getStrings(STRING_KEYS.map(key => ({key, component: 'tiny_cursive'})))
            .then(values => Object.fromEntries(STRING_KEYS.map((key, index) => [key, values[index]])));
    }
    return stringsPromise;
};

/**
 * @returns {boolean} True when the viewer asked for reduced motion.
 */
const prefersReducedMotion = () => Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

export default class DashboardChart {

    ctx = document.getElementById('CursvieMainChart');

    /**
     * @param {string} dataType - 'progress', 'speed', 'effort', 'behavior_pattern' or 'draw' (no API key).
     * @param {string} chartType - Chart.js type ('line' or 'bar').
     * @param {string|null} subType - Metric for progress charts.
     * @param {Array} dataset - Per-submission rows from the page.
     */
    constructor(dataType, chartType, subType, dataset) {
        this.type = chartType;
        this.subType = subType;
        this.dataset = dataset;
        this.dataType = dataType;
        this.yMax = 0;
        this.strings = {};

        this.ready = loadStrings().then(strings => {
            this.strings = strings;
            this.prepareData();
            this.extendPointCapp();
            this.init();
            return this;
        }).catch(error => window.console.error(error));
    }

    init() {
        if (!this.ctx) {
            return;
        }
        const existing = Chart.getChart('CursvieMainChart');
        if (existing) {
            existing.destroy();
        }

        this.ctx.width = this.ctx.parentElement.offsetWidth;
        this.ctx.height = this.ctx.parentElement.offsetHeight;

        // Empty states are text in the DOM, not paint on the canvas (4.1.3).
        this.setStatus(this.dataType === 'draw' ? this.strings.freemium : '');

        const hoverSegment = {
            id: 'hoverSegment',
            beforeDraw(chart) {
                if (chart.config.type === 'bar') {
                    const {ctx, chartArea, scales} = chart;
                    const active = chart.getActiveElements();

                    if (!active.length) {
                        return;
                    }

                    const xScale = scales.x;
                    const index = active[0].index;

                    // Highlight the whole column under the pointer.
                    const columnWidth = xScale.width / xScale.ticks.length;
                    const left = xScale.getPixelForValue(index) - columnWidth / 2;
                    const right = xScale.getPixelForValue(index) + columnWidth / 2;

                    ctx.save();
                    ctx.fillStyle = 'rgba(150, 100, 255, 0.15)';
                    ctx.fillRect(left, chartArea.top, right - left, chartArea.bottom - chartArea.top);
                    ctx.restore();
                }
            },
            afterEvent(chart) {
                // Redraw on pointer movement so the hover highlight follows it.
                chart.draw();
            },
        };

        new Chart(this.ctx.getContext('2d'), {
            type: this.type,
            data: {
                labels: this.dataset.labels,
                datasets: this.dataset.data
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: prefersReducedMotion() ? false : {},
                interaction: {
                    mode: this.dataType === 'speed' ? 'index' : 'nearest',
                    intersect: this.dataType !== 'speed'
                },
                plugins: {
                    title: {
                        display: false,
                    },
                    tooltip: {
                        enabled: true,
                        mode: this.dataType === 'speed' ? 'index' : 'nearest',
                        intersect: this.dataType !== 'speed',
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
                            // Each series shows its own point shape and dash, not only its colour (1.4.1).
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                size: 16,
                                weight: 'bold'
                            },
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

        this.renderTable();
    }

    /**
     * Writes the chart state message (empty clears it).
     *
     * @param {string} text
     */
    setStatus(text) {
        const status = document.getElementById('CursiveChartStatus');
        if (status) {
            status.textContent = text;
            status.hidden = !text;
        }
    }

    /**
     * Fills the data table that mirrors the plotted series (the chart's text alternative).
     */
    renderTable() {
        const holder = document.getElementById('CursiveChartTable');
        const toggle = document.getElementById('CursiveChartTableToggle');
        if (!holder) {
            return;
        }
        holder.replaceChildren();

        const hasData = this.dataType !== 'draw' && this.dataset.data.length > 0 && this.dataset.labels.length > 0;
        if (toggle) {
            toggle.hidden = !hasData;
        }
        if (!hasData) {
            return;
        }

        const table = document.createElement('table');
        table.className = 'table table-sm tiny_cursive-chart-table';
        const caption = table.createCaption();
        caption.className = 'sr-only visually-hidden';
        caption.textContent = document.getElementById('CursiveChartTitle')?.textContent.trim() || '';

        const head = table.createTHead().insertRow();
        [this.strings.module_name, ...this.dataset.data.map(series => series.label)].forEach(text => {
            const th = document.createElement('th');
            th.scope = 'col';
            th.textContent = text;
            head.appendChild(th);
        });

        const body = table.createTBody();
        this.dataset.labels.forEach((label, index) => {
            const row = body.insertRow();
            const th = document.createElement('th');
            th.scope = 'row';
            th.textContent = Array.isArray(label) ? label.join(' ') : String(label);
            row.appendChild(th);
            this.dataset.data.forEach(series => {
                row.insertCell().textContent = series.data[index] ?? '';
            });
        });

        holder.appendChild(table);
    }

    extendPointCapp() {
        const allValues = this.dataset.data.flatMap(ds => ds.data);
        this.yMax = allValues.length ? Math.ceil(Math.max(...allValues) * 1.1) : 0;
    }

    prepareData() {
        const labels = [];
        const datasets = [];

        const dataValues = Object.values(this.dataset);
        dataValues.forEach((data) => {
            labels.push([data.title, ("(" + data.cshortname + ")")]);
        });

        if (this.dataType === 'progress' && this.subType) {
            const values = dataValues.map(data => data[this.subType] ?? 0);
            datasets.push({
                label: this.getText(this.subType),
                data: values,
                borderColor: Color.lineBlue,
                pointStyle: 'circle',
                tension: 0.5
            });
        } else if (this.dataType === 'speed') {
            const wpm = dataValues.map(d => d.words_per_minute ?? 0);
            const kpm = dataValues.map(d => d.keys_per_minute ?? 0);

            datasets.push({
                label: this.getText('words_per_minute_desc'),
                data: wpm,
                borderColor: Color.lineBlue,
                backgroundColor: Color.lightCyan,
                pointStyle: 'circle',
                fill: true,
                tension: 0.5
            }, {
                label: this.getText('keys_per_minute'),
                data: kpm,
                borderColor: Color.lineOrange,
                backgroundColor: Color.lightOrange,
                pointStyle: 'triangle',
                borderDash: [6, 4],
                fill: true,
                tension: 0.5
            });
        } else if (this.dataType === 'effort') {
            const effort = dataValues.map(d => d.effort ?? 0);
            datasets.push({
                label: this.getText('es'),
                data: effort,
                backgroundColor: Color.Purple,
                pointStyle: 'rectRounded',
                borderRadius: 4
            });
        } else if (this.dataType === 'behavior_pattern') {
            const rr = dataValues.map(d => d.backspace_percent ?? 0);
            const cb = dataValues.map(d => d.copy_behavior ?? 0);
            datasets.push(
                {
                    label: this.getText('backspace'),
                    data: rr,
                    borderColor: Color.lineRed,
                    pointStyle: 'rect',
                    borderDash: [6, 4],
                    tension: 0.5
                },
                {
                    label: this.getText('copybehavior'),
                    data: cb,
                    borderColor: Color.lineOrange,
                    pointStyle: 'circle',
                    tension: 0.5
                }
            );
        }
        this.dataset = {
            labels: labels,
            data: datasets
        };
    }

    /**
     * Translated label for a string key or a progress metric name.
     *
     * @param {string} key - Lang string key or metric field name.
     * @returns {string}
     */
    getText(key) {
        const metricStrings = {
            'backspace_percent': 'rr',
            effort: 'es',
            'words_per_minute': 'words_per_minute_desc',
            'characters_per_minute': 'characters_per_minute',
            'word_count': 'word_count',
        };
        const stringKey = metricStrings[key] ?? key;
        if (this.strings[stringKey]) {
            return this.strings[stringKey];
        }
        const text = String(key).charAt(0).toUpperCase() + String(key).slice(1);
        return text.replace(/_/g, ' ');
    }
}
