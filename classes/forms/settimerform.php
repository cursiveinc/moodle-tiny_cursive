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

defined('MOODLE_INTERNAL') || die;
require_once("$CFG->libdir/formslib.php");

/**
 * Tiny cursive plugin.
 *
 * @package tiny_cursive
 * @copyright  CTI <info@cursivetechnology.com>
 * @author eLearningstack
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class settimerform extends moodleform {
    /**
     * Tiny cursive plugin settings form.
     */
    public function definition() {

        // Start dropdowns of course, quiz and set time search field in mform.

        $attributes = [];
        $mform =& $this->_form;
        $options = ['multiple' => false, 'includefrontpage' => false];
        $mform->addElement('course', 'courseid', get_string('coursename', 'tiny_cursive'), $options);
        $mform->addRule('courseid', get_string('field_required', 'tiny_cursive'), 'required', null, 'client');

        $select = $mform->addElement('select', 'quizname', get_string('quizname', 'tiny_cursive'),
            [get_string('selectquiz', 'tiny_cursive')], $attributes);
        $mform->addElement('hidden', 'quizid', '0');
        $mform->setType('quizid', PARAM_INT);
        $select->setMultiple(false);
        $mform->addRule('quizname', get_string('field_require', 'tiny_cursive'), 'required', null, 'client');

        $radioarray = [];
        $radioarray[] = $mform->createElement('radio', 'time', '', get_string('stndtime', 'tiny_cursive'), 1);
        $radioarray[] = $mform->createElement('radio', 'time', '', get_string('queswise', 'tiny_cursive'), 2);
        $mform->addGroup($radioarray, 'radio', get_string('select_time', 'tiny_cursive'), [], false);

        $mform->addElement('text', 'stdtime', get_string('enter_time', 'tiny_cursive'), 'maxlength="4" size="25" ');
        $mform->setType('stdtime', PARAM_NOTAGS);
        $mform->addRule('stdtime', get_string('enter_numericvalue', 'tiny_cursive'), 'numeric', null, 'client');
        $mform->addRule('stdtime', get_string('enter_nonzerovalue', 'tiny_cursive'), 'nonzero', null, 'client');

        $mform->hideIf('stdtime', 'time', 'neq', 1);
        $mform->hideIf('stdtime', 'time');

        $mform->addElement('html', '<div class="class_question"></div>');
        $mform->addElement('html', '<div class="form-group row  fitem  class_stdtime"></div>');
        $mform->addElement('html', '<div class="save_time"></div>');
        $mform->addElement('html', '<div class="alert alert-success cursive_time_success" style="display:none;">'
            . get_string('timesave_success', 'tiny_cursive') . '</div>');
        $mform->addElement('html', '<div class="alert alert-success cursive_time_successfull" style="display:none;">'
            . get_string('timesave_success', 'tiny_cursive') . '</div>');
        $this->add_action_buttons();
    }
}
