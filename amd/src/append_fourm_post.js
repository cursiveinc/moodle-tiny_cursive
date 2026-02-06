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
 * @module     tiny_cursive/append_fourm_post
 * @category TinyMCE Editor
 * @copyright  CTI <info@cursivetechnology.com>
 * @author kuldeep singh <mca.kuldeep.sekhon@gmail.com>
 */

define(["jquery", "core/ajax", "core/str", "core/templates", "./replay", "./analytic_button",
    "./replay_button", "./analytic_events"], function(
    $,
    AJAX,
    str,
    templates,
    Replay,
    analyticButton,
    replayButton,
    AnalyticEvents
) {
    const replayInstances = {};
    // eslint-disable-next-line camelcase
    window.video_playback = function(mid, filepath) {
        if (filepath !== '') {
            const replay = new Replay(
                'content' + mid,
                filepath,
                10,
                false,
                'player_' + mid
            );
            replayInstances[mid] = replay;
        } else {
            templates.render('tiny_cursive/no_submission').then(html => {
                $('#content' + mid).html(html);
                return true;
            }).catch(e => window.console.error(e));
        }
        return false;

    };

    var usersTable = {
        init: function(scoreSetting, showcomment, hasApiKey) {
            str
                .get_strings([
                    {key: "field_require", component: "tiny_cursive"},
                ])
                .done(function() {
                    usersTable.getToken(scoreSetting, showcomment, hasApiKey);
                });
        },
        getToken: function(scoreSetting, showcomment, hasApiKey) {
            $('#page-mod-forum-discuss').find("article").get().forEach(function(entry) {
                var replyButton = $('a[data-region="post-action"][title="Reply"]');
                if (replyButton.length > 0) {
                    replyButton.on('click', function(event) {
                        var isTeacher = $('#body').hasClass('teacher_admin');
                        if (isTeacher) {
                            return true;
                        }
                        event.preventDefault();
                        var url = $(this).attr('href');

                        var urlParts = url.split('#');
                        var baseUrl = urlParts[0];
                        var hash = urlParts.length > 1 ? '#' + urlParts[1] : '';

                        if (baseUrl.indexOf('setformat=') > -1) {
                            baseUrl = baseUrl.replace(/setformat=\d/, 'setformat=1');
                        } else if (baseUrl.indexOf('?') > -1) {
                            baseUrl += '&setformat=1';
                        } else {
                            baseUrl += '?setformat=1';
                        }
                        var finalUrl = baseUrl + hash;

                        window.location.href = finalUrl;
                    });
                }

                var ids = $("#" + entry.id).data("post-id");
                var cmid = M.cfg.contextInstanceId;

                let args = {id: ids, modulename: "forum", cmid: cmid};
                let methodname = 'cursive_get_forum_comment_link';
                let com = AJAX.call([{methodname, args}]);
                com[0].done(function(json) {
                    var data = JSON.parse(json);

                    var filepath = '';
                    if (data.data.filename) {
                        filepath = data.data.filename;
                    }
                    if (filepath) {

                        let analyticButtonDiv = document.createElement('div');

                        if (!hasApiKey) {
                            $(analyticButtonDiv).html(replayButton(ids));
                        } else {
                            analyticButtonDiv.append(analyticButton(data.data.effort_ratio, ids));
                        }

                        analyticButtonDiv.classList.add('text-center', 'my-2');
                        analyticButtonDiv.dataset.region = "analytic-div" + ids;

                        $("#" + entry.id).find('#post-content-' + ids).prepend(analyticButtonDiv);

                        let myEvents = new AnalyticEvents();
                        var context = {
                            tabledata: data.data,
                            formattime: myEvents.formatedTime(data.data),
                            page: scoreSetting,
                            userid: ids,
                            apikey: hasApiKey
                        };

                        let authIcon = myEvents.authorshipStatus(data.data.first_file, data.data.score, scoreSetting);
                        myEvents.createModal(ids, context, '', replayInstances, authIcon);
                        myEvents.analytics(ids, templates, context, '', replayInstances, authIcon);
                        myEvents.checkDiff(ids, data.data.file_id, '', replayInstances);
                        myEvents.replyWriting(ids, filepath, '', replayInstances);
                    }

                });
                return com.usercomment;
            });
        },
    };
    return usersTable;


});