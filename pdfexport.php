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
 * File for handling PDF export functionality in the Authory.tech plugin
 *
 * @package    tiny_authory_tech
 * @copyright  2025 Authory Technology S.L. <info@authory.tech>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require('../../../../../config.php');

require_login();
require_sesskey();

$id     = required_param('id', PARAM_INT);
$file   = required_param('file', PARAM_INT);
$cmid   = required_param('cmid', PARAM_INT);
$course = required_param('course', PARAM_INT);
$qid    = optional_param('qid', 0, PARAM_INT);
$page   = new \tiny_authory_tech\local\page\pdfexport($course, $cmid, $id, $qid, $file);
$page->download();
