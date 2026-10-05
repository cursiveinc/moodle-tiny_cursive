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

use core\task\scheduled_task;

/**
 * Scheduled task applying the administrator's retention period to notice acknowledgements.
 *
 * This is the only place in the plugin that ever deletes acknowledgement records. It is a
 * no-op unless tiny_cursive/notice_retentionperiod is set; records are otherwise kept
 * indefinitely (see the privacy provider for why erasure requests do not remove them).
 *
 * @package    tiny_cursive
 * @copyright  2026 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class purge_old_records extends scheduled_task {
    /** Number of acknowledgement rows deleted per statement. */
    public const BATCH_SIZE = 1000;

    /**
     * Task name shown in the scheduled task list.
     *
     * @return string
     */
    public function get_name(): string {
        return get_string('task_purge_old_records', 'tiny_cursive');
    }

    /**
     * Delete acknowledgements older than the retention period, then any orphaned wording snapshots.
     */
    public function execute(): void {
        $period = (int) get_config('tiny_cursive', 'notice_retentionperiod');
        if ($period <= 0) {
            mtrace('[tiny_cursive] Notice retention period is not set; acknowledgement records are kept indefinitely.');
            return;
        }

        $deleted = self::purge_before(time() - $period);
        mtrace("[tiny_cursive] Deleted {$deleted} notice acknowledgement record(s) older than {$period} seconds.");
    }

    /**
     * Delete acknowledgement rows created before the cutoff, in batches, and clean up snapshots.
     *
     * @param int $cutoff Unix timestamp; rows with timecreated strictly before this are removed.
     * @return int Number of acknowledgement rows deleted.
     */
    public static function purge_before(int $cutoff): int {
        global $DB;

        $deleted = 0;
        do {
            $ids = array_keys($DB->get_records_select(
                'tiny_cursive_notice',
                'timecreated < :cutoff',
                ['cutoff' => $cutoff],
                'id ASC',
                'id',
                0,
                self::BATCH_SIZE
            ));
            if ($ids) {
                $DB->delete_records_list('tiny_cursive_notice', 'id', $ids);
                $deleted += count($ids);
            }
        } while (count($ids) === self::BATCH_SIZE);

        if ($deleted > 0) {
            $DB->delete_records_select(
                'tiny_cursive_notice_text',
                "noticetexthash NOT IN (SELECT DISTINCT noticetexthash FROM {tiny_cursive_notice})"
            );
        }

        return $deleted;
    }
}
