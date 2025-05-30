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
use moodleform;

/**
 * Tiny cursive plugin.
 *
 * @package tiny_cursive
 * @copyright  CTI <info@cursivetechnology.com>
 * @author eLearningstack
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class wrreport_form extends moodleform {
    /**
     * Defines the form elements for the cursive plugin report.
     */
    public function definition() {
        // Start dropdowns of course, quiz and user email search field in mform.

        $mform = &$this->_form;
        $attributes = '';
        $options = ['multiple' => false, 'includefrontpage' => false];
        $mform->addElement('course', 'coursename', get_string('coursename', 'tiny_cursive'), $options);
        $mform->addRule('coursename', null, 'required', null, 'client');
        $options = [
            'id'    => get_string('uid', 'tiny_cursive'),
            'name'  => get_string('name', "tiny_cursive"),
            'email' => get_string('email', 'tiny_cursive'),
            'date'  => get_string('date', 'tiny_cursive'),
        ];
        $mform->addElement('select', 'orderby', get_string('orderby', 'tiny_cursive'), $options, $attributes);
        $mform->setType('orderby', PARAM_TEXT);
        $this->add_action_buttons(false, get_string('submit'));
    }

    /**
     * Tiny cursive plugin user report form data.
     *
     * @return object|null Form data object or null if no data submitted
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
        }
        return $data;
    }

    /**
     * Get all modules for a given course.
     *
     * @param int $courseid The ID of the course to get modules for
     * @return array Array of module details with module ID as key and name as value
     */
    public function get_modules($courseid) {
        // Get users dropdown.
        global $DB;
        $mdetail = [];
        $mdetail[0] = get_string('allmodule', 'tiny_cursive');
        if ($courseid) {
            $modules = $DB->get_records('course_modules', ['course' => $courseid], '', 'id, instance');
            foreach ($modules as $cm) {
                $modinfo = get_fast_modinfo($courseid);
                $cm = $modinfo->get_cm($cm->id);
                $getmodulename = get_coursemodule_from_id($cm->modname, $cm->id, 0, false, MUST_EXIST);
                $mdetail[$cm->id] = $getmodulename->name;
            }
        }

        return $mdetail;
    }
}
