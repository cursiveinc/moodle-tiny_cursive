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
 * Tiny cursive plugin settings.
 *
 * @package tiny_cursive
 * @copyright  CTI <info@cursivetechnology.com>
 * @author Brain Station 23 <elearning@brainstation-23.com>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die;

global $CFG, $PAGE;
$PAGE->requires->js_call_amd('tiny_cursive/token_approve', 'init', [1]);

if (is_siteadmin()) {
    $settings->add(
        new admin_setting_heading(
            'cursive_settings',
            '',
            get_string('pluginname_desc', 'tiny_cursive')
        )
    );
    $restweblink = $CFG->wwwroot . '/admin/settings.php?section=webserviceprotocols';
    $createtoken = $CFG->wwwroot . '/admin/webservice/tokens.php';
    $settings->add(
        new admin_setting_configtext(
            'tiny_cursive/secretkey',
            get_string('secretkey', 'tiny_cursive'),
            get_string('secretkey_desc', 'tiny_cursive') . '' .
            "<br/><a id='approve_token' href='#' class='btn btn-primary'>  " . get_string('test_token', 'tiny_cursive') . " </a>
            <span id='token_message'></span>",
            '',
            PARAM_TEXT
        )
    );
    $settings->add(
        new admin_setting_configtext(
            'tiny_cursive/python_server',
            get_string('api_url', 'tiny_cursive'),
            get_string('api_addr_url', 'tiny_cursive'),
            '',
            PARAM_TEXT
        )
    );
    $settings->add(
        new admin_setting_configtext(
            'tiny_cursive/host_url',
            get_string('moodle_host', 'tiny_cursive'),
            get_string('host_domain', 'tiny_cursive'),
            $CFG->wwwroot,
            PARAM_TEXT
        )
    );
    $settings->add(
        new admin_setting_configtext(
            'tiny_cursive/confidence_threshold',
            get_string('confidence_thresholds', 'tiny_cursive'),
            get_string('thresold_description', 'tiny_cursive'),
            '',
            PARAM_TEXT
        )
    );
    $settings->add(
        new admin_setting_configcheckbox(
            'tiny_cursive/showcomments',
            get_string('cite_src', "tiny_cursive"),
            get_string('cite_src_des', 'tiny_cursive'),
            1
        )
    );
    $settings->add(
        new admin_setting_configtext(
            'tiny_cursive/cursivetoken',
            get_string('webservicetoken', "tiny_cursive"),
            "<a id='generate_cursivetoken' href='#' class=''>  " .
            get_string('generate', 'tiny_cursive') . " </a>" . ' ' .
            get_string('webservicetoken_des', 'tiny_cursive') . "<br><span id='cursivetoken_'></span>",
            '',
            PARAM_TEXT
        )
    );

    $settings->add(
        new admin_setting_configtext(
            'tiny_cursive/syncinterval',
            get_string('syncinterval', 'tiny_cursive'),
            get_string('syncinterval_des', 'tiny_cursive'),
            10,
            PARAM_TEXT
        )
    );
}
