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
 * @author kuldeep singh <mca.kuldeep.sekhon@gmail.com>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_cursive\task;
use core\task\scheduled_task;
/**
 * Tiny cursive plugin upload file using cron to the api server.
 *
 * @package tiny_cursive
 * @copyright  CTI <info@cursivetechnology.com>
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
        if (!$service) {
            mtrace('[tiny_cursive] Upload cron skipped: external service not found.');
            return;
        }

        $adminuser = get_admin();
        if (!$adminuser) {
            mtrace('[tiny_cursive] Upload cron skipped: admin user not found.');
            return;
        }

        // Use the configured token only when it is a non-empty value; otherwise fall
        // back to the admin's external web service token.
        $wstoken = trim((string) get_config('tiny_cursive', 'cursivetoken'));
        if ($wstoken === '') {
            $tokenrecord = $DB->get_record(
                'external_tokens',
                ['userid' => $adminuser->id, 'externalserviceid' => $service->id],
                '*',
                IGNORE_MULTIPLE
            );
            if ($tokenrecord && !empty($tokenrecord->token)) {
                $wstoken = $tokenrecord->token;
            }
        }

        if ($wstoken === '') {
            mtrace('[tiny_cursive] Upload cron skipped: no web service token available.');
            return;
        }

        // Select only the lightweight columns needed to drive the loop. The large
        // content/original_content blobs are loaded per record, just before upload,
        // to avoid materialising up to $batchsize multi-megabyte rows at once.
        $batchsize = 200;
        $sql = "SELECT tcf.id, tcf.userid, tcf.cmid, tcf.filename, tcf.timemodified, tcf.uploaded
                FROM {tiny_cursive_files} tcf
                WHERE tcf.timemodified > tcf.uploaded
                ORDER BY tcf.timemodified ASC";
        $filerecords = $DB->get_records_sql($sql, null, 0, $batchsize);

        $table = 'tiny_cursive_files';
        $transientfailurecount = 0;
        $successids = [];
        $permanentfailureids = [];

        $contentrecords = [];
        $modules = [];
        if (!empty($filerecords)) {
            $contentrecords = $DB->get_records_list($table, 'id', array_keys($filerecords), '', 'id, content, original_content');
            $cmids = array_values(array_unique(array_filter(array_column($filerecords, 'cmid'))));
            if ($cmids) {
                $modules = $DB->get_records_list('course_modules', 'id', $cmids, '', 'id');
            }
        }

        foreach ($filerecords as $filerecord) {
            // Load the heavy columns from the pre-fetched batch.
            $filerecord->content = $contentrecords[$filerecord->id]->content ?? null;
            $answer = (string) ($contentrecords[$filerecord->id]->original_content ?? '');

            // Skip records with empty content to prevent json_decode() errors.
            if (empty($filerecord->content)) {
                mtrace("Skipping record {$filerecord->id}: content is empty.");
                continue;
            }

            // Skip records where the course module no longer exists (activity was deleted).
            if (!empty($filerecord->cmid) && !isset($modules[$filerecord->cmid])) {
                mtrace("Skipping record {$filerecord->id}: cmid {$filerecord->cmid} no longer exists.");
                continue;
            }

            $status = tiny_cursive_upload_multipart_record($filerecord, $filerecord->filename, $wstoken, $answer);
            if ($status === 'success') {
                $successids[] = $filerecord->id;
            } else if ($status === 'permanent_failure') {
                $permanentfailureids[] = $filerecord->id;
            } else {
                $transientfailurecount++;
            }
        }

        // Update upload state once per outcome instead of issuing a write query per row.
        if ($successids) {
            [$insql, $params] = $DB->get_in_or_equal($successids, SQL_PARAMS_NAMED);
            $params['uploadtime'] = time();
            $DB->execute("UPDATE {{$table}} SET uploaded = :uploadtime WHERE id {$insql}", $params);
        }
        if ($permanentfailureids) {
            [$insql, $params] = $DB->get_in_or_equal($permanentfailureids, SQL_PARAMS_NAMED);
            $DB->execute("UPDATE {{$table}} SET uploaded = timemodified WHERE id {$insql}", $params);
        }

        $successcount = count($successids);
        $permanentfailurecount = count($permanentfailureids);

        mtrace(
            "[tiny_cursive] Upload cron summary - batch size: {$batchsize}, processed: " . count($filerecords) .
            ", success: {$successcount}, transient failures: {$transientfailurecount}, permanent failures: {$permanentfailurecount}"
        );
    }
}
