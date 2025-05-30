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


namespace tiny_cursive;

use context_course;

defined('MOODLE_INTERNAL') || die();
require_once($CFG->dirroot . '/mod/quiz/lib.php');
require_once($CFG->dirroot . '/mod/quiz/locallib.php');
require_once($CFG->dirroot . '/mod/quiz/attemptlib.php');


use stdClass;

/**
 * Tiny cursive plugin.
 *
 * @package tiny_cursive
 * @copyright  CTI <info@cursivetechnology.com>
 * @author Brain Station 23 <elearning@brainstation-23.com>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class tiny_cursive_data {

    /**
     * Get list of users enrolled in a course.
     *
     * @param array $params Parameters containing courseid
     * @return stdClass Object containing array of users
     * @throws \dml_exception
     */
    public static function get_courses_users($params) {
        global $DB;

        $allusers             = new stdClass();
        $allusers->userlist   = [];
        $udetail              = [];
        $udetail2             = [];
        $courseid             = (int)$params['courseid'];
        $admin                = get_admin();
        $users                = get_enrolled_users(context_course::instance($courseid), '', 0, );

        $udetail2['id']       = 0;
        $udetail2['name']     = get_string('alluser', 'tiny_cursive');
        $allusers->userlist[] = $udetail2;

        foreach ($users as $user) {
            if ($user->id == $admin->id) {
                continue;
            }
            $udetail['id']        = $user->id;
            $udetail['name']      = fullname($user);
            $allusers->userlist[] = $udetail;

        }
        return $allusers;
    }

    /**
     * Get list of modules in a course.
     *
     * @param array $params Parameters containing courseid
     * @return stdClass Object containing array of course modules
     * @throws \coding_exception
     * @throws \dml_exception
     * @throws \moodle_exception
     */
    public static function get_courses_modules($params) {
        global $DB;

        $allusers             = new stdClass();
        $allusers->userlist   = [];

        $udetail              = [];
        $udetail2             = [];
        $courseid             = (int)$params['courseid'];

        $udetail2['id']       = 0;
        $udetail2['name']     = get_string('allmodule', 'tiny_cursive');
        $allusers->userlist[] = $udetail2;
        $modules = $DB->get_records('course_modules', ['course' => $courseid], '', 'id, instance');

        foreach ($modules as $cm) {
            $modinfo              = get_fast_modinfo($courseid);
            $cm                   = $modinfo->get_cm($cm->id);
            $getmodulename        = get_coursemodule_from_id($cm->modname, $cm->id, 0, false, MUST_EXIST);
            $udetail['id']        = $cm->id;
            $udetail['name']      = $getmodulename->name;
            $allusers->userlist[] = $udetail;
        }

        return $allusers;
    }
}
