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
 * @author kuldeep singh <mca.kuldeep.sekhon@gmail.com>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * tiny_cursive_renderer
 */
class tiny_cursive_renderer extends plugin_renderer_base {

    /**
     * Generates a timer report table with user attempt data.
     *
     * @param array $users Array containing user attempt data and count
     * @param int $courseid ID of the course
     * @param int $page Current page number for pagination
     * @param int $limit Number of records per page
     * @param string $baseurl Base URL for pagination links
     * @return void
     * @throws coding_exception
     * @throws dml_exception
     * @throws moodle_exception
     */
    public function timer_report($users, $courseid, $page = 0, $limit = 5, $baseurl = '') {
        global $DB;

        $totalcount = $users['count'];
        $data       = $users['data'];

        $table      = new html_table();
        $table->attributes['class'] = 'table table-hover mx-2 my-3 overflow-hidden';
        $table->attributes['style'] = 'width: 98%;';
        $table->head = [
            get_string('attemptid', 'tiny_cursive'),
            get_string('fullname', 'tiny_cursive'),
            get_string('email', 'tiny_cursive'),
            get_string('module_name', 'tiny_cursive'),
            get_string('last_modified', 'tiny_cursive'),
            get_string('analytics', 'tiny_cursive'),
            get_string("download", 'tiny_cursive'),
        ];
        foreach ($data as $user) {

            $modinfo  = get_fast_modinfo($courseid);
            $cm       = $modinfo->get_cm($user->cmid);
            $module   = get_coursemodule_from_id($cm?->modname, $user->cmid, 0, false, MUST_EXIST);
            $filepath = $user->filename;

            $row   = [];
            $row[] = $user->fileid;
            $row[] = fullname($user);
            $row[] = $user->email;
            $row[] = $module->name;
            $row[] = date("l jS \of F Y h:i:s A", $user->timemodified);
            $row[] = html_writer::div(
                get_string('analytics', 'tiny_cursive'), 'analytic-modal', [
                        'data-cmid' => $user->cmid,
                        'data-filepath' => $filepath,
                        'data-id' => $user->attemptid,
                    ]);
            $row[] = html_writer::link(
                new moodle_url('/lib/editor/tiny/plugins/cursive/download_json.php', [
                    'fname'   => $user->filename,
                    'quizid'  => 2,
                    'user_id' => $user->usrid,
                    'cmid'    => $user->cmid,
                ]),
                get_string('download', 'tiny_cursive'),
                [
                    'class' => 'btn btn-primary',
                    'style' => 'margin-right:50px;',
                    'aria-describedby' => get_string('download_attempt_json', 'tiny_cursive'),
                    'role'  => 'button',
                ],
            );
            $table->data[] = $row;
        }
        echo html_writer::table($table);
        echo $this->output->paging_bar($totalcount, $page, $limit, $baseurl);
    }

