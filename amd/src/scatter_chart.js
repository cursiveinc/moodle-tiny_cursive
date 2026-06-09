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
 * Scatter chart AMD module for the tiny_cursive authorship analytics report.
 *
 * Responsibilities:
 *  - Renders a Chart.js scatter plot of submission writing data.
 *  - Accepts xaxis / yaxis parameters from PHP (4th and 5th AMD init args).
 *  - Restores the user's last axis choice from localStorage on page load
 *    (localStorage value takes precedence over the PHP-supplied default).
 *  - Wires the #cursive-axis-controls Submit button so the chart updates
 *    immediately when the user picks new axes, without a page reload.
 *  - Enforces mutual exclusion: the same metric cannot appear on both axes.
 *  - Saves the chosen axes to localStorage after each Submit so the
 *    preference persists across sessions.
 *
 * @module     tiny_cursive/scatter_chart
 * @copyright  2025 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Chart from 'core/chartjs';
import {get_strings as getStrings} from 'core/str';

/** @type {string} localStorage key used to persist axis preferences. */
const AXIS_PREF_KEY = 'tiny_cursive_axis_pref';

/** @type {string[]} All valid axis identifiers. */
const VALID_AXES = ['time', 'effort', 'words'];

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Persists the user's axis preference to localStorage.
 * Fails silently when localStorage is unavailable (e.g. private browsing).
 *
 * @param {string} xaxis - Axis key for X.
 * @param {string} yaxis - Axis key for Y.
 */
const saveAxisPref = (xaxis, yaxis) => {
    try {
        localStorage.setItem(AXIS_PREF_KEY, JSON.stringify({x: xaxis, y: yaxis}));
    } catch (e) {
        // Silently ignore quota or security errors.
    }
};

/**
 * Loads the persisted axis preference from localStorage.
 * Returns null when nothing is stored, the stored value is invalid, or
 * both axes are identical.
 *
 * @returns {{x: string, y: string}|null} Saved preference or null.
 */
const loadAxisPref = () => {
    try {
        const raw = localStorage.getItem(AXIS_PREF_KEY);
        if (!raw) {
            return null;
        }
        const pref = JSON.parse(raw);
        if (VALID_AXES.includes(pref.x) && VALID_AXES.includes(pref.y) && pref.x !== pref.y) {
            return pref;
        }
    } catch (e) {
        // Silently ignore parse errors.
    }
    return null;
};

/**
 * Remaps every point's x and y coordinates to the specified axis fields.
 *
 * Each point object always carries the full set of raw metric fields
 * (point.time, point.effort, point.words) so this operation is non-destructive
 * and reversible.
 *
 * @param {object[]} datasets - Chart.js dataset array (mutated in place).
 * @param {string}   xkey     - Raw field name to use for the X coordinate.
 * @param {string}   ykey     - Raw field name to use for the Y coordinate.
 */
const remapDatasets = (datasets, xkey, ykey) => {
    datasets.forEach(dataset => {
        if (!Array.isArray(dataset.data)) {
            return;
        }
        // Prevent Chart.js from clipping points that sit on or near an axis edge.
        dataset.clip = false;
        dataset.data.forEach(point => {
            if (point && typeof point === 'object' && Object.keys(point).length > 0) {
                point.x = point[xkey];
                point.y = point[ykey];
            }
        });
    });
};

/**
 * Returns the human-readable scale label for a given axis key.
 *
 * @param {string} key     - Axis key ('time'|'effort'|'words').
 * @param {object} strings - Resolved Moodle lang strings map.
 * @returns {string} Localised label string.
 */
const getAxisLabel = (key, strings) => {
    const labels = {
        time:   strings.timespent,
        effort: strings.effortscore,
        words:  strings.words,
    };
    return labels[key] ?? key;
};

/**
 * Builds a dynamic chart title that reflects what is currently visible.
 *
 * Format: "<ModuleCaption> — X: <xLabel> / Y: <yLabel> (<n> student(s))"
 * When datasets are empty the module caption is returned unchanged so the
 * title always makes sense in context.
 *
 * @param {string}   caption  - Module-level caption string from PHP.
 * @param {string}   xkey     - Current X-axis key.
 * @param {string}   ykey     - Current Y-axis key.
 * @param {object[]} datasets - Current Chart.js dataset array.
 * @param {object}   strings  - Resolved Moodle lang strings map.
 * @returns {string} Dynamic title string.
 */
