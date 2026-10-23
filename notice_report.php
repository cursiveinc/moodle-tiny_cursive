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
 * Report of data transparency notice acknowledgements.
 *
 * @package    tiny_cursive
 * @copyright  2026 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

use tiny_cursive\forms\notice_report_filter_form;
use tiny_cursive\local\table\notice_report_table;
use tiny_cursive\notice;

require(__DIR__ . '/../../../../../config.php');

// Deliberately not admin_externalpage_setup(): the admin tree only loads plugin settings
// files for users with moodle/site:config, so a manager holding the report capability
// would be refused before the capability was ever checked.
require_login();
$context = context_system::instance();
require_capability('tiny/cursive:viewnoticereport', $context);

$pageurl = new moodle_url('/lib/editor/tiny/plugins/cursive/notice_report.php');
$PAGE->set_context($context);
$PAGE->set_url($pageurl);
$PAGE->set_pagelayout('report');
$PAGE->set_title(get_string('notice_report', 'tiny_cursive'));
$PAGE->set_heading(get_string('notice_report', 'tiny_cursive'));
if (has_capability('moodle/site:config', $context)) {
    $PAGE->navbar->add(get_string('administrationsite'), new moodle_url('/admin/search.php'));
    $PAGE->navbar->add(get_string('reports'), new moodle_url('/admin/category.php', ['category' => 'reports']));
}
$PAGE->navbar->add(get_string('notice_report', 'tiny_cursive'), $pageurl);

$textid = optional_param('textid', 0, PARAM_INT);
$download = optional_param('download', '', PARAM_ALPHA);

$filters = [
    'mode' => optional_param('mode', notice_report_table::MODE_ACKNOWLEDGED, PARAM_ALPHA),
    'datefrom' => optional_param('datefrom', 0, PARAM_INT),
    'dateto' => optional_param('dateto', 0, PARAM_INT),
    'noticeversion' => optional_param('noticeversion', 0, PARAM_INT),
    'lang' => optional_param('lang', '', PARAM_LANG),
    'courseid' => optional_param('courseid', 0, PARAM_INT),
    'cohortid' => optional_param('cohortid', 0, PARAM_INT),
];
if (!in_array($filters['mode'], [notice_report_table::MODE_ACKNOWLEDGED, notice_report_table::MODE_PENDING], true)) {
    $filters['mode'] = notice_report_table::MODE_ACKNOWLEDGED;
}

$form = new notice_report_filter_form($pageurl, null, 'get');

if ($data = $form->get_data()) {
    // The form submitted new filters: fold them into the canonical scalar URL parameters
    // so sorting, paging and download links all carry the same filters.
    $filters = [
        'mode' => $data->mode,
        'datefrom' => (int) ($data->datefrom ?? 0),
        'dateto' => $data->dateto ? (int) $data->dateto + DAYSECS - 1 : 0,
        'noticeversion' => (int) ($data->noticeversion ?? 0),
        'lang' => (string) ($data->lang ?? ''),
        'courseid' => (int) ($data->courseid ?? 0),
        'cohortid' => (int) ($data->cohortid ?? 0),
    ];
    redirect(new moodle_url($pageurl, array_filter($filters)));
}

$baseurl = new moodle_url($pageurl, array_filter($filters));

// Single wording view.
if ($textid) {
    $snapshot = $DB->get_record('tiny_cursive_notice_text', ['id' => $textid], '*', MUST_EXIST);
    $count = $DB->count_records('tiny_cursive_notice', ['noticetexthash' => $snapshot->noticetexthash]);
    $iscurrent = notice::get_current_hash($snapshot->lang) === $snapshot->noticetexthash;

    $PAGE->set_url(new moodle_url($baseurl, ['textid' => $textid]));
    echo $OUTPUT->header();
    echo $OUTPUT->heading(get_string('notice_report_wording_heading', 'tiny_cursive'));

    echo $OUTPUT->notification(
        get_string($iscurrent ? 'notice_report_wording_current' : 'notice_report_wording_superseded', 'tiny_cursive'),
        $iscurrent ? \core\output\notification::NOTIFY_SUCCESS : \core\output\notification::NOTIFY_WARNING,
        false
    );

    $details = [
        get_string('notice_report_version', 'tiny_cursive') => (int) $snapshot->noticeversion,
        get_string('notice_report_lang', 'tiny_cursive') => s($snapshot->lang),
        get_string('notice_report_firstseen', 'tiny_cursive') => userdate($snapshot->timecreated),
        get_string('notice_report_count', 'tiny_cursive') => $count,
        'SHA-256' => html_writer::tag('code', $snapshot->noticetexthash),
    ];
    $dl = '';
    foreach ($details as $label => $value) {
        $dl .= html_writer::tag('dt', $label, ['class' => 'col-sm-3']);
        $dl .= html_writer::tag('dd', $value, ['class' => 'col-sm-9']);
    }
    echo html_writer::tag('dl', $dl, ['class' => 'row']);

    echo html_writer::div(
        notice::format_text_for_display($snapshot->noticetext),
        'tiny_cursive-notice-gate border rounded p-3 mb-3'
    );

    echo html_writer::link($baseurl, get_string('notice_report_backtoreport', 'tiny_cursive'), ['class' => 'btn btn-secondary']);
    echo $OUTPUT->footer();
    exit;
}

$table = new notice_report_table('tiny_cursive_notice_report', $filters, $baseurl);
$table->is_downloading($download, 'tiny_cursive_notice_report_' . $filters['mode'], get_string('notice_report', 'tiny_cursive'));

$scoped = $filters['mode'] !== notice_report_table::MODE_PENDING || $filters['courseid'] || $filters['cohortid'];

if (!$table->is_downloading()) {
    $PAGE->set_url($baseurl);
    echo $OUTPUT->header();
    echo $OUTPUT->heading(get_string('notice_report', 'tiny_cursive'));

    if (!notice::is_enabled()) {
        echo $OUTPUT->notification(get_string('notice_report_disabled', 'tiny_cursive'), 'info', false);
    }

    $form->set_data([
        'mode' => $filters['mode'],
        'datefrom' => $filters['datefrom'],
        'dateto' => $filters['dateto'],
        'noticeversion' => $filters['noticeversion'],
        'lang' => $filters['lang'],
        'courseid' => $filters['courseid'],
        'cohortid' => $filters['cohortid'],
    ]);
    $form->display();

    if (!$scoped) {
        echo $OUTPUT->notification(get_string('notice_report_scoperequired', 'tiny_cursive'), 'warning', false);
    }
}

if ($scoped) {
    $table->out(50, false);
}

if (!$table->is_downloading()) {
    echo $OUTPUT->footer();
}
