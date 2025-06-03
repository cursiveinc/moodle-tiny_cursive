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
 * @category   TinyMCE Editor
 * @copyright  CTI <info@cursivetechnology.com>
 * @author     Brain Station 23 <sales@brainstation-23.com>
 */

import {call} from 'core/ajax';
import {create} from 'core/modal_factory';
import {get_string as getString} from 'core/str';
import {save, cancel, hidden} from 'core/modal_events';
import jQuery from 'jquery';
import {iconUrl, iconGrayUrl} from 'tiny_cursive/common';

export const register = (editor, interval, userId, hasApiKey) => {

    var isStudent = !(jQuery('#body').hasClass('teacher_admin'));
    var intervention = jQuery('#body').hasClass('intervention');
    var userid = userId;
    var host = M.cfg.wwwroot;
    var courseid = M.cfg.courseId;
    var filename = "";
    var quizSubmit = jQuery('#mod_quiz-next-nav');
    var ed = "";
    var event = "";
    var resourceId = 0;
    var modulename = "";
    var editorid = editor?.id;
    var cmid = M.cfg.contextInstanceId;
    var questionid = 0;
    let assignSubmit = jQuery('#id_submitbutton');
    var syncInterval = interval ? interval * 1000 : 10000; // Default: Sync Every 10s.

    const postOne = async(methodname, args) => {
        try {
            const response = await call([{
                methodname,
                args,
            }])[0];
            return response;
        } catch (error) {
            window.console.error('Error in postOne:', error);
            throw error;
        }
    };

    assignSubmit.on('click', async function(e) {
        e.preventDefault();
        if (filename) {
            // eslint-disable-next-line
            syncData().then(() => {
                assignSubmit.off('click').click();
            });
        } else {
            assignSubmit.off('click').click();
        }
    });

    quizSubmit.on('click', async function(e) {
        e.preventDefault();
        if (filename) {
            // eslint-disable-next-line
            syncData().then(() => {
                quizSubmit.off('click').click();
            });
        } else {
            quizSubmit.off('click').click();
        }
    });

    const getModal = (e) => {

        Promise.all([
            getString('tiny_cursive_srcurl', 'tiny_cursive'),
            getString('tiny_cursive_srcurl_des', 'tiny_cursive'),
            getString('tiny_cursive_placeholder', 'tiny_cursive')
        ]).then(function([title, titledes, placeholder]) {

            return create({
                type: 'SAVE_CANCEL',
                title: `<div><div style='color:dark;font-weight:500;line-height:0.5'>${title}</div><span style='color:
                        gray;font-weight: 400;line-height: 1.2;font-size: 14px;display: inline-block;
                        margin-top: .5rem;'>${titledes}</span></div>`,
                body: `<textarea  class="form-control inputUrl" value="" id="inputUrl" placeholder="${placeholder}"></textarea>`,

                removeOnClose: true,
            })
                .done(modal => {
                    modal.getRoot().append(`
                        <style>
                                .close {
                                    display: none ! important;
                                }
                                body.tox-fullscreen .modal-dialog {
                                    max-width: 500px;
                                    max-height:300px;
                                    padding:1rem;
                                }
                                body.tox-fullscreen .modal-dialog .modal-header {
                                    height: auto;
                                    padding: 1rem
                                }
                         </style>`);
                    modal.show();
                    var lastEvent = '';
                    // eslint-disable-next-line
                    modal.getRoot().on(save, function() {
                        var number = document.getElementById("inputUrl").value.trim();
                        if (number === "" || number === null || number === undefined) {
                            editor.execCommand('Undo');
                            // eslint-disable-next-line
                            getString('pastewarning', 'tiny_cursive').then(str => alert(str));

                        } else {
                            editor.execCommand('Paste');
                        }
                        let ur = e.srcElement.baseURI;
                        let resourceId = 0;
                        let parm = new URL(ur);
                        let modulename = "";
                        let editorid = editor?.id;
                        let courseid = M.cfg.courseId;
                        let cmid = M.cfg.contextInstanceId;

                        // eslint-disable-next-line
                        if (ur.includes("attempt.php") || ur.includes("forum") || ur.includes("assign") || ur.includes("lesson") | ur.includes("oublog")) { } else {
                            return false;
                        }
                        if (ur.includes("forum") && !ur.includes("assign")) {
                            resourceId = parm.searchParams.get('edit');
                        }
                        if (!ur.includes("forum") && !ur.includes("assign")) {
                            resourceId = parm.searchParams.get('attempt');
                        }

                        if (resourceId === null) {
                            resourceId = 0;
                        }
                        if (ur.includes("forum")) {
                            modulename = "forum";
                        }
                        if (ur.includes("assign")) {
                            modulename = "assign";
                            resourceId = cmid;
                        }
                        if (ur.includes("attempt")) {
                            modulename = "quiz";
                        }
                        if (ur.includes("lesson")) {
                            modulename = "lesson";
                            resourceId = cmid;
                        }
                        if (ur.includes("oublog")) {
                            modulename = "oublog";
                            resourceId = 0;
                        }
                        if (cmid === null) {
                            cmid = 0;
                        }

                        postOne('cursive_user_comments', {
                            modulename: modulename,
                            cmid: cmid,
                            resourceid: resourceId,
                            courseid: courseid,
                            usercomment: number,
                            timemodified: Date.now(),
                            editorid: editorid ? editorid : ""
                        });
                        lastEvent = 'save';
                        modal.destroy();
                    });
                    modal.getRoot().on(cancel, function() {

                        editor.execCommand('Undo');
                        lastEvent = 'cancel';
                    });
                    modal.getRoot().on(hidden, function() {
                        if (lastEvent != 'cancel' && lastEvent != 'save') {
                            editor.execCommand('Undo');
                        }
                    });
                    return modal;
                });
        }).catch(error => window.console.error(error));

    };
    // eslint-disable-next-line
    const sendKeyEvent = (events, eds) => {
        let ur = eds.srcElement.baseURI;
        let parm = new URL(ur);
        ed = eds;
        event = events;
        // eslint-disable-next-line
        if (ur.includes("attempt.php") || ur.includes("forum") || ur.includes("assign") || ur.includes('lesson') || ur.includes("oublog")) { } else {
            return false;
        }

        if (ur.includes("forum") && !ur.includes("assign")) {
            resourceId = parm.searchParams.get('edit');
        } else {

            resourceId = parm.searchParams.get('attempt');
        }
        if (resourceId === null) {
            resourceId = 0;
        }

        if (ur.includes("forum")) {
            modulename = "forum";
        }
        if (ur.includes("assign")) {
            modulename = "assign";
            resourceId = cmid;
        }
        if (ur.includes("attempt")) {
            modulename = "quiz";
        }
        if (ur.includes("lesson")) {
            modulename = "lesson";
            resourceId = cmid;
        }
        if (ur.includes("oublog")) {
            modulename = "oublog";
            resourceId = 0;
        }

        filename = `${userid}_${resourceId}_${cmid}_${modulename}_attempt`;

        if (modulename === 'quiz') {
            questionid = editorid.split(':')[1].split('_')[0];
            filename = `${userid}_${resourceId}_${cmid}_${questionid}_${modulename}_attempt`;

        }

        if (localStorage.getItem(filename)) {

            let data = JSON.parse(localStorage.getItem(filename));
            data.push({
                resourceId: resourceId,
                key: ed.key,
                keyCode: ed.keyCode,
                event: event,
                courseId: courseid,
                unixTimestamp: Date.now(),
                clientId: host,
                personId: userid
            });
            localStorage.setItem(filename, JSON.stringify(data));
        } else {
            let data = [];
            data.push({
                resourceId: resourceId,
                key: ed.key,
                keyCode: ed.keyCode,
                event: event,
                courseId: courseid,
                unixTimestamp: Date.now(),
                clientId: host,
                personId: userid
            });
            localStorage.setItem(filename, JSON.stringify(data));
        }

    };
    editor.on('keyUp', (editor) => {
        customTooltip();
        sendKeyEvent("keyUp", editor);
    });
    editor.on('Paste', async(e) => {
        customTooltip();
        if (isStudent && intervention) {
            getModal(e);
        }
    });
    editor.on('Redo', async(e) => {
        customTooltip();
        if (isStudent && intervention) {
            getModal(e);
        }
    });
    editor.on('keyDown', (editor) => {
        sendKeyEvent("keyDown", editor);
        customTooltip();
    });
    // eslint-disable-next-line
    editor.on('init', () => {
        customTooltip();
    });
    editor.on('SkinLoaded', () => {

        customTooltip();
    });

    /**
     * Synchronizes data from localStorage to server
     * @async
     * @function SyncData
     * @description Retrieves stored keypress data from localStorage and sends it to server
     * @returns {Promise} Returns response from server if data exists and is successfully sent
     * @throws {Error} Logs error to console if data submission fails
     */
    async function syncData() {

        let data = localStorage.getItem(filename);

        if (!data || data.length === 0) {
            return;
        } else {
            localStorage.removeItem(filename);
            let originalText = editor.getContent({format: 'text'});
            try {
                // eslint-disable-next-line
                return await postOne('cursive_write_local_to_json', {
                    key: ed.key,
                    event: event,
                    keyCode: ed.keyCode,
                    resourceId: resourceId,
                    cmid: cmid,
                    modulename: modulename,
                    editorid: editorid,
                    "json_data": data,
                    originalText: originalText
                });
            } catch (error) {
                window.console.error('Error submitting data:', error);
            }
        }
    }
    /**
     * Sets up custom tooltip functionality for the Cursive icon
     * Initializes tooltip text, positions the icon in the menubar,
     * and sets up mouse event handlers for showing/hiding the tooltip
     * @function customTooltip
     */
    function customTooltip() {
        if (document.querySelector('#tiny_cursive_StateIcon')) {
            return;
        }
        try {
            const tooltipText = getTooltipText();
            const menubarDiv = document.querySelector('div[role="menubar"].tox-menubar');
            // const cursiveIcon = document.querySelector('#tiny_cursive_StateIcon');

            const cursiveIcon = document.createElement('img');
            cursiveIcon.src = hasApiKey ? iconUrl: iconGrayUrl;

            // cursiveIcon.id = "tiny_cursive_StateIcon";

            cursiveIcon.setAttribute('class', 'tiny_cursive_StateButton');
            cursiveIcon.style.display = 'inline-block';

            cursiveState(cursiveIcon, menubarDiv);

            tooltipText.then((text) => {
                setTooltip(text, document.querySelector('#tiny_cursive_StateIcon'));
            });

            jQuery('#tiny_cursive_StateIcon').on('mouseenter', function () {

                jQuery(this).css('position', 'relative');
                jQuery('.tiny_cursive_tooltip').css(tooltipCss());
            });

            jQuery('#tiny_cursive_StateIcon').on('mouseleave', function () {
                jQuery('.tiny_cursive_tooltip').css('display', 'none');
            });
        } catch (error) {
            window.console.error('Error setting up custom tooltip:', error);
        }
    }

    /**
     * Retrieves tooltip text strings from language files
     * @async
     * @function getTooltipText
     * @returns {Promise<Object>} Object containing buttonTitle and buttonDes strings
     */
    async function getTooltipText() {
        const [
            buttonTitle,
            buttonDes,
        ] = await Promise.all([
            getString('cursive:state:active', 'tiny_cursive'),
            getString('cursive:state:active:des', 'tiny_cursive'),
        ]);
        return { buttonTitle, buttonDes };
    }

    /**
     * Updates the Cursive icon state and positions it in the menubar
     * @param {HTMLElement} cursiveIcon - The Cursive icon element to modify
     * @param {HTMLElement} menubarDiv - The menubar div element
     */
    function cursiveState(cursiveIcon, menubarDiv) {
        if (menubarDiv) {
            const rightWrapper = document.createElement('div');
            const imgWrapper   = document.createElement('span');

            rightWrapper.style.marginLeft = 'auto';
            rightWrapper.style.display = 'flex';
            rightWrapper.style.alignItems = 'center';
            imgWrapper.id = 'tiny_cursive_StateIcon';

            imgWrapper.appendChild(cursiveIcon);
            rightWrapper.appendChild(imgWrapper);
            menubarDiv.appendChild(rightWrapper);
        }
    }

    /**
     * Returns CSS styles object for tooltip positioning and appearance
     * @function tooltipCss
     * @returns {Object} Object containing CSS properties and values for tooltip styling
     */
    function tooltipCss() {
        return {
            display: 'block',
            position: 'absolute',
            transform: 'translateX(-100%)',
            backgroundColor: 'white',
            color: 'black',
            border: '1px solid #ccc',
            marginBottom: '6px',
            padding: '10px',
            textAlign: 'justify',
            minWidth: '200px',
            borderRadius: '1px',
            pointerEvents: 'none',
            zIndex: 10000
        };
    }

    /**
     * Sets up tooltip content and styling for the Cursive icon
     * @param {Object} text - Object containing tooltip text strings
     * @param {string} text.buttonTitle - Title text for the tooltip
     * @param {string} text.buttonDes - Description text for the tooltip
     * @param {HTMLElement} cursiveIcon - The Cursive icon element to attach tooltip to
     */
    function setTooltip(text, cursiveIcon) {

        const tooltipSpan = document.createElement('span');
        const description = document.createElement('span');
        const linebreak = document.createElement('br');
        const tooltipTitle = document.createElement('strong');

        tooltipSpan.style.display = 'none';
        cursiveIcon.style.width = "auto";

        tooltipTitle.textContent = text.buttonTitle;
        tooltipTitle.style.fontSize = '16px';
        tooltipTitle.style.fontWeight = 'bold';
        description.textContent = text.buttonDes;
        description.style.fontSize = '14px';

        tooltipSpan.setAttribute('class', 'tiny_cursive_tooltip shadow');
        tooltipSpan.appendChild(tooltipTitle);
        tooltipSpan.appendChild(linebreak);
        tooltipSpan.appendChild(description);
        cursiveIcon.appendChild(tooltipSpan);
    }

    window.addEventListener('unload', () => {
        syncData();
    });

    setInterval(syncData, syncInterval);
};
