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
import $ from 'jquery';
import {iconUrl, iconGrayUrl, tooltipCss} from 'tiny_cursive/common';
import Autosave from 'tiny_cursive/cursive_autosave';
import DocumentView from 'tiny_cursive/document_view';
import {call as getUser} from "core/ajax";

export const register = (editor, interval, userId, hasApiKey, MODULES, Rubrics, submission) => {

    var isStudent = !($('#body').hasClass('teacher_admin'));
    var intervention = $('#body').hasClass('intervention');
    var host = M.cfg.wwwroot;
    var userid = userId;
    var courseid = M.cfg.courseId;
    var editorid = editor?.id;
    var cmid = M.cfg.contextInstanceId;
    var ed = "";
    var event = "";
    var filename = "";
    var questionid = 0;
    var quizSubmit = $('#mod_quiz-next-nav');
    let assignSubmit = $('#id_submitbutton');
    var syncInterval = interval ? interval * 1000 : 10000; // Default: Sync Every 10s.
    var lastCaretPos = 1;
    let aiContents = [];
    var isFullScreen = false;
    var user = null;
    let ur = window.location.href;
    let parm = new URL(ur);
    let modulesInfo = getModulesInfo(ur, parm, MODULES);
    var resourceId = modulesInfo.resourceId;
    var modulename = modulesInfo.name;
    var errorAlert = true;

    const postOne = async(methodname, args) => {
        try {
            const response = await call([{
                methodname,
                args,
            }])[0];
            if (response) {
                setTimeout(() => {
                    Autosave.updateSavingState('saved');
                }, 1000);
            }
            return response;
        } catch (error) {
            Autosave.updateSavingState('offline');
            window.console.error('Error in postOne:', error);
            throw error;
        }
    };

    getUser([{
            methodname: 'core_user_get_users_by_field',
            args: {field: 'id', values: [M.cfg.userId]},
        }])[0].done(response => {
            user = response[0];
        }).fail((ex) => {
        window.console.error('Error fetching user data:', ex);
    });

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
        localStorage.removeItem('lastCopyCutContent');
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
        localStorage.removeItem('lastCopyCutContent');
    });

    const getModal = () => {

        Promise.all([
            getString('tiny_cursive_srcurl', 'tiny_cursive'),
            getString('tiny_cursive_srcurl_des', 'tiny_cursive'),
            getString('tiny_cursive_placeholder', 'tiny_cursive')
        ]).then(function([title, titledes, placeholder]) {

            return create({
                type: 'SAVE_CANCEL',
                title: `<div><div class="tiny-cursive-title-text">${title}</div>
                <span class="tiny-cursive-title-description ">${titledes}</span></div>`,
                body: `<textarea  class="form-control inputUrl" value="" id="inputUrl" placeholder="${placeholder}"></textarea>`,
                removeOnClose: true,
            })
                .done(modal => {
                    modal.getRoot().addClass('tiny-cursive-modal');
                    modal.show();
                    var lastEvent = '';

                    modal.getRoot().on(save, function() {

                        var number = document.getElementById("inputUrl").value.trim();

                        if (number === "" || number === null || number === undefined) {
                            editor.execCommand('Undo');
                            // eslint-disable-next-line
                            getString('pastewarning', 'tiny_cursive').then(str => alert(str));
                        } else {
                            editor.execCommand('Paste');
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

    const sendKeyEvent = (events, editor) => {
        ed = editor;
        event = events;

        filename = `${userid}_${resourceId}_${cmid}_${modulename}_attempt`;

        if (modulename === 'quiz') {
            questionid = editorid.split(':')[1].split('_')[0];
            filename = `${userid}_${resourceId}_${cmid}_${questionid}_${modulename}_attempt`;
        }

        if (localStorage.getItem(filename)) {
            let data = JSON.parse(localStorage.getItem(filename));
            data.push({
                resourceId: resourceId,
                key: editor.key,
                keyCode: editor.keyCode,
                event: event,
                courseId: courseid,
                unixTimestamp: Date.now(),
                clientId: host,
                personId: userid,
                position: ed.caretPosition,
                rePosition: ed.rePosition,
                pastedContent: editor.pastedContent,
                aiContent : editor.aiContent
            });
            localStorage.setItem(filename, JSON.stringify(data));
        } else {
            let data = [{
                resourceId: resourceId,
                key: editor.key,
                keyCode: editor.keyCode,
                event: event,
                courseId: courseid,
                unixTimestamp: Date.now(),
                clientId: host,
                personId: userid,
                position: ed.caretPosition,
                rePosition: ed.rePosition,
                pastedContent: editor.pastedContent,
                aiContent : editor.aiContent
            }];
            localStorage.setItem(filename, JSON.stringify(data));
        }
    };

    editor.on('keyUp', (editor) => {
        customTooltip();
        let position = getCaretPosition(true);
        editor.caretPosition = position.caretPosition;
        editor.rePosition = position.rePosition;
        sendKeyEvent("keyUp", editor);
    });
    editor.on('Paste', async(e) => {
        customTooltip();
        const pastedContent = (e.clipboardData || e.originalEvent.clipboardData).getData('text');
        if (!pastedContent) {
            return;
        }
        if (isStudent && intervention) {
            if (pastedContent !== localStorage.getItem('lastCopyCutContent')) {
                getModal(e);
            }
        }
    });
    editor.on('Redo', async(e) => {
        customTooltip();
        if (isStudent && intervention) {
            getModal(e);
        }
    });
    editor.on('keyDown', (editor) => {
        customTooltip();
        let position = getCaretPosition();
        editor.caretPosition = position.caretPosition;
        editor.rePosition = position.rePosition;
        sendKeyEvent("keyDown", editor);
    });
     editor.on('Cut', () => {
        const selectedContent = editor.selection.getContent({format: 'text'});
        localStorage.setItem('lastCopyCutContent', selectedContent.trim());
    });
    editor.on('Copy', () => {
        const selectedContent = editor.selection.getContent({format: 'text'});
        localStorage.setItem('lastCopyCutContent', selectedContent.trim());
    });
    editor.on('mouseDown', async(editor) => {
        constructMouseEvent(editor);
        sendKeyEvent("mouseDown", editor);
    });
    editor.on('mouseUp', async(editor) => {
        constructMouseEvent(editor);
        sendKeyEvent("mouseUp", editor);
    });
    editor.on('init', () => {
        customTooltip();
    });
    editor.on('SetContent', () => {
        customTooltip();
    });
    editor.on('FullscreenStateChanged', (e) => {
        let view = new DocumentView(user, Rubrics, submission, modulename, editor);
        isFullScreen = e.state;
        try {
            if (!e.state) {
                view.normalMode();
            } else {
                view.fullPageMode();
            }
        } catch (error) {
            if (errorAlert) {
                errorAlert = false;
                editor.windowManager.alert('Unable to initialize document view in Fullscreen mode. Opening default view.');
            }
            view.normalMode();
            window.console.error('Error ResizeEditor event:', error);
        }
    });

    editor.on('execcommand', function (e) {
        if (e.command === "mceInsertContent") {
            const contentObj = e.value;

            const isPaste = contentObj && typeof contentObj === 'object' && contentObj.paste === true;

            let insertedContent = contentObj.content || contentObj;
            let tempDiv = document.createElement('div');
            tempDiv.innerHTML = insertedContent;
            let text = tempDiv.textContent || tempDiv.innerText || '';

            let position = getCaretPosition(true);
            editor.caretPosition = position.caretPosition;
            editor.rePosition = position.rePosition;

            if (isPaste) {
                sendKeyEvent("Paste", {
                    key: "v",
                    keyCode: 86,
                    caretPosition: editor.caretPosition,
                    rePosition: editor.rePosition,
                    pastedContent: insertedContent,
                    srcElement: { baseURI: window.location.href }
                });
            } else {
                aiContents.push(text);

                sendKeyEvent("aiInsert", {
                    key: "ai",
                    keyCode: 0,
                    caretPosition: editor.caretPosition,
                    rePosition: editor.rePosition,
                    aiContent: text,
                    srcElement: { baseURI: window.location.href }
                });
            }
        }
    });

    editor.on('input', function (e) {
        let position = getCaretPosition(true);
        editor.caretPosition = position.caretPosition;
        editor.rePosition = position.rePosition;
        let aiContent = e.data;

        if (e.inputType === 'insertReplacementText' || (e.inputType === 'insertText' && aiContent && aiContent.length > 1)) {

            aiContents.push(aiContent);

            e.key = "ai";
            e.keyCode = 0;
            e.caretPosition = position.caretPosition;
            e.rePosition = position.rePosition;
            e.aiContent = aiContent;

            sendKeyEvent("aiInsert", e);
        }
    });


    /**
     * Constructs a mouse event object with caret position and button information
     * @param {Object} editor - The TinyMCE editor instance
     * @function constructMouseEvent
     * @description Sets caret position, reposition, key and keyCode properties on the editor object based on current mouse state
     */
    function constructMouseEvent(editor) {
        let position = getCaretPosition();
        editor.caretPosition = position.caretPosition;
        editor.rePosition = position.rePosition;
        editor.key = getMouseButton(editor);
        editor.keyCode = editor.button;
    }

    /**
     * Gets the string representation of a mouse button based on its numeric value
     * @param {Object} editor - The editor object containing button information
     * @returns {string} The string representation of the mouse button ('left', 'middle', or 'right')
     */
    function getMouseButton(editor) {

        switch (editor.button) {
            case 0:
                return 'left';
            case 1:
                return 'middle';
            case 2:
                return 'right';
        }
        return null;
    }

    /**
     * Gets the current caret position in the editor
     * @param {boolean} skip - If true, returns the last known caret position instead of calculating a new one
     * @returns {Object} Object containing:
     *   - caretPosition: Sequential position number stored in session
     *   - rePosition: Absolute character offset from start of content
     * @throws {Error} Logs warning to console if error occurs during calculation
     */
    function getCaretPosition(skip = false) {
        try {
            if (!editor || !editor.selection) {
                return {caretPosition: 0, rePosition: 0};
            }
            const rng = editor.selection.getRng();

            let absolutePosition = 0;
            let node = rng.startContainer;
            let offset = rng.startOffset;

            // For selections, use the end position
            if (rng.startContainer !== rng.endContainer || rng.startOffset !== rng.endOffset) {
                node = rng.endContainer;
                offset = rng.endOffset;
            }

            absolutePosition = offset;

            // Calculate position by walking through previous nodes
            while (node && node !== editor.getBody()) {
                while (node.previousSibling) {
                    node = node.previousSibling;
                    if (node.textContent) {
                        absolutePosition += node.textContent.length;
                    }
                }
                node = node.parentNode;
            }

            if (skip) {
                return {
                    caretPosition: lastCaretPos,
                    rePosition: absolutePosition
                };
            }

            const storageKey = `${userid}_${resourceId}_${cmid}_position`;
            let storedPos = parseInt(sessionStorage.getItem(storageKey), 10);
            if (isNaN(storedPos)) {
                storedPos = 0;
            }
            storedPos++;
            lastCaretPos = storedPos;
            sessionStorage.setItem(storageKey, storedPos);

            return {
                caretPosition: storedPos,
                rePosition: absolutePosition
            };
        } catch (e) {
            window.console.warn('Error getting caret position:', e);
            return {caretPosition: 0, rePosition: 0};
        }
    }


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
                Autosave.updateSavingState('saving');
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
        try {
            const tooltipText = getTooltipText();
            const menubarDiv = document.querySelectorAll('div[role="menubar"].tox-menubar');
            let classArray = [];

            if (menubarDiv.length) {
                menubarDiv.forEach(function(element, index) {
                    index += 1;
                    let className = 'cursive-menu-' + index;
                    element.classList.add(className);
                    classArray.push(className);
                });
            }

            const cursiveIcon = document.createElement('img');
            cursiveIcon.src = hasApiKey ? iconUrl : iconGrayUrl;

            cursiveIcon.setAttribute('class', 'tiny_cursive_StateButton');
            cursiveIcon.style.display = 'inline-block';

            cursiveState(cursiveIcon, menubarDiv, classArray);

            for (let index in classArray) {
                const elementId = "tiny_cursive_StateIcon" + index;
                const tooltipId = `tiny_cursive_tooltip${index}`;

                tooltipText.then((text) => {
                    return setTooltip(text, document.querySelector(`#${elementId}`), tooltipId);
                }).catch(error => window.console.error(error));

                $(`#${elementId}`).on('mouseenter', function() {
                    $(this).css('position', 'relative');
                    $(`#${tooltipId}`).css(tooltipCss);
                });

                $(`#${elementId}`).on('mouseleave', function() {
                    $(`#${tooltipId}`).css('display', 'none');
                });
            }
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
        return {buttonTitle, buttonDes};
    }

    /**
     * Updates the Cursive icon state and positions it in the menubar
     * @param {HTMLElement} cursiveIcon - The Cursive icon element to modify
     * @param {HTMLElement} menubarDiv - The menubar div element
     * @param {Array} classArray - Array of class names for the menubar div elements
     */
    function cursiveState(cursiveIcon, menubarDiv, classArray) {
        if (menubarDiv) {
            for (let index in classArray) {
                const rightWrapper = document.createElement('div');
                const imgWrapper = document.createElement('span');
                const iconClone = cursiveIcon.cloneNode(true);
                const targetMenu = document.querySelector('.' + classArray[index]);
                let elementId = "tiny_cursive_StateIcon" + index;

                rightWrapper.style.marginLeft = 'auto';
                rightWrapper.style.display = 'flex';
                rightWrapper.style.alignItems = 'center';
                imgWrapper.id = elementId;
                imgWrapper.style.marginLeft = '.2rem';

                imgWrapper.appendChild(iconClone);
                let moduleIds = {
                    resourceId: resourceId,
                    cmid: cmid,
                    modulename: modulename,
                    questionid: questionid,
                    userid: userid,
                    courseid: courseid};

                if (!targetMenu?.querySelector('.tiny_cursive_savingState')) {
                    Autosave.destroyInstance();
                    Autosave.getInstance(editor, rightWrapper, moduleIds, isFullScreen);
                }
                rightWrapper.appendChild(imgWrapper);
                if (isFullScreen && (modulename === 'assign' || modulename === 'forum')) {
                    let existsElement = document.querySelector('.tox-menubar[class*="cursive-menu-"] > div');
                    if (existsElement) {
                        existsElement.remove();
                    }

                    if (!document.querySelector(`#${elementId}`)) {
                        rightWrapper.style.marginTop = '3px';
                        document.querySelector('#tiny_cursive-fullpage-right-wrapper').prepend(rightWrapper);
                    }

                    Autosave.destroyInstance();
                    Autosave.getInstance(editor, rightWrapper, moduleIds, isFullScreen);
                } else {
                    if (targetMenu && !targetMenu.querySelector(`#${elementId}`)) {
                        targetMenu.appendChild(rightWrapper);
                    }
                }

            }
        }
    }

    /**
     * Sets up tooltip content and styling for the Cursive icon
     * @param {Object} text - Object containing tooltip text strings
     * @param {string} text.buttonTitle - Title text for the tooltip
     * @param {string} text.buttonDes - Description text for the tooltip
     * @param {HTMLElement} cursiveIcon - The Cursive icon element to attach tooltip to
     * @param {string} tooltipId - ID for the tooltip element
     */
    function setTooltip(text, cursiveIcon, tooltipId) {

        if (document.querySelector(`#${tooltipId}`)) {
            return;
        }
        if (cursiveIcon) {

            const tooltipSpan = document.createElement('span');
            const description = document.createElement('span');
            const linebreak = document.createElement('br');
            const tooltipTitle = document.createElement('strong');

            tooltipSpan.style.display = 'none';
            tooltipTitle.textContent = text.buttonTitle;
            tooltipTitle.style.fontSize = '16px';
            tooltipTitle.style.fontWeight = 'bold';
            description.textContent = text.buttonDes;
            description.style.fontSize = '14px';

            tooltipSpan.id = tooltipId;
            tooltipSpan.classList.add(`shadow`);
            tooltipSpan.appendChild(tooltipTitle);
            tooltipSpan.appendChild(linebreak);
            tooltipSpan.appendChild(description);
            cursiveIcon.appendChild(tooltipSpan);
        }
    }

    /**
     * Extracts module information from URL parameters
     * @param {string} ur - The base URL to analyze
     * @param {URL} parm - URL object containing search parameters
     * @param {Array} MODULES - Array of valid module names to check against
     * @returns {Object|boolean} Object containing resourceId and module name if found, false if no valid module
     */
    function getModulesInfo(ur, parm, MODULES) {

        if (!MODULES.some(module => ur.includes(module))) {
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

        for (const module of MODULES) {
            if (ur.includes(module)) {
                modulename = module;
                if (module === "lesson" || module === "assign") {
                    resourceId = cmid;
                } else if (module === "oublog") {
                    resourceId = 0;
                }
                break;
            }
        }

        return {resourceId: resourceId, name: modulename};
    }

    window.addEventListener('unload', () => {
        syncData();
    });

    setInterval(syncData, syncInterval);
};
