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

        foreach ($recs as $rec) {
            $rec->resourceid = $id;
            if ($name) {
                $rec->filename = $name;
            }
            $DB->update_record($table, $rec, true);
        }
    }

    /**
     * Performs data synchronization to remote platform
     *
     * @param array | object $data The data to be sent (must contain 'id' field for course/category)
     * @return void
     * @throws moodle_exception When remote platform rejects the data or other sync errors occur
     */
    public static function perform_data_sent($data) {
        global $DB;

        if (empty($data)) {
            mtrace("\nInvalid form data", DEBUG_DEVELOPER);
            return;
        }

        [$curl, $url, $options] = self::get_curl(constants::BASE_URL . constants::API_END);
        $json = json_encode($data);

        if ($json === false) {
            mtrace(
                "\nFailed to encode data: " . json_last_error_msg(),
                DEBUG_DEVELOPER
            );
            return;
        }

        try {
            $response = $curl->post($url, $json, $options);
            $decoded = self::check_request_response($curl, $response);

            if (empty($decoded['message'])) {
                mtrace(
                    "\nRemote platform rejected data: " . json_encode($decoded),
                    DEBUG_DEVELOPER
                );
            }

            mtrace("Response from remote: " . json_encode($decoded['message'] . "\n"), DEBUG_DEVELOPER);
        } catch (moodle_exception $e) {
            mtrace(
                'Error sending data: ' . $e->getMessage(),
                DEBUG_DEVELOPER
            );
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
        // Curl-level error.
        if ($curl->get_errno()) {
            mtrace(
                'Curl error: ' . $curl->error,
                DEBUG_DEVELOPER
            );
        }

        // HTTP status validation.
        $info = $curl->get_info();
        $httpcode = $info['http_code'] ?? 0;

        if ($httpcode < 200 || $httpcode >= 300) {
            mtrace(
                "\nHTTP request failed. Code: " . $httpcode,
                ' Response: ' . $response,
                DEBUG_DEVELOPER
            );
        }

        // Decode JSON safely.
        $decoded = json_decode($response, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            mtrace(
                "\nInvalid JSON response: " . json_last_error_msg() . " \nResponse: " . $response,
                DEBUG_DEVELOPER
            );
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
            mtrace(
                "\nEndpoint URL is not configured.",
                DEBUG_DEVELOPER
            );
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
