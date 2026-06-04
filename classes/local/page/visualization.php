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

namespace tiny_cursive\local\page;

use html_writer;
use moodle_url;
use context_system;
use stdClass;
use tiny_cursive\constants;

/**
 * Visualization class for handling course analytics and data visualization.
 *
 * Manages the rendering of writing-analytics scatter charts for a given course
 * and course module.  Axis configuration (X / Y) is accepted at render time and
 * forwarded to the AMD scatter_chart module so the chart reflects the user's
 * most recent selection without a full page reload.
 */
class visualization {
    /**
     * The ID of the course being visualized.
     * @var int
     */
    protected $courseid;

    /**
     * Course module information.
     * @var \course_modinfo
     */
    protected $modinfo;

    /**
     * The course object.
     * @var stdClass
     */
    protected $course;

    /**
     * The course module ID.
     * @var int
     */
    protected $cmid;

    /**
     * The type of module being visualized.
     * @var string
     */
    protected $type;

    /**
     * The URL for the visualization page.
     * @var moodle_url
     */
    protected $url;

    /**
     * The user ID being visualized.
     * @var int
     */
    protected $userid;

    /**
     * The caption displayed above the chart.
     * @var string
     */
    protected $caption;

    /** @var string Mustache template name for standalone rendering. */
    public const TEMPLATE = 'visualisation';

    /**
     * Constructor.
     *
     * @param int    $courseid The ID of the course to visualize.
     * @param string $type     The module type being visualized.
     * @param int    $cmid     The course module ID.
     * @param int    $userid   The user ID (0 = all users).
     */
    public function __construct(int $courseid, string $type, $cmid, $userid) {
        $this->type     = $type;
        $this->courseid = $courseid;
        $this->course   = get_course($courseid);
        $this->cmid     = $cmid;
        $this->userid   = $userid;
        $this->modinfo  = get_fast_modinfo($courseid);
        $this->url      = new moodle_url(
            '/lib/editor/tiny/plugins/cursive/visualization.php',
            ['course' => $courseid]
        );
    }

    /**
     * Renders the visualization by emitting the data store div and queuing the AMD call.
     *
     * @param string $xaxis Axis key for X ('time'|'effort'|'words'). Defaults to 'time'.
     * @param string $yaxis Axis key for Y ('time'|'effort'|'words'). Defaults to 'effort'.
     */
    public function render(string $xaxis = 'time', string $yaxis = 'effort'): void {
        $this->page_setup(
            $this->get_course_analytics($this->courseid, $this->cmid),
            constants::has_api_key(),
            true,
            $xaxis,
            $yaxis
        );
    }

    /**
     * Emits the hidden data store and registers the AMD module initialisation.
     *
     * The axis keys are passed as the 4th and 5th arguments to scatter_chart::init
     * so the JS module can apply them immediately on page load without waiting for
     * a user interaction.
     *
     * @param array  $data      Visualisation data returned by get_course_analytics().
     * @param bool   $status    Whether a valid API key is configured.
     * @param bool   $onlychart True when embedded inside the report page (no page chrome).
     * @param string $xaxis     Axis key for X.
     * @param string $yaxis     Axis key for Y.
     */
    private function page_setup(
        $data,
        bool $status,
        bool $onlychart,
        string $xaxis,
        string $yaxis
    ): void {
        global $PAGE;

        if (!$onlychart) {
            $PAGE->set_url($this->url);
            $PAGE->set_context(context_system::instance());
            $PAGE->set_title(get_string('data_visualization', 'tiny_cursive'));
            $PAGE->navbar->add(
                $this->course->shortname,
                new moodle_url('/course/view.php', ['id' => $this->courseid])
            );
            $PAGE->navbar->add(get_string('data_visualization', 'tiny_cursive'), $this->url);
        }

        // Hidden div acts as the server-side data store read by scatter_chart.js.
        echo html_writer::div('', 'hidden', [
            'id'        => 'scatter-chart-data',
            'data-data' => json_encode($data),
        ]);

        // Pass xaxis and yaxis as AMD init args (positions 4 and 5).
        $PAGE->requires->js_call_amd(
            'tiny_cursive/scatter_chart',
            'init',
            [$data ? true : false, $status, $this->caption, $xaxis, $yaxis]
        );
    }

