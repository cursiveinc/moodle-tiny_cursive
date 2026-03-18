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
 * Plugin functions for the tiny_authory_tech plugin.
 *
 * @package   tiny_authory_tech
 * @copyright 2024, CTI <info@cursivetechnology.com>
 * @copyright  2026 Authory Technology S.L. <info@authory.tech>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
use tiny_authory_tech\constants;
/**
 * Given an array with a file path, it returns the itemid and the filepath for the defined filearea.
 *
 * @param array $args The path (the part after the filearea and before the filename).
 * @return array The itemid and the filepath inside the $args path, for the defined filearea.
 */
function tiny_authory_tech_get_path_from_pluginfile(array $args): array {
    // Authory.tech never has an itemid (the number represents the revision but it's not stored in database).
    array_shift($args);

    // Get the filepath.
    if (empty($args)) {
        $filepath = '/';
    } else {
        $filepath = '/' . implode('/', $args) . '/';
    }

    return [
        'itemid'   => 0,
        'filepath' => $filepath,
    ];
}

/**
 * Serves files from the tiny_authory_tech plugin's file storage area.
 *
 * This function handles file serving requests for files stored in the tiny_authory_tech
 * plugin's file area. It retrieves and sends the requested file to the user.
 *
 * @param stdClass $context The context object for file access permissions
 * @param string $filearea The file area identifier within tiny_authory_tech
 * @param array $args Array of path segments identifying the file
 * @param bool $forcedownload If true, forces file download rather than display
 * @param array $options Additional options for file serving (e.g. caching, filters)
 * @return void|bool Returns false if file not found, void otherwise
 */
function tiny_authory_tech_pluginfile($context, $filearea, $args, $forcedownload, array $options = []) {
    $itemid = array_shift($args);
    $filename = array_pop($args);

    if (!$args) {
        $filepath = '/';
    } else {
        $filepath = '/' . implode('/', $args) . '/';
    }

    $fs   = get_file_storage();

    $file = $fs->get_file($context->id, 'tiny_authory_tech', $filearea, $itemid, $filepath, $filename);
    if (!$file) {
        return false;
    }
    send_stored_file($file, 0, 0, $forcedownload, $options);
}

/**
 * Extends the course navigation with a link to the Authory.tech writing report.
 * This function adds a navigation node to access writing reports if the user has appropriate permissions
 * and Authory.tech is enabled for the course.
 *
 * @param navigation_node $navigation The navigation node to extend
 * @param stdClass $course The course object containing the course details
 * @return void
 * @throws moodle_exception If there is an error creating the navigation node
 */
