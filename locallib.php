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
 * Plugin functions for the tiny_cursive plugin.
 *
 * @package   tiny_cursive
 * @copyright 2024, CTI <info@cursivetechnology.com>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
use core_external\util;
/**
 * Get user attempts data from the database
 *
 * @param int $userid The user ID to get attempts for
 * @param int $courseid The course ID to filter by
 * @param int|null $moduleid The module ID to filter by
 * @param string $orderby Field to order results by (id, name, email, date)
 * @param int $page Page number for pagination
 * @param int $limit Number of records per page
 * @return array Array containing total count and data records
 * @throws dml_exception
 */
function tiny_cursive_get_user_attempts_data(
    $userid,
    $courseid,
    $moduleid,
    $orderby = 'id',
    $page = 0,
    $limit = 10
) {
    global $DB;
    $allowedcolumns = ['id', 'name', 'email', 'date'];

    if (!in_array($orderby, $allowedcolumns, true)) {
        $orderby = 'id';
    }

    $params = [];

    $sql = "SELECT uf.id AS fileid, u.id AS usrid, uw.id AS uniqueid,
                   u.firstname, u.lastname, u.email, uf.courseid,
                   u.firstnamephonetic, u.lastnamephonetic, u.middlename, u.alternatename,
                   uf.id AS attemptid, uf.timemodified, uf.cmid AS cmid,
                   uf.filename, uw.total_time_seconds AS total_time_seconds,
                   uw.key_count AS key_count, uw.keys_per_minute AS keys_per_minute,
                   uw.character_count AS character_count,
                   uw.characters_per_minute AS characters_per_minute,
                   uw.word_count AS word_count, uw.words_per_minute AS words_per_minute,
                   uw.backspace_percent AS backspace_percent, uw.score AS score,
                   uw.copy_behavior AS copy_behavior
              FROM {tiny_cursive_files} uf
              JOIN {user} u ON uf.userid = u.id
              JOIN {course} c ON c.id = uf.courseid AND c.visible = 1
         LEFT JOIN {tiny_cursive_user_writing} uw ON uw.file_id = uf.id
             WHERE uf.userid <> :userid1";

    $params['userid1'] = guest_user()->id;

    if ($userid != 0) {
        $sql .= " AND uf.userid = :userid2";
        $params['userid2'] = $userid;
    }

    if ($courseid != 0) {
        $sql .= " AND uf.courseid = :courseid";
        $params['courseid'] = $courseid;
    }

    if ($moduleid != 0) {
        $sql .= " AND uf.cmid = :cmid";
        $params['cmid'] = $moduleid;
    }

    $sql .= " GROUP BY uf.id, u.id, uw.id, u.firstname, u.lastname, u.email,
                       uf.courseid, uf.timemodified, uf.cmid, uf.filename,
                       uw.total_time_seconds, uw.key_count, uw.keys_per_minute,
                       uw.character_count, uw.characters_per_minute, uw.word_count,
                       uw.words_per_minute, uw.backspace_percent, uw.score, uw.copy_behavior ";

    switch ($orderby) {
        case 'name':
            $sql .= 'ORDER BY u.firstname ASC';
            break;
        case 'email':
            $sql .= 'ORDER BY u.email ASC';
            break;
        case 'date':
            $sql .= 'ORDER BY uf.timemodified ASC';
            break;
        default:
            $sql .= 'ORDER BY u.id ASC';
            break;
    }

    $countsql = "SELECT COUNT(*)
                        FROM ($sql) subquery";
    $totalcount = $DB->count_records_sql($countsql, $params);

    if ($limit) {
        $sql .= " LIMIT " . $limit;
        if ($page) {
            $offset = $page * $limit;
            $sql .= " OFFSET " . $offset;
        }
    }
    try {
        $res = $DB->get_records_sql($sql, $params);
    } catch (moodle_exception $e) {
        throw new moodle_exception('dmlreadexception', 'error', '', null, $e->getMessage());
    }

    return ['count' => $totalcount, 'data' => $res];
}

/**
 * Get user writing data from the database with pagination
 *
 * @param int $userid The user ID to get writing data for (0 for all users)
 * @param int $courseid The course ID to filter by (0 for all courses)
 * @param int $moduleid The module ID to filter by (0 for all modules)
 * @param string $orderby Field to order results by (id, name, email, date)
 * @param string $order Sort order (ASC or DESC)
 * @param int $perpage Number of records to skip (for pagination)
 * @param int $limit Maximum number of records to return
 * @return array Array containing total count and data records
 * @throws dml_exception
 */
