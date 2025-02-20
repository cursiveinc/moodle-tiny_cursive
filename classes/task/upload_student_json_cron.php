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
 * Tiny cursive plugin upload file using cron to the api server.
 *
 * @package tiny_cursive
 * @copyright  CTI <info@cursivetechnology.com>
 * @author Brain Station 23 <elearning@brainstation-23.com>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_cursive\task;
use core\task\scheduled_task;
/**
 * Tiny cursive plugin upload file using cron to the api server.
 *
 * @package tiny_cursive
 * @copyright  CTI <info@cursivetechnology.com>
 * @author Brain Station 23 <elearning@brainstation-23.com>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class upload_student_json_cron extends scheduled_task {
    /**
     * Return the task's name as shown in admin screens.
     *
     * @return string
     */
    public function get_name() {
        return get_string('pluginname', 'tiny_cursive');
    }

    /**
     * Execution function
     *
     * @return void
     * @throws \dml_exception
     */
    public function execute() {
        global $CFG, $DB;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/lib.php');

        $serviceshortname = 'cursive_json_service';
        $service = $DB->get_record('external_services', ['shortname' => $serviceshortname]);

        $token = '';
        $adminuser = get_admin();
        $cursivetoken = get_config('tiny_cursive', 'cursivetoken');

        if (!$cursivetoken) {
            $sql = "SELECT *
                      FROM {external_tokens}
                     WHERE userid = ? AND externalserviceid = ?
                           ORDER BY id DESC LIMIT 1";
            $token = $DB->get_record_sql($sql, [$adminuser->id, $service->id]);
        }

        $wstoken = $cursivetoken ?? $token->token;

        $sql = "SELECT tcf.*
                FROM {tiny_cursive_files} tcf
                WHERE tcf.timemodified > tcf.uploaded";
        $filerecords = $DB->get_records_sql($sql);

        $table = 'tiny_cursive_files';
        foreach ($filerecords as $filerecord) {

            $answer = $filerecord->original_content ?? "";

            $uploaded = tiny_cursive_upload_multipart_record($filerecord, $filerecord->filename, $wstoken, $answer);
            if ($uploaded) {
                $filerecord->uploaded = strtotime(date('Y-m-d H:i:s'));
                $DB->update_record($table, $filerecord);
                $uploaded = false;
            }
        }
    }
}
