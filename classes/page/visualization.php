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
 * Class visualization
 *
 * @package    tiny_cursive
 * @copyright  2025 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
namespace tiny_cursive\page;

use html_writer;
use moodle_url;
use context_system;
use stdClass;
use tiny_cursive\constants;

/**
 * Visualization class for handling course analytics and data visualization
 *
 * This class manages the visualization of writing analytics data for courses and course modules.
 * It handles:
 * - Setting up and rendering visualization pages
 * - Retrieving and processing course analytics data
 * - Managing module filters and navigation
 * - Categorizing writing efforts into different levels
 * - Generating visualization data for scatter charts
 */
class visualization {
    /**
     * The ID of the course being visualized
     * @var int
     */
    protected $courseid;

    /**
     * Course module information
     * @var \course_modinfo
     */
    protected $modinfo;

    /**
     * The course object
     * @var stdClass
     */
    protected $course;

    /**
     * The course module ID
     * @var int
     */
    protected $cmid;

    /**
     * The type of module being visualized
     * @var string
     */
    protected $type;

    /**
     * The URL for the visualization page
     * @var moodle_url
     */
    protected $url;

    /**
     * The user ID being visualized
     * @var int
     */
    protected $userid;

    /**
     * The caption for the visualization
     * @var string
     */
    protected $caption;
    /**
     * Template name for rendering
     */
    public const TEMPLATE = "visualisation";

    /**
     * Constructor for the visualization class
     *
     * @param int $courseid The ID of the course to visualize
     * @param string $type The type of module being visualized
     * @param int $cmid The course module ID
     * @param int $userid The user id
     */
    public function __construct(int $courseid, string $type,  $cmid, $userid) {
        $this->type     = $type;
        $this->courseid = $courseid;
        $this->course   = get_course($courseid);
        $this->cmid     = $cmid;
        $this->userid   = $userid;
        $this->modinfo  = get_fast_modinfo($courseid);
        $this->url      = new moodle_url('/lib/editor/tiny/plugins/cursive/visualization.php', ['course' => $courseid]);
    }

    /**
     * Renders the visualization page by setting up the page configuration with course analytics data
     *
     * Calls page_setup() with:
     * - Course analytics data from get_course_analytics()
     * - API key status from constants::has_api_key()
     * - onlychart parameter set to true to show just the chart
     */
    public function render() {

        $this->page_setup($this->get_course_analytics($this->courseid, $this->cmid), constants::has_api_key(), true);

    }

    /**
     * Sets up the page configuration for visualization
     *
     * @param array $data The visualization data to be displayed
     * @param bool $status The API key status
     * @param bool $onlychart Whether to only show the chart without page chrome
     */
    private function page_setup($data, $status, $onlychart) {
        global $PAGE;
        if (!$onlychart) {
            $PAGE->set_url($this->url);
            $PAGE->set_context(context_system::instance());
            $PAGE->set_title(get_string('data_visualization', 'tiny_cursive'));
            $PAGE->navbar->add($this->course->shortname, new moodle_url('/course/view.php', ['id' => $this->courseid]));
            $PAGE->navbar->add(get_string('data_visualization', 'tiny_cursive'), $this->url);
        }
        echo html_writer::div('', 'hidden', ['id' => 'scatter-chart-data', 'data-data' => json_encode($data)]);
        $PAGE->requires->js_call_amd('tiny_cursive/scatter_chart', 'init', [$data ? true : false, $status, $this->caption]);
    }

    /**
     * Gets analytics data for a specific course and course module
     *
     * @param int $course The course ID to get analytics for
     * @param int $cmid The course module ID to get analytics for
     * @return array | void Returns either:
     *               - Array of writing data grouped by effort level for visualization
     *               - Array with 'state' => 'apply_filter' if no analytics and no cmid
     *               - Array with 'state' => 'no_submission' if no analytics but has cmid
     */
    private function get_course_analytics($course, $cmid) {
        global $DB;

        $sql = "SELECT f.id as fileid, CONCAT(u.firstname,' ',u.lastname) AS username,
                       f.userid, w.*, d.meta as effort
                  FROM {tiny_cursive_files} f
             LEFT JOIN {tiny_cursive_user_writing} w ON f.id = w.file_id
             LEFT JOIN {tiny_cursive_writing_diff} d ON f.id = d.file_id
             LEFT JOIN {user} u ON f.userid = u.id
                 WHERE f.courseid = :courseid AND f.cmid = :cmid";

        $params    = ['courseid' => $course, 'cmid' => $cmid, 'userid' => $this->userid];
        $this->caption = get_string('chart_result', 'tiny_cursive');

        if ($this->userid) {
            $sql .= " AND f.userid = :userid";
            $params['userid'] = $this->userid;
            $this->caption = get_string('chart_result_user', 'tiny_cursive');
        }

        $analytics = $DB->get_records_sql($sql, $params);
        $writing   = [];

        foreach ($analytics as $analytic) {

            $effortlabel = $this->get_effort_level($analytic->effort);
            $key = $effortlabel['label']; // Group by this.

            if (!isset($writing[$key])) {
                $writing[$key]        = new stdClass;
                $writing[$key]->label = $effortlabel['label'];
                $writing[$key]->backgroundColor = $effortlabel['color'];
                $writing[$key]->pointRadius = 8;
                $writing[$key]->pointStyle  = 'circle';
                $writing[$key]->data   = [];
            }

            $point         = new stdClass;
            if (isset($analytic->total_time_seconds) && isset($analytic->effort) &&
                isset($analytic->word_count) && isset($analytic->words_per_minute)) {
                $point->x      = $analytic->total_time_seconds;
                $point->y      = $analytic->effort;
                $point->label  = $analytic->username;
                $point->effort = $analytic->effort;
                $point->time   = $analytic->total_time_seconds;
                $point->words  = $analytic->word_count;
                $point->wpm    = $analytic->words_per_minute;

            }
            $writing[$key]->data[] = $point;
        }

        // Re-index to get plain array (Chart.js needs numerically indexed array).
        $writing = array_values($writing);

        if (count($analytics) > 0 && $cmid ) {
            return $writing;
        } else if (count($analytics) == 0 && $cmid == 0) {
            return ['state' => 'apply_filter'];
        } else if (count($analytics) == 0 && $cmid) {
            return ["state" => "no_submission"];
        }

    }