function tiny_cursive_get_user_writing_data(
    $userid = 0,
    $courseid = 0,
    $moduleid = 0,
    $orderby = 'id',
    $order = 'ASC',
    $perpage = '',
    $limit = ''
) {
    global $DB;

    $params = [];
    $select = "SELECT uf.id AS fileid, u.id AS usrid, uw.id AS uniqueid,
                      u.firstname, u.email, uf.courseid, uf.resourceid AS attemptid, uf.timemodified,
                      uf.cmid AS cmid, uf.filename,
                      uw.total_time_seconds AS total_time_seconds,
                      uw.key_count AS key_count,
                      uw.keys_per_minute AS keys_per_minute,
                      uw.character_count AS character_count,
                      uw.characters_per_minute AS characters_per_minute,
                      uw.word_count AS word_count,
                      uw.words_per_minute AS words_per_minute,
                      uw.backspace_percent AS backspace_percent,
                      uw.score AS score,
                      uw.copy_behavior AS copy_behavior
                FROM {tiny_cursive_files} uf
                JOIN {user} u ON uf.userid = u.id
           LEFT JOIN {tiny_cursive_user_writing} uw ON uw.file_id = uf.id
               WHERE uf.userid != ?";

    $params[] = guest_user()->id; // Exclude user ID 1.

    if ($userid != 0) {
        $select .= " AND uf.userid = ?";
        $params[] = $userid;
    }
    if ($courseid != 0) {
        $select .= " AND uf.courseid = ?";
        $params[] = $courseid;
    }
    if ($moduleid != 0) {
        $select .= " AND uf.cmid = ?";
        $params[] = $moduleid;
    }

    $select .= " ORDER BY ? ?";
    $params[] =
        $orderby === 'id' ? 'u.id' : ($orderby === 'name' ? 'u.firstname' : ($orderby === 'email' ? 'u.email' : 'uf.timemodified'));
    $params[] = $order;

    $totalcount = 0;
    if ($limit) {
        $getdetailcount = $DB->get_records_sql($select, $params);
        $totalcount = count($getdetailcount);
        $select .= " LIMIT ?, ?";
        $params[] = $perpage;
        $params[] = $limit;
    }

    $res = $DB->get_records_sql($select, $params);
    $resncount = ['count' => $totalcount, 'data' => $res];

    return $resncount;
}

/**
 * Get user profile data including total time and word count
 *
 * @param int $userid The ID of the user to get profile data for
 * @param int $courseid Optional course ID to filter results (0 for all courses)
 * @return false|mixed Returns false on failure or object with total_time and word_count on success
 * @throws dml_exception
 */
function tiny_cursive_get_user_profile_data($userid, $courseid = 0) {
    global $DB;
    $attempts = [];
    $attempts = "SELECT sum(uw.total_time_seconds) AS total_time,sum(uw.word_count) AS word_count
                   FROM {tiny_cursive_user_writing} uw
                   JOIN {tiny_cursive_files} uf
                        ON uw.file_id = uf.id
                  WHERE uf.userid = :userid";
    if ($courseid != 0) {
        $attempts .= "  AND uf.courseid = :courseid";
    }
    $res = $DB->get_record_sql($attempts, ['userid' => $userid, 'courseid' => $courseid]);
    return $res;
}

/**
 * Get user submissions data including writing metrics and file information
 *
 * @param int $userid The user ID to get submissions for
 * @param string $modulename The name of the module
 * @param int $cmid The course module ID
 * @param int $courseid Optional course ID to filter results (0 for all courses)
 * @param int $oublogpostid Optional blog post ID to filter results (0 for all posts)
 * @return array[] Array containing submission data and file information
 * @throws dml_exception
 */
function tiny_cursive_get_user_submissions_data($userid, $modulename, $cmid, $courseid = 0, $oublogpostid = 0) {
    global $CFG, $DB;
    require_once($CFG->dirroot . "/lib/editor/tiny/plugins/cursive/lib.php");

    $sql = "SELECT uw.total_time_seconds, uw.word_count, uw.words_per_minute,
                   uw.backspace_percent, uw.score, uw.copy_behavior, uf.resourceid,
                   uf.modulename, uf.userid, uw.file_id, uf.filename,
                   diff.meta AS effort_ratio
              FROM {tiny_cursive_user_writing} uw
              JOIN {tiny_cursive_files} uf ON uw.file_id = uf.id
         LEFT JOIN {tiny_cursive_writing_diff} diff ON uw.file_id = diff.file_id
             WHERE uf.userid = :userid
                   AND uf.cmid = :cmid
                   AND uf.modulename = :modulename";

    // Array to hold SQL parameters.
    $params = [
        'userid' => $userid,
        'cmid' => $cmid,
        'modulename' => $modulename,
    ];

    // Add optional condition based on $courseid.
    if ($courseid != 0) {
        $sql .= " AND uf.courseid = :courseid";
        $params['courseid'] = $courseid;
    }
    if ($oublogpostid != 0) {
        $sql .= " AND uf.resourceid = :oublogid";
        $params['oublogid'] = $oublogpostid;
    }

    // Execute the SQL query using Moodle's database abstraction layer.
    $data = $DB->get_record_sql($sql, $params);
    if (isset($data->effort_ratio)) {
        $data->effort_ratio = intval(floatval($data->effort_ratio) * 100);
    }
    $data = (array)$data;

    if (!isset($data['filename'])) {
        $params = [
            'userid' => $userid,
            'cmid' => $cmid,
            'modulename' => $modulename,
        ];
        $sql = 'SELECT id as fileid, userid, filename, content
                  FROM {tiny_cursive_files}
                 WHERE userid = :userid
                       AND cmid = :cmid
                       AND modulename = :modulename';

        if ($oublogpostid != 0) {
            $sql .= " AND resourceid = :oublogid";
            $params['oublogid'] = $oublogpostid;
        }

        $filename = $DB->get_record_sql($sql, $params);

        if ($filename) {
            $data['filename'] = $filename->filename;
            $data['file_id'] = $filename->fileid ?? '';
        }
    }

    if ($data['filename']) {
        $sql = 'SELECT id as fileid
                  FROM {tiny_cursive_files}
                 WHERE userid = :userid ORDER BY id ASC LIMIT 1';

        $ffile = $DB->get_record_sql($sql, ['userid' => $userid]);
        $ffile = (array)$ffile;
        if ($ffile['fileid'] == $data['file_id']) {
            $data['first_file'] = 1;
        } else {
            $data['first_file'] = 0;
        }
    }

    $res = $data;

    $response = [
        'res' => $res,
    ];
    return $response;
}

