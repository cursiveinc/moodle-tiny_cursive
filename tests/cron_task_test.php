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

declare(strict_types=1);

namespace tiny_cursive;

use advanced_testcase;
use tiny_cursive\task\upload_student_json_cron;
use tiny_cursive\task\post_upgrade_task;

/**
 * Unit tests for scheduled and adhoc tasks in tiny_cursive.
 *
 * @package     tiny_cursive
 * @covers      \tiny_cursive\task\upload_student_json_cron
 * @covers      \tiny_cursive\task\post_upgrade_task
 * @copyright   2026 CTI <info@cursivetechnology.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class cron_task_test extends advanced_testcase {
    /**
     * Set up tests.
     */
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest(true);
    }

    /**
     * Test upload_student_json_cron task metadata.
     */
    public function test_upload_student_json_cron_name(): void {
        $task = new upload_student_json_cron();
        $this->assertNotEmpty($task->get_name());
    }

    /**
     * Test upload_student_json_cron handles execution safely.
     */
    public function test_upload_student_json_cron_safe_execution(): void {
        $task = new upload_student_json_cron();

        // Capture standard mtrace output during execution.
        ob_start();
        $task->execute();
        $output = ob_get_clean();

        $this->assertIsString($output);
    }

    /**
     * Test post_upgrade_task metadata.
     */
    public function test_post_upgrade_task_name(): void {
        $task = new post_upgrade_task();
        $this->assertNotEmpty($task->get_name());
    }
}
