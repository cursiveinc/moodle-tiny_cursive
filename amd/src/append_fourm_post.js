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

define(["jquery", "core/ajax", "core/str", "core/templates", "./replay", "./analytic_button", "./analytic_events"], function(
    $,
    AJAX,
    str,
    templates,
    Replay,
    analyticButton,
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
        init: function(scoreSetting, showcomment) {
            str
                .get_strings([
                    {key: "field_require", component: "tiny_cursive"},
                ])
                .done(function() {
                    usersTable.getToken(scoreSetting, showcomment);
                });
        },
        getToken: function(scoreSetting, showcomment) {
            $('#page-mod-forum-discuss').find("article").get().forEach(function(entry) {
                var replyButton = $('a[data-region="post-action"][title="Reply"]');
                if (replyButton.length > 0) {
                    replyButton.on('click', function(event) {
                        event.preventDefault();
                        var url = $(this).attr('href');
                        window.location.href = url;
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
                        analyticButtonDiv.append(analyticButton(ids));
                        analyticButtonDiv.classList.add('text-center', 'my-3');
                        analyticButtonDiv.dataset.region = "analytic-div" + ids;

                        if (data.usercomment != 'comments' && parseInt(showcomment)) {

                           str.get_string('refer', 'tiny_cursive').then(str =>{
                            let comments = "";
                            data.usercomment.forEach(element => {
                                // Create the anchor element
                                comments += '<div class="border-bottom p-3" style="font-weight:600;color:#0f6cbf">'
                                    + element.usercomment + '</div>';
                            });

                            $("#" + entry.id).find('#post-content-' + ids).prepend($('<div>')
                                .addClass('tiny_cursive-quiz-references rounded mb-2')
                                        .append(comments)).prepend($('<h4>').append(str));
                            return comments;
                            }).catch(error => {
                                window.console.error(error);
                            });
                        }
                        $("#" + entry.id).find('#post-content-' + ids).prepend(analyticButtonDiv);

                        let myEvents = new AnalyticEvents();
                        var context = {
                            tabledata: data.data,
                            formattime: myEvents.formatedTime(data.data),
                            page: scoreSetting,
                            userid: ids,
                        };

                        let authIcon = myEvents.authorshipStatus(data.data.first_file, data.data.score, scoreSetting);
                        myEvents.createModal(ids, context, '', authIcon);
                        myEvents.analytics(ids, templates, context, '', replayInstances, authIcon);
                        myEvents.checkDiff(ids, data.data.file_id, '', replayInstances);
                        myEvents.replyWriting(ids, filepath, '', replayInstances);
                        myEvents.quality(ids, templates, context, '', replayInstances, cmid);
                    }

                });
                return com.usercomment;
            });
        },
    };
    return usersTable;


});