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
 * Tiny authory_tech plugin settings.
 *
 * @package tiny_authory_tech
 * @copyright  CTI <info@cursivetechnology.com>
 * @copyright  2026 Authory Technology S.L. <info@authory.tech>
 * @author kuldeep singh <mca.kuldeep.sekhon@gmail.com>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die;

require_once(__DIR__ . '/locallib.php');
global $CFG, $PAGE;

$PAGE->requires->js_call_amd('tiny_authory_tech/token_approve', 'init', [1]);

$ADMIN->add('editortiny', new admin_category('tiny_authory_tech', new lang_string('pluginname', 'tiny_authory_tech')));

if ($ADMIN->fulltree) {
    $information = html_writer::tag(
        'p',
        get_string('pluginname_desc_new', 'tiny_authory_tech') . ' ' .
        html_writer::link(
            'https://sjcgf.share.hsforms.com/2SHQOFefUSriOMeP9SzMmmw',
            get_string('pluginname_desc_new_link', 'tiny_authory_tech'),
            ['target' => '_blank', 'rel' => 'noopener']
        ) . '. ' . get_string('pluginname_desc_new_2', 'tiny_authory_tech')
    );

    $information .= html_writer::tag(
        'p',
        get_string('pluginname_desc_new_3', 'tiny_authory_tech') . ' ' .
        html_writer::link(
            'mailto:info@authory.tech',
            'info@authory.tech'
        ),
        ['style' => 'margin-bottom: 2rem;']
    );

    $settings->add(
        new admin_setting_heading(
            'authory_tech_settings',
            "",
            $information
        )
    );

    $settings->add(
        new admin_setting_configtext(
            'tiny_authory_tech/secretkey',
            get_string('secretkey', 'tiny_authory_tech'),
            get_string('secretkey_desc', 'tiny_authory_tech') . '' .
            "<br/><a id='approve_token' href='#' class='btn btn-primary'>  " .
            get_string('test_token', 'tiny_authory_tech') . " </a><span id='token_message'></span>",
            "",
            PARAM_TEXT
        )
    );
    $settings->add(
        new admin_setting_configtext(
            'tiny_authory_tech/python_server',
            get_string('api_url', 'tiny_authory_tech'),
            get_string('api_addr_url', 'tiny_authory_tech'),
            '',
            PARAM_TEXT
        )
    );
    $settings->add(
        new admin_setting_configtext(
            'tiny_authory_tech/host_url',
            get_string('moodle_host', 'tiny_authory_tech'),
            get_string('host_domain', 'tiny_authory_tech'),
            $CFG->wwwroot,
            PARAM_TEXT
        )
    );
    $settings->add(
        new admin_setting_configtext(
            'tiny_authory_tech/confidence_threshold',
            get_string('confidence_thresholds', 'tiny_authory_tech'),
            get_string('thresold_description', 'tiny_authory_tech'),
            '',
            PARAM_TEXT
        )
    );
    $settings->add(
        new admin_setting_configcheckbox(
            'tiny_authory_tech/showcomments',
            get_string('cite_src', "tiny_authory_tech"),
            get_string('cite_src_des', 'tiny_authory_tech'),
            1
        )
    );
    $settings->add(
        new admin_setting_configcheckbox(
            'tiny_authory_tech/json_download',
            get_string('json_title', "tiny_authory_tech"),
            get_string('json_des', 'tiny_authory_tech'),
            1
        )
    );

    $settings->add(
        new admin_setting_configtext(
            'tiny_authory_tech/authory_tech_token',
            get_string('webservicetoken', "tiny_authory_tech"),
            "<a id='generate_authory_tech_token' href='#' class=''>  " .
            get_string('generate', 'tiny_authory_tech') . " </a>" . ' ' .
            get_string('webservicetoken_des', 'tiny_authory_tech') . "<br><span id='authory_tech_token_'></span>",
            '',
            PARAM_TEXT
        )
    );

    $settings->add(
        new admin_setting_configtext(
            'tiny_authory_tech/syncinterval',
            get_string('syncinterval', 'tiny_authory_tech'),
            get_string('syncinterval_des', 'tiny_authory_tech'),
            10,
            PARAM_TEXT
        )
    );

    $settings->add(
        new admin_setting_configempty(
            'tiny_authory_tech/authory_tech_disable',
            get_string('authory_tech_disable', 'tiny_authory_tech'),
            "<a href='#authory_tech_disable' class='btn btn-primary mb-1' id='authory_tech_disable' >" .
            get_string('disable', 'tiny_authory_tech') . "</a>
            <a href='#authory_tech_enable' class='btn btn-primary mb-1' id='authory_tech_enable'>" .
            get_string('enable', 'tiny_authory_tech') . "
            </a><br><span id='authory_tech_disable_'></span><br>" .
            get_string('authory_tech_disable_des', 'tiny_authory_tech'),
        )
    );

    $settings->add(
        new admin_setting_heading(
            'authory_tech_more_info',
            get_string('new_admin_heading', 'tiny_authory_tech'),
            get_string('new_admin_desc', "tiny_authory_tech"),
        )
    );

        $settings->add(
            new admin_setting_configtext(
                'tiny_authory_tech/note_text',
                get_string('note_text_title', 'tiny_authory_tech'),
                "",
                get_string('authory_tech_enable_notice', 'tiny_authory_tech'),
                PARAM_TEXT
            )
        );

    $settings->add(
        new admin_setting_configtext(
            'tiny_authory_tech/note_url_text',
            get_string('note_url_text', 'tiny_authory_tech'),
            "",
            get_string('authory_tech_more_info', 'tiny_authory_tech'),
            PARAM_TEXT
        )
    );

    $settings->add(
        new admin_setting_configtext(
            'tiny_authory_tech/note_url',
            get_string('note_url_title', 'tiny_authory_tech'),
            "",
            "https://authory.tech",
            PARAM_TEXT
        )
    );
}