/**
 * Get course module ID for a given course
 *
 * @param int $courseid The ID of the course to get the module ID for
 * @return int The course module ID, or 0 if not found
 * @throws dml_exception
 */
function tiny_cursive_get_cmid($courseid) {
    global $DB;

    $cm = $DB->get_record('course_modules', ['course' => $courseid, 'deletioninprogress' => 0],
         'id', IGNORE_MULTIPLE);
    $cmid = isset($cm->id) ? $cm->id : 0;

    return $cmid;
}

/**
 * Create a token for a given user
 *
 * @package tiny_cursive
 * @return string The created token
 */
function tiny_cursive_create_token_for_user() {
    global $DB, $USER;
    $token = '';
    $serviceshortname = 'cursive_json_service'; // Replace with your service shortname.
    $service = $DB->get_record('external_services', ['shortname' => $serviceshortname]);
    if ($USER->id && is_siteadmin() && $service) {
        $admin = get_admin();
        $token = util::generate_token(EXTERNAL_TOKEN_PERMANENT, $service, $admin->id, context_system::instance());
    }
    return $token;
}

/**
 * Renders a table displaying user data with export functionality
 *
 * @param array $users Array of user data to display in the table
 * @param renderer_base $renderer The renderer object used to display the table
 * @param int $courseid The course ID to filter results
 * @param int $page Current page number for pagination
 * @param int $limit Number of records per page
 * @param string $linkurl Base URL for pagination links
 * @param int $moduleid The module ID to filter results
 * @param int $userid The user ID to filter results
 * @return void
 */
function tiny_cursive_render_user_table($users, $renderer, $courseid, $page, $limit, $linkurl, $moduleid, $userid) {

    // Prepare the URL for the link.
    $url = new moodle_url('/lib/editor/tiny/plugins/cursive/csvexport.php', [
        'courseid' => $courseid,
        'moduleid' => $moduleid,
        'userid' => $userid,
    ]);
    // Prepare the link text.
    $linktext = get_string('download_csv', 'tiny_cursive');
    // Prepare the attributes for the link.
    $attributes = [
        'target' => '_blank',
        'id' => 'export',
        'role' => 'button',
        'class' => 'btn btn-primary mb-4',
        'style' => 'margin-right:50px;',
    ];
    // Generate the link using html_writer::link.
    echo html_writer::link($url, $linktext, $attributes);
    echo $renderer->timer_report($users, $courseid, $page, $limit, $linkurl);
}

/**
 * Check subscription status for Tiny Cursive plugin
 *
 * Verifies the subscription status by making a request to the remote Python server
 * using the configured secret key. Updates the subscription status in plugin config.
 *
 * @return array Returns array with status boolean indicating subscription check result
 * @throws moodle_exception If there is an error checking the subscription
 */
function tiny_cursive_check_subscriptions() {
    global $DB, $CFG;
    require_once("$CFG->libdir/filelib.php");

    $token = get_config('tiny_cursive', 'secretkey');

    if (!$token) {
        return ['status' => false];
    }
    try {
        $remoteurl = get_config('tiny_cursive', 'python_server') . '/verify-role';
        $moodleurl = $CFG->wwwroot;

        $curl = new curl();
        $options = [
            'CURLOPT_RETURNTRANSFER' => true,
            'CURLOPT_HTTPHEADER' => [
                'Authorization: Bearer ' . $token,
                'X-Moodle-Url: ' . $moodleurl,
                'Content-Type: multipart/form-data',
                'Accept: application/json',
            ],
        ];

        // Prepare POST fields.
        $postfields = [
            'token' => $token,
            'moodle_url' => $moodleurl,
        ];
        $result = '';
        // Execute the request.
        $result = $curl->post($remoteurl, $postfields, $options);
        $result = json_decode($result);
        if ($result) {
            set_config('has_subscription', $result->status, 'tiny_cursive');
            return ['status' => true];
        }
    } catch (dml_exception $e) {
        throw new moodle_exception($e->getMessage());
    }
}
