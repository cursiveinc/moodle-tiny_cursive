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

use moodle_url;
use context_system;
use stdClass;
use tiny_cursive\constants;

defined('MOODLE_INTERNAL') || die();

class visualization {
    protected $courseid;
    protected $modinfo;
    protected $course;
    protected $cmid;
    protected $type;
    protected $url;

    public const TEMPLATE = "visualisation";

    public function __construct(int $courseid, string $type,  $cmid) {
        $this->type     = $type;
        $this->courseid = $courseid;
        $this->course   = get_course($courseid);
        $this->cmid     = $cmid;
        $this->modinfo  = get_fast_modinfo($courseid);
        $this->url      = new moodle_url('/lib/editor/tiny/plugins/cursive/visualization.php', ['course' => $courseid]);
    }

    public function render() {

        $this->page_setup($this->get_course_analytics($this->courseid, $this->cmid));
        $this->page($this::TEMPLATE, $this->prepare_data());

    }

    private function page_setup($data) {
        global $PAGE;

        $PAGE->set_url($this->url);
        $PAGE->set_context(context_system::instance());
        $PAGE->set_title(get_string('data_visualization', 'tiny_cursive'));
        $PAGE->navbar->add($this->course->shortname, new moodle_url('/course/view.php', ['id' => $this->courseid]));
        $PAGE->navbar->add(get_string('data_visualization', 'tiny_cursive'), $this->url);
        $PAGE->requires->js_call_amd('tiny_cursive/scatter_chart', 'init',[$data]);
    }

    private function page($template, $data) {
        global $OUTPUT;

        echo   $OUTPUT->header();
        echo   $OUTPUT->render_from_template("tiny_cursive/$template", $data);
        echo   $OUTPUT->footer();
    }

    private function get_course_analytics($course, $cmid) {
        global $DB;

        $sql = "SELECT SUBSTRING(MD5(RAND()), 1, 8) AS uniqueid, CONCAT(u.firstname,' ',u.lastname) AS username, f.userid, w.*, d.meta as effort
                  FROM {tiny_cursive_files} f
             LEFT JOIN {tiny_cursive_user_writing} w ON f.id = w.file_id
             LEFT JOIN {tiny_cursive_writing_diff} d ON f.id = d.file_id
             LEFT JOIN {user} u ON f.userid = u.id
                 WHERE f.courseid = :courseid AND f.cmid = :cmid";

        $params    = ['courseid' => $course, 'cmid' => $cmid];
        $analytics = $DB->get_records_sql($sql, $params);
        $writing   = [];

        foreach ($analytics as $analytic) {

            $effortlabel = $this->get_effort_level($analytic->effort);
            $key = $effortlabel['label']; // group by this

            if (!isset($writing[$key])) {
                $writing[$key]        = new stdClass;
                $writing[$key]->label = $effortlabel['label'];
                $writing[$key]->backgroundColor = $effortlabel['color'];
                $writing[$key]->pointRadius = 8;
                $writing[$key]->pointStyle  = 'circle';
                $writing[$key]->data   = [];
            }

            $point         = new stdClass;
            $point->x      = $analytic->total_time_seconds;
            $point->y      = $analytic->effort;
            $point->label  = $analytic->username;
            $point->effort = $analytic->effort;
            $point->time   = $analytic->total_time_seconds;
            $point->words  = $analytic->word_count;
            $point->wpm    = $analytic->words_per_minute;

            $writing[$key]->data[] = $point;
        }

        // Re-index to get plain array (Chart.js needs numerically indexed array)
        $writing = array_values($writing);


        return $writing;
    }

    private function get_active_analytics_type($type) {

        $modules = array_values(array_unique(array_map(
            function($cm) use ($type) {
                if (!in_array($cm->modname, constants::NAMES)) return;
                $id      = array_values($this->get_multiple_mod($cm->modname))[0]['id']; //cmid
                $filters = ["link" => $this->generate_link(['name' => $cm->name, "type" => $cm->modname, "id" => $id]), "state" => "", "name" => ucfirst($cm->modname)];
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


    private function generate_link($mod) {
        global $PAGE;

        $current = $PAGE->url->out(false);
        unset($mod['name']);
        $url = new moodle_url($current, $mod);
        return $url->out(false);
    }

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

    private function prepare_mods($mods, $id){
        foreach($mods as &$mod) {
            $mod['link'] = $this->generate_link($mod);
            $mod["state"] = $mod["id"] == $id ? "btn-outline-primary" : "";
        }

        return $mods;
    }

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

    private function get_effort_level($effort) {
        if ($effort < 0.5) {
            return ["label" => "Low effort (<0.5)", "color" => "#FF9800"];
        } elseif ($effort <= 1.0) {
            return ["label" => "Average (0.5-1.0)", "color" => "#2196F3"];
        } elseif ($effort <= 1.3) {
            return ["label" => "High effort (1.0-1.3)", "color" => "#43A047"];
        } elseif ($effort <= 1.6) {
            return ["label" => "Very high effort (1.3-1.6)", "color" => "#2E7D32"];
        } else {
            return ["label" => "Exceptional effort (1.6+)", "color" => "#1B5E20"];
        }
    }
}
