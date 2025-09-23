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
use tiny_cursive\constants;

require_once(__DIR__ . '/locallib.php');
require_once(__DIR__ . '/lib.php');

global $CFG, $DB, $PAGE, $OUTPUT;
require_login(null, false);

if (isguestuser()) {
    redirect($CFG->wwwroot);
}
if (\core\session\manager::is_loggedinas()) {
    redirect(new moodle_url('/user/index.php'));
}

$userid   = optional_param('userid', 0, PARAM_INT);
$courseid = required_param('courseid',  PARAM_INT);
$orderby  = optional_param('orderby', 'id', PARAM_TEXT);
$page     = optional_param('page', 0, PARAM_INT);

$limit    = 10;
$perpage  = $page * $limit;

$params   = ['userid' => $userid];
if (!empty($courseid)) {
    $params['courseid'] = $courseid;
}

$url      = new moodle_url('/lib/editor/tiny/plugins/cursive/writing_report.php', $params);

if ($courseid) {
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
$user = $DB->get_record('user', ['id' => $userid]);
if (!$user) {
    throw new moodle_exception('invaliduser', 'error');
}

$PAGE->requires->js_call_amd('tiny_cursive/cursive_writing_reports', 'init',
                 ["", constants::has_api_key(), get_config('tiny_cursive', 'json_download')]);

$PAGE->set_context(context_system::instance());
$PAGE->set_url($url);
$PAGE->set_title(get_string('tiny_cursive', 'tiny_cursive'));

echo $OUTPUT->header();

$renderer    = $PAGE->get_renderer('tiny_cursive');
$users       = tiny_cursive_get_user_attempts_data($userid, $courseid, null, $orderby, $page, $limit);
$userprofile = tiny_cursive_get_user_profile_data($userid, $courseid);

echo $renderer->tiny_cursive_user_writing_report($users, $userprofile, $userid, $page, $limit, $url);
echo $OUTPUT->footer();