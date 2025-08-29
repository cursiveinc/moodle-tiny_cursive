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
 * @category TinyMCE Editor
 * @copyright  CTI <info@cursivetechnology.com>
 * @author kuldeep singh <mca.kuldeep.sekhon@gmail.com>
 */
import $ from "jquery";
import AJAX from "core/ajax";
import * as str from "core/str";
import templates from "core/templates";
import Replay from "./replay";
import analyticButton from "./analytic_button";
import AnalyticEvents from "./analytic_events";
import Events from "core/modal_events";
import Alert from "core/modal";
import Modal from "core/modal_save_cancel";
import dashboardChart from "tiny_cursive/dashboard_chart";

export const init = (page, hasApiKey, csvOption) => {
    const replayInstances = {};
    // eslint-disable-next-line
    window.video_playback = function (mid, filepath) {
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
            // eslint-disable-next-line
            templates.render('tiny_cursive/no_submission').then(html => {
                $('#content' + mid).html(html);
            }).catch(e => window.console.error(e));
        }
        return false;
    };

    str
        .get_strings([
            { key: "field_require", component: "tiny_cursive" },
        ])
        .done(function () {
            getusers(page);
        });

    let myEvents = new AnalyticEvents();
    (async function () {
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
     * This function iterates over each element with the class `analytic-modal`,
     * retrieves necessary data attributes, and makes an AJAX call to get writing
     * statistics. Once the data is retrieved, it processes and displays it within
     * the modal.
     *
     * @param {Object} scoreSetting - Configuration settings related to scoring.
     * @param {boolean} hasApiKey - api key status
     * @param {boolean} csvOption - csv option status
     */
    function analyticsEvents(scoreSetting, hasApiKey, csvOption) {

        $(".analytic-modal").each(function () {
            var mid = $(this).data("id");
            var filepath = $(this).data("filepath");
            let context = {};
            context.userid = mid;
            let cmid = $(this).data("cmid");


            AJAX.call([{
                methodname: 'cursive_get_writing_statistics',
                args: {
                    cmid: cmid,
                    fileid: mid,
                },
            }])[0].done(response => {
                let data = JSON.parse(response.data);

                $(this).html(analyticButton(hasApiKey ? data.effort_ratio : "", $(this).data('id')));

                context.formattime = myEvents.formatedTime(data);
                context.tabledata = data;
                context.apikey = hasApiKey;
                // Perform actions that require context.tabledata
                let authIcon = myEvents.authorshipStatus(data.first_file, data.score, scoreSetting);
                myEvents.createModal(mid, context, '', replayInstances, authIcon);
                myEvents.analytics(mid, templates, context, '', replayInstances, authIcon);
                myEvents.checkDiff(mid, mid, '', replayInstances);
                myEvents.replyWriting(mid, filepath, '', replayInstances);

            }).fail(error => {
                throw new Error('Error: ' + error.message);
            });

        });


        $('.download-btn').on('click', async function (e) {
            e.preventDefault();

            const link1 = $(this).attr('href');
            const link2 = $(this).data('link');

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
                }]
            }).then(modal => {
                modal.show();
                modal.getRoot().on(Events.save, function () {
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
            });
        });


        const chartTitle = document.getElementById('CursiveChartTitle');
        const chartDesc = document.getElementById('CursiveChartDescription');

        var dataType = $('#CursiveChartTypeSelect').val();
        var chartType = "line";
        var subType = $('#CursiveMetricSelect').val() ?? "";
        var dataset = $('#CursiveChartTypeSelect').data('chart');

        generateProgressChart(dataType, chartType, subType, dataset, false);

        $('#CursiveChartTypeSelect').on('change', function (e) {
            chartTitle.textContent = $(this).find(':selected').text();
            document.getElementById('CursiveMetricSelect').dispatchEvent(new Event('change'));
            if (this.dataType !== 'progress') {
                chartDesc.textContent = $(this).find(':selected').data('track');
            }

            dataType = $(this).val();
            chartType = dataType === 'effort' ? 'bar' : 'line';
            generateProgressChart(dataType, chartType, subType, dataset, false);

        });
        $('#CursiveMetricSelect').on('change', function () {
            subType = $(this).val();
            let description = $(this).find(':selected').data('track');
            chartDesc.textContent = description;
            generateProgressChart(dataType, chartType, subType, dataset, false);
        });

        $('#expandChart').on('click', function () {
            $('#CursiveChartContainer').toggleClass('cursive-expand-height');
            generateProgressChart(dataType, chartType, subType, dataset);
        });
        document.getElementById('CursiveChartTypeSelect').dispatchEvent(new Event('change'));
        document.getElementById('CursiveMetricSelect').dispatchEvent(new Event('change'));

    }

    function getusers(page) {
        $("#id_coursename").change(function () {
            var courseid = $(this).val();
            var promise1 = AJAX.call([
                {
                    methodname: "cursive_get_user_list",
                    args: {
                        courseid: courseid,
                    },
                },
            ]);
            promise1[0].done(function (json) {
                var data = JSON.parse(json);
                var context = {
                    tabledata: data,
                    page: page,
                };
                // eslint-disable-next-line
                templates
                    .render("tiny_cursive/user_list", context)
                    .then(function (html) {

                        var filteredUser = $("#id_username");
                        filteredUser.html(html);
                        return true;
                    });
            });

            var promise2 = AJAX.call([
                {
                    methodname: "cursive_get_module_list",
                    args: {
                        courseid: courseid,
                    },
                },
            ]);
            promise2[0].done(function (json) {
                var data = JSON.parse(json);
                var context = {
                    tabledata: data,
                    page: page,
                };
                // eslint-disable-next-line
                templates
                    .render("tiny_cursive/module_list", context)
                    .then(function (html) {

                        var filteredUser = $("#id_modulename");
                        filteredUser.html(html);
                        return true;
                    });
            });
        });


    }

    function generateProgressChart(dataType, chartType, subType, dataset, toggle) {

        if (dataType === 'progress') {
            $('#CursiveMetricControls').removeClass('d-none');
            new dashboardChart(dataType, chartType, subType, dataset, toggle);
        } else {
            $('#CursiveMetricControls').addClass('d-none');
            new dashboardChart(dataType, chartType, null, dataset, toggle);
        }
    }
}