function tiny_authory_tech_extend_navigation_course(\navigation_node $navigation, \stdClass $course) {
    global $CFG;
    require_once(__DIR__ . "/locallib.php");

    $cmid    = tiny_authory_tech_get_cmid($course->id);
    $module  = get_coursemodule_from_id(false, $cmid, $course->id);
    $authory_tech_status = tiny_authory_tech_status($course->id);

    $url     = new moodle_url(
        $CFG->wwwroot . '/lib/editor/tiny/plugins/authory_tech/tiny_authory_tech_report.php',
        ['courseid' => $course->id]
    );

    if ($cmid && $authory_tech_status) {
        $context = context_module::instance($cmid);
        $hascap  = has_capability("tiny/authory_tech:editsettings", $context);
        if ($hascap) {
            $navigation->add(
                get_string('wractivityreport', 'tiny_authory_tech'),
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
 * Modifies the global navigation by removing the home node.
 * This function is called when building the global navigation menu and ensures
 * the home node is not displayed.
 *
 * @param global_navigation $navigation The global navigation instance to modify
 * @return void
 */
function tiny_authory_tech_extend_navigation(global_navigation $navigation) {
    if ($home = $navigation->find('home', global_navigation::TYPE_SETTING)) {
        $home->remove();
    }
}

/**
 * Callback to add Authory.tech settings to a course module form.
 *
 * This function adds a Authory.tech configuration section to supported module forms,
 * allowing users to enable/disable Authory.tech functionality for that specific module instance.
 *
 * @param moodleform $formwrapper The form wrapper containing the module form
 * @param MoodleQuickForm $mform The actual form object to add elements to
 * @return void
 */
function tiny_authory_tech_coursemodule_standard_elements($formwrapper, $mform) {
    global $PAGE;

    $authory_tech_status   = tiny_authory_tech_status($formwrapper->get_current()->course);
    $plugins   = core_component::get_plugin_list('local');

    if (!$authory_tech_status) {
        return;
    }
    if (!isset($plugins['cursive_oublog']) && $PAGE->bodyid === "page-mod-oublog-mod") {
        return;
    }

    $module    = $formwrapper->get_current()->modulename;
    $courseid  = $formwrapper->get_current()->course;
    $instance  = $formwrapper->get_current()->coursemodule;
    $key       = "CUR$courseid$instance";
    $state     = get_config('tiny_authory_tech', $key);

    if ($state === "1" || $state === false) {
        $state = true;
    }
    // Constants::NAMES is authory_tech supported plugin list defined in tiny_authory_tech\constant class.
    if (in_array($module, constants::NAMES)) {
        $mform->addElement('header', 'authory_tech_header', 'Authory.tech', 'local_callbacks');
        $options = [
            0 => get_string('disabled', 'tiny_authory_tech'),
            1 => get_string('enabled', 'tiny_authory_tech'),
        ];
        $mform->addElement('select', 'authory_tech_status', get_string('authory_tech_status', 'tiny_authory_tech'), $options);
        $mform->setType('authory_tech_status', PARAM_INT);

        $mform->setdefault('authory_tech_status', );
    }

    if ($state) {
        $pasteoptions = [
            'allow'       => get_string('paste_allow', 'tiny_authory_tech'),
            'block'       => get_string('paste_block', 'tiny_authory_tech'),
            'cite_source' => get_string('paste_cite_source', 'tiny_authory_tech'),
        ];

        $pastekey     = "PASTE{$courseid}_{$instance}";
        $pastesetting = get_config('tiny_authory_tech', $pastekey);

        if (!$pastesetting) {
            $pastesetting = 'allow';
        }

        $mform->addElement(
            'select',
            'paste_setting',
            get_string('paste_setting', 'tiny_authory_tech'),
            $pasteoptions
        );

        $mform->setType('paste_setting', PARAM_TEXT);
        $mform->setDefault('paste_setting', $pastesetting);
        $mform->addHelpButton('paste_setting', 'paste_setting', 'tiny_authory_tech');
    }
}

/**
 * Handles post-actions for course module editing, specifically for Authory.tech settings.
 *
 * This function is called after a course module form is submitted. It saves the Authory.tech
 * state configuration for supported modules.
 *
 * @param stdClass $formdata The form data containing module settings
 * @param stdClass $course The course object
 * @return stdClass The modified form data
 */
function tiny_authory_tech_coursemodule_edit_post_actions($formdata, $course) {
    global $PAGE;

    $authory_tech_status = tiny_authory_tech_status($course->id);
    if (!$authory_tech_status) {
        return $formdata;
    }
    if (!isset($plugins['cursive_oublog']) && $PAGE->bodyid === "page-mod-oublog-mod") {
        return $formdata;
    }

    // Constants::NAMES is authory_tech supported plugin list defined in tiny_authory_tech\constant class.
    if (in_array($formdata->modulename, constants::NAMES)) {
        $state    = $formdata->authory_tech_status;
        $courseid = $course->id;
        $instance = $formdata->coursemodule;
        $key      = "CUR$courseid$instance";
        set_config($key, $state, 'tiny_authory_tech');
    }
    if (!empty($formdata->paste_setting) && $state == 1) {
        $pastekey = "PASTE{$courseid}_{$instance}";
        set_config($pastekey, $formdata->paste_setting, 'tiny_authory_tech');
    }
    return $formdata;
}

/**
 * Add a node to the myprofile navigation tree for writing reports.
 *
 * @param \core_user\output\myprofile\tree $tree Navigation tree to add node to
 * @param stdClass $user The user object
 * @param stdClass $course The course object
 * @return void
 * @throws coding_exception
 * @throws moodle_exception
 */
function tiny_authory_tech_myprofile_navigation(core_user\output\myprofile\tree $tree, $user, $course) {
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

    if (get_config('tiny_authory_tech', 'disabled')) {
        return;
    }

    $url  = new moodle_url(
        '/lib/editor/tiny/plugins/authory_tech/my_writing_report.php',
        ['id' => $user->id, 'course' => isset($course->id) ? $course->id : "", 'mode' => 'authory_tech']
    );
    $node = new core_user\output\myprofile\node(
        'reports',
        'authory_tech',
        get_string('student_writing_statics', 'tiny_authory_tech'),
        null,
        $url
    );
    $tree->add_node($node);
}

/**
 * Uploads a file record using multipart form data
 *
 * @param stdClass $filerecord The file record object containing metadata
 * @param string $filenamewithfullpath Full path to the file to upload
 * @param string $wstoken Web service token for authentication
 * @param string $answertext Original submission text
 * @return bool|string Returns response from server or false on failure
 * @throws dml_exception
 */
function tiny_authory_tech_upload_multipart_record($filerecord, $filenamewithfullpath, $wstoken, $answertext) {
    global $CFG;
    require_once($CFG->dirroot . '/lib/filelib.php');

    $moodleurl = get_config('tiny_authory_tech', 'host_url');
    $result    = '';

    try {
        $token      = get_config('tiny_authory_tech', 'secretkey');
        $remoteurl  = get_config('tiny_authory_tech', 'python_server') . "/upload_file";
        $filetosend = '';

        $tempfilepath = make_temp_directory('tiny_authory_tech') . '/' . uniqid('upload_', true);

        $jsoncontent  = json_decode($filerecord->content, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new moodle_exception('invalidjson', 'tiny_authory_tech');
        }
            file_put_contents($tempfilepath, json_encode($jsoncontent));
            $filetosend = new CURLFILE($tempfilepath, 'application/json', 'uploaded.json');

            // Ensure the temporary file does not exceed the size limit.
        if (filesize($tempfilepath) > 16 * 1024 * 1024) {
            unlink($tempfilepath);
            throw new moodle_exception('filesizelimit', 'tiny_authory_tech');
        }

        echo $remoteurl;

        $curl     = new curl();
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
    } catch (moodle_exception $e) {
        echo $e->getMessage();
    }

    return $result;
}

/**
 * Creates a URL for a file in the tiny_authory_tech file area
 *
 * @param \context $context The context object
 * @param stdClass $user The user object containing fileid
 * @return string|false Returns the download URL for the file, or false if no file found
 * @throws coding_exception
 */
function tiny_authory_tech_file_urlcreate($context, $user) {
    $fs    = get_file_storage();
    $files = $fs->get_area_files($context->id, 'tiny_authory_tech', 'attachment', $user->fileid, 'sortorder', false);

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

/**
 * Get the status of tiny_authory_tech for a specific course
 *
 * @param int $courseid The ID of the course to check
 * @return bool Returns true if tiny_authory_tech is enabled for the course, false otherwise
 * @throws dml_exception
 */
function tiny_authory_tech_status($courseid = 0) {
    if (get_config('tiny_authory_tech', 'disabled')) {
        return false;
    }
    return get_config('tiny_authory_tech', "authory_tech-$courseid");
}

/**
 * Verifies a token by sending it to a remote server for approval.
 * This function retrieves the secret key and Moodle URL, then sends them to the remote
 * verification server for authentication. It uses Moodle's curl library to make the request.
 *
 * @return string The response from the remote verification server, empty string if no token configured
 * @throws moodle_exception If token verification fails or there is a curl error
 */
function authory_tech_approve_token() {
    global $CFG;
    require_once("$CFG->libdir/filelib.php");

    try {
        // Use Moodle's cURL library.
        $token     = get_config('tiny_authory_tech', 'secretkey');
        $remoteurl = get_config('tiny_authory_tech', 'python_server') . '/verify-token';
        $moodleurl = $CFG->wwwroot;

        if (empty($token)) {
            return "";
        }

        $curl    = new curl();
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

        $result = $curl->post($remoteurl, $postfields, $options);

        if ($result === false) {
            throw new moodle_exception('curlerror', 'tiny_authory_tech', '', null, $curl->error);
        }
    } catch (moodle_exception $e) {
        // Log the exception.
        debugging("Error in authory_tech_approve_token_func: " . $e->getMessage());

        // Return a Moodle exception.
        throw new moodle_exception('errorverifyingtoken', 'tiny_authory_tech', '', null, $e->getMessage());
    }

    return $result;
}
