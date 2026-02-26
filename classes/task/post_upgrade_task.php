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

namespace tiny_cursive\task;

use core\task\adhoc_task;
use core_plugin_manager;
use moodle_url;
use stdClass;
use tiny_cursive\helper;

/**
 * Class post_upgrade_task
 *
 * @package    tiny_cursive
 * @copyright  2026 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @author Brain station 23 Ltd <sales@brainstation-23.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class post_upgrade_task extends adhoc_task {
    /**
     * Get the name of the task.
     *
     * @return string The localized name of the post upgrade task
     */
    public function get_name(): string {
        return get_string('postupgradetask', 'tiny_cursive');
    }
    /**
     * Execute the task.
     */
    public function execute() {
        global $CFG;

        $plugininfo = core_plugin_manager::instance()->get_plugin_info('tiny_cursive');
        $url = new moodle_url('/');

        $data = new stdClass();
        $data->domain = $url->out();
        $data->plugin_version = get_config('tiny_cursive', 'version');
        $data->moodle_version = $CFG->version;

        helper::perform_data_sent($data);
    }
}
