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
 * @module     tiny_cursive/replay
 * @category TinyMCE Editor
 * @copyright  CTI <info@cursivetechnology.com>
 * @author Brain Station 23 <elearning@brainstation-23.com>
 */

import {call as fetchJson} from 'core/ajax';
import templates from 'core/templates';
import $ from 'jquery';
import * as Str from 'core/str';
export default class Replay {
    controllerId = '';
    controllerId = '';
    constructor(elementId, filePath, speed = 1, loop = false, controllerId) {
        this.controllerId = controllerId;
        this.controllerId = controllerId;
        this.replayInProgress = false;
        this.speed = speed;
        this.loop = loop;
        const element = document.getElementById(elementId);
        if (element) {
            this.outputElement = element;
        } else {
            throw new Error(`Element with id '${elementId}' not found`);
        }
        if (controllerId) {

            this.constructController(controllerId);
        }
        this.loadJSON(filePath)
            .then((data) => {
                if (data.status) {
                    var val = JSON.parse(data.data);
                    this.logData = val;

                    if ("data" in this.logData) {
                        this.logData = this.logData.data;
                    }
                    if ("payload" in this.logData) {
                        this.logData = this.logData.payload;
                    }
                    this.startReplay();
                } else {
                    templates.render('tiny_cursive/no_submission').then(html => {
                        let updatedHtml = html.replace('No Submission', "Something Went Wrong! or File Not Found!");
                        document.querySelector('.tiny_cursive').innerHTML = updatedHtml;
                    });
                } catch (error) {
                    window.console.error(error);
                }
            }
            return data;
        })
        .catch(error => {

            try {
               // eslint-disable-next-line
                Promise.all([
                    templates.render('tiny_cursive/no_submission'),
                    Str.get_string('warningpayload', 'tiny_cursive')
                ])
                .then(function(results) {
                    var html = results[0];
                    var str = results[1];
                    var newElement = $(html);
                    newElement.text(str);
                    $('.tiny_cursive').html(newElement);
                    return true;
                })
                .catch(function(error) {
                    window.console.error(error);
                });
            } catch (error) {
                window.console.error(error);
            }
            window.console.error('Error loading JSON file: ' + error.message);
        });
    }

    stopReplay() {
        if (this.replayInProgress) {
            clearTimeout(this.replayTimeout);
            this.replayInProgress = false;
        }
    }
    constructController(controllerId) {
        const controller = document.getElementById(controllerId);

        if (controller) {
            this.scrubberElement = document.createElement('input');
            this.scrubberElement.type = 'range';
            this.scrubberElement.id = 'timelineScrubber';
            this.scrubberElement.min = '0';
            this.scrubberElement.max = '100';
            this.scrubberElement.addEventListener('input', () => {
                const scrubberValue = this.scrubberElement.value;
                this.skipToTime(scrubberValue);
            });
            controller.appendChild(this.scrubberElement);
        }
    }

    setScrubberVal(value) {
        if (this.scrubberElement) {
            this.scrubberElement.value = String(value);
        }
    }

    loadJSON(filePath) {
        return fetchJson([{
            methodname: 'cursive_get_reply_json',
            args: {
                filepath: filePath,
            },
        }])[0].done(response => {
            return response;
        }).fail(error => {
            throw new Error('Error loading JSON file: ' + error.message);
        });
    }

    // Call this to make a "start" or "start over" function
    startReplay() {
        // Clear previous instances of timeout to prevent multiple running at once
        if (this.replayInProgress) {
            clearTimeout(this.replayTimeout);
        }
        this.replayInProgress = true;
        let uid = this.controllerId.split('_')[1];
        let element = document.getElementById('rep' + uid);
        let isactive = element.classList.contains('active');
        if (!isactive) {
            this.stopReplay();
        } else {
            this.outputElement.innerHTML = '';
        }
        this.replayLog();
    }

    // Called by startReplay() to recursively call through keydown events
    replayLog() {
        let textOutput = "";
        let index = 0;
        const processEvent = () => {

            if (this.replayInProgress) {
                if (index < this.logData.length) {
                    let event = this.logData[index++];
                    if (event.event.toLowerCase() === 'keydown') {
                        textOutput = this.applyKey(event.key, textOutput);
                    }
                    this.outputElement.innerHTML = textOutput;
                    this.setScrubberVal(index / this.logData.length * 100);
                    this.replayTimeout = setTimeout(processEvent, 1 / this.speed * 100);
                } else {
                    this.replayInProgress = false;
                    if (this.loop) {
                        this.startReplay();
                    }
                }
            }
        };
        processEvent();
    }

    skipToEnd() {
        if (this.replayInProgress) {
            this.replayInProgress = false;
        }
        let textOutput = "";
        this.logData.forEach(event => {
            if (event.event.toLowerCase() === 'keydown') {
                textOutput = this.applyKey(event.key, textOutput);
            }
        });
        this.outputElement.innerHTML = textOutput.slice(0, -1);
        this.setScrubberVal(100);
    }

    // Used by the scrubber to skip to a certain percentage of data
    skipToTime(percentage) {
        if (this.replayInProgress) {
            this.replayInProgress = false;
        }
        // Only go through certain % of log data
        let textOutput = "";
        const numElementsToProcess = Math.ceil(this.logData.length * percentage / 100);
        for (let i = 0; i < numElementsToProcess; i++) {
            const event = this.logData[i];
            if (event.event.toLowerCase() === 'keydown') {
                textOutput = this.applyKey(event.key, textOutput);
            }
        }
        this.outputElement.innerHTML = textOutput.slice(0, -1);
        this.setScrubberVal(percentage);
    }

    // Used in various places to add a keydown, backspace, etc. to the output
    applyKey(key, textOutput) {
        switch (key) {
            case "Enter":
                return textOutput + "\n";
            case "Backspace":
                return textOutput.slice(0, -1);
            case "ControlBackspace": {
                let lastSpace = textOutput.lastIndexOf(' ');
                return textOutput.slice(0, lastSpace);
            }
            default:
                return !["Shift", "Ctrl", "Alt", "ArrowDown", "ArrowUp", "Control", "ArrowRight",
                    "ArrowLeft", "Meta", "CapsLock", "Tab", "Escape", "Delete", "PageUp", "PageDown",
                    "Insert", "Home", "End", "NumLock", "Insert", "Home", "End", "NumLock", "AudioVolumeUp",
                    "AudioVolumeDown", "MediaPlayPause", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9",
                    "F10", "F11", "F12", "PrintScreen", "UnIdentified"]
                    .includes(key) ? textOutput + key : textOutput;
        }
    }
}
