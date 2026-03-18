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
 * Tiny authory_tech plugin.
 *
 * @package tiny_authory_tech
 * @copyright  Authory Technology S.L. <info@authory.tech>
 * @author kuldeep singh <mca.kuldeep.sekhon@gmail.com>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$functions = [
    'authory_tech_get_user_list' => [
        'classname' => 'authory_tech_json_func_data',
        'methodname' => 'get_user_list',
        'classpath' => '/lib/editor/tiny/plugins/authory_tech/externallib.php',
        'description' => 'get quiz list by course',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => 'tiny/authory_tech:view',
    ],
    'authory_tech_get_module_list' => [
        'classname' => 'authory_tech_json_func_data',
        'methodname' => 'get_module_list',
        'classpath' => '/lib/editor/tiny/plugins/authory_tech/externallib.php',
        'description' => 'get quiz list by course',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => 'tiny/authory_tech:view',
    ],
    'authory_tech_approve_token' => [
        'classname' => 'authory_tech_json_func_data',
        'methodname' => 'authory_tech_approve_token_func',
        'classpath' => '/lib/editor/tiny/plugins/authory_tech/externallib.php',
        'description' => 'generate Reports for download',
        'type' => 'write',
        'ajax' => true,
        'capabilities' => 'tiny/authory_tech:editsettings',
    ],
    'authory_tech_user_comments' => [
        'classname' => 'authory_tech_json_func_data',
        'methodname' => 'authory_tech_user_comments_func',
        'classpath' => '/lib/editor/tiny/plugins/authory_tech/externallib.php',
        'description' => 'User Comments',
        'type' => 'write',
        'ajax' => true,
        'capabilities' => 'tiny/authory_tech:write',
    ],
    'authory_tech_get_comment_link' => [
        'classname' => 'authory_tech_json_func_data',
        'methodname' => 'get_comment_link',
        'classpath' => '/lib/editor/tiny/plugins/authory_tech/externallib.php',
        'description' => ' Comments Links',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => 'tiny/authory_tech:view',
    ],
    'authory_tech_get_assign_comment_link' => [
        'classname' => 'authory_tech_json_func_data',
        'methodname' => 'get_assign_comment_link',
        'classpath' => '/lib/editor/tiny/plugins/authory_tech/externallib.php',
        'description' => ' Comments Links',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => 'tiny/authory_tech:view',
    ],
    'authory_tech_get_forum_comment_link' => [
        'classname' => 'authory_tech_json_func_data',
        'methodname' => 'get_forum_comment_link',
        'classpath' => '/lib/editor/tiny/plugins/authory_tech/externallib.php',
        'description' => 'get forum comments links',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => 'tiny/authory_tech:view',
    ],
    'authory_tech_get_assign_grade_comment' => [
        'classname' => 'authory_tech_json_func_data',
        'methodname' => 'get_assign_grade_comment',
        'classpath' => '/lib/editor/tiny/plugins/authory_tech/externallib.php',
        'description' => 'get assign grade comments',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => 'tiny/authory_tech:view',
    ],
    'authory_tech_user_list_submission_stats' => [
        'classname' => 'authory_tech_json_func_data',
        'methodname' => 'get_user_list_submission_stats',
        'classpath' => '/lib/editor/tiny/plugins/authory_tech/externallib.php',
        'description' => 'get user submissions status',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => 'tiny/authory_tech:view',
    ],

    'authory_tech_filtered_writing' => [
        'classname' => 'authory_tech_json_func_data',
        'methodname' => 'authory_tech_filtered_writing_func',
        'classpath' => '/lib/editor/tiny/plugins/authory_tech/externallib.php',
        'description' => 'generate Reports for download',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => 'tiny/authory_tech:view',
    ],
    'authory_tech_store_user_writing' => [
        'classname' => 'authory_tech_json_func_data',
        'methodname' => 'store_user_writing',
        'classpath' => '/lib/editor/tiny/plugins/authory_tech/externallib.php',
        'description' => 'Storing User Writings',
        'type' => 'write',
        'ajax' => true,
        'capabilities' => 'tiny/authory_tech:write',
    ],
    'authory_tech_get_reply_json' => [
        'classname' => 'authory_tech_json_func_data',
        'methodname' => 'authory_tech_get_reply_json',
        'classpath' => '/lib/editor/tiny/plugins/authory_tech/externallib.php',
        'description' => 'return the stored json file',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => 'tiny/authory_tech:view',
    ],
    'authory_tech_get_writing_statistics' => [
        'classname' => 'authory_tech_json_func_data',
        'methodname' => 'authory_tech_get_analytics',
        'classpath' => '/lib/editor/tiny/plugins/authory_tech/externallib.php',
        'description' => 'return the stored analytics data',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => 'tiny/authory_tech:view',
    ],
    'authory_tech_store_writing_differences' => [
        'classname' => 'authory_tech_json_func_data',
        'methodname' => 'authory_tech_store_writing_differencs',
        'classpath' => '/lib/editor/tiny/plugins/authory_tech/externallib.php',
        'description' => 'store writing difference data',
        'type' => 'write',
        'ajax' => true,
        'capabilities' => 'tiny/authory_tech:write',
    ],
    'authory_tech_get_writing_differences' => [
        'classname' => 'authory_tech_json_func_data',
        'methodname' => 'authory_tech_get_writing_differencs',
        'classpath' => '/lib/editor/tiny/plugins/authory_tech/externallib.php',
        'description' => 'return the stored writing difference data',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => 'tiny/authory_tech:view',
    ],
    'authory_tech_generate_webtoken' => [
        'classname' => 'authory_tech_json_func_data',
        'methodname' => 'generate_webtoken',
        'classpath' => '/lib/editor/tiny/plugins/authory_tech/externallib.php',
        'description' => 'Generate a webservice token',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => 'tiny/authory_tech:view',
    ],
    'authory_tech_write_local_to_json' => [
        'classname' => 'authory_tech_json_func_data',
        'methodname' => 'write_local_to_json',
        'classpath' => '/lib/editor/tiny/plugins/authory_tech/externallib.php',
        'description' => 'Store User writing as json',
        'type' => 'write',
        'ajax' => true,
        'capabilities' => 'tiny/authory_tech:view',
    ],
    'authory_tech_get_config' => [
        'classname' => 'authory_tech_json_func_data',
        'methodname' => 'authory_tech_get_config',
        'classpath' => '/lib/editor/tiny/plugins/authory_tech/externallib.php',
        'description' => 'get user configuration',
        'type' => 'write',
        'ajax' => true,
        'capabilities' => 'tiny/authory_tech:writingreport',
    ], 'authory_tech_get_lesson_submission_data' => [
        'classname' => 'authory_tech_json_func_data',
        'methodname' => 'get_lesson_submission_data',
        'classpath' => '/lib/editor/tiny/plugins/authory_tech/externallib.php',
        'description' => 'get lesson data',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => 'tiny/authory_tech:view',
    ], 'authory_tech_disable_all_course' => [
        'classname' => 'authory_tech_json_func_data',
        'methodname' => 'disable_authory_tech',
        'classpath' => '/lib/editor/tiny/plugins/authory_tech/externallib.php',
        'description' => 'disable authory_tech for all courses',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => 'tiny/authory_tech:view',
    ], 'authory_tech_get_oublog_submission_data' => [
        'classname' => 'authory_tech_json_func_data',
        'methodname' => 'get_oublog_submission_data',
        'classpath' => '/lib/editor/tiny/plugins/authory_tech/externallib.php',
        'description' => 'get oublog data',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => 'tiny/authory_tech:view',
    ], 'authory_tech_resubmit_payload_data' => [
        'classname' => 'authory_tech_json_func_data',
        'methodname' => 'resubmit_payload_data',
        'classpath' => '/lib/editor/tiny/plugins/authory_tech/externallib.php',
        'description' => 'resubmit payload data',
        'type' => 'write',
        'ajax' => true,
        'capabilities' => 'tiny/authory_tech:view',
    ],
    'authory_tech_get_autosave_content' => [
        'classname' => 'authory_tech_json_func_data',
        'methodname' => 'get_autosave_content',
        'classpath' => '/lib/editor/tiny/plugins/authory_tech/externallib.php',
        'description' => 'resubmit payload data',
        'type' => 'write',
        'ajax' => true,
        'capabilities' => 'tiny/authory_tech:view',
    ],
    'authory_tech_update_pdf_annote_id' => [
        'classname' => 'authory_tech_json_func_data',
        'methodname' => 'update_pdf_annote_id',
        'classpath' => '/lib/editor/tiny/plugins/authory_tech/externallib.php',
        'description' => 'update resourceid for pdf annote analytics file',
        'type' => 'write',
        'ajax' => true,
        'capabilities' => 'tiny/authory_tech:view',
    ],
];

