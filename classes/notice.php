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

namespace tiny_cursive;

use context_system;
use dml_write_exception;
use html_writer;
use moodle_exception;
use moodle_url;
use stdClass;

/**
 * Biometric data transparency notice: gating, wording snapshots and the acknowledgement log.
 *
 * The notice wording is fixed in language strings (not admin-editable) and versioned by
 * {@see self::VERSION}. Each acknowledgement is stored append-only in tiny_cursive_notice
 * together with a SHA-256 of the exact rendered wording, which is persisted once per
 * distinct hash in tiny_cursive_notice_text so the record stays self-contained even after
 * the language strings move on.
 *
 * @package    tiny_cursive
 * @copyright  2026 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class notice {
    /**
     * Version of the notice wording. Bump this in a release whenever the wording
     * materially changes; every user is then re-prompted on their next editor load.
     */
    public const VERSION = 1;

    /** User preference mirroring the acknowledged notice version (a cache of the table). */
    public const PREFERENCE = 'tiny_cursive_noticeversion';

    /** Acknowledgement state: gating is disabled so no acknowledgement is expected. */
    public const STATE_NOTREQUIRED = 'notrequired';

    /** Acknowledgement state: the user has acknowledged the current notice version. */
    public const STATE_ACKNOWLEDGED = 'acknowledged';

    /** Acknowledgement state: gating is on and the user has not acknowledged the current version. */
    public const STATE_PENDING = 'pending';

    /**
     * Whether the transparency notice gate is switched on by the administrator.
     *
     * @return bool
     */
    public static function is_enabled(): bool {
        return (bool) get_config('tiny_cursive', 'notice_enabled');
    }

    /**
     * The institution's own privacy notice URL, or an empty string when unset.
     *
     * @return string
     */
    public static function get_privacy_url(): string {
        $url = trim((string) get_config('tiny_cursive', 'notice_privacyurl'));
        return $url === '' ? '' : clean_param($url, PARAM_URL);
    }

    /**
     * Render the notice wording in the given language.
     *
     * This is the text that is hashed and snapshotted. It is deliberately assembled from
     * the raw language strings (before filters) so that the hash depends only on the
     * wording and the configured privacy URL, never on site filters or the viewer.
     *
     * @param string|null $lang Language code; defaults to the current language.
     * @return string HTML made of one paragraph per language string.
     */
    public static function get_text(?string $lang = null): string {
        $lang = $lang ?? current_language();
        $sm = get_string_manager();

        $button = new stdClass();
        $button->button = $sm->get_string('notice_consent_button', 'tiny_cursive', null, $lang);

        $paragraphs = [
            $sm->get_string('notice_para1', 'tiny_cursive', null, $lang),
            $sm->get_string('notice_para2', 'tiny_cursive', $button, $lang),
        ];

        $privacyurl = self::get_privacy_url();
        if ($privacyurl !== '') {
            $link = new stdClass();
            $link->privacyurl = s($privacyurl);
            $paragraphs[] = $sm->get_string('notice_para3', 'tiny_cursive', $link, $lang);
        }

        return implode("\n", array_map(fn(string $p): string => html_writer::tag('p', $p), $paragraphs));
    }

    /**
     * SHA-256 of a rendered notice text.
     *
     * @param string $text
     * @return string 64 hex characters.
     */
    public static function hash(string $text): string {
        return hash('sha256', $text);
    }

    /**
     * Hash of the current wording in the given language.
     *
     * @param string|null $lang
     * @return string
     */
    public static function get_current_hash(?string $lang = null): string {
        return self::hash(self::get_text($lang));
    }

    /**
     * Prepare the notice text for display.
     *
     * @param string $text Text as returned by {@see self::get_text()} or stored in the snapshot table.
     * @return string
     */
    public static function format_text_for_display(string $text): string {
        return format_text($text, FORMAT_HTML, [
            'context' => context_system::instance(),
            'filter' => false,
        ]);
    }

    /**
     * URL of the page where a user can switch their preferred text editor.
     *
     * @return moodle_url
     */
    public static function get_editor_preferences_url(): moodle_url {
        return new moodle_url('/user/editor.php');
    }

    /**
     * Whether the given user has acknowledged the current notice version.
     *
     * The user preference is consulted first; for the current user it is already loaded
     * so the common path costs no queries. Only a miss falls through to the table, and a
     * hit there refreshes the preference.
     *
     * @param int $userid
     * @return bool
     */
    public static function has_acknowledged(int $userid): bool {
        global $DB, $USER;

        $preferenceuser = ($userid == $USER->id) ? null : $userid;
        if ((int) get_user_preferences(self::PREFERENCE, 0, $preferenceuser) === self::VERSION) {
            return true;
        }

        $exists = $DB->record_exists('tiny_cursive_notice', ['userid' => $userid, 'noticeversion' => self::VERSION]);
        if ($exists) {
            set_user_preference(self::PREFERENCE, self::VERSION, $preferenceuser);
        }
        return $exists;
    }

    /**
     * Whether Cursive capture could run on the page currently being rendered.
     *
     * Mirrors the conditions under which the editor plugin registers capture: a supported
     * page, Cursive enabled for the course and the module not switched off.
     *
     * @return bool
     */
    public static function capture_possible_on_current_page(): bool {
        global $CFG, $PAGE;

        if (!in_array($PAGE->bodyid, constants::EDITOR_PAGES, true)) {
            return false;
        }

        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/lib.php');
        $courseid = $PAGE->course->id ?? 0;
        if (!tiny_cursive_status($courseid)) {
            return false;
        }

        return constants::is_active();
    }

    /**
     * Whether the gate must be shown to the current user on the page being rendered.
     *
     * @return bool
     */
    public static function is_required_for_current_user(): bool {
        global $USER;

        if (!self::is_enabled()) {
            return false;
        }
        if (!isloggedin() || isguestuser()) {
            return false;
        }
        if (!self::capture_possible_on_current_page()) {
            return false;
        }
        return !self::has_acknowledged((int) $USER->id);
    }

    /**
     * Acknowledgement state of a user, for the reporting layer.
     *
     * Lets reports distinguish "no data because the user has not acknowledged" from
     * "no data captured".
     *
     * @param int $userid
     * @return string One of the STATE_* constants.
     */
    public static function get_user_state(int $userid): string {
        if (!self::is_enabled()) {
            return self::STATE_NOTREQUIRED;
        }
        return self::has_acknowledged($userid) ? self::STATE_ACKNOWLEDGED : self::STATE_PENDING;
    }

    /**
     * Record that a user has acknowledged the current notice.
     *
     * Idempotent: a second call for the same user and version returns the existing row.
     * The wording is re-rendered server-side in the given language, so nothing supplied by
     * a client is trusted. The snapshot row is written first (outside the transaction, so a
     * lost race on its unique index cannot poison the transaction), then the acknowledgement
     * row and the user preference are written together.
     *
     * @param int $userid
     * @param string|null $lang Language the user saw the notice in; defaults to the current language.
     * @return stdClass The tiny_cursive_notice record.
     * @throws moodle_exception When the gate is disabled.
     */
    public static function record_acknowledgement(int $userid, ?string $lang = null): stdClass {
        global $DB, $USER;

        if (!self::is_enabled()) {
            throw new moodle_exception('notice_disabled', 'tiny_cursive');
        }

        $conditions = ['userid' => $userid, 'noticeversion' => self::VERSION];
        $preferenceuser = ($userid == $USER->id) ? null : $userid;

        $existing = $DB->get_record('tiny_cursive_notice', $conditions);
        if ($existing) {
            set_user_preference(self::PREFERENCE, self::VERSION, $preferenceuser);
            return $existing;
        }

        $lang = $lang ?? current_language();
        $text = self::get_text($lang);
        $hash = self::hash($text);
        $now = time();

        self::ensure_snapshot($hash, $text, $lang, $now);

        $record = new stdClass();
        $record->userid = $userid;
        $record->noticeversion = self::VERSION;
        $record->noticetexthash = $hash;
        $record->timecreated = $now;

        $transaction = $DB->start_delegated_transaction();
        try {
            $record->id = $DB->insert_record('tiny_cursive_notice', $record);
            set_user_preference(self::PREFERENCE, self::VERSION, $preferenceuser);
            $transaction->allow_commit();
        } catch (dml_write_exception $e) {
            // Lost a race against a concurrent acknowledgement (two tabs); the unique
            // index guarantees a single row, so return that one.
            $transaction->rollback($e);
            $existing = $DB->get_record('tiny_cursive_notice', $conditions);
            if (!$existing) {
                throw $e;
            }
            set_user_preference(self::PREFERENCE, self::VERSION, $preferenceuser);
            return $existing;
        }

        $event = event\notice_acknowledged::create_from_record($record);
        $event->trigger();

        return $record;
    }

    /**
     * Persist the wording for a hash if it has not been seen before.
     *
     * @param string $hash
     * @param string $text
     * @param string $lang
     * @param int $now
     * @return void
     */
    protected static function ensure_snapshot(string $hash, string $text, string $lang, int $now): void {
        global $DB;

        if ($DB->record_exists('tiny_cursive_notice_text', ['noticetexthash' => $hash])) {
            return;
        }

        $snapshot = new stdClass();
        $snapshot->noticetexthash = $hash;
        $snapshot->noticetext = $text;
        $snapshot->lang = $lang;
        $snapshot->noticeversion = self::VERSION;
        $snapshot->timecreated = $now;

        try {
            $DB->insert_record('tiny_cursive_notice_text', $snapshot);
        } catch (dml_write_exception $e) {
            // Another request inserted the same wording first; that is fine.
            if (!$DB->record_exists('tiny_cursive_notice_text', ['noticetexthash' => $hash])) {
                throw $e;
            }
        }
    }
}
