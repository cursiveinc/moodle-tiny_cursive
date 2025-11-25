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
 * @author eLearningstack
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_cursive\forms;
use context_course;
use moodleform;

/**
 * Tiny cursive plugin.
 *
 * @package tiny_cursive
 * @copyright  CTI <info@cursivetechnology.com>
 * @author eLearningstack
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class user_report_form extends moodleform {
    /**
     * Tiny cursive plugin user report form.
     */
    public function definition() {
        // Start dropdowns of course, quiz and user email search field in mform.
        global $PAGE;
        $mform = &$this->_form;
        $attributes = '';
        $courseid = $this->_customdata['courseid'];
        $users = self::get_user($courseid);
        $modules = self::get_modules($courseid);
        $options = ['multiple' => false, 'includefrontpage' => false];
        $mform->addElement('course', 'courseid', get_string('coursename', 'tiny_cursive'), $options);
        if ($courseid) {
            $mform->setDefault('courseid', $courseid);
        }

        $mform->addRule('courseid', null, 'required', null, 'client');
        $mform->addElement('select', 'moduleid', get_string('module_name', 'tiny_cursive'), $modules, $attributes);
        $mform->setType('moduleid', PARAM_TEXT);
        $mform->addElement('select', 'userid', get_string('userename', 'tiny_cursive'), $users, $attributes);
        $mform->setType('userid', PARAM_TEXT);
        $options = [
            'id'    => get_string('uid', 'tiny_cursive'),
            'name'  => get_string('name', "tiny_cursive"),
            'email' => get_string('email', 'tiny_cursive'),
            'date'  => get_string('date', 'tiny_cursive'),
        ];
        $mform->addElement('select', 'orderby', get_string('orderby', 'tiny_cursive'), $options, $attributes);
        $mform->setType('orderby', PARAM_TEXT);
        $this->add_action_buttons(false, get_string('submit'));

        if (!is_siteadmin()) {
            $PAGE->requires->js_call_amd('tiny_cursive/user_report_addition', 'init', []);
        }
    }

    /**
     * Tiny cursive plugin user report form data.
     *
     * @return object
     */
    public function get_data() {
        $data = parent::get_data();
        if (!empty($data)) {
            $mform = &$this->_form;
            // Add the studentid properly to the $data object.
            if (!empty($mform->_submitValues['courseid'])) {
                $data->courseid = $mform->_submitValues['courseid'];
            }
            if (!empty($mform->_submitValues['userid'])) {
                $data->userid = $mform->_submitValues['userid'];
            }
            if (!empty($mform->_submitValues['moduleid'])) {
                $data->moduleid = $mform->_submitValues['moduleid'];
            }
            if (!empty($mform->_submitValues['orderby'])) {
                $data->orderby = $mform->_submitValues['orderby'];
            }
        }
        return $data;
    }

    /**
     * Tiny cursive plugin get all modules.
     *
     * @param integer $courseid
     * @return array
     */
    public function get_modules($courseid) {
        // Get users dropdown.
        global $DB;
        $mdetail = [];
        $mdetail[0] = get_string('allmodule', 'tiny_cursive');
        if ($courseid) {
            $configs = get_config('tiny_cursive');
            $configs = array_filter((array)$configs, fn($key) => str_starts_with($key, 'CUR'), ARRAY_FILTER_USE_KEY);
            $modinfo = get_fast_modinfo($courseid);
            $cms     = $modinfo->get_cms(); // Course modules.
            foreach ($cms as $cm) {
                $key = "CUR{$courseid}{$cm->id}";
                // Excluding cursive disabled modules.
                if (array_key_exists($key, $configs)) {
                    if (!(int)$configs[$key]) {
                        continue;
                    }
                }

                $mdetail[$cm->id] = $cm->name ?? $cm->modname ?? "";
            }
        }
        return $mdetail;
    }

    /**
     * Tiny cursive plugin get all users.
     *
     * @param integer $courseid
     * @return array
     */
    public function get_user($courseid) {

        $udetail = [];

        $udetail[0] = get_string('alluser', 'tiny_cursive');

        if (!empty($courseid)) {
            // Use get_enrolled_users() function instead of raw SQL for better maintainability and security.
            $users = get_enrolled_users(context_course::instance($courseid), '', 0, 'u.*', null, 0, 0, true);
            foreach ($users as $user) {
                $udetail[$user->id] = fullname($user);
            }
        }

        return $udetail;
    }
}