    /**
     * Gets the active analytics type and generates filter data for each module
     *
     * @param string $type The module type to check against
     * @return array Array of module filter data containing:
     *               - link: URL for the module
     *               - state: Active state CSS class
     *               - name: Capitalized module name
     */
    private function get_active_analytics_type($type) {

        $modules = array_values(array_unique(array_map(
            function($cm) use ($type) {
                if (!in_array($cm->modname, constants::NAMES)) {
                    return;
                }
                $id      = array_values($this->get_multiple_mod($cm->modname))[0]['id']; // Cmid.
                $filters = ["link" => $this->generate_link(['name' => $cm->name, "type" => $cm->modname, "id" => $id]),
                           "state" => "", "name" => ucfirst($cm->modname)];
                if ($cm->modname === $type) {
                    $filters['state'] = "btn-outline-primary";
                }
                return $filters;
            },
            array_filter($this->modinfo->get_cms(), function($cm) {
                return $cm->uservisible;
            })
        ), SORT_REGULAR));

        return $modules;
    }


    /**
     * Generates a URL link for a module by combining current page URL with module parameters
     *
     * @param array $mod Module data containing parameters for the URL
     * @return string The generated URL string
     */
    private function generate_link($mod) {
        global $PAGE;

        $current = $PAGE->url->out(false);
        unset($mod['name']);
        $url = new moodle_url($current, $mod);
        return $url->out(false);
    }

    /**
     * Gets the full name of a module based on its ID
     *
     * @param array $mods Array of module data containing id and name
     * @param int|null $id ID of the module to find, or null to get first module name
     * @return string The name of the matched module, or empty string if not found
     */
    private function get_mod_fullname($mods, $id) {
        if ($id) {
            $matched = array_filter($mods, fn($m) => $m['id'] == $id);
            if (!empty($matched)) {
                return array_values($matched)[0]['name'];
            }
        } else {
            return array_values($mods)[0]['name'];
        }

        return "";
    }

    /**
     * Gets all instances of a specific module type that are visible to the user
     *
     * @param string $type The module type to get instances of
     * @return array Array of module instances with id, name and type
     */
    private function get_multiple_mod($type) {
        $modules = array_map(
            fn($cm) => ['id' => $cm->id, 'name' => $cm->name, "type" => $type],
            array_filter(
                $this->modinfo->get_instances_of($type),
                fn($cm) => $cm->uservisible
            )
        );

        return $modules;
    }

    /**
     * Prepares module data by adding link and state information
     *
     * @param array $mods Array of module data to prepare
     * @param int $id ID of the current module
     * @return array Modified array of module data with added link and state
     */
    private function prepare_mods($mods, $id) {
        foreach ($mods as &$mod) {
            $mod['link'] = $this->generate_link($mod);
            $mod["state"] = $mod["id"] == $id ? "btn-outline-primary" : "";
        }

        return $mods;
    }

    /**
     * Prepares data for visualization by gathering module information
     *
     * @return array Data array containing:
     *               - filter: Array of active analytics types
     *               - multiple: Array of module data if multiple modules exist
     *               - fullname: Full name of the selected module
     */
    private function prepare_data() {

        $mods = $this->get_multiple_mod($this->type);
        $data = ["filter"   => $this->get_active_analytics_type($this->type)];

        if (count($mods) > 1) {
            $multiple         = $this->prepare_mods($mods, $this->cmid);
            $data["multiple"] = array_values($multiple);
            $data['fullname'] = $this->get_mod_fullname($mods, $this->cmid);
        } else {
            $data['fullname'] = $this->get_mod_fullname($mods, $this->cmid);
        }

        return $data;
    }

    /**
     * Get the effort level label and color based on the effort value
     *
     * @param float $effort The effort value to evaluate
     * @return array Array containing label and color for the effort level
     */
    private function get_effort_level($effort) {
        if ($effort < 0.5) {
            return ["label" => "Low effort (<0.5)", "color" => "#FF9800"];
        } else if ($effort <= 1.0) {
            return ["label" => "Average (0.5-1.0)", "color" => "#2196F3"];
        } else if ($effort <= 1.3) {
            return ["label" => "High effort (1.0-1.3)", "color" => "#43A047"];
        } else if ($effort <= 1.6) {
            return ["label" => "Very high effort (1.3-1.6)", "color" => "#2E7D32"];
        } else {
            return ["label" => "Exceptional effort (1.6+)", "color" => "#1B5E20"];
        }
    }
}
