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
 * Tiny cursive plugin.
 *
 * @package tiny_cursive
 * @copyright  CTI <info@cursivetechnology.com>
 * @author Brain Station 23 <elearning@brainstation-23.com>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

class tiny_cursive_renderer extends plugin_renderer_base {
    /**
     * timer_report
     *
     * @param $users
     * @param $courseid
     * @param $page
     * @param $limit
     * @param $baseurl
     * @return void
     * @throws coding_exception
     * @throws dml_exception
     * @throws moodle_exception
     */
    public function timer_report($users, $courseid, $page = 0, $limit = 5, $baseurl = '') {
        global $CFG, $DB;
        $totalcount = $users['count'];

        $data = $users['data'];

        $table = new html_table();
        $table->head = [
            get_string('attemptid', 'tiny_cursive'),
            get_string('fulname', 'tiny_cursive'),
            get_string('email', 'tiny_cursive'),
            get_string('module_name', 'tiny_cursive'),
            get_string('last_modified', 'tiny_cursive'),
            get_string('analytics', 'tiny_cursive'),
            get_string("download", 'tiny_cursive'),
        ];

        foreach ($data as $user) {
            $sql = 'SELECT id AS fileid
                      FROM {tiny_cursive_files}
                     WHERE userid = :userid ORDER BY id ASC Limit 1';

            $ffile = $DB->get_record_sql($sql, ['userid' => $user->usrid]);
            $ffile = (array) $ffile;
            if ($ffile['fileid'] == $user->fileid) {
                $firstfile = 1;
            } else {
                $firstfile = 0;
            }

            $modinfo = get_fast_modinfo($courseid);
            $cm = $modinfo->get_cm($user->cmid);
            $getmodulename = get_coursemodule_from_id($cm?->modname, $user->cmid, 0, false, MUST_EXIST);

            $filepath = $user->filename;
            $row = [];
            $row[] = $user->fileid;
            $row[] = fullname($user);
            $row[] = $user->email;
            $row[] = $getmodulename->name;
            $row[] = date("l jS \of F Y h:i:s A", $user->timemodified);
            $row[] = '<div class ="analytic-modal" data-cmid="' . $user->cmid .
                '" data-filepath="' . $filepath . '" data-id="' . $user->attemptid .
                '" >' . get_string('analytics', 'tiny_cursive') . '</div>';
            $row[] = html_writer::link(
                new moodle_url('/lib/editor/tiny/plugins/cursive/download_json.php', [
                    'fname' => $user->filename,
                    'quizid' => 2,
                    'user_id' => $user->usrid,
                    'cmid' => $user->cmid,
                ]),
                get_string('download', 'tiny_cursive'),
                [
                    'class' => 'btn btn-primary',
                    'style' => 'margin-right:50px;',
                    'aria-describedby' => get_string('download_attempt_json', 'tiny_cursive'),
                    'role' => 'button',
                ]
            );
            $table->data[] = $row;
        }
        echo html_writer::table($table);
        echo $this->output->paging_bar($totalcount, $page, $limit, $baseurl);
    }

