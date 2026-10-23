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
 * @module     tiny_cursive/cursive_writing_reports
 * @category   TinyMCE Editor
 * @copyright  CTI <info@cursivetechnology.com>
 * @author     Brain Station 23 <sales@brainstation-23.com>
 */
import AJAX from "core/ajax";
import * as str from "core/str";
import templates from "core/templates";
import Replay from "tiny_cursive/replay";
import analyticButton from "tiny_cursive/analytic_button";
import AnalyticEvents from "tiny_cursive/analytic_events";
import Events from "core/modal_events";
import Alert from "core/modal";
import Modal from "core/modal_save_cancel";
import DashboardChart from "tiny_cursive/dashboard_chart";
import replayButton from 'tiny_cursive/replay_button';

export const init = (page, hasApiKey, csvOption) => {
    const replayInstances = {};
    // eslint-disable-next-line
    window.video_playback = function(mid, filepath) {
        if (filepath !== '') {
            const replay = new Replay(
                'content' + mid,
                filepath,
                10,
                false,
                'player_' + mid
            );
            replayInstances[mid] = replay;
        } else {

            templates.render('tiny_cursive/no_submission').then(html => {
                const contentEl = document.getElementById('content' + mid);
                if (contentEl) {
                    contentEl.innerHTML = html;
                }
                return true;
            }).catch(e => window.console.error(e));
        }
        return false;
    };

    str
        .get_strings([
            {key: "field_require", component: "tiny_cursive"},
        ])
        .done(function() {
            getusers(page);
        });

    let myEvents = new AnalyticEvents();
    (async function() {
        try {
            let scoreSetting = await str.get_string('confidence_threshold', 'tiny_cursive');
            analyticsEvents(scoreSetting, hasApiKey, parseInt(csvOption));
        } catch (error) {
            window.console.error('Error fetching string:', error);
        }
    })();

    /**
     * Handles the analytics events for each modal on the page.
     *
     * @param {Object} scoreSetting - Configuration settings related to scoring.
     * @param {boolean} hasApiKey - api key status
     * @param {boolean} csvOption - csv option status
     */
    function analyticsEvents(scoreSetting, hasApiKey, csvOption) {

        document.querySelectorAll(".analytic-modal").forEach(function(modalEl) {
            var mid = modalEl.dataset.id;
            var filepath = modalEl.dataset.filepath;
            let context = {};
            context.userid = mid;
            let cmid = modalEl.dataset.cmid;

            AJAX.call([{
                methodname: 'tiny_cursive_get_writing_statistics',
                args: {
                    cmid: cmid,
                    fileid: mid,
                },
            }])[0].done(response => {
                let data = JSON.parse(response.data);

                // Show replay button if no API key, otherwise show analytics button
                modalEl.innerHTML = '';
                if (!hasApiKey) {
                    modalEl.appendChild(replayButton(mid));
                } else {
                    modalEl.appendChild(analyticButton(data.effort_ratio, mid));
                }

                context.formattime = myEvents.formatedTime(data);
                context.tabledata = data;
                context.apikey = hasApiKey;

                // Perform actions that require context.tabledata
                let authIcon = myEvents.authorshipStatus(data.user_agent, data.first_file, data.score, scoreSetting);
                myEvents.createModal(mid, context, '', replayInstances, authIcon);
                myEvents.analytics(mid, templates, context, '', replayInstances, authIcon);
                myEvents.checkDiff(mid, mid, '', replayInstances, filepath);
                myEvents.replyWriting(mid, filepath, '', replayInstances);

            }).fail(error => {
                throw new Error('Error: ' + error.message);
            });
        });

        document.querySelectorAll('.download-btn').forEach(function(btn) {
            btn.addEventListener('click', async function(e) {
                e.preventDefault();

                const link1 = btn.getAttribute('href');
                const link2 = btn.dataset.link;

                let optionModal = Modal;
                let select = document.createElement('select');
                select.id = "download-type";
                select.classList.add('form-control', 'inputUrl');

                let title = await str.get_string('download', 'tiny_cursive');

                // Add CSV option
                if (csvOption) {
                    try {
                        const text = await str.get_string('payloadjson', 'tiny_cursive');
                        let option = document.createElement('option');
                        option.text = text;
                        option.value = 0;
                        select.appendChild(option);
                    } catch (error) {
                        window.console.error(error);
                    }
                }

                // Add API key option
                if (hasApiKey) {
                    try {
                        const text = await str.get_string('analyticspdf', 'tiny_cursive');
                        let option2 = document.createElement('option');
                        option2.text = text;
                        option2.value = 1;
                        select.appendChild(option2);
                    } catch (error) {
                        window.console.error(error);
                    }
                }

                // If no options available
                if (!hasApiKey && !csvOption) {
                    try {
                        const noOptionText = await str.get_string('no_option', 'tiny_cursive');
                        const messageText = await str.get_string('message', 'tool_dataprivacy');
                        title = messageText;
                        optionModal = Alert;
                        select = noOptionText;
                    } catch (error) {
                        window.console.error(error);
                    }
                }

                optionModal.create({
                    title: title,
                    body: select,
                    removeOnClose: true,
                    buttons: [{
                        text: 'OK',
                        type: 'submit',
                        primary: true
                    }],
                    show: true,
                }).then(modal => {
                    if (optionModal !== Alert) {
                        modal.getRoot().on(Events.save, function() {
                            const data = document.getElementById('download-type');
                            if (!data) {
                                return;
                            }
                            if (parseInt(data.value)) {
                                window.location.href = link2;
                            } else {
                                window.location.href = link1;
                            }
                        });
                    }
                    return modal;
                }).catch(error => {
                    window.console.error('failed to open modal', error);
                });
            });
        });

        // For Writing Statistics Page.
        if (document.body.id === 'page-cws') {
            const chartTitle = document.getElementById('CursiveChartTitle');
            const chartDesc = document.getElementById('CursiveChartDescription');
            const chartTypeSelect = document.getElementById('CursiveChartTypeSelect');
            const metricSelect = document.getElementById('CursiveMetricSelect');

            var dataType = chartTypeSelect ? chartTypeSelect.value : '';
            var chartType = "line";
            var subType = metricSelect ? metricSelect.value : "";
            var dataset = chartTypeSelect && chartTypeSelect.dataset.chart
                ? JSON.parse(chartTypeSelect.dataset.chart)
                : [];

            if (hasApiKey) {
                generateProgressChart(dataType, chartType, subType, dataset, false);
                if (chartTypeSelect) {
                    chartTypeSelect.addEventListener('change', function() {
                        const selectedOption = this.options[this.selectedIndex];
                        if (chartTitle && selectedOption) {
                            chartTitle.textContent = selectedOption.textContent;
                        }
                        if (metricSelect) {
                            metricSelect.dispatchEvent(new Event('change'));
                        }
                        if (dataType !== 'progress' && chartDesc && selectedOption) {
                            chartDesc.textContent = selectedOption.dataset.track || '';
                        }

                        dataType = this.value;
                        chartType = dataType === 'effort' ? 'bar' : 'line';
                        generateProgressChart(dataType, chartType, subType, dataset, false);
                    });
                }
                if (metricSelect) {
                    metricSelect.addEventListener('change', function() {
                        subType = this.value;
                        const selectedOption = this.options[this.selectedIndex];
                        let description = selectedOption ? (selectedOption.dataset.track || '') : '';
                        if (chartDesc) {
                            chartDesc.textContent = description;
                        }
                        generateProgressChart(dataType, chartType, subType, dataset, false);
                    });
                }

                if (chartTypeSelect) {
                    chartTypeSelect.dispatchEvent(new Event('change'));
                }
                if (metricSelect) {
                    metricSelect.dispatchEvent(new Event('change'));
                }
            } else {
                generateProgressChart("draw", chartType, subType, [], false);
            }

            const expandChart = document.getElementById('expandChart');
            if (expandChart) {
                expandChart.addEventListener('click', function() {
                    const chartContainer = document.getElementById('CursiveChartContainer');
                    const showText = document.getElementById('showtext');
                    const hideText = document.getElementById('hidetext');
                    const tinyChartContainer = document.getElementById('tiny_cursive-chart-container');

                    if (chartContainer) {
                        chartContainer.classList.toggle('tiny_cursive-expand-height');
                    }
                    if (showText) {
                        showText.classList.toggle('d-none');
                    }
                    if (hideText) {
                        hideText.classList.toggle('d-none');
                    }
                    setTimeout(() => {
                        if (tinyChartContainer) {
                            tinyChartContainer.classList.toggle('tiny_cursive-hide-chartcontainer');
                        }
                    }, 200);
                });
            }
        }
    }

    /**
     * Handles user selection and populates user and module lists based on course selection.
     *
     * @param {string} page - The current page identifier used for context in templates
     */
    function getusers(page) {
        const courseSelect = document.getElementById("id_courseid");
        if (courseSelect) {
            courseSelect.addEventListener('change', function() {
                var courseid = this.value;

                var promise1 = AJAX.call([
                    {
                        methodname: "tiny_cursive_get_user_list",
                        args: {
                            courseid: courseid,
                        },
                    },
                ]);
                promise1[0].done(function(json) {
                    var data = JSON.parse(json);
                    var context = {
                        tabledata: data,
                        page: page,
                    };
                    templates
                        .render("tiny_cursive/user_list", context)
                        .then(function(html) {
                            const filteredUser = document.getElementById("id_username");
                            if (filteredUser) {
                                filteredUser.innerHTML = html;
                            }
                            return true;
                        }).catch(e => window.console.error(e));
                });

                var promise2 = AJAX.call([
                    {
                        methodname: "tiny_cursive_get_module_list",
                        args: {
                            courseid: courseid,
                        },
                    },
                ]);
                promise2[0].done(function(json) {
                    var data = JSON.parse(json);

                    var context = {
                        tabledata: data,
                        page: page,
                    };
                    templates
                        .render("tiny_cursive/module_list", context)
                        .then(function(html) {
                            const filteredModule = document.getElementById("id_moduleid");
                            if (filteredModule) {
                                filteredModule.innerHTML = html;
                            }
                            return true;
                        }).catch(e => window.console.error(e));
                });
            });
        }
    }

    /**
     * Generates a progress chart based on the specified parameters.
     *
     * @param {string} dataType - The type of data to display in the chart (e.g., 'progress', 'effort')
     * @param {string} chartType - The type of chart to render (e.g., 'line', 'bar')
     * @param {string|null} subType - The metric subtype for progress charts, null for other types
     * @param {Array} dataset - The data to be displayed in the chart
     * @param {boolean} toggle - Whether the chart is being toggled/expanded
     */
    function generateProgressChart(dataType, chartType, subType, dataset, toggle) {
        const metricControls = document.getElementById('CursiveMetricControls');
        if (dataType === 'progress') {
            if (metricControls) {
                metricControls.classList.remove('d-none');
            }
            new DashboardChart(dataType, chartType, subType, dataset, toggle);
        } else {
            if (metricControls) {
                metricControls.classList.add('d-none');
            }
            new DashboardChart(dataType, chartType, null, dataset, toggle);
        }
    }
};
