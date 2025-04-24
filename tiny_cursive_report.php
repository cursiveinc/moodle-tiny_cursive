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
 * Tiny cursive plugin writing report.
 *
 * @package tiny_cursive
 * @copyright  CTI <info@cursivetechnology.com>
 * @author Brain Station 23 <elearning@brainstation-23.com>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../../../../config.php');
global $CFG, $DB, $USER, $PAGE, $SESSION, $OUTPUT;

require_once($CFG->dirroot . '/mod/quiz/lib.php');
require_once($CFG->dirroot . '/mod/quiz/locallib.php');
require_once(__DIR__ . '/classes/forms/userreportform.php');
require_once(__DIR__ . '/locallib.php');

require_login(); // Teacher and admin can see this page.
$courseid = optional_param('courseid', 0, PARAM_INT);
$userid = optional_param('userid', 0, PARAM_INT);
$moduleid = optional_param('moduleid', 0, PARAM_INT);
$orderby = optional_param('orderby', 'id', PARAM_TEXT);
$order = optional_param('order', 'ASC', PARAM_TEXT);
$page = optional_param('page', 0, PARAM_INT);
$limit = 10;
$perpage = $page * $limit;

if ($courseid) {
    $cmid = tiny_cursive_get_cmid($courseid);
    $context = context_module::instance($cmid);
} else {
    $context = context_system::instance();
}

$haseditcapability = has_capability('tiny/cursive:view', $context);

if (!$haseditcapability) {
    return redirect(new moodle_url('/course/index.php'), get_string('warning', 'tiny_cursive'));
}

$linkurl = '/lib/editor/tiny/plugins/cursive/tiny_cursive_report.php';
$linkurl .= '?sesskey=' . $USER->sesskey . '&_qf__userreportform=1&courseid=' .
    $courseid . '&moduleid=' . $moduleid . '&userid=' . $userid .
    '&orderby=' . $orderby . '&submitbutton=Submit';
$systemcontext = context_system::instance();
$linktext = get_string('tiny_cursive', 'tiny_cursive');

$PAGE->requires->js_call_amd('tiny_cursive/key_logger', 'init', [1]);
$PAGE->requires->css("/css/style.css");
$PAGE->set_context($systemcontext);
$PAGE->set_title($linktext);
$PAGE->set_title($linktext);
$PAGE->set_url($linkurl);
$PAGE->set_heading(get_string('tiny_cursive', 'tiny_cursive'));
$PAGE->requires->jquery_plugin('jquery');
$PAGE->requires->jquery_plugin('ui');
$PAGE->requires->js_call_amd('tiny_cursive/cursive_writing_reports', 'init', []);

echo $OUTPUT->header();

$mform = new userreportform(null, [
    'courseid' => $courseid,
    'userid' => $userid,
    'moduleid' => $moduleid,
    'orderby' => $orderby,
], '', '', []);

$mform->display();

if ($formdata = $mform->get_data()) {
    if ($formdata->courseid) {
        $context = context_course::instance($courseid);
        require_capability('mod/quiz:viewreports', $context);
    }
    $users = get_user_attempts_data(
        $formdata->userid,
        $formdata->courseid,
        $formdata->moduleid,
        $orderby,
        $order,
        $page,
        $limit
    );
    $renderer = $PAGE->get_renderer('tiny_cursive');
    // Prepare the URL for the link.
    $url = new moodle_url('/lib/editor/tiny/plugins/cursive/csvexport.php', [
        'courseid' => $courseid,
        'moduleid' => $moduleid,
        'userid' => $userid,
    ]);
    // Prepare the link text.
    $linktext = get_string('download_csv', 'tiny_cursive');
    // Prepare the attributes for the link.
    $attributes = [
        'target' => '_blank',
        'id' => 'export',
        'role' => 'button',
        'class' => 'btn btn-primary mb-4',
        'style' => 'margin-right:50px;',
    ];
    // Generate the link using html_writer::link.
    echo html_writer::link($url, $linktext, $attributes);
    echo $renderer->timer_report($users, $courseid, $page, $limit, $linkurl);

}
echo $OUTPUT->footer();
