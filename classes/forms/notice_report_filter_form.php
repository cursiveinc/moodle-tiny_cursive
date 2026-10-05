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

namespace tiny_cursive\forms;

use moodleform;
use tiny_cursive\local\table\notice_report_table;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->libdir . '/formslib.php');

/**
 * Filters for the notice acknowledgement report.
 *
 * @package    tiny_cursive
 * @copyright  2026 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class notice_report_filter_form extends moodleform {
    /**
     * Form definition.
     */
    public function definition() {
        global $DB;

        $mform = $this->_form;

        $mform->addElement('header', 'filters', get_string('notice_report_filters', 'tiny_cursive'));

        $mform->addElement('select', 'mode', get_string('notice_report_mode', 'tiny_cursive'), [
            notice_report_table::MODE_ACKNOWLEDGED => get_string('notice_report_acknowledged', 'tiny_cursive'),
            notice_report_table::MODE_PENDING => get_string('notice_report_pending', 'tiny_cursive'),
        ]);
        $mform->setType('mode', PARAM_ALPHA);

        $dateoptions = ['optional' => true];

        $mform->addElement('date_selector', 'datefrom', get_string('notice_report_datefrom', 'tiny_cursive'), $dateoptions);
        $mform->hideIf('datefrom', 'mode', 'eq', notice_report_table::MODE_PENDING);

        $mform->addElement('date_selector', 'dateto', get_string('notice_report_dateto', 'tiny_cursive'), $dateoptions);
        $mform->hideIf('dateto', 'mode', 'eq', notice_report_table::MODE_PENDING);

        $versions = [0 => get_string('notice_report_anyversion', 'tiny_cursive')];
        foreach ($DB->get_fieldset_sql("SELECT DISTINCT noticeversion FROM {tiny_cursive_notice} ORDER BY noticeversion") as $v) {
            $versions[(int) $v] = (int) $v;
        }
        $mform->addElement('select', 'noticeversion', get_string('notice_report_version', 'tiny_cursive'), $versions);
        $mform->setType('noticeversion', PARAM_INT);
        $mform->hideIf('noticeversion', 'mode', 'eq', notice_report_table::MODE_PENDING);

        $langs = ['' => get_string('notice_report_anylang', 'tiny_cursive')];
        foreach ($DB->get_fieldset_sql("SELECT DISTINCT lang FROM {tiny_cursive_notice_text} ORDER BY lang") as $lang) {
            $langs[$lang] = $lang;
        }
        $mform->addElement('select', 'lang', get_string('notice_report_lang', 'tiny_cursive'), $langs);
        $mform->setType('lang', PARAM_LANG);
        $mform->hideIf('lang', 'mode', 'eq', notice_report_table::MODE_PENDING);

        $courseoptions = ['multiple' => false, 'includefrontpage' => false];
        $mform->addElement('course', 'courseid', get_string('notice_report_course', 'tiny_cursive'), $courseoptions);
        $mform->setType('courseid', PARAM_INT);
        $mform->hideIf('courseid', 'mode', 'eq', notice_report_table::MODE_ACKNOWLEDGED);

        $mform->addElement('cohort', 'cohortid', get_string('notice_report_cohort', 'tiny_cursive'), ['multiple' => false]);
        $mform->setType('cohortid', PARAM_INT);
        $mform->hideIf('cohortid', 'mode', 'eq', notice_report_table::MODE_ACKNOWLEDGED);

        $this->add_action_buttons(false, get_string('filter'));
    }
}
