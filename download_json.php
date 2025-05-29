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
 * Tiny cursive download json functionality.
 *
 * @package tiny_cursive
 * @copyright  CTI <info@cursivetechnology.com>
 * @author Brain Station 23 <elearning@brainstation-23.com>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require(__DIR__ . '/../../../../../config.php');
require_once(__DIR__ . '/locallib.php');
global $DB;
require_login();

$resourceid = optional_param('resourceid', 0, PARAM_INT);
$userid     = optional_param('user_id', 0, PARAM_INT);
$cmid       = optional_param('cmid', 0, PARAM_INT);
$fname      = clean_param(optional_param('fname', '', PARAM_FILE), PARAM_FILE);

if ($cmid <= 0 || $userid <= 0) {
    throw new moodle_exception('invalidparameters', 'tiny_cursive');
}

$context    = context_module::instance($cmid);
require_capability('tiny/cursive:writingreport', $context);

$filerow    = $DB->get_record('tiny_cursive_files', ['filename' => $fname]);
if (!$fname || !$filerow || !$filerow->content) {
    redirect(get_local_referer(false), get_string('filenotfound', 'tiny_cursive'));
}

// Convert JSON to CSV.
$jsondata   = json_decode($filerow->content, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    redirect(get_local_referer(false), get_string('filenotfound', 'tiny_cursive'));
}

$csvfilename = $filerow->modulename." ".get_string('student_writing_statics', 'tiny_cursive')."_".rand(0, 9).".csv";

// Set headers for CSV download.
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header("Content-Description: File Transfer");
header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $csvfilename . '"');
header('Content-Security-Policy: default-src \'none\';');
header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
header('Pragma: no-cache');
header('Expires: 0');

// Create output stream.
$output     = fopen('php://output', 'w');

// If data is array of arrays.
if (is_array($jsondata) && is_array(reset($jsondata))) {
    // Write headers.
    fputcsv($output, array_keys(reset($jsondata)));
    // Write data rows.
    foreach ($jsondata as $row) {
        fputcsv($output, $row);
    }
} else {
    // Single row - write headers and single row.
    fputcsv($output, array_keys($jsondata));
    fputcsv($output, array_values($jsondata));
}

fclose($output);
die();
