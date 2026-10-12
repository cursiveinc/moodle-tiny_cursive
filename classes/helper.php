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

namespace tiny_cursive;

use curl;
use moodle_exception;

/**
 * Class helper
 *
 * @package    tiny_cursive
 * @copyright  2026 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class helper {
    /**
     * Validate access to a stored writing JSON download.
     *
     * The course is always derived from the course module so a caller cannot combine a privileged
     * course ID with an unrelated module ID.
     *
     * @param int $cmid Course module ID.
     * @param int $userid Owner of the requested writing data.
     * @return \stdClass The course record derived from the course module.
     */
    public static function require_json_download_access(int $cmid, int $userid): \stdClass {
        global $USER;

        $cm = get_coursemodule_from_id(null, $cmid, 0, false, MUST_EXIST);
        $course = get_course($cm->course);
        require_login($course, false, $cm);

        $context = \context_module::instance($cmid);
        require_capability('tiny/cursive:writingreport', $context);
        if ((int) $USER->id !== $userid) {
            require_capability('tiny/cursive:view', $context);
        }

        return $course;
    }

    /**
     * Updates resource IDs for both comments and cursive files
     *
     * @param array $data Array containing userid, modulename, courseid, cmid and resourceid
     * @return void
     * @throws \dml_exception
     */
    public static function update_resource_id($data) {
        self::update_comment($data);
        self::update_cursive_files($data);
    }

    /**
     * Updates comments in the tiny_cursive_comments table.
     *
     * @param array $data Array containing userid, modulename, courseid, cmid and resourceid
     * @throws \dml_exception
     */
    public static function update_comment($data) {
        global $DB;

        $table      = 'tiny_cursive_comments';
        $conditions = [
            "userid"     => $data['userid'],
            "modulename" => $data['modulename'],
            'resourceid' => 0,
            'courseid'   => $data['courseid'],
            'cmid'       => $data['cmid'],
        ];

        $recs = $DB->get_records($table, $conditions);
        if ($recs) {
            self::update_records($recs, $table, $data['resourceid']);
        }
        // Update autosave content as well.
        $conditions['modulename'] = $data['modulename'] . "_autosave";
        self::update_autosaved_content($conditions, $table, $data['resourceid']);
    }

    /**
     * Updates cursive file in the tiny_cursive_files table.
     *
     * @param array $data Array containing userid, modulename, courseid, cmid and resourceid
     * @throws \dml_exception
     */
    public static function update_cursive_files($data) {
        global $DB;

        $table      = 'tiny_cursive_files';
        $conditions = [
            "userid"     => $data['userid'],
            "modulename" => $data['modulename'],
            'resourceid' => 0,
            'courseid'   => $data['courseid'],
            'cmid'       => $data['cmid'],
        ];
        $recs = $DB->get_records($table, $conditions);
        if ($recs) {
            $fname               = $data['userid'] . '_' . $data['resourceid'] . '_' . $data['cmid'] . '_attempt' . '.json';
            self::update_records($recs, $table, $data['resourceid'], $fname);
        }
    }

    /**
     * Links PDF Annotator captures that were left pending to the comment they belong to.
     *
     * A new annotation is captured under resourceid 0 and re-linked by a browser call once
     * PDF Annotator has saved the comment. When that call never arrives, the capture stays
     * pending and the same user's next annotation in the activity is written into it. This
     * matches each pending capture to the user's own comment in that activity which has no
     * capture yet and was created closest to the capture's last activity.
     *
     * @param int|null $userid Limit to one user's captures, or null for all users
     * @param int|null $cmid Limit to one course module, or null for all PDF Annotator activities
     * @param bool $parkunmatched Move captures with no matching comment aside so they are not reused
     * @return array Counts keyed by 'linked' and 'parked'
     * @throws \dml_exception
     */
    public static function relink_pending_pdfannotator_captures(
        ?int $userid = null,
        ?int $cmid = null,
        bool $parkunmatched = false
    ): array {
        global $DB;

        $result = ['linked' => 0, 'parked' => 0];
        if (!$DB->get_manager()->table_exists('pdfannotator_comments')) {
            return $result;
        }

        $sql = "SELECT f.id, f.userid, f.cmid, f.courseid, f.timemodified, f.content, cm.instance
                  FROM {tiny_cursive_files} f
                  JOIN {course_modules} cm ON cm.id = f.cmid
                  JOIN {modules} m ON m.id = cm.module AND m.name = :modname
                 WHERE f.modulename = :modulename AND f.resourceid = 0";
        $params = ['modname' => 'pdfannotator', 'modulename' => 'pdfannotator'];
        if ($userid !== null) {
            $sql .= " AND f.userid = :userid";
            $params['userid'] = $userid;
        }
        if ($cmid !== null) {
            $sql .= " AND f.cmid = :cmid";
            $params['cmid'] = $cmid;
        }

        // Read everything first: the rows are updated below.
        $pending = $DB->get_records_sql($sql . " ORDER BY f.id ASC", $params);
        foreach ($pending as $file) {
            $lastactivity = self::get_capture_last_activity($file);
            $candidates = $DB->get_records_sql(
                "SELECT c.id, c.timecreated
                   FROM {pdfannotator_comments} c
                  WHERE c.userid = :userid AND c.pdfannotatorid = :instance
                        AND c.timecreated >= :earliest AND c.timecreated <= :latest
                        AND NOT EXISTS (
                            SELECT 1
                              FROM {tiny_cursive_files} linked
                             WHERE linked.modulename = :modulename AND linked.cmid = :cmid
                                   AND linked.resourceid = c.id
                        )",
                [
                    'userid' => $file->userid,
                    'instance' => $file->instance,
                    'earliest' => $file->timemodified - constants::PDF_RELINK_BEFORE,
                    'latest' => $lastactivity + constants::PDF_RELINK_AFTER,
                    'modulename' => 'pdfannotator',
                    'cmid' => $file->cmid,
                ],
            );

            $match = null;
            foreach ($candidates as $candidate) {
                $distance = abs($candidate->timecreated - $lastactivity);
                if ($match === null || $distance < $match['distance']) {
                    $match = ['id' => (int) $candidate->id, 'distance' => $distance];
                }
            }

            if ($match === null && !$parkunmatched) {
                continue;
            }

            // A parked capture gets a negative resourceid no comment can have, so the next
            // annotation starts a capture of its own instead of being appended to this one.
            self::update_resource_id([
                'userid' => $file->userid,
                'modulename' => 'pdfannotator',
                'courseid' => $file->courseid,
                'cmid' => $file->cmid,
                'resourceid' => $match === null ? -(int) $file->id : $match['id'],
            ]);
            $result[$match === null ? 'parked' : 'linked']++;
        }

        return $result;
    }

    /**
     * Returns when a capture last received a keystroke, in server time.
     *
     * The row's timemodified is only set when the capture is created, and event timestamps
     * come from the browser clock, so only the span between the first and last event is
     * taken from the events and added to the creation time.
     *
     * @param \stdClass $file A tiny_cursive_files row with timemodified and content
     * @return int Unix timestamp in seconds
     */
    private static function get_capture_last_activity(\stdClass $file): int {
        $created = (int) $file->timemodified;
        $events = json_decode((string) $file->content, true);
        if (!is_array($events) || !$events) {
            return $created;
        }
        $first = reset($events)['unixTimestamp'] ?? 0;
        $last = end($events)['unixTimestamp'] ?? 0;
        if (!is_numeric($first) || !is_numeric($last) || $last <= $first) {
            return $created;
        }

        return $created + (int) floor(($last - $first) / 1000);
    }

    /**
     * Update autosaved content records.
     *
     * @param array $conditions The conditions to find records to update
     * @param string $table The database table name
     * @param int $postid The post ID to update the records with
     * @return void
     * @throws \dml_exception
     */
    public static function update_autosaved_content($conditions, $table, $postid) {
        global $DB;
        $recs = $DB->get_records($table, $conditions);
        if ($recs) {
            self::update_records($recs, $table, $postid);
        }
    }

    /**
     * Updates records in the database with new resource ID and optionally a new filename
     *
     * @param array $recs Array of records to update
     * @param string $table Database table name
     * @param int $id New resource ID to set
     * @param string|null $name Optional new filename to set
     * @return void
     * @throws \dml_exception
     */
    private static function update_records($recs, $table, $id, $name = null) {
        global $DB;

        if (empty($recs)) {
            return;
        }
        [$insql, $inparams] = $DB->get_in_or_equal(array_keys($recs), SQL_PARAMS_NAMED);
        $set = "resourceid = :newresourceid";
        $params = ['newresourceid' => $id] + $inparams;
        if ($name) {
            $set .= ", filename = :newfilename";
            $params['newfilename'] = $name;
        }
        $DB->execute("UPDATE {{$table}} SET {$set} WHERE id {$insql}", $params);
    }

    /**
     * Performs data synchronization to remote platform
     *
     * @param array|object $data The data to be sent
     * @return void
     * @throws moodle_exception When remote platform rejects the data or other sync errors occur
     */
    public static function perform_data_sent($data) {
        if (empty($data)) {
            mtrace('Invalid form data — nothing to send.');
            return;
        }

        [$curl, $url, $options] = self::get_curl(constants::base_url() . constants::API_END);
        $json = json_encode($data);

        if ($json === false) {
            mtrace('tiny_cursive: failed to JSON-encode payload: ' . json_last_error_msg());
            return;
        }

        try {
            $response = $curl->post($url, $json, $options);
            $decoded = self::check_request_response($curl, $response);

            if (empty($decoded['message'])) {
                mtrace('tiny_cursive: remote platform returned no message. Response: '
                    . substr((string) json_encode($decoded), 0, 500));
                return;
            }

            mtrace('tiny_cursive: remote response — ' . $decoded['message']);
        } catch (moodle_exception $e) {
            // Re-throw so the ad-hoc task is marked failed and cron retries it.
            throw $e;
        }
    }

    /**
     * Checks the response from a curl request and handles errors
     *
     * @param curl $curl The curl instance used for the request
     * @param string $response The response received from the request
     * @return array|null The decoded JSON response or null if there were errors
     */
    private static function check_request_response($curl, $response) {
        // Curl-level error (network / DNS / TLS failure).
        if ($curl->get_errno()) {
            $errmsg = 'tiny_cursive: curl error (' . $curl->get_errno() . '): ' . $curl->error;
            mtrace($errmsg);
            throw new moodle_exception('curlerror', 'tiny_cursive', '', $errmsg);
        }

        // HTTP status validation.
        $info = $curl->get_info();
        $httpcode = $info['http_code'] ?? 0;

        if ($httpcode < 200 || $httpcode >= 300) {
            $errmsg = 'tiny_cursive: HTTP request failed. Code: ' . $httpcode
                . ' Response: ' . substr((string) $response, 0, 500);
            mtrace($errmsg);
            throw new moodle_exception('httperror', 'tiny_cursive', '', $errmsg);
        }

        // Decode JSON safely.
        $decoded = json_decode($response, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            $errmsg = 'tiny_cursive: invalid JSON response: ' . json_last_error_msg()
                . ' — Response: ' . substr((string) $response, 0, 500);
            mtrace($errmsg);
            throw new moodle_exception('invalidjson', 'tiny_cursive', '', $errmsg);
        }

        return $decoded;
    }

    /**
     * Creates and configures a curl instance for API requests
     *
     * @param string $apiend The API endpoint path to append to the platform URL
     * @return array | bool Returns configured curl instance, remote URL, and options or false if platform URL not set
     */
    public static function get_curl($apiend) {
        global $CFG;
        require_once($CFG->dirroot . '/lib/filelib.php');
        $secret = get_config('tiny_cursive', 'secret');

        if (empty($apiend)) {
            mtrace('tiny_cursive: endpoint URL is not configured — skipping remote call.');
            return false;
        }

        $curl = new curl();

        // Set headers properly.
        $curl->setHeader([
            'X-Moodle-Secret: ' . $secret,
            'Content-Type: application/json',
            'Accept: application/json',
        ]);

        // Set curl options.
        $options = [
            'CURLOPT_RETURNTRANSFER' => true,
            'CURLOPT_TIMEOUT' => 10,
            'CURLOPT_CONNECTTIMEOUT' => 5,
        ];

        return [$curl, $apiend, $options];
    }
}