// We define the services to install as pre-build services.
// A pre-build service is not editable by administrator.

$services = [
    'Authory.tech Json Service' => [
        'functions' => [
            'authory_tech_get_quizlist',
            'authory_tech_get_module_list',
            'authory_tech_user_comments',
            'authory_tech_get_comment_link',
            'authory_tech_user_list_submission_stats',
            'authory_tech_approve_token',
            'authory_tech_get_assign_comment_link',
            'authory_tech_get_forum_comment_link',
            'authory_tech_get_assign_grade_comment',
            'authory_tech_store_user_writing',
            'authory_tech_get_reply_json',
            'authory_tech_filtered_writing',
            'authory_tech_get_writing_statistics',
            'authory_tech_store_writing_differences',
            'authory_tech_get_writing_differences',
            'authory_tech_generate_webtoken',
            'authory_tech_write_local_to_json',
            'authory_tech_get_config',
            'authory_tech_store_quality_metrics',
            'authory_tech_get_quality_metrics',
        ],
        'shortname' => 'authory_tech_json_service',
        'downloadfiles' => 1, // Allow file downloads.
        'uploadfiles' => 1, // Allow file uploads.
        'restrictedusers' => 0,
        'enabled' => 1,
        'timecreated' => time(), // Time the service was created.
        'timemodified' => time(), // Time the service was last modified.
    ],
];
