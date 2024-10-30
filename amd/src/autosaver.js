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
 * @module     tiny_cursive/autosaver
 * @category TinyMCE Editor
 * @copyright  CTI <info@cursivetechnology.com>
 * @author kuldeep singh <mca.kuldeep.sekhon@gmail.com>
 */

import { call } from 'core/ajax';
import { create } from 'core/modal_factory';
import { get_string as getString } from 'core/str';
import { save, cancel, hidden } from 'core/modal_events';

export const register = (editor) => {
    const postOne = (methodname, args) => call([{
        methodname,
        args,
    }])[0];
    var is_student, intervention;

    var bodyElement = document.querySelector('#body');
    if (bodyElement) {
        is_student = !bodyElement.classList.contains('teacher_admin'); // true or false
        intervention = bodyElement.classList.contains('intervention'); // true or false
    } else {
        console.error('#body element not found');
    }

    const getModal = (e) => {
        return create({
            type: 'SAVE_CANCEL',
            title: getString('tiny_cursive', 'tiny_cursive'),
            body: '<textarea class="form-control inputUrl" value="" id="inputUrl" placeholder="sourceurl"></textarea>',
            removeOnClose: true,
        })
            .done(modal => {
                modal.getRoot().append('<style>.close { display: none !important; }</style>');
                modal.show();

                var lastEvent = '';
                modal.getRoot().on(save, function () {
                    var number = document.getElementById("inputUrl").value;
                    if (number === "" || number === null || number === undefined) {
                        editor.execCommand('Undo');
                        alert("You cannot paste text without providing source");
                    } else {
                        editor.execCommand('Paste');
                    }

                    let ur = e.srcElement.baseURI;
                    let recourceId = 0;
                    let parm = new URL(ur);
                    let modulename = "";
                    let editorid = editor?.id;
                    let bodyClasses = document.body.className.split(' ');

                    let courseid = parseInt(bodyClasses.find(classname => classname.startsWith('course-')).split('-')[1]);
                    let cmid = parseInt(bodyClasses.find(classname => classname.startsWith('cmid-')).split('-')[1]);

                    if (!ur.includes("forum") && !ur.includes("assign")) {
                        recourceId = parm.searchParams.get('attempt');
                    }

                    recourceId = recourceId === null ? 0 : recourceId;

                    if (ur.includes("forum")) {
                        modulename = "forum";
                    } else if (ur.includes("assign")) {
                        modulename = "assign";
                    } else if (ur.includes("attempt")) {
                        modulename = "quiz";
                    }

                    postOne('cursive_user_comments', {
                        modulename: modulename,
                        cmid: cmid || 0,
                        resourceid: recourceId,
                        courseid: courseid,
                        usercomment: number,
                        timemodified: "1121232",
                        editorid: editorid || ""
                    });

                    lastEvent = 'save';
                    modal.destroy();
                });

                modal.getRoot().on(cancel, function () {
                    editor.execCommand('Undo');
                    lastEvent = 'cancel';
                });

                modal.getRoot().on(hidden, function () {
                    if (lastEvent !== 'cancel' && lastEvent !== 'save') {
                        editor.execCommand('Undo');
                    }
                });

                return modal;
            });
    };

    const sendKeyEvent = (event, ed) => {
        let ur = ed.srcElement.baseURI;
        let parm = new URL(ur);
        let recourceId = 0;
        let modulename = "";
        let editorid = editor?.id;
        let bodyClasses = document.body.className.split(' ');

        let cmid = parseInt(bodyClasses.find(classname => classname.startsWith('cmid-')).split('-')[1]);

        if (ur.includes("attempt.php") || ur.includes("forum") || ur.includes("assign")) {
            if (!ur.includes("forum") && !ur.includes("assign")) {
                recourceId = parm.searchParams.get('attempt');
            }

            recourceId = recourceId === null ? 0 : recourceId;

            if (ur.includes("forum")) {
                modulename = "forum";
            } else if (ur.includes("assign")) {
                modulename = "assign";
            } else if (ur.includes("attempt")) {
                modulename = "quiz";
            }

            postOne('cursive_json', {
                key: ed.key,
                event: event,
                keyCode: ed.keyCode,
                resourceId: recourceId,
                cmid: cmid,
                modulename: modulename,
                editorid: editorid || ""
            });
        }
    };

    editor.on('keyUp', (editor) => {
        sendKeyEvent("keyUp", editor);
    });

    editor.on('Paste', async (e) => {
        if (is_student && intervention) {
            getModal(e);
        }
    });

    editor.on('Redo', async (e) => {
        if (is_student && intervention) {
            getModal(e);
        }
    });

    editor.on('keyDown', (editor) => {
        sendKeyEvent("keyDown", editor);
    });

    editor.on('init', () => { });
};
