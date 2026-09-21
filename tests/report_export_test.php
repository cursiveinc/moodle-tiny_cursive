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
use moodle_exception;
use tiny_cursive\local\page\pdfexport;

/**
 * Unit tests for report export classes in tiny_cursive.
 *
 * @package     tiny_cursive
 * @covers      \tiny_cursive\local\page\pdfexport
 * @copyright   2026 CTI <info@cursivetechnology.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class report_export_test extends advanced_testcase {
    /**
     * Set up tests.
     */
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest(true);
    }

    /**
     * Test pdfexport rejects when API key is missing.
     */
    public function test_pdfexport_rejects_missing_api_key(): void {
        $course = $this->getDataGenerator()->create_course();
        $assign = $this->getDataGenerator()->create_module('assign', ['course' => $course->id]);
        $user = $this->getDataGenerator()->create_user();
        $this->getDataGenerator()->enrol_user($user->id, $course->id, 'student');

        set_config('secretkey', '', 'tiny_cursive');

        $this->setUser($user);
        $exporter = new pdfexport((int) $course->id, (int) $assign->cmid, (int) $user->id, 0, 1);

        $this->expectException(moodle_exception::class);
        $exporter->download();
    }

    /**
     * Test pdfexport rejects unauthorized student trying to access another student's report.
     */
    public function test_pdfexport_rejects_unauthorized_student(): void {
        $course = $this->getDataGenerator()->create_course();
        $assign = $this->getDataGenerator()->create_module('assign', ['course' => $course->id]);
        $student1 = $this->getDataGenerator()->create_user();
        $student2 = $this->getDataGenerator()->create_user();

        $this->getDataGenerator()->enrol_user($student1->id, $course->id, 'student');
        $this->getDataGenerator()->enrol_user($student2->id, $course->id, 'student');

        set_config('secretkey', 'mysecret', 'tiny_cursive');
        set_config('apiKey', 1, 'tiny_cursive');
        set_config('ApiSyncInterval', time() + 3600, 'tiny_cursive');

        // Log in as student2 and attempt to download student1's report.
        $this->setUser($student2);
        $exporter = new pdfexport((int) $course->id, (int) $assign->cmid, (int) $student1->id, 0, 1);

        $this->expectException(moodle_exception::class);
        $exporter->download();
    }
}