    /**
     * user_writing_report
     *
     * @param $users
     * @param $userprofile
     * @param $username
     * @param $page
     * @param $limit
     * @param $baseurl
     * @return void
     * @throws coding_exception
     * @throws dml_exception
     * @throws moodle_exception
     */
    public function user_writing_report($users, $userprofile, $userid, $page = 0, $limit = 5, $baseurl = '') {
        global $CFG, $DB, $USER;
        require_once($CFG->dirroot . "/lib/editor/tiny/plugins/cursive/lib.php");
        $courseid = optional_param('courseid', 0, PARAM_INT);
        $wordcount = $userprofile->word_count ?? 0;
        echo get_string('total_word', 'tiny_cursive') . " $wordcount</br>";
        if (isset($userprofile->total_time) && $userprofile->total_time > 0) {

            $seconds = $userprofile->total_time;
            $interval = new DateInterval('PT' . $seconds . 'S');
            $datetime = new DateTime('@0');
            $datetime->add($interval);
            $hrs = $datetime->format('G');
            $mins = $datetime->format('i');
            $secs = $datetime->format('s');
            echo get_string('total_time', 'tiny_cursive') .
                ": " . (int)$hrs . "h : " . (int)$mins . "m : " . (int)$secs . "s</br>";
            $avgwords = round($userprofile->word_count / ($userprofile->total_time / 60));

        } else {
            // Handle the case when there is no time data.
            echo get_string('total_time', 'tiny_cursive') . ": 0</br>";
            $avgwords = 0;
        }

        echo get_string('average_min', 'tiny_cursive') . " " . $avgwords . "</br></br>";
        $sql = "SELECT c.fullname, c.id, u.id AS userid, u.firstname, u.lastname
                  FROM {course} c
                  JOIN {enrol} en ON en.courseid = c.id
                  JOIN {user_enrolments} ue ON ue.enrolid = en.id
                  JOIN {user} u ON u.id = ue.userid
                 WHERE ue.userid = :userid";

        if (is_siteadmin($USER->id)) {
            // The user is a site admin.
            $courses = $DB->get_records_sql($sql, ['userid' => $userid]);
        } else if ($USER->id != $userid) {
            // The user is not a site admin.
            $courses = $DB->get_records_sql($sql, ['userid' => $USER->id]);
        } else {
            // Not a site admin.
            $courses = $DB->get_records_sql($sql, ['userid' => $USER->id]);
        }
        $options = [];
        $currenturl = new moodle_url($baseurl, ['userid' => $userid, 'courseid' => null]);
        $allcoursesurl = $currenturl->out(false, ['courseid' => null]);
        $allcoursesattributes =
            empty($courseid) ? ['value' => $allcoursesurl, 'selected' => 'selected'] : ['value' => $allcoursesurl];
        if (is_siteadmin($USER->id) || $courseid == '' || !isset($courseid) || $courseid == null) {
            $options[] = html_writer::tag('option', 'All Courses', $allcoursesattributes);
        }
        foreach ($courses as $course) {
            $courseurl = new moodle_url($baseurl, ['userid' => $userid, 'courseid' => $course->id]);
            $courseattributes = (isset($courseid) && $courseid == $course->id) ? ['value' => $courseurl, 'selected' => 'selected'] :
                ['value' => $courseurl];
            $options[] = html_writer::tag('option', $course->fullname, $courseattributes);
        }

        $select = html_writer::tag('select', implode('', $options), [
            'id' => 'course-select',
            'class' => 'custom-select',
            'onchange' => 'window.location.href=this.value',
        ]);

        echo html_writer::start_tag('div', ['class' => 'mb-4']);
        echo html_writer::tag('strong', get_string("selectcrs", 'tiny_cursive'));
        echo html_writer::end_tag('strong');
        echo "<br>";
        echo $select;
        echo html_writer::end_tag('div');

        $table = new html_table();
        $table->id = 'writing_report_table';
        $totalcount = $users['count'];
        $data = $users['data'];

        $table->head = [
            get_string('module_name', 'tiny_cursive'),
            get_string('last_modified', 'tiny_cursive'),
            get_string('analytics', 'tiny_cursive'),
            get_string('download', 'tiny_cursive'),
        ];

        $sql = 'SELECT id
                  FROM {tiny_cursive_files}
                 WHERE userid = :userid ORDER BY id ASC LIMIT 1';
        $firstfile = $DB->get_record_sql(
            $sql,
            ['userid' => $userid]
        );

        foreach ($data as $user) {
            $courseid = $user->courseid;
            $cm = null;
            if ($courseid) {
                $modinfo = get_fast_modinfo($courseid);
                if ($modinfo) {
                    $cm = $modinfo->get_cm($user->cmid);
                }
            }

            $getmodulename = $cm ? get_coursemodule_from_id($cm->modname, $user->cmid, 0, false, MUST_EXIST) : null;

            $filepath = $user->filename;
            $row   = [];
            $row[] = $getmodulename ? $getmodulename->name : '';
            $row[] = date("l jS \of F Y h:i:s A", $user->timemodified);
            $row[] = '<div class ="analytic-modal" data-cmid="' . $user->cmid . '" data-filepath="' . $filepath . '" data-id="' .
                $user->attemptid . '" >'. get_string('analytics', 'tiny_cursive') . '</div>';
            $row[] = html_writer::link(
                new moodle_url('/lib/editor/tiny/plugins/cursive/download_json.php', [
                    'fname' => $user->filename,
                    'quizid' => 2,
                    'user_id' => $user->usrid,
                    'cmid' => $user->cmid,
                ]),
                get_string('download', 'tiny_cursive'),
                [
                    'class' => 'btn btn-primary',
                    'style' => 'margin-right:50px;',
                    'aria-describedby' => get_string('download_attempt_json', 'tiny_cursive'),
                    'role' => 'button',
                ]
            );
            $table->data[] = $row;
        }

        echo html_writer::table($table);
        $pagingbar = new paging_bar($totalcount, $page, $limit, $baseurl);
        echo $this->output->render($pagingbar);

        echo html_writer::start_tag('div', ['class' => 'text-right']);
        echo html_writer::start_tag('a', [
            'class' => 'btn btn-icon bg-secondary icon-no-margin',
            'href' => 'https://docs.moodle.org/403/en/Cursive',
            'target' => '_blank',
        ]);
        echo html_writer::empty_tag('i', [
            'class' => 'icon fa fa-question fa-fw',
            'style' => 'position: relative; top: 10px;',
            'aria-hidden' => 'true',
        ]);
        echo html_writer::end_tag('i');
        echo html_writer::end_tag('a');
        echo html_writer::start_tag('span', ['class' => 'ml-2']);
        echo get_string("learn_more", "tiny_cursive");
        echo html_writer::end_tag('span');
        echo html_writer::end_tag('div');
        echo html_writer::start_tag('script', ['type' => 'text/template', 'id' => 'aria-descriptions-script']);
        echo "document.querySelectorAll('#writing_report_table tr th').forEach((el, index) => {
                switch (index) {
                    case 0:
                        el.setAttribute('aria-describedby','');
                        break;
                    case 1:
                        el.setAttribute('aria-describedby','');
                        break;
                    case 2:
                        el.setAttribute('aria-describedby','');
                        break;
                    case 3:
                        el.setAttribute('aria-describedby','');
                        break;
                    case 4:
                        el.setAttribute('aria-describedby','TypeID is a confidence score related to authorship');
                        break;
                }
            });";
        echo html_writer::end_tag('script');

    }

}
