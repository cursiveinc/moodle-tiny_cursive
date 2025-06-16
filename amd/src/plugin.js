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
 * @module     tiny_cursive/plugin
 * @category   TinyMCE Editor
 * @copyright  2025 CTI <info@cursivetechnology.com>
 * @author     Brain Station 23 <sales@brainstation-23.com>
 */

import {getTinyMCE} from 'editor_tiny/loader';
import {getPluginMetadata} from 'editor_tiny/utils';
import {component, pluginName} from './common';
import * as Autosaver from './autosaver';
import getConfig from 'core/ajax';

export default new Promise((resolve, reject) => {
    const page = [
        'page-mod-assign-editsubmission',
        'page-mod-quiz-attempt',
        'page-mod-forum-view',
        'page-mod-forum-post',
        'page-mod-lesson-view',
        'page-mod-oublog-editpost'];

    Promise.all([
        getTinyMCE(),
        getPluginMetadata(component, pluginName),
    ])
        .then(([tinyMCE, pluginMetadata]) => {
            tinyMCE.PluginManager.add(pluginName, (editor) => {

                getConfig.call([{
                    methodname: "cursive_get_config",
                    args: {courseid: M.cfg.courseId, cmid: M.cfg.contextInstanceId}
                }])[0].done((data) => {
                    if (data.status && page.includes(document.body.id) && data.mod_state) {

                        Autosaver.register(editor, data.sync_interval, data.userid);
                    }
                }).fail((error) => {
                    window.console.error('Error getting cursive config:', error);
                });

                return pluginMetadata;
            });
            return resolve(pluginName);
        })
        .catch((error) => {
            reject(error);
        });
});