const buildChartTitle = (caption, xkey, ykey, datasets, strings) => {
    const totalPoints = datasets.reduce((sum, ds) => {
        if (!Array.isArray(ds.data)) {
            return sum;
        }
        return sum + ds.data.filter(p => p && typeof p === 'object' && Object.keys(p).length > 0).length;
    }, 0);

    if (totalPoints === 0) {
        return caption ?? '';
    }

    const xLabel = getAxisLabel(xkey, strings);
    const yLabel = getAxisLabel(ykey, strings);

    const submissionLabel = totalPoints === 1
        ? `1 ${strings.submission_singular}`
        : `${totalPoints} ${strings.submissions}`;

    return `${caption}: ${xLabel} vs ${yLabel} (${submissionLabel})`;
};



/**
 * Formats a raw seconds value as a mm:ss string.
 *
 * @param {number} seconds - Duration in seconds.
 * @returns {string} Formatted string, e.g. '01:45'.
 */
const formatTime = seconds => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

/**
 * Formats a tick value for an axis.
 * Time axes use mm:ss; all other axes return the raw numeric value.
 *
 * @param {number} value   - Raw axis value.
 * @param {string} axiskey - Axis key for this scale.
 * @returns {string|number} Formatted tick label.
 */
const formatTick = (value, axiskey) => (axiskey === 'time' ? formatTime(value) : value);

/**
 * Draws a centred fallback message directly onto the chart canvas.
 *
 * @param {string} text  - Message to display.
 * @param {Chart}  chart - Active Chart.js instance.
 */
const drawMessage = (text, chart) => {
    const {ctx: canvasCtx, chartArea: {left, right, top, bottom}} = chart;
    canvasCtx.save();
    canvasCtx.textAlign    = 'center';
    canvasCtx.textBaseline = 'middle';
    canvasCtx.font         = 'bold 16px "Segoe UI", Arial';
    canvasCtx.fillStyle    = '#666';
    canvasCtx.fillText(text, (left + right) / 2, (top + bottom) / 2);
    canvasCtx.restore();
};

/**
 * Applies mutual-exclusion constraints to the two axis <select> elements.
 *
 * When the user changes one select, this function:
 *  1. Rotates the other select to a valid (non-duplicate) value if needed.
 *  2. Disables the option in each select that is already chosen by the other.
 *
 * @param {HTMLSelectElement} xselect - The X-axis <select> element.
 * @param {HTMLSelectElement} yselect - The Y-axis <select> element.
 * @param {string}            changed - Which select was just changed: 'x' or 'y'.
 */
const syncAxisSelects = (xselect, yselect, changed) => {
    if (changed === 'x' && yselect.value === xselect.value) {
        yselect.value = VALID_AXES.find(v => v !== xselect.value) ?? 'effort';
    } else if (changed === 'y' && xselect.value === yselect.value) {
        xselect.value = VALID_AXES.find(v => v !== yselect.value) ?? 'time';
    }

    Array.from(xselect.options).forEach(opt => {
        opt.disabled = (opt.value === yselect.value);
    });
    Array.from(yselect.options).forEach(opt => {
        opt.disabled = (opt.value === xselect.value);
    });
};

// ---------------------------------------------------------------------------
// Module entry point
// ---------------------------------------------------------------------------

/**
 * Initialises the scatter chart and axis selector controls.
 *
 * Called by Moodle's AMD loader via:
 *   $PAGE->requires->js_call_amd('tiny_cursive/scatter_chart', 'init', [...]);
 *
 * Arguments 1–3 are unchanged from the original signature.
 * Arguments 4–5 (xaxis, yaxis) are new; they carry the server-side defaults
 * but are overridden by any saved localStorage preference.
 *
 * @param {boolean|null} hasdata - True when data is available to render.
 * @param {boolean}      apikey  - True when a valid API key is configured.
 * @param {string}       caption - Chart title string.
 * @param {string}       xaxis   - Initial X-axis key from PHP ('time'|'effort'|'words').
 * @param {string}       yaxis   - Initial Y-axis key from PHP ('time'|'effort'|'words').
 */
