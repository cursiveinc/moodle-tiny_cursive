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
 * @author kuldeep singh <mca.kuldeep.sekhon@gmail.com>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
use tiny_cursive\forms\user_report_form;
require(__DIR__ . '/../../../../../config.php');

require_once(__DIR__ . '/locallib.php');
require_once(__DIR__ . '/lib.php');

global $DB, $PAGE, $OUTPUT;

require_login(); // Teacher and admin can see this page.
$courseid = required_param('courseid', PARAM_INT);
$userid   = optional_param('userid', 0, PARAM_INT);
$moduleid = optional_param('moduleid', 0, PARAM_INT);
$orderby  = optional_param('orderby', 'id', PARAM_TEXT);
$page     = optional_param('page', 0, PARAM_INT);

$limit    = 5;
$perpage  = $page * $limit;

$params   = [
    'sesskey'             => sesskey(),
    '_qf__userreportform' => 1,
    'courseid'            => $courseid,
    'moduleid'            => $moduleid,
    'userid'              => $userid,
    'orderby'             => $orderby,
    'submitbutton'        => 'Submit',
];
$url     = new moodle_url('/lib/editor/tiny/plugins/cursive/tiny_cursive_report.php', $params);

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

$apikey = json_decode(cursive_approve_token());
$PAGE->requires->js_call_amd('tiny_cursive/key_logger', 'init', [1]);
$PAGE->requires->js_call_amd('tiny_cursive/cursive_writing_reports', 'init', ["", $apikey->status ?? false]);

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

$mform->display();
$renderer     = $PAGE->get_renderer('tiny_cursive');

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

    tiny_cursive_render_user_table(
        $users,
        $renderer,
        $courseid,
        $page,
        $limit,
        $url,
        $moduleid,
        $userid);
} else {
    $users = tiny_cursive_get_user_attempts_data(
        $userid,
        $courseid,
        $moduleid,
        $orderby,
        $page,
        $limit
    );
    tiny_cursive_render_user_table(
        $users,
        $renderer,
        $courseid,
        $page,
        $limit,
        $url,
        $moduleid,
        $userid);
}

echo $OUTPUT->footer();