    /**
     * Generates a user writing report with analytics and download options
     *
     * @param array $users Array containing user attempt data and count
     * @param stdClass $userprofile User profile data including word count and time stats
     * @param int $userid ID of the user
     * @param int $page Current page number for pagination
     * @param int $limit Number of records per page
     * @param string $baseurl Base URL for pagination links
     * @return void
     * @throws coding_exception
     * @throws dml_exception
     * @throws moodle_exception
     */
    public function tiny_cursive_user_writing_report($users, $userprofile, $userid, $page = 0, $limit = 5, $baseurl = '') {
        global $CFG, $DB, $USER;
        require_once($CFG->dirroot . "/lib/editor/tiny/plugins/cursive/lib.php");

        $courseid  = optional_param('courseid', 0, PARAM_INT);
        $svg       = $this->output->pix_icon('analytics', 'analytics icon', 'tiny_cursive', ['class' => 'mr-0']);
        $totaltime = "0";
        $icon      = html_writer::tag('i', $svg, ['class' => 'tiny_cursive-analytics-icon']);
        $user      = $DB->get_record('user', ['id' => $userid], '*', MUST_EXIST);

        if (isset($userprofile->total_time) && $userprofile->total_time > 0) {

            $seconds   = $userprofile->total_time;
            $interval  = new DateInterval('PT' . $seconds . 'S');
            $datetime  = new DateTime('@0');
            $datetime->add($interval);
            $hrs       = $datetime->format('G');
            $mins      = $datetime->format('i');
            $secs      = $datetime->format('s');
            $totaltime = (int) $hrs . "h : " . (int) $mins . "m : " . (int) $secs . "s";
            $avgwords  = round($userprofile->word_count / ($userprofile->total_time / 60));

        } else {
            $avgwords  = 0;
        }

        if (is_siteadmin($USER->id)) {
            $courses = enrol_get_users_courses($userid, true, 'id, fullname', 'fullname ASC');
        } else if ($USER->id != $userid) {
            $courses = enrol_get_users_courses($USER->id, true, 'id, fullname', 'fullname ASC');
        } else {
            $courses = enrol_get_users_courses($USER->id, true, 'id, fullname', 'fullname ASC');
        }

        $options    = [];
        $currenturl = new moodle_url($baseurl, ['userid' => $userid, 'courseid' => null]);

        $allcoursesurl = $currenturl->out(false, ['courseid' => null]);
        $allattributes =
            empty($courseid) ? ['value' => $allcoursesurl, 'selected' => 'selected'] : ['value' => $allcoursesurl];
        if (is_siteadmin($USER->id) || $courseid == '' || isset($courseid) || $courseid == null) {
            $options[] = html_writer::tag('option', get_string('allcourses', 'tiny_cursive'), $allattributes);
        }

        foreach ($courses as $course) {
            $cursive = get_config('tiny_cursive', "cursive-$course->id");

            if ($cursive == '1' || $cursive === false) {
                $courseurl   = new moodle_url($baseurl, ['userid' => $userid, 'courseid' => $course->id]);
                $cattributes = (isset($courseid) && $courseid == $course->id) ? ['value' => $courseurl,
                'selected'   => 'selected'] : ['value' => $courseurl];
                $options[]   = html_writer::tag('option', $course->fullname, $cattributes);
            }
        }

        $select = html_writer::tag('select', implode('', $options), [
            'id'       => 'course-select',
            'class'    => 'custom-select',
            'onchange' => 'window.location.href=this.value',
        ]);

        $totalcount = $users['count'];
        $data       = $users['data'];

        $userdata = [];
        foreach ($data as $user) {
            $courseid = $user->courseid;

            $cursive = get_config('tiny_cursive', "cursive-$courseid");
            if ($cursive == '0') {
                continue;
            }

            $cm = null;
            if ($courseid) {
                $modinfo = get_fast_modinfo($courseid);
                if ($modinfo) {
                    $cm = $modinfo->get_cm($user->cmid);
                }
            }

            $getmodulename = $cm ? get_coursemodule_from_id($cm->modname,
            $user->cmid, 0, false, MUST_EXIST) : null;

            $filepath = $user->filename;
            $row      = [];
            $row['modulename']   = $getmodulename ? $getmodulename->name : '';
            $row['lastmodified'] = date("l jS \of F Y h:i:s A", $user->timemodified);
            $row['analytics']    = html_writer::div(
                html_writer::span(
                    $icon . html_writer::span(get_string('analytics', 'tiny_cursive')),
                    'd-inline-flex align-items-center text-white tiny_cursive-analytics-btn'
                ),
                'analytic-modal',
                [
                    'data-cmid'     => $user->cmid,
                    'data-filepath' => $filepath,
                    'data-id'       => $user->attemptid,
                ]
            );
            $row['download']    = html_writer::link(
                new moodle_url('/lib/editor/tiny/plugins/cursive/download_json.php', [
                    'fname'   => $user->filename,
                    'quizid'  => 2,
                    'user_id' => $user->usrid,
                    'cmid'    => $user->cmid,
                ]),
                get_string('download', 'tiny_cursive'),
                [
                    'class' => 'tiny_cursive-writing-report-download-btn download-btn',
                    'aria-describedby' => get_string('download_attempt_json', 'tiny_cursive'),
                    'role'  => 'button',
                ],
            );
            $userdata[] = $row;
        }

        $title = fullname($user);
        echo $this->output->render_from_template(
            'tiny_cursive/writing_report',
            [
                'total_word' => $userprofile->word_count ?? 0,
                'total_time' => $totaltime,
                'avg_min'    => $avgwords,
                'username'   => $title,
                'userdata'   => $userdata,
                'options'    => $select,
            ],
        );

        $pagingbar = new paging_bar($totalcount, $page, $limit, $baseurl);
        echo $this->output->render($pagingbar);

    }

}
