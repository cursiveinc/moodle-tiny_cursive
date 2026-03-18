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
 * Tiny authory_tech plugin upload file using cron to the api server.
 *
 * @package tiny_authory_tech
 * @copyright  Authory Technology S.L. <info@authory.tech>
 * @author kuldeep singh <mca.kuldeep.sekhon@gmail.com>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_authory_tech\task;
use core\task\scheduled_task;
/**
 * Tiny authory_tech plugin upload file using cron to the api server.
 *
 * @package tiny_authory_tech
 * @copyright  Authory Technology S.L. <info@authory.tech>
 * @author kuldeep singh <mca.kuldeep.sekhon@gmail.com>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class upload_student_json_cron extends scheduled_task {
    /**
     * Return the task's name as shown in admin screens.
     *
     * @return string
     */
    public function get_name() {
        return get_string('pluginname', 'tiny_authory_tech');
    }

    /**
     * Execution function
     *
     * @return void
     * @throws \dml_exception
     */
    public function execute() {
        global $CFG, $DB;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/authory_tech/lib.php');

        $serviceshortname = 'authory_tech_json_service';
        $service = $DB->get_record('external_services', ['shortname' => $serviceshortname]);

        $token = '';
        $adminuser = get_admin();
        $authory_tech_token = get_config('tiny_authory_tech', 'authory_tech_token');

        if (!$authory_tech_token) {
            // Use get_record() instead of get_record_sql() for simpler queries.
            $token = $DB->get_record(
                'external_tokens',
                ['userid' => $adminuser->id, 'externalserviceid' => $service->id],
                '*',
                IGNORE_MULTIPLE
            );
        }

        $wstoken = $authory_tech_token ?? $token->token;

        $sql = "SELECT tcf.*
                FROM {tiny_cursive_files} tcf
                WHERE tcf.timemodified > tcf.uploaded";
        $filerecords = $DB->get_records_sql($sql);

        $table = 'tiny_cursive_files';
        foreach ($filerecords as $filerecord) {
            $answer = $filerecord->original_content ?? "";

            $uploaded = tiny_authory_tech_upload_multipart_record($filerecord, $filerecord->filename, $wstoken, $answer);
            if ($uploaded) {
                $filerecord->uploaded = strtotime(date('Y-m-d H:i:s'));
                $DB->update_record($table, $filerecord);
                $uploaded = false;
            }
        }
    }
}
