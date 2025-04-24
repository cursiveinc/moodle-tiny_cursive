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
 * Tiny cursive plugin csv export.
 *
 * @package tiny_cursive
 * @copyright  CTI <info@cursivetechnology.com>
 * @author kuldeep singh <mca.kuldeep.sekhon@gmail.com>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../../../../config.php');
require_login();
require_once($CFG->libdir . "/csvlib.class.php");
require_once(__DIR__.'/locallib.php');
require_once(__DIR__.'/lib.php');

$courseid = optional_param('courseid', 0, PARAM_INT);
$userid = optional_param('userid', 0, PARAM_INT);
$moduleid = optional_param('moduleid', 0, PARAM_INT);
// Use csv_export_writer.
if ($moduleid != 0) {
    $context = context_module::instance($moduleid);
} else {
    $cmid = tiny_cursive_get_cmid($courseid);
    $context = context_module::instance($cmid);
}

require_capability('tiny/cursive:view', $context);

global $CFG, $DB, $OUTPUT;
$report = [];
$headers = [
    get_string('fullname', 'tiny_cursive'),
    get_string('email', 'tiny_cursive'),
    get_string('courseid', 'tiny_cursive'),
    get_string('total_time_seconds', 'tiny_cursive'),
    get_string('key_count', 'tiny_cursive'),
    get_string('keys_per_minute', 'tiny_cursive'),
    get_string('character_count', 'tiny_cursive'),
    get_string('characters_per_minute', 'tiny_cursive'),
    get_string('word_count', 'tiny_cursive'),
    get_string('words_per_minute', 'tiny_cursive'),
    get_string('backspace_percent', 'tiny_cursive'),
    get_string('score', 'tiny_cursive'),
    get_string('copybehavior', 'tiny_cursive'),
    get_string('effort_ratio', 'tiny_cursive'),
];
$exportcsv = new csv_export_writer('comma');
$exportcsv->set_filename("Writing Analysis Report");
$exportcsv->add_data($headers); // Add Header Row.
$params = [];
if ($courseid != 0) {

    $attempts = "SELECT uf.id as fileid, u.id as usrid,
                        " . $DB->sql_concat('u.firstname', "' '", 'u.lastname') . " as fullname,
                        u.email, uf.courseid,
                        " . $DB->sql_cast_char2int('SUM(COALESCE(uw.total_time_seconds,0))') . " as total_time,
                        " . $DB->sql_cast_char2int('SUM(COALESCE(uw.key_count,0))') . " as key_count,
                        CAST(AVG(COALESCE(uw.keys_per_minute,0)) AS DECIMAL(10,2)) as keys_per_minute,
                        " . $DB->sql_cast_char2int('SUM(COALESCE(uw.character_count,0))') . " as character_count,
                        CAST(AVG(COALESCE(uw.characters_per_minute,0)) AS DECIMAL(10,2)) as characters_per_minute,
                        " . $DB->sql_cast_char2int('SUM(COALESCE(uw.word_count,0))') . " as word_count,
                        CAST(AVG(COALESCE(uw.words_per_minute,0)) AS DECIMAL(10,2)) as words_per_minute,
                        CAST(AVG(COALESCE(uw.backspace_percent,0)) AS DECIMAL(10,2)) as backspace_percent,
                        CAST(AVG(COALESCE(uw.score,0)) AS DECIMAL(10,2)) as score,
                        " . $DB->sql_cast_char2int('SUM(COALESCE(uw.copy_behavior,0))') . " as copybehavior,
                        CAST(AVG(COALESCE(wd.meta,0)) AS DECIMAL(10,2)) as effort
                  FROM {tiny_cursive_files} uf
                  JOIN {user} u ON u.id = uf.userid
             LEFT JOIN {tiny_cursive_user_writing} uw ON uw.file_id = uf.id
             LEFT JOIN {tiny_cursive_writing_diff} wd ON wd.file_id = uf.id
                 WHERE uf.userid != :adminid";


    $params['adminid'] = get_admin()->id;

    if ($userid != 0) {
        $attempts .= " AND uf.userid = :userid";
        $params['userid'] = $userid;
    }
    if ($courseid != 0) {
        $attempts .= " AND uf.courseid = :courseid";
        $params['courseid'] = $courseid;
    }

    if ($moduleid != 0) {
        $attempts .= " AND uf.cmid = :moduleid";
        $params['moduleid'] = $moduleid;
    }
    $attempts .= " GROUP BY uf.id, u.id, u.email, uf.courseid";
    $ress = $DB->get_records_sql($attempts, $params);

    foreach ($ress as $key => $res) {
        if ($res != null) {
            $userrow = [
                $res->fullname,
                $res->email,
                $res->courseid,
                $res->total_time,
                $res->key_count,
                $res->keys_per_minute,
                $res->character_count,
                $res->characters_per_minute,
                $res->word_count,
                $res->words_per_minute,
                $res->backspace_percent,
                $res->score,
                $res->copybehavior,
                $res->effort
            ];
            $exportcsv->add_data($userrow);
        }
    }
}

$exportcsv->download_file();
