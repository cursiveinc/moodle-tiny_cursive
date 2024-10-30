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
 * get_user_attempts_data
 *
 * @param $userid
 * @param $courseid
 * @param $moduleid
 * @param $orderby
 * @param $order
 * @param $perpage
 * @param $limit
 * */
function get_user_attempts_data($userid, $courseid, $moduleid, $orderby = 'id', $order = 'ASC', $page = 0, $limit = 10) {
    global $DB;

    $params = [];
    $odby = 'u.id';

    switch ($orderby) {
        case 'name':
            $odby = 'u.firstname';
            break;
        case 'email':
            $odby = 'u.email';
            break;
        case 'date':
            $odby = 'uf.timemodified';
            break;
    }

    $sql = "SELECT uf.id AS fileid, u.id AS usrid,uw.id AS uniqueid, u.firstname, u.lastname,u.email,uf.courseid,
                   uf.id AS attemptid,uf.timemodified, uf.cmid AS cmid,
                   uf.filename, uw.total_time_seconds AS total_time_seconds,
                   uw.key_count AS key_count, uw.keys_per_minute AS keys_per_minute,
                   uw.character_count AS character_count,
                   uw.characters_per_minute AS characters_per_minute,
                   uw.word_count AS word_count, uw.words_per_minute AS words_per_minute,
                   uw.backspace_percent AS backspace_percent, uw.score AS score,
                   uw.copy_behavior AS copy_behavior
              FROM  {tiny_cursive_files} uf
              JOIN {user} u ON uf.userid = u.id
         LEFT JOIN {tiny_cursive_user_writing} uw ON uw.file_id = uf.id
             WHERE uf.userid != 1 ";

    if ($userid != 0) {
        $sql .= " AND uf.userid = :userid";
        $params['userid'] = $userid;
    }

    if ($courseid != 0) {
        $sql .= " AND uf.courseid = :courseid";
        $params['courseid'] = $courseid;
    }

    if ($moduleid != 0) {
        $sql .= " AND uf.cmid = :moduleid";
        $params['moduleid'] = $moduleid;
    }
    $params['odby'] = $odby;
    $params['order'] = $order;

    $sql .= " GROUP BY uf.id, u.id, uw.id, u.firstname, u.lastname, u.email,
                  uf.courseid, uf.timemodified, uf.cmid, uf.filename,
                  uw.total_time_seconds, uw.key_count, uw.keys_per_minute,
                  uw.character_count, uw.characters_per_minute, uw.word_count,
                  uw.words_per_minute, uw.backspace_percent, uw.score, uw.copy_behavior
          ORDER BY :odby :order";

    // Calculate the total count for pagination.
    $countsql = "SELECT COUNT(*)
                   FROM ($sql) subquery";
    $totalcount = $DB->count_records_sql($countsql, $params);

    // Add LIMIT and OFFSET for pagination.
    $offset = ($page * $limit);
    $sql .= " LIMIT $limit OFFSET $offset";

    try {
        $res = $DB->get_records_sql($sql, $params);
    } catch (Exception $e) {
        debugging("Error executing query: " . $e->getMessage());
        throw new moodle_exception('errorreadingfromdatabase', 'error', '', null, $e->getMessage());
    }
    return ['count' => $totalcount, 'data' => $res];
}

/**
 * get_user_writing_data
 *
 * @param $userid
 * @param $courseid
 * @param $moduleid
 * @param $orderby
 * @param $order
 * @param $perpage
 * @param $limit
 * @return array
 * @throws dml_exception
 */
function get_user_writing_data(
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

    $params[] = 1; // Exclude user ID 1.

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
 * get_user_profile_data
 *
 * @param $userid
 * @param $courseid
 * @return false|mixed
 * @throws dml_exception
 */
function get_user_profile_data($userid, $courseid = 0) {
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
 * get_user_submissions_data
 *
 * @param $resourceid
 * @param $modulename
 * @param $cmid
 * @param $courseid
 * @return array[]
 * @throws dml_exception
 */
function get_user_submissions_data($resourceid, $modulename, $cmid, $courseid = 0) {
    global $CFG, $DB;
    require_once($CFG->dirroot . "/lib/editor/tiny/plugins/cursive/lib.php");
    $userid = $resourceid;
    $sql = "SELECT uw.total_time_seconds, uw.word_count, uw.words_per_minute,
                   uw.backspace_percent, uw.score, uw.copy_behavior, uf.resourceid,
                   uf.modulename, uf.userid, uw.file_id, uf.filename,
                   diff.meta AS effort_ratio
              FROM {tiny_cursive_user_writing} uw
              JOIN {tiny_cursive_files} uf ON uw.file_id = uf.id
         LEFT JOIN {tiny_cursive_writing_diff} diff ON uw.file_id = diff.file_id
             WHERE uf.userid = :resourceid
                   AND uf.cmid = :cmid
                   AND uf.modulename = :modulename";

    // Array to hold SQL parameters.
    $params = [
        'resourceid' => $resourceid,
        'cmid' => $cmid,
        'modulename' => $modulename,
    ];

    // Add optional condition based on $courseid.
    if ($courseid != 0) {
        $sql .= " AND uf.courseid = :courseid";
        $params['courseid'] = $courseid;
    }

    // Execute the SQL query using Moodle's database abstraction layer.
    $data = $DB->get_record_sql($sql, $params);
    $data = (array)$data;

    if (!isset($data['filename'])) {
        $sql = 'SELECT id as fileid, userid, filename
                  FROM {tiny_cursive_files}
                 WHERE userid = :userid
                   AND cmid = :cmid
                   AND modulename = :modulename';
        $filename = $DB->get_record_sql($sql, ['userid' => $resourceid, 'cmid' => $cmid, 'modulename' => $modulename]);

        if ($filename) {
            $filep = $CFG->tempdir . '/userdata/' . $filename->filename;
            $data['filename'] = $filep;
            $data['file_id'] = $filename->fileid ?? '';
        }
    } else {
        $data['filename'] = $CFG->tempdir . '/userdata/' . $data['filename'];
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
 * get_user_submissions_data
 */
function tiny_cursive_get_cmid($courseid) {
    global $DB;
    $sql = "SELECT cm.id
              FROM {course_modules} cm
         LEFT JOIN {modules} m ON m.id = cm.module
         LEFT JOIN {course} c ON c.id = cm.course
             WHERE cm.course = :courseid LIMIT 1";

    $params = ['courseid' => $courseid];
    $cm = $DB->get_record_sql($sql, $params);
    $cmid = isset($cm->id) ? $cm->id : 0;
    return $cmid;
}

/**
 * Create a token for a given user
 *
 * @package tiny_cursive
 * @param int $userid The ID of the user to create the token for
 * @return string The created token
 */
function create_token_for_user() {
    global $DB;
    $amdinid = get_admin();

    $serviceshortname = 'cursive_json_service'; // Replace with your service shortname.
    $service = $DB->get_record('external_services', ['shortname' => $serviceshortname]);
    $token = util::generate_token(EXTERNAL_TOKEN_PERMANENT, $service, $amdinid->id, context_system::instance());

    return $token;
}
