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

namespace tiny_cursive\local\table;

use core_user\fields;
use html_writer;
use moodle_url;
use stdClass;
use table_sql;
use tiny_cursive\notice;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->libdir . '/tablelib.php');

/**
 * Report table of notice acknowledgements, or of users in scope who have not acknowledged.
 *
 * The query is O(1) in users: name fields come from the user join and the "current wording"
 * comparison is computed once per language, never per row.
 *
 * @package    tiny_cursive
 * @copyright  2026 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class notice_report_table extends table_sql {
    /** Report mode listing acknowledgements. */
    public const MODE_ACKNOWLEDGED = 'acknowledged';

    /** Report mode listing users in scope who have not acknowledged the current version. */
    public const MODE_PENDING = 'pending';

    /** @var array Active filters. */
    protected array $filters;

    /** @var array Current wording hash per language, filled lazily. */
    protected array $currenthashes = [];

    /**
     * Constructor.
     *
     * @param string $uniqueid
     * @param array $filters Keys: mode, datefrom, dateto, noticeversion, lang, courseid, cohortid.
     * @param moodle_url $baseurl URL carrying the filters, used for sorting, paging and download links.
     */
    public function __construct(string $uniqueid, array $filters, moodle_url $baseurl) {
        parent::__construct($uniqueid);

        $this->filters = $filters;
        $this->define_baseurl($baseurl);
        $this->set_attribute('class', 'generaltable tiny_cursive-notice-report');
        $this->collapsible(false);
        $this->pageable(true);
        $this->is_downloadable(true);
        $this->show_download_buttons_at([TABLE_P_BOTTOM]);

        if ($this->is_pending()) {
            $this->define_columns(['fullname', 'username', 'email']);
            $this->define_headers([
                get_string('fullnameuser'),
                get_string('username'),
                get_string('email'),
            ]);
            $this->sortable(true, 'lastname', SORT_ASC);
            $this->set_caption(get_string('notice_report_pendingcaption', 'tiny_cursive', notice::VERSION), []);
            [$fields, $from, $where, $params] = self::get_pending_sql($filters);
        } else {
            $this->useridfield = 'userid';
            $this->define_columns(['fullname', 'username', 'email', 'timecreated', 'noticeversion', 'lang', 'wording']);
            $this->define_headers([
                get_string('fullnameuser'),
                get_string('username'),
                get_string('email'),
                get_string('notice_report_acknowledgedon', 'tiny_cursive'),
                get_string('notice_report_version', 'tiny_cursive'),
                get_string('notice_report_lang', 'tiny_cursive'),
                get_string('notice_report_wording', 'tiny_cursive'),
            ]);
            $this->sortable(true, 'timecreated', SORT_DESC);
            $this->no_sorting('wording');
            $this->set_caption(get_string('notice_report_acknowledged', 'tiny_cursive'), []);
            [$fields, $from, $where, $params] = self::get_acknowledged_sql($filters);
        }

        $this->set_sql($fields, $from, $where, $params);
    }

    /**
     * Whether the table is in "not yet acknowledged" mode.
     *
     * @return bool
     */
    public function is_pending(): bool {
        return ($this->filters['mode'] ?? '') === self::MODE_PENDING;
    }

    /**
     * SQL parts listing acknowledgements matching the filters.
     *
     * @param array $filters
     * @return array [fields, from, where, params]
     */
    public static function get_acknowledged_sql(array $filters): array {
        $namefields = fields::for_name()->get_sql('u', false, '', '', false)->selects;

        $fields = "n.id, n.userid, n.noticeversion, n.noticetexthash, n.timecreated,
                   t.id AS textid, t.lang, u.username, u.idnumber, u.email, {$namefields}";
        $from = "{tiny_cursive_notice} n
                 JOIN {user} u ON u.id = n.userid
            LEFT JOIN {tiny_cursive_notice_text} t ON t.noticetexthash = n.noticetexthash";

        $where = ['1 = 1'];
        $params = [];

        if (!empty($filters['datefrom'])) {
            $where[] = 'n.timecreated >= :datefrom';
            $params['datefrom'] = (int) $filters['datefrom'];
        }
        if (!empty($filters['dateto'])) {
            $where[] = 'n.timecreated <= :dateto';
            $params['dateto'] = (int) $filters['dateto'];
        }
        if (!empty($filters['noticeversion'])) {
            $where[] = 'n.noticeversion = :noticeversion';
            $params['noticeversion'] = (int) $filters['noticeversion'];
        }
        if (!empty($filters['lang'])) {
            $where[] = 't.lang = :lang';
            $params['lang'] = $filters['lang'];
        }

        return [$fields, $from, implode(' AND ', $where), $params];
    }

    /**
     * SQL parts listing users in the selected course or cohort with no acknowledgement at the current version.
     *
     * The scope is mandatory: a site-wide "everyone without a row" is both meaningless and
     * expensive. Enrolment and membership are tested with EXISTS so a user with several
     * enrolments is listed, and counted, once.
     *
     * @param array $filters
     * @return array [fields, from, where, params]
     */
    public static function get_pending_sql(array $filters): array {
        $namefields = fields::for_name()->get_sql('u', false, '', '', false)->selects;

        $fields = "u.id, u.username, u.idnumber, u.email, {$namefields}";
        $from = "{user} u
            LEFT JOIN {tiny_cursive_notice} n ON n.userid = u.id AND n.noticeversion = :noticeversion";

        $where = ['n.id IS NULL', 'u.deleted = 0', 'u.id <> :guestid'];
        $params = ['noticeversion' => notice::VERSION, 'guestid' => (int) ($GLOBALS['CFG']->siteguest ?? 1)];

        if (!empty($filters['courseid'])) {
            $where[] = "EXISTS (
                SELECT 1
                  FROM {user_enrolments} ue
                  JOIN {enrol} e ON e.id = ue.enrolid
                 WHERE ue.userid = u.id AND e.courseid = :courseid)";
            $params['courseid'] = (int) $filters['courseid'];
        } else if (!empty($filters['cohortid'])) {
            $where[] = "EXISTS (
                SELECT 1
                  FROM {cohort_members} cm
                 WHERE cm.userid = u.id AND cm.cohortid = :cohortid)";
            $params['cohortid'] = (int) $filters['cohortid'];
        } else {
            // No scope: match nothing rather than everything.
            $where[] = '1 = 0';
        }

        return [$fields, $from, implode(' AND ', $where), $params];
    }

    /**
     * Acknowledgement time in the viewer's timezone.
     *
     * @param stdClass $row
     * @return string
     */
    public function col_timecreated(stdClass $row): string {
        return userdate($row->timecreated);
    }

    /**
     * Language the wording was rendered in.
     *
     * @param stdClass $row
     * @return string
     */
    public function col_lang(stdClass $row): string {
        return s($row->lang ?? '');
    }

    /**
     * Link to the stored wording, flagged when it no longer matches the current release.
     *
     * @param stdClass $row
     * @return string
     */
    public function col_wording(stdClass $row): string {
        $superseded = !$this->is_current_wording($row);
        $status = get_string($superseded ? 'notice_report_superseded' : 'notice_report_current', 'tiny_cursive');

        if ($this->is_downloading()) {
            return $row->noticetexthash . ' (' . $status . ')';
        }

        $out = '';
        if (!empty($row->textid)) {
            $url = new moodle_url($this->baseurl, ['textid' => $row->textid]);
            $out .= html_writer::link($url, get_string('notice_report_viewwording', 'tiny_cursive'));
        } else {
            $out .= html_writer::tag('code', substr($row->noticetexthash, 0, 12));
        }

        $badgeclass = $superseded ? 'badge bg-warning text-dark badge-warning' : 'badge bg-success badge-success';
        $out .= ' ' . html_writer::span($status, $badgeclass . ' ml-1 ms-1');

        return $out;
    }

    /**
     * Whether the row's wording is what the current release renders for its language.
     *
     * @param stdClass $row
     * @return bool
     */
    protected function is_current_wording(stdClass $row): bool {
        $lang = $row->lang ?? current_language();
        if (!array_key_exists($lang, $this->currenthashes)) {
            $this->currenthashes[$lang] = notice::get_current_hash($lang);
        }
        return $this->currenthashes[$lang] === $row->noticetexthash;
    }

    /**
     * Message shown when nothing matches.
     */
    public function print_nothing_to_display() {
        global $OUTPUT;

        echo $this->render_reset_button();
        $this->print_initials_bar();
        echo $OUTPUT->notification(get_string('notice_report_norecords', 'tiny_cursive'), 'info', false);
    }
}
