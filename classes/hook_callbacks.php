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
use core_component;
use core_course\hook\after_form_definition;
use core_course\hook\after_form_submission;
use tiny_cursive\constants as MODULES;


/**
 * Tiny cursive plugin hook callback class.
 *
 * @package tiny_cursive
 * @copyright  CTI <info@cursivetechnology.com>
 * @author Brain Station 23 <sales@brainstation-23.com>
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

        if (empty($COURSE) || during_initial_install()) {
            return;
        }

        $cursivestatus = tiny_cursive_status($COURSE->id);
        $context       = "";

        if (!$cursivestatus) {
            return;
        }

        $cmid = tiny_cursive_get_cmid($COURSE->id) ?? 0;
        if ($cmid) {
            $context = context_module::instance($cmid);
        }
        if ($context && !has_capability('tiny/cursive:writingreport', $context, $USER->id)) {
            return;
        }

        $context  = context_course::instance($COURSE->id);
        $userrole = (has_capability('report/courseoverview:view', $context, $USER->id, false) || is_siteadmin())
            ? 'teacher_admin' : '';

        $plugins             = core_component::get_plugin_list('local');
        $PAGE->requires->js_call_amd('tiny_cursive/settings', 'init', [MODULES::show_comments(), $userrole]);

        if (array_key_exists($PAGE->bodyid, MODULES::BODY_IDS)) {

            if (MODULES::BODY_IDS[$PAGE->bodyid][1] === "oublog" && !isset($plugins['cursive_oublog'])) {
                return;
            }

            if (MODULES::is_active()) {
                $apikey = cursive_approve_token();
                $apikey = json_decode($apikey, true);
                $PAGE->requires->js_call_amd(
                        "tiny_cursive/".MODULES::BODY_IDS[$PAGE->bodyid][0],
                        'init',
                        [MODULES::confidence_threshold(), MODULES::show_comments(), isset($apikey->status) ? true : false],
                    );
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

        if (get_config('tiny_cursive', 'disabled')) {
            return;
        }

        $mform = $hook->mform;
        $mform->addElement('header', 'Cursive', get_string('pluginname', 'tiny_cursive'), [], [
            'collapsed' => false,
        ]);
        // Add a static element for the notice above the enable/disable dropdown.
        $notice = get_string('cursive_enable_notice', 'tiny_cursive') .
                ' <a href="https://cursivetechnology.com/" target="_blank">' .
                get_string('cursive_more_info', 'tiny_cursive') . '</a>';
        $mform->addElement('static', 'cursive_notice', '', $notice);

        $mform->addElement('select', 'cursive_status', get_string('cursive_status', 'tiny_cursive'), [
            '0' => get_string('disabled', 'tiny_cursive'),
            '1' => get_string('enabled', 'tiny_cursive'),
        ]);

        $default = get_config('tiny_cursive', "cursive-$COURSE->id");
        $mform->setDefault('cursive_status', $default);
    }

    /**
     * Hook to handle form submission after it is processed.
     *
     * @param after_form_submission $hook The hook instance containing the form submission data
     */
    public static function after_form_submission(after_form_submission $hook) {

        $courseid = $hook->get_data()->id;
        $status   = $hook->get_data()->cursive_status ?? false;
        $name     = "cursive-$courseid";
        set_config($name, $status, 'tiny_cursive');
    }


}
