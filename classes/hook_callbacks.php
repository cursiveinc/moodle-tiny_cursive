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
 * @author kuldeep singh <mca.kuldeep.sekhon@gmail.com>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_cursive;

use context_course;
use context_module;
use core\hook\output\before_footer_html_generation;
use core_course\hook\after_form_definition;
use core_course\hook\after_form_submission;


/**
 * Tiny cursive plugin hook callback class.
 *
 * @package tiny_cursive
 * @copyright  CTI <info@cursivetechnology.com>
 * @author eLearningstack
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class hook_callbacks {

    /**
     * Hook to modify the output before footer HTML is generated.
     *
     * @param before_footer_html_generation $hook
     */
    public static function before_footer_html_generation(before_footer_html_generation $hook) {
        global $PAGE, $COURSE, $USER, $CFG;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/locallib.php');
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/lib.php');
        $cursivestatus = tiny_cursive_status($COURSE->id);
        $capcheck = null;

        if (!empty($COURSE) && !during_initial_install() && $cursivestatus) {

            $cmid = isset($COURSE->id) ? tiny_cursive_get_cmid($COURSE->id) : 0;
            $confidencethreshold = get_config('tiny_cursive', 'confidence_threshold');
            $confidencethreshold = !empty($confidencethreshold) ? floatval($confidencethreshold) : 0.65;
            $showcomments = get_config('tiny_cursive', 'showcomments');

            $context = context_course::instance($COURSE->id);
            $userrole = '';
            if (has_capability('report/courseoverview:view', $context, $USER->id, false) || is_siteadmin()) {
                $userrole = 'teacher_admin';
            }

            $PAGE->requires->js_call_amd('tiny_cursive/settings', 'init', [$showcomments, $userrole]);

            if ($cmid) {
                $context = context_module::instance($cmid);
                $capcheck = has_capability('tiny/cursive:writingreport', $context, $USER->id);
            }

            if ($capcheck) {
                switch ($PAGE->bodyid) {
                    case 'page-mod-forum-discuss':
                    case 'page-mod-forum-view':
                        $PAGE->requires->js_call_amd(
                            'tiny_cursive/append_fourm_post',
                            'init',
                            [$confidencethreshold, $showcomments],
                        );
                        break;

                    case 'page-mod-assign-grader':
                        $PAGE->requires->js_call_amd(
                            'tiny_cursive/show_url_in_submission_grade',
                            'init',
                            [$confidencethreshold, $showcomments],
                        );
                        break;

                    case 'page-mod-assign-grading':
                        $PAGE->requires->js_call_amd(
                            'tiny_cursive/append_submissions_table',
                            'init',
                            [$confidencethreshold, $showcomments],
                        );
                        break;

                    case 'page-mod-quiz-review':
                        $PAGE->requires->js_call_amd(
                            'tiny_cursive/show_url_in_quiz_detail',
                            'init',
                            [$confidencethreshold, $showcomments],
                        );
                        break;

                    case 'page-course-view-participants':
                        $PAGE->requires->js_call_amd(
                            'tiny_cursive/append_participants_table',
                            'init',
                            [$confidencethreshold, $showcomments],
                        );
                        break;
                    case 'page-mod-lesson-essay':
                        $PAGE->requires->js_call_amd(
                            'tiny_cursive/append_lesson_grade_table',
                            'init',
                            [$confidencethreshold, $showcomments],
                        );
                        break;
                }
            }

        }
    }

    /**
     * Hook to modify the form after its definition.
     *
     * @param after_form_definition $hook The hook instance
     */
    public static function after_form_definition(after_form_definition $hook) {
        global $COURSE;

        $mform = $hook->mform;
        $mform->addElement('header', 'Cursive', get_string('pluginname', 'tiny_cursive'), [], [
            'collapsed' => false,
        ]);

        $mform->addElement('select', 'cursive_status', get_string('cursive_status', 'tiny_cursive'), [
            '0' => get_string('disabled', 'tiny_cursive'),
            '1' => get_string('enabled', 'tiny_cursive'),
        ]);
        $default = get_config('tiny_cursive', "cursive-$COURSE->id");
        if ($default === false) {
            $mform->setDefault('cursive_status', '1');
        } else {
            $mform->setDefault('cursive_status', $default);
        }
    }

    /**
     * Hook to handle form submission after it is processed.
     *
     * @param after_form_submission $hook The hook instance containing the form submission data
     */
    public static function after_form_submission(after_form_submission $hook) {
        $courseid = $hook->get_data()->id;
        $status = $hook->get_data()->cursive_status ?? false;
        $name = "cursive-$courseid";
        set_config($name, $status, 'tiny_cursive');
    }


}
