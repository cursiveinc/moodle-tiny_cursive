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
 * Tiny cursive plugin.
 *
 * @package tiny_cursive
 * @copyright  CTI <info@cursivetechnology.com>
 * @author Brain Station 23 <elearning@brainstation-23.com>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
use tiny_cursive\constants;
require(__DIR__ . '/../../../../../config.php');

global $CFG, $DB, $USER, $PAGE;

require_once(__DIR__ . '/../../../../../user/lib.php');
require_once(__DIR__ . '/locallib.php');
require_once(__DIR__ . '/lib.php');

require_login();

if (isguestuser()) {
    redirect(new moodle_url('/'));
}
if (\core\session\manager::is_loggedinas()) {
    redirect(new moodle_url('/user/index.php'));
}

$orderby  = optional_param('orderby', 'id', PARAM_TEXT);
$page     = optional_param('page', 0, PARAM_INT);
$courseid = optional_param('courseid', 0, PARAM_INT);
$userid   = optional_param('userid', 0, PARAM_INT);
$uidparam = optional_param('id', 0, PARAM_INT);
$cparam   = optional_param('course', 0, PARAM_INT);

$limit    = 5;
$perpage  = $page * $limit;


if ($uidparam) {
    $userid   = $uidparam;
}

if ($cparam && !is_siteadmin($USER->id) && $useridparam !== $USER->id) {
    $courseid = $cparam;
}

$user     = $DB->get_record('user', ['id' => $userid]);
if (!$user) {
    throw new moodle_exception('invaliduser', 'error');
}

if (!user_can_view_profile($user)) {
    throw new moodle_exception('cannotviewprofile', 'error');
}

$viewaccess = has_capability('tiny/cursive:view', context_system::instance());

if (!$viewaccess && $userid != $USER->id) {
    return redirect(new moodle_url('/course/index.php'), get_string('warning', 'tiny_cursive'));
}

$params = ['userid' => $userid];
if (!empty($courseid)) {
    $params['courseid'] = $courseid;
}
$url    = new moodle_url('/lib/editor/tiny/plugins/cursive/my_writing_report.php', $params);

if ($courseid) {
    $cmid    = tiny_cursive_get_cmid($courseid);
    $context = context_module::instance($cmid);
} else {
    $context = context_system::instance();
}

$PAGE->requires->js_call_amd('tiny_cursive/key_logger', 'init', [1]);
$PAGE->requires->js_call_amd('tiny_cursive/cursive_writing_reports', 'init', ["", constants::has_api_key(),
                 get_config('tiny_cursive', 'json_download')]);

$PAGE->set_context(context_system::instance());
$PAGE->set_url($url);
$PAGE->set_title(get_string('tiny_cursive', 'tiny_cursive'));
$PAGE->set_pagelayout('mypublic');
$PAGE->set_pagetype('user-profile');

$PAGE->navbar->add(get_string('profile'), new moodle_url('/user/profile.php'));
$PAGE->navbar->add(get_string('student_writing_statics', 'tiny_cursive'), $url);

echo $OUTPUT->header();

$renderer    = $PAGE->get_renderer('tiny_cursive');
$attempts    = tiny_cursive_get_user_attempts_data($userid, $courseid, null, $orderby, $page, $limit);
$userprofile = tiny_cursive_get_user_profile_data($userid, $courseid);

echo $renderer->tiny_cursive_user_writing_report($attempts, $userprofile, $userid, $page, $limit, $url);
echo $OUTPUT->footer();

