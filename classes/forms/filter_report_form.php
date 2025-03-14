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
class filter_report_form extends moodleform {
    /**
     * Tiny cursive plugin.
     *
     * @package tiny_cursive
     * @copyright  CTI <info@cursivetechnology.com>
     * @author eLearningstack
     */
    public function definition() {
        global $DB;
        // Get all courses and create options array in one step
        $options = $DB->get_records_menu('course', null, '', 'id, fullname');
        
        $mform = &$this->_form;
        $mform->addElement('select', 'coursename', get_string('course', 'tiny_cursive'), $options);
        $mform->addRule('coursename', null, 'required', null, 'client');
    }
}
