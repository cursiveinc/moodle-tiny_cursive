<?php
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
 * Tiny cursive plugin writing report — v2 layout.
 *
 * Logic is identical to tiny_cursive_report.php (v1).
 * Only the HTML structure and CSS classes have changed to produce a
 * card-based, two-column layout with a dedicated chart header bar.
 *
 * @package    tiny_cursive
 * @copyright  CTI <info@cursivetechnology.com>
 * @author     kuldeep singh <mca.kuldeep.sekhon@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

use tiny_cursive\constants;
use tiny_cursive\forms\user_report_form;

require(__DIR__ . '/../../../../../config.php');
require_once(__DIR__ . '/locallib.php');
require_once(__DIR__ . '/lib.php');

global $DB, $PAGE, $OUTPUT;

require_login();

// ── Parameters (unchanged from v1) ──────────────────────────────────────────
$courseid = required_param('courseid', PARAM_INT);
$userid   = optional_param('userid', 0, PARAM_INT);
$moduleid = optional_param('moduleid', 0, PARAM_INT);
$orderby  = optional_param('orderby', 'id', PARAM_ALPHA);
$page     = optional_param('page', 0, PARAM_INT);
$xaxis    = optional_param('xaxis', 'time', PARAM_ALPHA);
$yaxis    = optional_param('yaxis', 'effort', PARAM_ALPHA);

$allowedaxes = ['time', 'effort', 'words'];

if (!in_array($xaxis, $allowedaxes)) {
    $xaxis = 'time';
}
if (!in_array($yaxis, $allowedaxes) || $yaxis === $xaxis) {
    foreach ($allowedaxes as $candidate) {
        if ($candidate !== $xaxis) {
            $yaxis = $candidate;
            break;
        }
    }
}

$limit   = 5;
$perpage = $page * $limit;

$params = [
    'sesskey'             => sesskey(),
    '_qf__userreportform' => 1,
    'courseid'            => $courseid,
    'moduleid'            => $moduleid,
    'userid'              => $userid,
    'orderby'             => $orderby,
    'submitbutton'        => 'Submit',
];
$url = new moodle_url('/lib/editor/tiny/plugins/cursive/tiny_cursive_report.php', $params);

if ($courseid && $courseid != 0) {
    $cmid    = tiny_cursive_get_cmid($courseid);
    $context = context_module::instance($cmid);
    $struser = get_string('student_writing_statics', 'tiny_cursive');
    $course  = get_course($courseid);

    $PAGE->navbar->add($course->shortname, new moodle_url('/course/view.php', ['id' => $courseid]));
    $PAGE->navbar->add($struser, $url);
} else {
    $context = context_system::instance();
}

require_capability('tiny/cursive:view', $context);

$PAGE->requires->js_call_amd('tiny_cursive/key_logger', 'init', [1]);
$PAGE->requires->js_call_amd(
    'tiny_cursive/cursive_writing_reports',
    'init',
    ['', constants::has_api_key(), get_config('tiny_cursive', 'json_download')]
);

$PAGE->set_context(context_system::instance());
$PAGE->set_title(get_string('tiny_cursive', 'tiny_cursive'));
$PAGE->set_url($url);
$PAGE->set_heading(get_string('tiny_cursive', 'tiny_cursive'));

echo $OUTPUT->header();

$mform = new user_report_form(null, [
    'courseid' => $courseid,
    'userid'   => $userid,
    'moduleid' => $moduleid,
    'orderby'  => $orderby,
], '', '', []);


$axisbar = tiny_cursive_render_axis_selector_v2($xaxis, $yaxis);


$canvas = html_writer::tag('canvas', '', [
    'id'    => 'effortScatterChart',
    'style' => 'max-height: 340px; width: 100%;',
]);


$filterheader = html_writer::div(
    html_writer::tag('span', get_string('filters', 'tiny_cursive'), ['class' => 'cursive-card-header-title']),
    'cursive-card-header'
);
$filterbody = html_writer::div($mform->render(), 'cursive-card-body');
$filtercard = html_writer::div(
    $filterheader . $filterbody . $requirednote,
    'cursive-card'
);

$axisbar = constants::has_api_key() ? html_writer::div($axisbar, 'cursive-axis-bar') : '';
$chartheader = html_writer::div(
    html_writer::tag('span', get_string('analytics_chart', 'tiny_cursive'), ['class' => 'cursive-card-header-title']) .
    $axisbar,
    'cursive-card-header'
);
$chartwrap   = html_writer::div($canvas, 'cursive-chart-wrap');
$chartcard   = html_writer::div($chartheader . $chartwrap, 'cursive-card');


$topgrid = html_writer::div(
    html_writer::div($filtercard, '') .
    html_writer::div($chartcard, ''),
    'cursive-top-grid'
);

echo html_writer::div($topgrid, 'cursive-report-v2');

// ── Table section ─────────────────────────────────────────────────────────────
// Rendered inside its own card wrapper; the actual table + download button
// come from tiny_cursive_render_user_table() and visualization->render()
// which echo directly, so we open the card shell around them.
echo html_writer::start_div('cursive-report-v2');
echo html_writer::start_div('cursive-card cursive-table-card mt-2');
echo html_writer::div(
    html_writer::tag(
        'span',
        get_string('student_writing_statics', 'tiny_cursive'),
        ['class' => 'cursive-card-header-title']
    ) . tiny_cursive_render_download_button($courseid, $moduleid, $userid),
    'cursive-card-header'
);
echo html_writer::start_div('cursive-card-body p-0');

$renderer = $PAGE->get_renderer('tiny_cursive');

if ($formdata = $mform->get_data()) {
    if ($formdata->courseid) {
        $context = context_course::instance($courseid);
        require_capability('mod/quiz:viewreports', $context);
    }
    $users = tiny_cursive_get_user_attempts_data(
        $formdata->userid,
        $formdata->courseid,
        $formdata->moduleid,
        $orderby,
        $page,
        $limit
    );
    echo $renderer->timer_report($users, $courseid, $page, $limit, $url);
    $chart = new \tiny_cursive\local\page\visualization($courseid, '', $moduleid, $formdata->userid);
    $chart->render($xaxis, $yaxis);
} else {
    $users = tiny_cursive_get_user_attempts_data($userid, $courseid, $moduleid, $orderby, $page, $limit);
    echo $renderer->timer_report($users, $courseid, $page, $limit, $url);
    $chart = new \tiny_cursive\local\page\visualization($courseid, '', $moduleid, $userid);
    $chart->render($xaxis, $yaxis);
}

echo html_writer::end_div(); // .cursive-card-body
echo html_writer::end_div(); // .cursive-card
echo html_writer::end_div(); // .cursive-report-v2

echo $OUTPUT->footer();
