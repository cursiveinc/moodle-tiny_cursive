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
use core\hook\output\before_footer_html_generation;
use core_renderer;

/**
 * Unit tests for hook callbacks in tiny_cursive.
 *
 * @package     tiny_cursive
 * @covers      \tiny_cursive\hook_callbacks
 * @covers      ::tiny_cursive_status
 * @copyright   2026 CTI <info@cursivetechnology.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class hook_callbacks_test extends advanced_testcase {
    /**
     * Set up tests.
     */
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest(true);
    }

    /**
     * Helper to create a dummy hook instance.
     *
     * @return before_footer_html_generation
     */
    private function create_hook(): before_footer_html_generation {
        global $PAGE;
        $renderer = new core_renderer($PAGE, RENDERER_TARGET_GENERAL);
        return new before_footer_html_generation($renderer);
    }

    /**
     * Test that before_footer_html_generation early-exits when $COURSE is empty.
     */
    public function test_before_footer_html_generation_empty_course(): void {
        global $COURSE, $PAGE;

        $COURSE = null;
        $hook = $this->create_hook();

        // Should return early and not register any cursive AMD calls.
        hook_callbacks::before_footer_html_generation($hook);
        $this->assertStringNotContainsString('tiny_cursive', $PAGE->requires->get_end_code());
    }

    /**
     * Test that before_footer_html_generation early-exits when $COURSE is the site course (SITEID).
     */
    public function test_before_footer_html_generation_site_course(): void {
        global $COURSE, $SITE, $PAGE;

        $COURSE = clone($SITE);
        $this->assertEquals(SITEID, $COURSE->id);

        $hook = $this->create_hook();

        // Ensure cursive is even "configured" on site id to prove the guard prevents the check entirely.
        set_config("cursive-" . SITEID, 1, 'tiny_cursive');

        hook_callbacks::before_footer_html_generation($hook);
        $this->assertStringNotContainsString('tiny_cursive', $PAGE->requires->get_end_code());
    }

    /**
     * Test that before_footer_html_generation runs normally when $COURSE is a real course.
     */
    public function test_before_footer_html_generation_real_course(): void {
        global $COURSE, $PAGE;

        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $course = $this->getDataGenerator()->create_course();
        $COURSE = $course;
        $this->assertNotEquals(SITEID, $COURSE->id);

        set_config("cursive-{$course->id}", 1, 'tiny_cursive');

        $hook = $this->create_hook();
        hook_callbacks::before_footer_html_generation($hook);

        // When enabled in a real course, settings init AMD script is registered.
        $this->assertStringContainsString('tiny_cursive/settings', $PAGE->requires->get_end_code());
    }

    /**
     * Test tiny_cursive_status guards against 0 and SITEID.
     */
    public function test_tiny_cursive_status(): void {
        global $CFG;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/lib.php');

        // Course ID 0 or empty should always return false.
        $this->assertFalse(tiny_cursive_status(0));

        // SITEID should always return false, even if database config is somehow set.
        set_config("cursive-" . SITEID, 1, 'tiny_cursive');
        $this->assertFalse(tiny_cursive_status(SITEID));

        // Real course reflects configuration.
        $course = $this->getDataGenerator()->create_course();
        $this->assertFalse(tiny_cursive_status((int) $course->id));

        set_config("cursive-{$course->id}", 1, 'tiny_cursive');
        $this->assertTrue(tiny_cursive_status((int) $course->id));

        set_config("cursive-{$course->id}", 0, 'tiny_cursive');
        $this->assertFalse(tiny_cursive_status((int) $course->id));
    }
}
