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
 * @author Brain Station 23 <elearning@brainstation-23.com>
 */

define(["jquery", "core/ajax", "core/str", "core/templates", "./replay", "./analytic_button", "./analytic_events"], function(
    $,
    AJAX,
    str,
    templates,
    Replay,
    analyticButton,
    AnalyticEvents) {
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
                document.getElementById('content' + mid).innerHTML = html;
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
        getToken: function (score_setting, showcomment) {
            const articles = document.querySelectorAll('#page-mod-forum-discuss article');
            articles.forEach(function (entry) {
                const replyButton = document.querySelectorAll('a[data-region="post-action"][title="Reply"]');

                if (replyButton.length > 0) {
                    replyButton.forEach(button => {

                        button.addEventListener('click', function (event) {
                            event.preventDefault();
                            const url = button.getAttribute('href');
                            window.location.href = url;
                        });
                    });
                }

                const ids = document.getElementById(entry.id).getAttribute('data-post-id');
                var cmid = M.cfg.contextInstanceId;

                let args = { id: ids, modulename: "forum", cmid: cmid };
                let methodname = 'cursive_get_forum_comment_link';
                let com = AJAX.call([{ methodname, args }]);
                com[0].done(function (json) {
                    const data = JSON.parse(json);

                    let filepath = '';
                    if (data.data.filename) {
                        filepath = data.data.filename;
                        filepath = data.data.filename;
                    }

                    if (filepath) {
                        const analyticButtonDiv = document.createElement('div');
                        analyticButtonDiv.append(analyticButton(ids));
                        analyticButtonDiv.classList.add('text-center', 'mt-2');
                        analyticButtonDiv.setAttribute('data-region', "analytic-div" + ids);

                        document.getElementById('post-content-' + ids).append(analyticButtonDiv);

                        if (data.usercomment !== 'comments' && parseInt(showcomment)) {
                            let comments = "";
                            data.usercomment.forEach(element => {
                                comments += '<div class="border-bottom p-3 text-primary" style="font-weight:600;">' + element.usercomment + '</div>';
                            });

                            const commentDiv = document.createElement('div');
                            commentDiv.classList.add('tiny_cursive-quiz-references', 'rounded');
                            commentDiv.innerHTML = comments;

                            document.getElementById('post-content-' + ids).prepend(commentDiv);
                        }

                        const myEvents = new AnalyticEvents();
                        const context = {
                            tabledata: data.data,
                            formattime: myEvents.formatedTime(data.data),
                            page: scoreSetting,
                            userid: ids,
                        };

                        const authIcon = myEvents.authorshipStatus(data.data.first_file, data.data.score, score_setting);
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
