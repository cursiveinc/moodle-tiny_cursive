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

defined('MOODLE_INTERNAL') || die();

$functions = [
    'cursive_get_user_list' => [
        'classname' => 'cursive_json_func_data',
        'methodname' => 'get_user_list',
        'classpath' => '/lib/editor/tiny/plugins/cursive/externallib.php',
        'description' => 'get quiz list by course',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => 'tiny/cursive:view',
    ],
    'cursive_get_module_list' => [
        'classname' => 'cursive_json_func_data',
        'methodname' => 'get_module_list',
        'classpath' => '/lib/editor/tiny/plugins/cursive/externallib.php',
        'description' => 'get quiz list by course',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => 'tiny/cursive:view',
    ],
    'cursive_approve_token' => [
        'classname' => 'cursive_json_func_data',
        'methodname' => 'cursive_approve_token_func',
        'classpath' => '/lib/editor/tiny/plugins/cursive/externallib.php',
        'description' => 'generate Reports for download',
        'type' => 'write',
        'ajax' => true,
        'capabilities' => 'tiny/cursive:editsettings',
    ],
    'cursive_user_comments' => [
        'classname' => 'cursive_json_func_data',
        'methodname' => 'cursive_user_comments_func',
        'classpath' => '/lib/editor/tiny/plugins/cursive/externallib.php',
        'description' => 'User Comments',
        'type' => 'write',
        'ajax' => true,
        'capabilities' => 'tiny/cursive:write',
    ],
    'cursive_get_comment_link' => [
        'classname' => 'cursive_json_func_data',
        'methodname' => 'get_comment_link',
        'classpath' => '/lib/editor/tiny/plugins/cursive/externallib.php',
        'description' => ' Comments Links',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => 'tiny/cursive:view',
    ],
    'cursive_get_assign_comment_link' => [
        'classname' => 'cursive_json_func_data',
        'methodname' => 'get_assign_comment_link',
        'classpath' => '/lib/editor/tiny/plugins/cursive/externallib.php',
        'description' => ' Comments Links',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => 'tiny/cursive:view',
    ],
    'cursive_get_forum_comment_link' => [
        'classname' => 'cursive_json_func_data',
        'methodname' => 'get_forum_comment_link',
        'classpath' => '/lib/editor/tiny/plugins/cursive/externallib.php',
        'description' => 'get forum comments links',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => 'tiny/cursive:view',
    ],
    'cursive_get_assign_grade_comment' => [
        'classname' => 'cursive_json_func_data',
        'methodname' => 'get_assign_grade_comment',
        'classpath' => '/lib/editor/tiny/plugins/cursive/externallib.php',
        'description' => 'get assign grade comments',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => 'tiny/cursive:view',
    ],
    'cursive_user_list_submission_stats' => [
        'classname' => 'cursive_json_func_data',
        'methodname' => 'get_user_list_submission_stats',
        'classpath' => '/lib/editor/tiny/plugins/cursive/externallib.php',
        'description' => 'get user submissions status',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => 'tiny/cursive:view',
    ],

    'cursive_filtered_writing' => [
        'classname' => 'cursive_json_func_data',
        'methodname' => 'cursive_filtered_writing_func',
        'classpath' => '/lib/editor/tiny/plugins/cursive/externallib.php',
        'description' => 'generate Reports for download',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => 'tiny/cursive:view',
    ],
    'cursive_store_user_writing' => [
        'classname' => 'cursive_json_func_data',
        'methodname' => 'store_user_writing',
        'classpath' => '/lib/editor/tiny/plugins/cursive/externallib.php',
        'description' => 'Storing User Writings',
        'type' => 'write',
        'ajax' => true,
        'capabilities' => 'tiny/cursive:write',
    ],
    'cursive_get_reply_json' => [
        'classname' => 'cursive_json_func_data',
        'methodname' => 'cursive_get_reply_json',
        'classpath' => '/lib/editor/tiny/plugins/cursive/externallib.php',
        'description' => 'return the stored json file',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => 'tiny/cursive:view',
    ],
    'cursive_get_writing_statistics' => [
        'classname' => 'cursive_json_func_data',
        'methodname' => 'cursive_get_analytics',
        'classpath' => '/lib/editor/tiny/plugins/cursive/externallib.php',
        'description' => 'return the stored analytics data',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => 'tiny/cursive:view',
    ],
    'cursive_store_writing_differences' => [
        'classname' => 'cursive_json_func_data',
        'methodname' => 'cursive_store_writing_differencs',
        'classpath' => '/lib/editor/tiny/plugins/cursive/externallib.php',
        'description' => 'store writing difference data',
        'type' => 'write',
        'ajax' => true,
        'capabilities' => 'tiny/cursive:write',
    ],
    'cursive_get_writing_differences' => [
        'classname' => 'cursive_json_func_data',
        'methodname' => 'cursive_get_writing_differencs',
        'classpath' => '/lib/editor/tiny/plugins/cursive/externallib.php',
        'description' => 'return the stored writing difference data',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => 'tiny/cursive:view',
    ],
    'cursive_generate_webtoken' => [
        'classname' => 'cursive_json_func_data',
        'methodname' => 'generate_webtoken',
        'classpath' => '/lib/editor/tiny/plugins/cursive/externallib.php',
        'description' => 'Generate a webservice token',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => 'tiny/cursive:view',
    ],
    'cursive_write_local_to_json' => [
        'classname' => 'cursive_json_func_data',
        'methodname' => 'write_local_to_json',
        'classpath' => '/lib/editor/tiny/plugins/cursive/externallib.php',
        'description' => 'Store User writing as json',
        'type' => 'write',
        'ajax' => true,
        'capabilities' => 'tiny/cursive:view',
    ],
    'cursive_get_config' => [
        'classname' => 'cursive_json_func_data',
        'methodname' => 'cursive_get_config',
        'classpath' => '/lib/editor/tiny/plugins/cursive/externallib.php',
        'description' => 'get user configuration',
        'type' => 'write',
        'ajax' => true,
        'capabilities' => 'tiny/cursive:writingreport',
    ],
    'cursive_store_quality_metrics' => [
        'classname' => 'cursive_json_func_data',
        'methodname' => 'store_quality_metrics',
        'classpath' => '/lib/editor/tiny/plugins/cursive/externallib.php',
        'description' => 'get user configuration',
        'type' => 'write',
        'ajax' => true,
        'capabilities' => 'tiny/cursive:editsettings',
    ], 'cursive_get_quality_metrics' => [
        'classname' => 'cursive_json_func_data',
        'methodname' => 'get_quality_metrics',
        'classpath' => '/lib/editor/tiny/plugins/cursive/externallib.php',
        'description' => 'get user configuration',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => 'tiny/cursive:editsettings',
    ], 'cursive_get_lesson_submission_data' => [
        'classname' => 'cursive_json_func_data',
        'methodname' => 'get_lesson_submission_data',
        'classpath' => '/lib/editor/tiny/plugins/cursive/externallib.php',
        'description' => 'get lesson data',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => 'tiny/cursive:editsettings',
    ], 'cursive_disable_all_course' => [
        'classname' => 'cursive_json_func_data',
        'methodname' => 'disable_cursive',
        'classpath' => '/lib/editor/tiny/plugins/cursive/externallib.php',
        'description' => 'disable cursive for all courses',
        'type' => 'read',
        'ajax' => true,
        'capabilities' => 'tiny/cursive:editsettings',
    ],
];

// We define the services to install as pre-build services.
// A pre-build service is not editable by administrator.

$services = [
    'Cursive Json Service' => [
        'functions' => [
            'cursive_get_quizlist',
            'cursive_get_module_list',
            'cursive_user_comments',
            'cursive_get_comment_link',
            'cursive_user_list_submission_stats',
            'cursive_approve_token',
            'cursive_get_assign_comment_link',
            'cursive_get_forum_comment_link',
            'cursive_get_assign_grade_comment',
            'cursive_store_user_writing',
            'cursive_get_reply_json',
            'cursive_filtered_writing',
            'cursive_get_writing_statistics',
            'cursive_store_writing_differences',
            'cursive_get_writing_differences',
            'cursive_generate_webtoken',
            'cursive_write_local_to_json',
            'cursive_get_config',
            'cursive_store_quality_metrics',
            'cursive_get_quality_metrics',
        ],
        'shortname' => 'cursive_json_service',
        'downloadfiles' => 1, // Allow file downloads.
        'uploadfiles' => 1, // Allow file uploads.
        'restrictedusers' => 0,
        'enabled' => 1,
        'timecreated' => time(), // Time the service was created.
        'timemodified' => time(), // Time the service was last modified.
    ],
];
