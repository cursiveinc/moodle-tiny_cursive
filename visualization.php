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
 * TODO describe file visualization
 *
 * @package    tiny_cursive
 * @copyright  2025 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require('../../../../../config.php');

require_login();
$courseid = required_param('course', PARAM_INT);

$url = new moodle_url('/lib/editor/tiny/plugins/cursive/visualization.php', []);

$title = get_string('data_visualization', 'tiny_cursive');
$course  = get_course($courseid);

$PAGE->navbar->add($course->shortname, new moodle_url('/course/view.php', ['id' => $courseid]));
$PAGE->navbar->add($title, $url);
$PAGE->set_url($url);
$PAGE->requires->js_call_amd('tiny_cursive/scatter_chart', 'init');
echo $OUTPUT->header();

$sales = new \core\chart_series('Sales', [1000, 1170, 660, 1030]);
$expenses = new \core\chart_series('Expenses', [400, 460, 1120, 540]);
$labels = ['2004', '2005', '2006', '2007'];

echo $OUTPUT->render_from_template('tiny_cursive/visualisation',[]);
echo $OUTPUT->footer();
