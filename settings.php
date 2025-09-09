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
 * @author kuldeep singh <mca.kuldeep.sekhon@gmail.com>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die;

require_once(__DIR__.'/locallib.php');
global $CFG, $PAGE;

$PAGE->requires->js_call_amd('tiny_cursive/token_approve', 'init', [1]);

$ADMIN->add('editortiny', new admin_category('tiny_cursive', new lang_string('pluginname', 'tiny_cursive')));

if ($ADMIN->fulltree) {


    $information = html_writer::tag('p',
        get_string('pluginname_desc_new', 'tiny_cursive') . ' ' .
        html_writer::link(
            'https://sjcgf.share.hsforms.com/2SHQOFefUSriOMeP9SzMmmw',
            get_string('pluginname_desc_new_link', 'tiny_cursive'),
            ['target' => '_blank', 'rel' => 'noopener']
        ) . '. ' . get_string('pluginname_desc_new_2', 'tiny_cursive')
    );

    $information .= html_writer::tag('p',
        get_string('pluginname_desc_new_3', 'tiny_cursive') . ' ' .
        html_writer::link(
            'mailto:info@cursivetechnology.com',
            'info@cursivetechnology.com'
        ),
        ['style' => 'margin-bottom: 2rem;']
    );


    $settings->add(
        new admin_setting_heading(
            'cursive_settings',
            "",
            $information
        )
    );

    $settings->add(
        new admin_setting_configtext(
            'tiny_cursive/secretkey',
            get_string('secretkey', 'tiny_cursive'),
            get_string('secretkey_desc', 'tiny_cursive') . '' .
            "<br/><a id='approve_token' href='#' class='btn btn-primary'>  " .
            get_string('test_token', 'tiny_cursive') . " </a><span id='token_message'></span>",
            "", PARAM_TEXT
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
        new admin_setting_configcheckbox(
            'tiny_cursive/json_download',
            get_string('json_title', "tiny_cursive"),
            get_string('json_des', 'tiny_cursive'),
            1
        )
    );

    $settings->add(
        new admin_setting_configtext(
            'tiny_cursive/cursivetoken',
            get_string('webservicetoken', "tiny_cursive"),
            "<a id='generate_cursivetoken' href='#' class=''>  " .
            get_string('generate', 'tiny_cursive') . " </a>".' '.
            get_string('webservicetoken_des', 'tiny_cursive')."<br><span id='cursivetoken_'></span>",
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

    $settings->add(
        new admin_setting_configempty(
            'tiny_cursive/cursivedisable',
            get_string('cursivedisable', 'tiny_cursive'),
            "<a href='#cursivedisable' class='btn btn-primary mb-1' id='cursivedisable' >".
            get_string('disable', 'tiny_cursive')."</a>
            <a href='#cursiveenable' class='btn btn-primary mb-1' id='cursiveenable'>".
            get_string('enable', 'tiny_cursive')."
            </a><br><span id='cursivedisable_'></span><br>".
            get_string('cursivedisable_des', 'tiny_cursive'),
        )
    );

    $settings->add(
        new admin_setting_heading(
            'cursive_more_info',
            get_string('new_admin_heading', 'tiny_cursive'),
            get_string('new_admin_desc', "tiny_cursive"),
        ));

        $settings->add(
        new admin_setting_configtext(
            'tiny_cursive/note_text',
            get_string('note_text_title', 'tiny_cursive'),
            "",
            get_string('cursive_enable_notice', 'tiny_cursive'),
            PARAM_TEXT
        )
    );

    $settings->add(
            new admin_setting_configtext(
                'tiny_cursive/note_url_text',
                get_string('note_url_text', 'tiny_cursive'),
                "",
                get_string('cursive_more_info', 'tiny_cursive'),
                PARAM_TEXT
            )
        );

    $settings->add(
        new admin_setting_configtext(
            'tiny_cursive/note_url',
            get_string('note_url_title', 'tiny_cursive'),
            "",
            "https://cursivetechnology.com/moodle-integration-how-it-works",
            PARAM_TEXT
        )
    );
}
