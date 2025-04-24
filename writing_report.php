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
 * Tiny cursive plugin displaying user writing report.
 *
 * @package tiny_cursive
 * @copyright  CTI <info@cursivetechnology.com>
 * @author Brain Station 23 <elearning@brainstation-23.com>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../../../../config.php');
require_once($CFG->dirroot . '/mod/quiz/lib.php');
require_once($CFG->dirroot . '/mod/quiz/locallib.php');
require_once(__DIR__ . '/classes/forms/wrreportform.php');
require_once(__DIR__ . '/locallib.php');

global $CFG, $DB, $USER, $PAGE, $OUTPUT;
require_login(null, false);

if (isguestuser()) {
    redirect($CFG->wwwroot);
    die;
}
if (\core\session\manager::is_loggedinas()) {
    redirect($CFG->wwwroot . '/user/index.php');
    die;
}

$userid = optional_param('userid', 0, PARAM_INT);
$courseid = optional_param('courseid', 0, PARAM_INT);
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

$orderby = optional_param('orderby', 'id', PARAM_TEXT);
$order = optional_param('order', 'ASC', PARAM_TEXT);
$page = optional_param('page', 0, PARAM_INT);
$limit = 10;
$perpage = $page * $limit;
$user = $DB->get_record('user', ['id' => $userid], '*', MUST_EXIST);
$systemcontext = context_system::instance();
$struser = get_string('student_writing_statics', 'tiny_cursive');

if ($courseid) {
    $linkurl = $CFG->wwwroot . '/lib/editor/tiny/plugins/cursive/writing_report.php?userid=' . $userid . '&courseid=' . $courseid;

} else {
    $linkurl = $CFG->wwwroot . '/lib/editor/tiny/plugins/cursive/writing_report.php?userid=' . $userid;
}
$linktext = get_string('tiny_cursive', 'tiny_cursive');

$PAGE->requires->jquery_plugin('jquery');
$PAGE->requires->js_call_amd('tiny_cursive/cursive_writing_reports', 'init', []);
$PAGE->set_context($systemcontext);
$PAGE->set_url($linkurl);
$PAGE->set_title($linktext);
$PAGE->set_heading(fullname($user));
$PAGE->set_pagelayout('mypublic');
$PAGE->set_pagetype('user-profile');
$PAGE->set_url('/user/profile.php', ['id' => $userid]);
$PAGE->navbar->add($struser);

echo $OUTPUT->header();

echo $OUTPUT->heading(get_string('student_writing_statics', 'tiny_cursive'));
$renderer = $PAGE->get_renderer('tiny_cursive');
$users = get_user_attempts_data($userid, $courseid, null, $orderby, $order, $page, $limit);
$userprofile = get_user_profile_data($userid, $courseid);
echo $renderer->user_writing_report($users, $userprofile, $userid, $page, $limit, $linkurl);

echo $OUTPUT->footer();
