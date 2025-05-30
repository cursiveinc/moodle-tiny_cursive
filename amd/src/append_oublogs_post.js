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
 * This module provides functionality to append blog posts in the OU Blogs plugin for TinyMCE editor
 *
 * @module     tiny_cursive/append_oublogs_post
 * @copyright  2025  CTI <info@cursivetechnology.com>
 * @author     Brain Station 23 <sales@brainstation-23.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {call as getData} from 'core/ajax';
import templates from 'core/templates';
import AnalyticEvents from './analytic_events';
import analyticButton from './analytic_button';
import Replay from './replay';

export const init = (scoreSetting) => {
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
                const contentElement = document.getElementById('content' + mid);
                if (contentElement) {
                    contentElement.innerHTML = html;
                }
                return contentElement;
            }).catch(e => window.console.error(e));
        }
        return false;

    };

    const ouBlogPosts = document.querySelectorAll('.oublog-post');
    const cmid = M.cfg.contextInstanceId;
    ouBlogPosts.forEach(function(element) {
        const postedByLink = element.querySelector('.oublog-postedby a');
        const permalinkElement = element.querySelector('.oublog-post-links a');

        const postedByHref = postedByLink.getAttribute('href');
        const permalink = permalinkElement.getAttribute('href');

        const resourceIdParam = new URLSearchParams(permalink.split('?')[1]).get('post');
        const useridParam = new URLSearchParams(postedByHref.split('?')[1]).get('id');

        const resourceId = resourceIdParam ? parseInt(resourceIdParam) : 0;
        const userid = useridParam ? parseInt(useridParam) : 0;
        let filepath = '';

        if (userid && resourceId) {
            let args = {id: userid, resourceid: resourceId, modulename: "oublog", cmid: cmid};
            let methodname = 'cursive_get_oublog_submission_data';
            let com = getData([{methodname, args}]);

            com[0].done(function(json) {
                var data = JSON.parse(json);
                if (data.res.filename) {
                    filepath = data.res.filename;
                }

                const postLinksElement = element.querySelector('.oublog-post-links');
                if (postLinksElement) {
                    postLinksElement.append(analyticButton(userid));
                }

                const myEvents = new AnalyticEvents();
                const context = {
                    tabledata: data.res,
                    formattime: myEvents.formatedTime(data.res),
                    page: scoreSetting,
                    userid: userid,
                };

                const authIcon = myEvents.authorshipStatus(data.res.first_file, data.res.score, scoreSetting);
                myEvents.createModal(userid, context, '', authIcon);
                myEvents.analytics(userid, templates, context, '', replayInstances, authIcon);
                myEvents.checkDiff(userid, data.res.file_id, '', replayInstances);
                myEvents.replyWriting(userid, filepath, '', replayInstances);

            });

            com[0].fail((error) => {
                window.console.error(error);
            });
        }
    });

};