    /**
     * Fetches and groups writing analytics records for the given course and module.
     *
     * Each point object carries all raw metric fields (effort, time, words, wpm)
     * so the client-side AMD module can remap x/y without a round-trip.
     *
     * @param  int        $course Course ID.
     * @param  int        $cmid   Course-module ID.
     * @return array|void Grouped dataset array, or an array with a 'state' key on error conditions.
     */
    private function get_course_analytics(int $course, int $cmid) {
        global $DB;

        $sql = 'SELECT f.id AS fileid,
                       CONCAT(u.firstname, \' \', u.lastname) AS username,
                       f.userid, w.*, d.meta AS effort
                  FROM {tiny_cursive_files} f
             LEFT JOIN {tiny_cursive_user_writing} w ON f.id = w.file_id
             LEFT JOIN {tiny_cursive_writing_diff} d ON f.id = d.file_id
             LEFT JOIN {user} u ON f.userid = u.id
                 WHERE f.courseid = :courseid
                   AND f.cmid     = :cmid';

        $params        = ['courseid' => $course, 'cmid' => $cmid];
        $this->caption = get_string('chart_result', 'tiny_cursive');

        if ($this->userid) {
            $sql           .= ' AND f.userid = :userid';
            $params['userid'] = $this->userid;
            $this->caption    = get_string('chart_result_user', 'tiny_cursive');
        }

        $analytics = $DB->get_records_sql($sql, $params);
        $writing   = [];

        foreach ($analytics as $analytic) {
            $effortlevel = $this->get_effort_level($analytic->effort);
            $key         = $effortlevel['label'];

            if (!isset($writing[$key])) {
                $writing[$key]                  = new stdClass();
                $writing[$key]->label           = $effortlevel['label'];
                $writing[$key]->backgroundColor = $effortlevel['color'];
                $writing[$key]->pointRadius     = 8;
                $writing[$key]->pointStyle      = 'circle';
                $writing[$key]->data            = [];
            }

            // Only add a point when all required numeric fields are present and non-null.
            $hasmetrics = !empty($analytic->total_time_seconds)
                && is_numeric($analytic->total_time_seconds)
                && !empty($analytic->word_count)
                && is_numeric($analytic->word_count)
                && is_numeric($analytic->words_per_minute);

            if ($hasmetrics) {
                $point         = new stdClass();
                // x / y use the PHP-supplied defaults; scatter_chart.js remaps them
                // client-side when the user changes the axis selectors.
                $point->x      = (int) $analytic->total_time_seconds;
                $point->y      = is_numeric($analytic->effort) ? (float) $analytic->effort : 0.0;
                $point->label  = !empty($analytic->username) ? $analytic->username : '';
                $point->effort = is_numeric($analytic->effort) ? (float) $analytic->effort : 0.0;
                $point->time   = (int) $analytic->total_time_seconds;
                $point->words  = (int) $analytic->word_count;
                $point->wpm    = is_numeric($analytic->words_per_minute) ? (float) $analytic->words_per_minute : 0.0;

                $writing[$key]->data[] = $point;
            }
        }

        // Remove buckets that ended up with no valid points (guards against phantom
        // legend entries when all records had null metrics), then re-index.
        $writing = array_values(array_filter($writing, function ($bucket) {
            return !empty($bucket->data);
        }));

        if (count($analytics) > 0 && $cmid) {
            return $writing;
        } else if (count($analytics) === 0 && $cmid == 0) {
            return ['state' => 'apply_filter'];
        } else if (count($analytics) === 0 && $cmid) {
            return ['state' => 'no_submission'];
        }
    }

    /**
     * Returns the effort-level label and colour for a given numeric effort score.
     *
     * Colour scheme (4 tiers):
     *  - Low      < 0.5          → red    (#D32F2F)
     *  - Low      0.5 – 1.0      → orange (#FF9800)
     *  - High     1.0 – 1.3      → green  (#43A047)
     *  - Very high 1.3+          → dark green (#2E7D32)
     *
     * Null or non-numeric values are treated as zero (lowest tier).
     *
     * @param  mixed $effort Raw effort score from the database (may be null).
     * @return array         Associative array with keys 'label' and 'color'.
     */
    private function get_effort_level($effort): array {
        // Treat null, empty string, or non-numeric values as zero.
        $score = is_numeric($effort) ? (float) $effort : 0.0;

        if ($score < 0.5) {
            return ['label' => 'Low effort (<0.5)', 'color' => '#D32F2F'];
        } else if ($score <= 1.0) {
            return ['label' => 'Low (0.5-1.0)', 'color' => '#FF9800'];
        } else if ($score <= 1.3) {
            return ['label' => 'High (1.0-1.3)', 'color' => '#43A047'];
        } else {
            return ['label' => 'Very high (1.3+)', 'color' => '#2E7D32'];
        }
    }

    /**
     * Gets the active analytics type and generates filter data for each module.
     *
     * @param  string $type The module type to match as active.
     * @return array        Array of filter data arrays with keys: link, state, name.
     */
    private function get_active_analytics_type(string $type): array {
        $modules = array_values(array_unique(array_map(
            function ($cm) use ($type) {
                if (!in_array($cm->modname, constants::NAMES)) {
                    return null;
                }
                $id     = array_values($this->get_multiple_mod($cm->modname))[0]['id'];
                $filter = [
                    'link'  => $this->generate_link(['name' => $cm->name, 'type' => $cm->modname, 'id' => $id]),
                    'state' => ($cm->modname === $type) ? 'btn-outline-primary' : '',
                    'name'  => ucfirst($cm->modname),
                ];
                return $filter;
            },
            array_filter($this->modinfo->get_cms(), function ($cm) {
                return $cm->uservisible;
            })
        ), SORT_REGULAR));

        return $modules;
    }

    /**
     * Generates an absolute URL for a module link.
     *
     * @param  array  $mod Module parameters to merge into the current page URL.
     * @return string      The generated URL string.
     */
    private function generate_link(array $mod): string {
        global $PAGE;
        $current = $PAGE->url->out(false);
        unset($mod['name']);
        $url = new moodle_url($current, $mod);
        return $url->out(false);
    }

    /**
     * Returns the full name of a module by its ID.
     *
     * @param  array    $mods Array of module data with keys: id, name, type.
     * @param  int|null $id   Module ID to look up, or null to return the first entry.
     * @return string         Module name, or empty string if not found.
     */
    private function get_mod_fullname(array $mods, $id): string {
        if ($id) {
            $matched = array_filter($mods, function ($m) use ($id) {
                return $m['id'] == $id;
            });
            if (!empty($matched)) {
                return array_values($matched)[0]['name'];
            }
        } else if (!empty($mods)) {
            return array_values($mods)[0]['name'];
        }
        return '';
    }

    /**
     * Returns all visible instances of a given module type for the course.
     *
     * @param  string $type Module type string (e.g. 'forum', 'assign').
     * @return array        Array of arrays with keys: id, name, type.
     */
    private function get_multiple_mod(string $type): array {
        return array_map(
            function ($cm) use ($type) {
                return ['id' => $cm->id, 'name' => $cm->name, 'type' => $type];
            },
            array_filter(
                $this->modinfo->get_instances_of($type),
                function ($cm) {
                    return $cm->uservisible;
                }
            )
        );
    }

    /**
     * Adds link and active-state data to a set of module arrays.
     *
     * @param  array $mods Array of module data arrays.
     * @param  int   $id   ID of the currently selected module.
     * @return array       Modified array with 'link' and 'state' keys added.
     */
    private function prepare_mods(array $mods, int $id): array {
        foreach ($mods as &$mod) {
            $mod['link']  = $this->generate_link($mod);
            $mod['state'] = ($mod['id'] == $id) ? 'btn-outline-primary' : '';
        }
        return $mods;
    }

    /**
     * Prepares data for the full visualization page (non-embedded mode).
     *
     * @return array Data array with keys: filter, fullname, and optionally multiple.
     */
    private function prepare_data(): array {
        $mods = $this->get_multiple_mod($this->type);
        $data = ['filter' => $this->get_active_analytics_type($this->type)];

        if (count($mods) > 1) {
            $data['multiple'] = array_values($this->prepare_mods($mods, $this->cmid));
        }
        $data['fullname'] = $this->get_mod_fullname($mods, $this->cmid);

        return $data;
    }
}