export const init = async(hasdata, apikey, caption, xaxis = 'time', yaxis = 'effort') => {

    const canvasEl = document.getElementById('effortScatterChart');
    if (!canvasEl) {
        return;
    }
    const chartCtx = canvasEl.getContext('2d');

    // Parse the full dataset from the hidden server-side data store.
    let data = [];
    if (hasdata) {
        const dataEl = document.getElementById('scatter-chart-data');
        if (dataEl) {
            data = JSON.parse(dataEl.dataset.data);
        }
    }

    // -----------------------------------------------------------------------
    // Resolve localisation strings
    // -----------------------------------------------------------------------
    const [
        strApplyFilter,
        strNoSubmission,
        strNoPayload,
        strFreemium,
        strTime,
        strWords,
        strEffortRatio,
        strWpm,
        strEffortScore,
        strTimespent,
        strSubmissionSingular,
        strSubmissionsPlural,
    ] = await getStrings([
        {key: 'apply_filter',  component: 'tiny_cursive'},
        {key: 'no_submission', component: 'tiny_cursive'},
        {key: 'nopaylod',      component: 'tiny_cursive'},
        {key: 'freemium',      component: 'tiny_cursive'},
        {key: 'time',          component: 'tiny_cursive'},
        {key: 'words',         component: 'tiny_cursive'},
        {key: 'effort_ratio',  component: 'tiny_cursive'},
        {key: 'wpm',           component: 'tiny_cursive'},
        {key: 'effort_score',  component: 'tiny_cursive'},
        {key: 'timespent',     component: 'tiny_cursive'},
        {key: 'submission_singular', component: 'tiny_cursive'},
        {key: 'submissions',         component: 'tiny_cursive'},
    ]);

    const strings = {
        applyfilter:  strApplyFilter,
        nosubmission: strNoSubmission,
        nopayload:    strNoPayload,
        freemium:     strFreemium,
        time:         strTime,
        words:        strWords,
        effortratio:  strEffortRatio,
        wpm:          strWpm,
        effortscore:  strEffortScore,
        timespent:    strTimespent,
        submission_singular: strSubmissionSingular,
        submissions:         strSubmissionsPlural,
    };

    // -----------------------------------------------------------------------
    // Restore last axis preference (localStorage beats PHP default)
    // -----------------------------------------------------------------------
    const savedPref = loadAxisPref();
    if (savedPref) {
        xaxis = savedPref.x;
        yaxis = savedPref.y;
    }

    // -----------------------------------------------------------------------
    // Wire axis <select> elements and Submit button
    // -----------------------------------------------------------------------
    const xselect   = document.getElementById('cursive-xaxis');
    const yselect   = document.getElementById('cursive-yaxis');
    const submitBtn = document.getElementById('cursive-axis-submit');

    if (xselect && yselect) {
        xselect.value = xaxis;
        yselect.value = yaxis;
        syncAxisSelects(xselect, yselect, 'x'); // Apply disabled states on load.

        xselect.addEventListener('change', () => syncAxisSelects(xselect, yselect, 'x'));
        yselect.addEventListener('change', () => syncAxisSelects(xselect, yselect, 'y'));
    }

    // -----------------------------------------------------------------------
    // Validate data and prepare datasets
    // -----------------------------------------------------------------------
    let showTitle = true;
    let hasPoints = false;
    let datasets  = [];

    if (Array.isArray(data) && !data.state && apikey) {
        datasets  = data;
        hasPoints = datasets.some(ds =>
            Array.isArray(ds.data) &&
            ds.data.some(p => p && typeof p === 'object' && Object.keys(p).length > 0)
        );
    }

    if (!apikey || datasets.length === 0 || !hasPoints || data === false) {
        showTitle = false;
    }

    // Apply the resolved axis mapping to all point coordinates.
    // clip:false is set inside remapDatasets so it also applies on initial render.
    remapDatasets(datasets, xaxis, yaxis);

    // -----------------------------------------------------------------------
    // Fallback message plugin
    // -----------------------------------------------------------------------
    const fallbackMessagePlugin = {
        id: 'fallbackMessagePlugin',
        /**
         * Draws a message when the chart cannot display real data.
         *
         * @param {Chart} chart - The Chart.js instance.
         */
        afterDraw(chart) {
            if (!apikey) {
                drawMessage('⚠ ' + strings.freemium, chart);
                return;
            }
            if (data.state === 'apply_filter') {
                drawMessage('⚠ ' + strings.applyfilter, chart);
                return;
            }
            if (data.state === 'no_submission') {
                drawMessage('⚠ ' + strings.nosubmission, chart);
                return;
            }
            if (!hasPoints && !data.state) {
                drawMessage('⚠ ' + strings.nopayload, chart);
            }
        },
    };

    // -----------------------------------------------------------------------
    // Build the Chart.js instance
    // -----------------------------------------------------------------------
    const chart = new Chart(chartCtx, {
        type: 'scatter',
        data: {datasets},
        options: {
            plugins: {
                title: {
                    display: showTitle,
                    text:    buildChartTitle(caption, xaxis, yaxis, datasets, strings),
                    font:    {size: 16, weight: 'bold'},
                    color:   '#333',
                    padding: {top: 10, bottom: 20},
                    align:   'center',
                },
                legend: {
                    // Hide the legend entirely when there are no real data points so
                    // effort-tier labels are not shown against an empty chart.
                    display:  hasPoints,
                    position: 'bottom',
                    labels:   {usePointStyle: true, pointStyle: 'circle', padding: 20},
                },
                tooltip: {
                    backgroundColor: 'rgba(252,252,252,0.8)',
                    titleColor:      '#000',
                    bodyColor:       '#000',
                    borderColor:     '#cccccc',
                    borderWidth:     1,
                    displayColors:   false,
                    callbacks: {
                        /**
                         * Returns the submission label as the tooltip title.
                         *
                         * @param {object[]} context - Chart.js tooltip context array.
                         * @returns {string} Submission label.
                         */
                        title: context => context[0].raw.label,
                        /**
                         * Returns the full metric breakdown for the hovered point.
                         * Always shows all four raw metrics regardless of axis choice
                         * so teachers get complete information from every tooltip.
                         *
                         * @param {object} context - Chart.js tooltip context for one point.
                         * @returns {string[]} Array of label lines.
                         */
                        label: context => {
                            const point = context.raw;
                            return [
                                `${strings.time}: ${formatTime(point.time)}`,
                                `${strings.effortratio}: ${Math.round(point.effort * 100 * 100) / 100}%`,
                                `${strings.words}: ${point.words}`,
                                `${strings.wpm}: ${point.wpm}`,
                            ];
                        },
                    },
                },
            },
            scales: {
                x: {
                    title: {display: true, text: getAxisLabel(xaxis, strings)},
                    min:   0,
                    ticks: {
                        /**
                         * @param {number} value - Raw axis value.
                         * @returns {string|number} Formatted tick label.
                         */
                        callback: value => formatTick(value, xaxis),
                    },
                },
                y: {
                    title: {display: true, text: getAxisLabel(yaxis, strings)},
                    min:   0,
                    ticks: {
                        stepSize: yaxis === 'effort' ? 0.5 : undefined,
                        /**
                         * @param {number} value - Raw axis value.
                         * @returns {string|number} Formatted tick label.
                         */
                        callback: value => formatTick(value, yaxis),
                    },
                },
            },
        },
        // Padding inside the canvas gives near-zero points room to render
        // without being clipped against the axis lines.
        layout: {
            padding: {
                top:   10,
                right: 10,
            },
        },
        plugins: [fallbackMessagePlugin],
    });

    // -----------------------------------------------------------------------
    // Axis Submit handler — updates chart without page reload
    // -----------------------------------------------------------------------
    if (submitBtn && xselect && yselect) {
        submitBtn.addEventListener('click', () => {
            const newX = xselect.value;
            const newY = yselect.value;

            if (newX === newY) {
                // Guard: should not occur due to mutual-exclusion logic above.
                return;
            }

            // Remap point coordinates (also sets clip:false on each dataset).
            remapDatasets(chart.data.datasets, newX, newY);

            // Update scale axis labels.
            chart.options.scales.x.title.text = getAxisLabel(newX, strings);
            chart.options.scales.y.title.text = getAxisLabel(newY, strings);

            // Update tick formatters.
            chart.options.scales.x.ticks.callback = value => formatTick(value, newX);
            chart.options.scales.y.ticks.callback = value => formatTick(value, newY);
            chart.options.scales.y.ticks.stepSize = newY === 'effort' ? 0.5 : undefined;

            // Update chart title to reflect the new axis combination.
            chart.options.plugins.title.text = buildChartTitle(caption, newX, newY, chart.data.datasets, strings);

            chart.update();

            // Persist the new preference for the next page load.
            saveAxisPref(newX, newY);
        });
    }
};