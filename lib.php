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

use editor_tiny\cursive\forms\fileupload;

/**
 * Given an array with a file path, it returns the itemid and the filepath for the defined filearea.
 *
 * @param array $args The path (the part after the filearea and before the filename).
 * @return array The itemid and the filepath inside the $args path, for the defined filearea.
 */
function tiny_cursive_get_path_from_pluginfile(array $args): array {
    // Cursive never has an itemid (the number represents the revision but it's not stored in database).
    array_shift($args);

    // Get the filepath.
    if (empty($args)) {
        $filepath = '/';
    } else {
        $filepath = '/' . implode('/', $args) . '/';
    }

    return [
        'itemid' => 0,
        'filepath' => $filepath,
    ];
}

/**
 * Serves the tiny_cursive files.
 *
 * @param stdClass $context context object
 * @param string $filearea file area
 * @param array $args extra arguments
 * @param bool $forcedownload whether or not force download
 * @param array $options additional options affecting the file serving
 * @package  mod_tiny_cursive
 */
function tiny_cursive_pluginfile($context, $filearea, $args, $forcedownload, array $options = []) {
    $itemid = array_shift($args);
    $filename = array_pop($args);

    if (!$args) {
        $filepath = '/';
    } else {
        $filepath = '/' . implode('/', $args) . '/';
    }

    $fs = get_file_storage();

    $file = $fs->get_file($context->id, 'tiny_cursive', $filearea, $itemid, $filepath, $filename);
    if (!$file) {
        return false;
    }
    send_stored_file($file, 0, 0, $forcedownload, $options);
}

/**
 * tiny_cursive_extend_navigation_course
 *
 * @param navigation_node $navigation
 * @param stdClass $course
 * @return void
 * @throws moodle_exception
 */
function tiny_cursive_extend_navigation_course(\navigation_node $navigation, \stdClass $course) {
    global $CFG, $USER, $DB;
    require_once(__DIR__ . "/locallib.php");

    $url = new moodle_url($CFG->wwwroot . '/lib/editor/tiny/plugins/cursive/tiny_cursive_report.php', ['courseid' => $course->id]);
    $cmid = tiny_cursive_get_cmid($course->id);
    if ($cmid && get_config('tiny_cursive', "cursive-$course->id")) {
        $context = context_module::instance($cmid);
        $hascap = has_capability("tiny/cursive:editsettings", $context);
        if ($hascap) {
            $navigation->add(
                get_string('wractivityreport', 'tiny_cursive'),
                $url,
                navigation_node::TYPE_SETTING,
                null,
                null,
                new pix_icon('i/report', '')
            );
        }
    }
}

/**
 * tiny_cursive_extend_navigation
 *
 * @param global_navigation $navigation
 * @return void
 */
function tiny_cursive_extend_navigation(global_navigation $navigation) {
    if ($home = $navigation->find('home', global_navigation::TYPE_SETTING)) {
        $home->remove();
    }
}

/**
 * tiny_cursive_myprofile_navigation
 *
 * @param \core_user\output\myprofile\tree $tree
 * @param $user
 * @param $course
 * @return void
 * @throws coding_exception
 * @throws moodle_exception
 */
function tiny_cursive_myprofile_navigation(core_user\output\myprofile\tree $tree, $user, $course) {
    global $USER;
    if (empty($course)) {
        $course = get_fast_modinfo(SITEID)->get_course();
    }

    if (isguestuser() || !isloggedin()) {
        return;
    }

    if (\core\session\manager::is_loggedinas() || $USER->id != $user->id) {
        return;
    }

    $url = new moodle_url(
        '/lib/editor/tiny/plugins/cursive/my_writing_report.php',
        ['id' => $user->id, 'course' => isset($course->id) ? $course->id : "", 'mode' => 'cursive']
    );
    $node = new core_user\output\myprofile\node('reports', 'cursive', get_string('writing', 'tiny_cursive'), null, $url);
    $tree->add_node($node);
}

/**
 * upload_multipart_record
 *
 * @param $filerecord
 * @param $filenamewithfullpath
 * @return bool|string
 * @throws dml_exception
 */
function tiny_cursive_upload_multipart_record($filerecord, $filenamewithfullpath, $wstoken, $answertext) {
    global $CFG;
    require_once($CFG->dirroot . '/lib/filelib.php');
    $moodleurl = get_config('tiny_cursive', 'host_url');
    $result = '';
    try {
        $token = get_config('tiny_cursive', 'secretkey');
        $remoteurl = get_config('tiny_cursive', 'python_server') . "/upload_file";
        $filetosend = '';

        $tempfilepath = tempnam(sys_get_temp_dir(), 'upload');

        $jsoncontent = json_decode(base64_decode($filerecord->content), true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("Invalid JSON content in file.");
        }
            file_put_contents($tempfilepath, json_encode($jsoncontent));
            $filetosend = new CURLFILE($tempfilepath, 'application/json', 'uploaded.json');

                // Ensure the temporary file does not exceed the size limit.
        if (filesize($tempfilepath) > 16 * 1024 * 1024) {
            unlink($tempfilepath);
            throw new Exception("File exceeds the 16MB size limit.");
        }

        echo $remoteurl;

        $curl = new curl();
        $postdata = [
            'file' => $filetosend,
            'resource_id' => $filerecord->id,
            'person_id' => $filerecord->userid,
            'ws_token' => $wstoken,
            'originalsubmission' => $answertext,
        ];

        $headers = [
            'Authorization: Bearer ' . $token,
            'X-Moodle-Url: ' . $moodleurl,
            'Content-Type: multipart/form-data',
        ];

        $result = $curl->post($remoteurl, $postdata, [
            'CURLOPT_HTTPHEADER' => $headers,
            'CURLOPT_RETURNTRANSFER' => true,
        ]);

        $httpcode = $curl->get_info()['http_code'];

        if ($result === false) {
            echo "File not found: " . $filenamewithfullpath . "\n";
            echo "cURL Error: " . $curl->error . "\n";
        } else {
            echo "\nHTTP Status Code: " . $httpcode . "\n";
            echo "File Id: " . $filerecord->id . "\n";
            echo "response: " . $result . "\n";
        }

        // Remove the temporary file if it was created.
        if (isset($tempfilepath) && file_exists($tempfilepath)) {
            unlink($tempfilepath);
        }
    } catch (Exception $e) {
        echo $e->getMessage();
    }

    return $result;
}

/**
 * file_urlcreate
 *
 * @param $context
 * @param $user
 * @return false|string
 * @throws coding_exception
 */
function tiny_cursive_file_urlcreate($context, $user) {
    $fs = get_file_storage();
    $files = $fs->get_area_files($context->id, 'tiny_cursive', 'attachment', $user->fileid, 'sortorder', false);

    foreach ($files as $file) {
        if ($file->get_filename() != '.') {
            $fileurl = moodle_url::make_pluginfile_url(
                $file->get_contextid(),
                $file->get_component(),
                $file->get_filearea(),
                $file->get_itemid(),
                $file->get_filepath(),
                $file->get_filename(),
                true
            );
            // Display the image.
            $downloadurl = $fileurl->get_port() ?
                $fileurl->get_scheme() . '://' . $fileurl->get_host() . ':' . $fileurl->get_port() . $fileurl->get_path() :
                $fileurl->get_scheme() . '://' . $fileurl->get_host() . $fileurl->get_path();
            return $downloadurl;
        }
    }
    return false;
}
