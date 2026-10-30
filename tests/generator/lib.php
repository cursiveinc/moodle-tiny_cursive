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

use tiny_cursive\notice;

/**
 * Data generator for tiny_cursive.
 *
 * @package    tiny_cursive
 * @category   test
 * @copyright  2026 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class tiny_cursive_generator extends component_generator_base {
    /**
     * Create a notice acknowledgement record directly, bypassing the gate.
     *
     * @param array|stdClass $record Keys: userid (required), noticeversion, lang, timecreated, noticetext.
     * @return stdClass The tiny_cursive_notice record.
     */
    public function create_acknowledgement($record): stdClass {
        global $DB;

        $record = (object) $record;
        if (empty($record->userid)) {
            throw new coding_exception('userid is required');
        }

        $version = (int) ($record->noticeversion ?? notice::VERSION);
        $lang = $record->lang ?? 'en';
        $text = $record->noticetext ?? notice::get_text($lang);
        $hash = notice::hash($text);
        $now = (int) ($record->timecreated ?? time());

        if (!$DB->record_exists('tiny_cursive_notice_text', ['noticetexthash' => $hash])) {
            $DB->insert_record('tiny_cursive_notice_text', (object) [
                'noticetexthash' => $hash,
                'noticetext' => $text,
                'lang' => $lang,
                'noticeversion' => $version,
                'timecreated' => $now,
            ]);
        }

        $ack = (object) [
            'userid' => (int) $record->userid,
            'noticeversion' => $version,
            'noticetexthash' => $hash,
            'timecreated' => $now,
        ];
        $ack->id = $DB->insert_record('tiny_cursive_notice', $ack);

        if ($version === notice::VERSION) {
            set_user_preference(notice::PREFERENCE, $version, $ack->userid);
        }

        return $ack;
    }

    /** @var string Plain text the student typed, as the capture reconstructs it. */
    const RECONSTRUCTED_TEXT = "Steam rises gently from the cup.\n\nGreen leaves steep in warm water while I write this.";

    /** @var string Submitted HTML as the Cursive API returns it, with one pasted and one AI-inserted passage. */
    const SUBMITTED_HTML = '<p>Steam rises gently from the cup. <span class="tiny_cursive-pasted_content">A line pasted '
        . 'from elsewhere.</span></p><p>Green leaves steep in warm water while I write this.</p>'
        . '<p><span class="tiny_cursive-inserted">Quiet moments brew.</span></p>';

    /**
     * Create a captured submission: the files row with replay events, its writing analytics and its diff.
     *
     * @param array|stdClass $record Keys: userid and cmid (required); modulename, resourceid, courseid, questionid,
     *     timemodified, uploaded, effort, score, total_time_seconds, word_count, submitted_html, reconstructed_text.
     * @return stdClass The tiny_cursive_files record, with writingid and diffid added.
     */
    public function create_submission($record): stdClass {
        global $CFG, $DB;

        $record = (object) $record;
        if (empty($record->userid) || empty($record->cmid)) {
            throw new coding_exception('userid and cmid are required');
        }

        $cm = get_coursemodule_from_id('', $record->cmid, 0, false, MUST_EXIST);
        $now = time();

        $file = (object) [
            'userid' => (int) $record->userid,
            'cmid' => (int) $cm->id,
            'modulename' => $record->modulename ?? $cm->modname,
            'resourceid' => (int) ($record->resourceid ?? $cm->instance),
            'courseid' => (int) ($record->courseid ?? $cm->course),
            'questionid' => (int) ($record->questionid ?? 0),
            'timemodified' => (int) ($record->timemodified ?? $now),
            'uploaded' => (int) ($record->uploaded ?? $now),
        ];
        $file->filename = "{$file->userid}_{$file->resourceid}_{$file->cmid}_attempt.json";

        // The replay events are a real capture, re-pointed at this user and activity.
        $events = json_decode(file_get_contents(__DIR__ . '/../fixtures/replay_events.json'), true);
        foreach ($events as &$event) {
            $event['personId'] = $file->userid;
            $event['resourceId'] = $file->resourceid;
            $event['courseId'] = $file->courseid;
            $event['clientId'] = $CFG->wwwroot;
        }
        unset($event);
        $file->content = json_encode($events);
        $file->original_content = $record->reconstructed_text ?? self::RECONSTRUCTED_TEXT;
        $file->id = $DB->insert_record('tiny_cursive_files', $file);

        $writing = (object) [
            'file_id' => $file->id,
            'total_time_seconds' => (int) ($record->total_time_seconds ?? 626),
            'key_count' => 1807,
            'keys_per_minute' => 173,
            'character_count' => 1683,
            'characters_per_minute' => 161,
            'word_count' => (int) ($record->word_count ?? 306),
            'words_per_minute' => 29,
            'backspace_percent' => 6.87,
            'score' => (float) ($record->score ?? 1),
            'copy_behavior' => 0,
            'user_agent' => 'Behat',
        ];
        $file->writingid = $DB->insert_record('tiny_cursive_user_writing', $writing);

        // The API stores the submitted HTML as base64 of its JSON encoding; the readers decode it the same way.
        $html = $record->submitted_html ?? self::SUBMITTED_HTML;
        $diff = (object) [
            'file_id' => $file->id,
            'reconstructed_text' => $file->original_content,
            'submitted_text' => base64_encode(json_encode($html)),
            'meta' => (string) ($record->effort ?? '1.64'),
        ];
        $file->diffid = $DB->insert_record('tiny_cursive_writing_diff', $diff);

        return $file;
    }
}
