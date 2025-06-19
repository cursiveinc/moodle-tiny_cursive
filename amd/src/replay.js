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
 * @author kuldeep singh <mca.kuldeep.sekhon@gmail.com>
 */

import {call as fetchJson} from 'core/ajax';
import templates from 'core/templates';
import $ from 'jquery';
import * as Str from 'core/str';

export default class Replay {
    controllerId = '';

    constructor(elementId, filePath, speed = 1, loop = false, controllerId) {
        this.controllerId = controllerId;
        this.replayInProgress = false;
        this.speed = parseFloat(speed);
        this.loop = loop;
        this.highlightedChars = [];
        this.deletedChars = [];
        this.cursorPosition = 0;
        this.currentEventIndex = 0;
        this.totalEvents = 0;
        this.currentTime = 0;
        this.totalDuration = 0;
        this.usercomments = [];
        this.pasteTimestamps = [];
        this.isPasteEvent = false;

        const element = document.getElementById(elementId);
        if (element) {
            this.outputElement = element;
            this.outputElement.classList.add('tiny_cursive_outputElement');

        } else {
            throw new Error(`Element with id '${elementId}' not found`);
        }

        this.loadJSON(filePath)
            .then((data) => {
                if (data.status) {
                    var val = JSON.parse(data.data);
                    this.logData = val;
                    if (data.comments) {
                        var comments = JSON.parse(data.comments);
                        this.usercomments = Array.isArray(comments) ? [...comments] : [];
                    }

                    if ("data" in this.logData) {
                        this.logData = this.logData.data;
                    }
                    if ("payload" in this.logData) {
                        this.logData = this.logData.payload;
                    }

                    if (this.logData.length > 0 && this.logData[0].unixTimestamp) {
                        const startTime = this.logData[0].unixTimestamp;
                        this.logData = this.logData.map(event => ({
                            ...event,
                            normalizedTime: event.unixTimestamp - startTime
                        }));
                        this.totalDuration = this.logData[this.logData.length - 1].normalizedTime;
                    }

                    this.totalEvents = this.logData.length;
                    this.identifyPasteEvents();
                    if (controllerId && this.logData) {
                        this.constructController(controllerId);
                    }
                    this.startReplay();
                } else {
                    try {
                        // eslint-disable-next-line
                        Promise.all([
                            templates.render('tiny_cursive/no_submission'),
                            Str.get_string('warningpayload', 'tiny_cursive')
                        ])
                            .then(function (results) {
                                var html = results[0];
                                var str = results[1];
                                var newElement = $(html);
                                newElement.text(str);
                                $('.tiny_cursive').html(newElement);
                                return true;
                            })
                            .catch(function (error) {
                                window.console.error(error);
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
                        .then(function (results) {
                            var html = results[0];
                            var str = results[1];
                            var newElement = $(html);
                            newElement.text(str);
                            $('.tiny_cursive').html(newElement);
                        })
                        .catch(function (error) {
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
            var playSvg = document.createElement('img');
            playSvg.src = M.util.image_url('playicon', 'tiny_cursive');

            if (this.playButton) {
                this.playButton.querySelector('.play-icon').innerHTML = playSvg.outerHTML;
            }
        }
    }

    constructController(controllerId) {
        this.replayInProgress = false;
        this.currentPosition = 0;
        this.speed = 1;
        if (this.replayIntervalId) {
            clearInterval(this.replayIntervalId);
            this.replayIntervalId = null;
        }
        const container = document.getElementById(controllerId);
        if (!container) {
            window.console.error("Container element not found with ID:", controllerId);
            return;
        }
        // Clean up any existing controls first
        const existingControls = container.querySelectorAll('.replay-control');
        existingControls.forEach(control => control.remove());

        // Check if there's an existing paste events panel
        const existingPanels = container.querySelectorAll('.paste-events-panel');
        existingPanels.forEach(panel => panel.remove());

        // Create a container for all controls
        const controlContainer = document.createElement('div');
        controlContainer.classList.add('tiny_cursive_replay_control', 'replay-control');

        // Create first row for play button and scrubber
        const topRow = document.createElement('div');
        topRow.classList.add('tiny_cursive_top_row');

        // Create play button
        this.playButton = document.createElement('button');
        this.playButton.classList.add('tiny_cursive_play_button');

        const playSvg = document.createElement('i');
        playSvg.className = '';

        this.playButton.innerHTML = `<span class="play-icon">${playSvg.outerHTML}</span>`;
        this.playButton.classList.add('tiny_cursive_play_button');

        this.playButton.addEventListener('click', () => {
            if (this.replayInProgress) {
                this.stopReplay();
                const playSvg = document.createElement('img');
                playSvg.src = M.util.image_url('playicon', 'tiny_cursive');
                this.playButton.querySelector('.play-icon').innerHTML = playSvg.outerHTML;
            } else {
                this.startReplay(false);
            }
        });
        topRow.appendChild(this.playButton);

        // Create timeline scrubber
        const scrubberContainer = document.createElement('div');
        scrubberContainer.classList.add('tiny_cursive_scrubber_container');

        this.scrubberElement = document.createElement('input');
        this.scrubberElement.classList.add('tiny_cursive_timeline_scrubber', 'timeline-scrubber');
        this.scrubberElement.id = 'timelineScrubber';
        this.scrubberElement.type = 'range';
        this.scrubberElement.max = '100';
        this.scrubberElement.min = '0';
        this.scrubberElement.value = '0';

        this.scrubberElement.addEventListener('input', () => {
            const scrubberValue = parseInt(this.scrubberElement.value, 10);
            this.skipToTime(scrubberValue);
        });

        scrubberContainer.appendChild(this.scrubberElement);
        topRow.appendChild(scrubberContainer);

        // Create second row for speed controls and time display
        const bottomRow = document.createElement('div');
        bottomRow.classList.add('tiny_cursive_bottom_row');

        // Create Speed controls
        const speedContainer = document.createElement('div');
        speedContainer.classList.add('tiny_cursive_speed_controls', 'speed-controls');

        const speedLabel = document.createElement('span');
        speedLabel.classList.add('tiny_cursive_speed_label');
        speedContainer.appendChild(speedLabel);
        speedLabel.textContent = 'Speed: ';

        // Create a single button like container for speed options
        const speedGroup = document.createElement('div');
        speedGroup.classList.add('tiny_cursive_speed_group');

        [1, 1.5, 2, 5, 10].forEach(speedValue => {
            const speedBtn = document.createElement('button');
            speedBtn.textContent = `${speedValue}x`;
            speedBtn.classList.add('tiny_cursive_speed_btn', 'speed-btn');
            if (parseFloat(speedValue) === parseFloat(this.speed)) {
                speedBtn.classList.add('active');
            }
            speedBtn.dataset.speed = speedValue;

            speedBtn.addEventListener('click', () => {
                document.querySelectorAll('.tiny_cursive_speed_btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                speedBtn.classList.add('active');
                this.speed = parseFloat(speedBtn.dataset.speed);
                // Restart to apply the new speed
                const wasPlaying = this.replayInProgress;
                if (wasPlaying) {
                    this.stopReplay();
                    this.startReplay(false);
                }
            });
            speedGroup.appendChild(speedBtn);
        });

        speedContainer.appendChild(speedGroup);
        bottomRow.appendChild(speedContainer);

        // Add rows to container
        controlContainer.appendChild(topRow);
        controlContainer.appendChild(bottomRow);

        // Add time display
        this.timeDisplay = document.createElement('div');
        this.timeDisplay.classList.add('tiny_cursive_time_display');
        this.timeDisplay.textContent = '00:00 / 00:00';

        topRow.appendChild(this.timeDisplay);

        // Create Paste Events Panel toggle button
        const pasteEventsToggle = document.createElement('div');
        pasteEventsToggle.classList.add('tiny_cursive_paste_events_toggle', 'paste-events-toggle');

        const pasteEventsIcon = document.createElement('span');
        const pasteIcon = document.createElement('img');
        pasteIcon.src = M.util.image_url('pasteicon', 'tiny_cursive');
        pasteEventsIcon.innerHTML = pasteIcon.outerHTML;
        pasteEventsIcon.classList.add('tiny_cursive_paste_events_icon');

        const pasteEventsText = document.createElement('span');
        pasteEventsText.textContent = 'Paste Events';

        const pasteEventCount = document.createElement('span');
        pasteEventCount.textContent = `(${this.usercomments.length})`;
        pasteEventCount.className = 'paste-event-count';
        pasteEventCount.style.marginLeft = '2px';

        const chevronIcon = document.createElement('span');
        const chevron = document.createElement('i');
        chevron.className = 'fa fa-chevron-down';
        chevronIcon.innerHTML = chevron.outerHTML;
        chevronIcon.style.marginLeft = '5px';
        chevronIcon.style.transition = 'transform 0.3s ease';

        pasteEventsToggle.appendChild(pasteEventsIcon);
        pasteEventsToggle.appendChild(pasteEventsText);
        pasteEventsToggle.appendChild(pasteEventCount);
        pasteEventsToggle.appendChild(chevronIcon);

        // Create Paste Events Panel
        const pasteEventsPanel = document.createElement('div');
        pasteEventsPanel.classList.add('tiny_cursive_paste_events_panel', 'paste-events-panel');
        pasteEventsPanel.style.display = 'none';

        this.populatePasteEventsPanel(pasteEventsPanel);

        pasteEventsToggle.addEventListener('click', () => {
            const isHidden = pasteEventsPanel.style.display === 'none';
            pasteEventsPanel.style.display = isHidden ? 'block' : 'none';
            chevronIcon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0)';
        });

        bottomRow.appendChild(pasteEventsToggle);

        controlContainer.appendChild(pasteEventsPanel);

        this.pasteEventsPanel = pasteEventsPanel;
        this.pasteEventCount = pasteEventCount;

        // Add the controls container to main container
        container.insertBefore(controlContainer, container.firstChild);
    }

    identifyPasteEvents() {
        this.pasteTimestamps = [];
        let controlPressed = false;
        let pasteCount = 0;

        // Check for finding Control+V combinations
        for (let i = 0; i < this.logData.length; i++) {
            const event = this.logData[i];
            if (event.event && event.event.toLowerCase() === "keydown") {
                if (event.key === "Control") {
                    controlPressed = true;
                } else if (event.key === "v" && controlPressed) {
                    const timestamp = event.normalizedTime || 0;

                    let userComment = "";
                    if (this.usercomments && this.usercomments[pasteCount]) {
                        userComment = this.usercomments[pasteCount];
                    }

                    this.pasteTimestamps.push({
                        index: pasteCount,
                        time: timestamp,
                        formattedTime: this.formatTime(timestamp),
                        pastedText: userComment,
                        timestamp: timestamp
                    });
                    pasteCount++;

                    controlPressed = false;
                } else {
                    controlPressed = false;
                }
            }
        }

        if (this.usercomments.length > 0 && this.pasteTimestamps.length === 0) {
            for (let i = 0; i < this.usercomments.length; i++) {
                this.pasteTimestamps.push({
                    index: i,
                    time: 0,
                    formattedTime: this.formatTime(0),
                    pastedText: this.usercomments[i],
                    timestamp: 0
                });
            }
        }

        while (this.pasteTimestamps.length < this.usercomments.length) {
            const lastIndex = this.pasteTimestamps.length;
            this.pasteTimestamps.push({
                index: lastIndex,
                time: 0,
                formattedTime: this.formatTime(0),
                pastedText: this.usercomments[lastIndex],
                timestamp: 0
            });
        }

        if (this.pasteEventsPanel) {
            this.populatePasteEventsPanel(this.pasteEventsPanel);
        }
    }

    populatePasteEventsPanel(panel) {
        panel.innerHTML = '';

        while (panel.firstChild) {
            panel.removeChild(panel.firstChild);
        }
        panel.classList.add('tiny_cursive_event_panel');

        const pasteEvents = this.pasteTimestamps && this.pasteTimestamps.length ?
            this.pasteTimestamps : [];

        if (!pasteEvents || pasteEvents.length === 0) {
            const noEventsMessage = document.createElement('div');
            noEventsMessage.className = 'no-paste-events-message p-3';
            noEventsMessage.textContent = 'No paste events detected for this submission.';
            panel.appendChild(noEventsMessage);
            return;
        }

        const carouselContainer = document.createElement('div');
        carouselContainer.classList.add('tiny_cursive_paste_events_carousel', 'paste-events-carousel');

        const navigationRow = document.createElement('div');
        navigationRow.classList.add('paste-events-navigation', 'tiny_cursive_navigation_row');

        const counterDisplay = document.createElement('div');
        counterDisplay.classList.add('paste-events-counter', 'tiny_cursive_counter_display');
        counterDisplay.textContent = 'Paste Events';

        const navButtons = document.createElement('div');
        navButtons.classList.add('tiny_cursive_nav_buttons', 'tiny_cursive_nav_buttons');

        const prevButton = document.createElement('button');
        prevButton.classList.add('paste-event-prev-btn', 'tiny_cursive_nav_button');
        const leftChevron = document.createElement('i');
        leftChevron.className = 'fa fa-chevron-left';
        prevButton.innerHTML = leftChevron.outerHTML;

        const nextButton = document.createElement('button');
        nextButton.className = 'paste-event-next-btn tiny_cursive_nav_button';
        const rightChevron = document.createElement('i');
        rightChevron.className = 'fa fa-chevron-right';
        nextButton.innerHTML = rightChevron.outerHTML;
        nextButton.disabled = pasteEvents.length <= 1;

        navButtons.appendChild(prevButton);
        navButtons.appendChild(nextButton);

        navigationRow.appendChild(counterDisplay);
        navigationRow.appendChild(navButtons);

        const contentContainer = document.createElement('div');
        contentContainer.className = 'paste-events-content tiny_cursive_content_container';

        // Create initial content with first paste event
        const createPasteEventDisplay = (pasteEvent) => {
            const eventRow = document.createElement('div');
            eventRow.className = 'tiny_cursive_event_row';

            // Header row with timestamp and play button
            const headerRow = document.createElement('div');
            headerRow.className = 'tiny_cursive_header_row';

            // Timestamp and text container
            const textContainer = document.createElement('div');
            textContainer.className = 'tiny_cursive_text_container';

            const timestampContainer = document.createElement('div');
            timestampContainer.className = 'paste-event-timestamp tiny_cursive_paste_event_timestamp';
            timestampContainer.textContent = pasteEvent.formattedTime;

            const pastedTextContainer = document.createElement('div');
            pastedTextContainer.className = 'paste-event-text tiny_cursive_pasted_text_container';
            pastedTextContainer.textContent = pasteEvent.pastedText;

            textContainer.appendChild(timestampContainer);
            textContainer.appendChild(pastedTextContainer);

            const playButton = document.createElement('button');
            playButton.className = 'paste-event-play-btn tiny_cursive_seekplay_button';

            const playIcon = document.createElement('img');
            playIcon.src = M.util.image_url('seekplayicon', 'tiny_cursive');
            playButton.innerHTML = playIcon.outerHTML;

            playButton.addEventListener('click', () => {
                this.jumpToTimestamp(pasteEvent.timestamp);
            });

            headerRow.appendChild(textContainer);
            headerRow.appendChild(playButton);

            eventRow.appendChild(headerRow);

            return eventRow;
        };

        contentContainer.appendChild(createPasteEventDisplay(pasteEvents[0]));

        carouselContainer.appendChild(navigationRow);
        carouselContainer.appendChild(contentContainer);

        panel.appendChild(carouselContainer);

        let currentIndex = 0;

        prevButton.addEventListener('click', () => {
            if (currentIndex > 0) {
                currentIndex--;
                updatePasteEventDisplay();
            }
        });

        nextButton.addEventListener('click', () => {
            if (currentIndex < pasteEvents.length - 1) {
                currentIndex++;
                updatePasteEventDisplay();
            }
        });

        const updatePasteEventDisplay = () => {
            contentContainer.innerHTML = '';
            contentContainer.appendChild(createPasteEventDisplay(pasteEvents[currentIndex]));

            counterDisplay.textContent = 'Paste Events';

            prevButton.disabled = currentIndex === 0;
            prevButton.style.opacity = currentIndex === 0 ? '0.5' : '1';
            nextButton.disabled = currentIndex === pasteEvents.length - 1;
            nextButton.style.opacity = currentIndex === pasteEvents.length - 1 ? '0.5' : '1';
        };
    }

    jumpToTimestamp(timestamp) {
        const percentage = this.totalDuration > 0 ? (timestamp / this.totalDuration) * 100 : 0;

        this.skipToTime(percentage);

        if (!this.replayInProgress) {
            this.startReplay(false);
        }
    }


    setScrubberVal(value) {
        if (this.scrubberElement) {
            this.scrubberElement.value = String(value);

            if (this.timeDisplay) {
                const displayTime = Math.min(this.currentTime, this.totalDuration);
                const currentTimeFormatted = this.formatTime(displayTime);
                const totalTimeFormatted = this.formatTime(this.totalDuration);
                this.timeDisplay.textContent = `${currentTimeFormatted} / ${totalTimeFormatted}`;
            }
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

    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // Call this to make a "start" or "start over" function
    startReplay(reset = true) {
        // Clear previous instances of timeout to prevent multiple running at once
        if (this.replayInProgress) {
            clearTimeout(this.replayTimeout);
        }
        const atEnd = (this.totalDuration > 0 && this.currentTime >= this.totalDuration) ||
            (this.currentEventIndex >= this.totalEvents);
        if (atEnd && !reset) {
            reset = true;
        }
        this.replayInProgress = true;
        if (reset) {
            this.outputElement.innerHTML = '';
            this.text = '';
            this.cursorPosition = 0;
            this.currentEventIndex = 0;
            this.currentTime = 0;
            this.highlightedChars = [];
            this.deletedChars = [];
            this.isControlKeyPressed = false;
        }
        if (this.playButton) {
            const pauseSvg = document.createElement('i');
            pauseSvg.className = 'fa fa-pause';
            this.playButton.querySelector('.play-icon').innerHTML = pauseSvg.outerHTML;
        }
        this.replayLog();
    }

    // Called by startReplay() to recursively call through keydown events
    replayLog() {
        if (!this.replayInProgress) {
            this.updateDisplayText(this.text, this.cursorPosition, [], []);
            return;
        }

        while (this.currentEventIndex < this.logData.length) {
            const event = this.logData[this.currentEventIndex];

            if (event.normalizedTime && event.normalizedTime > this.currentTime) {
                break;
            }

            let text = this.text || '';
            let cursor = this.cursorPosition || 0;
            let updatedHighlights = [...this.highlightedChars];
            let updatedDeleted = [...this.deletedChars];

            // Always update cursor position based on rePosition if available
            if (event.rePosition !== undefined) {
                cursor = Math.max(0, Math.min(event.rePosition, text.length));
            }

            if (event.event && event.event.toLowerCase() === "keydown") {
                const charToInsert = this.applyKey(event.key);

                if (event.key === "Control") {
                    this.isControlKeyPressed = true;
                }
                else if (event.key !== "v") {
                    if (event.key !== "Control") {
                        this.isControlKeyPressed = false;
                    }
                    if (event.key !== "Backspace" && event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
                        this.isPasteEvent = false;
                    }
                }
                else if (event.key == 'v' && this.isControlKeyPressed) {
                    this.isPasteEvent = true;
                    this.isControlKeyPressed = false;
                }
                if (event.key === "Backspace" && this.isControlKeyPressed) {
                    // Handle Control+Backspace word deletion
                    if (cursor > 0) {
                        let wordStart = cursor;
                        while (wordStart > 0 && text[wordStart - 1] === ' ') {
                            wordStart--;
                        }
                        while (wordStart > 0 && text[wordStart - 1] !== ' ') {
                            wordStart--;
                        }

                        const wordToDelete = text.substring(wordStart, cursor);
                        for (let i = 0; i < wordToDelete.length; i++) {
                            updatedDeleted.push({
                                index: wordStart + i,
                                char: wordToDelete[i],
                                time: this.currentTime,
                                expiresAt: this.currentTime + 2000
                            });
                        }
                        // Remove the word
                        text = text.substring(0, wordStart) + text.substring(cursor);
                        cursor = wordStart;
                    }
                    this.isControlKeyPressed = false;
                }
                else if (event.key === "Backspace" && !this.isPasteEvent) {
                    if (cursor > 0) {
                        // Store the character being deleted
                        updatedDeleted.push({
                            index: cursor - 1,
                            char: text[cursor - 1],
                            time: this.currentTime,
                            expiresAt: this.currentTime + 2000 // Make deletions visible for 2 seconds
                        });
                        // Remove the character before cursor
                        text = text.substring(0, cursor - 1) + text.substring(cursor);
                        cursor--;
                    }
                }
                else if (event.key === "ArrowLeft") {
                    cursor = Math.max(0, cursor - 1);
                }
                else if (event.key === "ArrowRight") {
                    cursor = Math.min(text.length, cursor + 1);
                }
                else if (charToInsert !== null && charToInsert !== "") {
                    // Insert the character at cursor position
                    text = text.substring(0, cursor) + charToInsert + text.substring(cursor);
                    // Highlight non-space characters
                    if (charToInsert.trim() !== "") {
                        updatedHighlights.push({
                            index: cursor,
                            char: charToInsert,
                            time: this.currentTime,
                            expiresAt: this.currentTime + 1500 // Make highlights visible for 1.5 seconds
                        });
                    }
                    cursor++;
                }
            }

            this.text = text;
            this.cursorPosition = cursor;

            // Filter out expired highlights and deletions
            this.highlightedChars = updatedHighlights.filter(h =>
                !h.expiresAt || h.expiresAt > this.currentTime
            );

            this.deletedChars = updatedDeleted.filter(d =>
                !d.expiresAt || d.expiresAt > this.currentTime
            );

            this.currentEventIndex++;
        }

        this.updateDisplayText(this.text, this.cursorPosition, this.highlightedChars, this.deletedChars);

        // Update timeline
        if (this.totalDuration > 0) {
            const percentComplete = Math.min((this.currentTime / this.totalDuration) * 100, 100);
            this.setScrubberVal(percentComplete);
        }

        // Continue or stop replay
        if (this.replayInProgress) {
            const baseIncrement = 100;
            const incrementTime = baseIncrement / this.speed;
            this.currentTime += baseIncrement;

            if (this.currentEventIndex >= this.totalEvents) {
                if (this.loop) {
                    this.startReplay(true);
                } else {
                    this.stopReplay();
                    this.updateDisplayText(this.text, this.cursorPosition, [], []);
                }
            } else {
                this.replayTimeout = setTimeout(() => this.replayLog(), incrementTime);
            }
        }
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
        const wasPlaying = this.replayInProgress;
        if (wasPlaying) {
            this.replayInProgress = false;
            clearTimeout(this.replayTimeout);
        }

        const targetTime = (this.totalDuration * percentage) / 100;
        this.currentTime = targetTime;
        this.currentEventIndex = 0;
        this.text = '';
        this.cursorPosition = 0;
        this.highlightedChars = [];
        this.deletedChars = [];
        this.isControlKeyPressed = false;

        let text = '';
        let cursor = 0;

        for (let i = 0; i < this.logData.length; i++) {
            const event = this.logData[i];
            if (event.normalizedTime && event.normalizedTime > targetTime) {
                this.currentEventIndex = i;
                break;
            }

            if (event.rePosition !== undefined) {
                cursor = Math.max(0, Math.min(event.rePosition, text.length));
            }

            if (event.event && event.event.toLowerCase() === "keydown") {
                const charToInsert = this.applyKey(event.key);

                if (event.key === "Control") {
                    this.isControlKeyPressed = true;
                }
                else if (event.key !== "v") {
                    if (event.key !== "Control") {
                        this.isControlKeyPressed = false;
                    }
                    if (event.key !== "Backspace" && event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
                        this.isPasteEvent = false;
                    }
                }
                else if (event.key == 'v' && this.isControlKeyPressed) {
                    this.isPasteEvent = true;
                    this.isControlKeyPressed = false;
                }
                if (event.key === "Backspace" && this.isControlKeyPressed) {
                    if (cursor > 0) {
                        let wordStart = cursor;
                        while (wordStart > 0 && text[wordStart - 1] === ' ') {
                            wordStart--;
                        }
                        while (wordStart > 0 && text[wordStart - 1] !== ' ') {
                            wordStart--;
                        }

                        const wordToDelete = text.substring(wordStart, cursor);
                        for (let i = 0; i < wordToDelete.length; i++) {
                            this.deletedChars.push({
                                index: wordStart + i,
                                char: wordToDelete[i],
                                time: targetTime,
                                expiresAt: targetTime + 2000
                            });
                        }

                        text = text.substring(0, wordStart) + text.substring(cursor);
                        cursor = wordStart;
                    }
                    this.isControlKeyPressed = false;
                }
                else if (event.key === "Backspace" && !this.isPasteEvent) {
                    if (cursor > 0) {
                        this.deletedChars.push({
                            index: cursor - 1,
                            char: text[cursor - 1],
                            time: targetTime,
                            expiresAt: targetTime + 1000
                        });
                        text = text.substring(0, cursor - 1) + text.substring(cursor);
                        cursor = Math.max(0, cursor - 1);
                    }
                }
                else if (event.key === "ArrowLeft") {
                    cursor = Math.max(0, cursor - 1);
                }
                else if (event.key === "ArrowRight") {
                    cursor = Math.min(text.length, cursor + 1);
                }
                else if (charToInsert && charToInsert.length > 0) {
                    text = text.substring(0, cursor) + charToInsert + text.substring(cursor);
                    if (charToInsert.trim() !== "") {
                        this.highlightedChars.push({
                            index: cursor,
                            char: charToInsert,
                            time: targetTime,
                            expiresAt: targetTime + 1000
                        });
                    }
                    cursor++;
                }
            }

            this.currentEventIndex = i + 1;
        }

        this.text = text;
        this.cursorPosition = cursor;
        this.updateDisplayText(text, cursor, this.highlightedChars, this.deletedChars);
        this.setScrubberVal(percentage);

        if (wasPlaying) {
            this.replayInProgress = true;
            this.replayLog();
        }
    }


    // Update display with text, cursor, highlights and deletions
    updateDisplayText(text, cursorPosition, highlights, deletions) {
        let html = '';
        const highlightMap = {};
        const deletionMap = {};
        const currentTime = this.currentTime;

        highlights.forEach(h => {
            let opacity = 1;
            if (h.expiresAt) {
                const timeRemaining = h.expiresAt - currentTime;
                if (timeRemaining < 500) {
                    opacity = Math.max(0, timeRemaining / 500);
                }
            }
            highlightMap[h.index] = { char: h.char, opacity: opacity };
        });

        deletions.forEach(d => {
            let opacity = 0.5;
            if (d.expiresAt) {
                const timeRemaining = d.expiresAt - currentTime;
                if (timeRemaining < 500) {
                    opacity = Math.max(0, (timeRemaining / 500) * 0.5);
                }
            }
            deletionMap[d.index] = { char: d.char, opacity: opacity };
        });

        // Find if we have out-of-bounds deletions (from Control+Backspace)
        const outOfRangeDeletions = deletions.filter(d => d.index >= text.length);

        const textLines = text.split('\n');
        let currentPosition = 0;

        for (let lineIndex = 0; lineIndex < textLines.length; lineIndex++) {
            const line = textLines[lineIndex];

            for (let i = 0; i < line.length; i++) {
                if (currentPosition === cursorPosition) {
                    html += '<span class="tiny_cursive-cursor">|</span>';
                }

                const char = line[i];

                if (deletionMap[currentPosition]) {
                    const deletion = deletionMap[currentPosition];
                    html += `<span class="tiny_cursive-deleted-char" style="opacity: ${deletion.opacity};">${deletion.char}</span>`;
                }

                if (highlightMap[currentPosition] && char !== ' ') {
                    const highlight = highlightMap[currentPosition];
                    html += `<span class="tiny_cursive-highlighted-char" style="opacity: ${highlight.opacity};">${char}</span>`;
                } else {
                    html += char === ' ' ? '&nbsp;' : this.escapeHtml(char);
                }

                currentPosition++;
            }

            if (currentPosition === cursorPosition) {
                html += '<span class="tiny_cursive-cursor">|</span>';
            }

            if (lineIndex < textLines.length - 1) {
                html += '<br>';
                currentPosition++;
            }
        }

        if (cursorPosition === text.length && !html.endsWith('<span class="tiny_cursive-cursor">|</span>')) {
            html += '<span class="tiny_cursive-cursor">|</span>';
        }

        // For control + backspace functionalities
        if (outOfRangeDeletions.length > 0) {
            outOfRangeDeletions.sort((a, b) => a.index - b.index);

            const cursorHTML = '<span class="tiny_cursive-cursor">|</span>';
            let cursorPos = html.lastIndexOf(cursorHTML);

            if (cursorPos !== -1) {
                let deletedWordHTML = '<span class="tiny_cursive-deleted-char" style="opacity: 0.5;">';
                outOfRangeDeletions.forEach(d => {
                    deletedWordHTML += d.char;
                });
                deletedWordHTML += '</span>';
                html = html.substring(0, cursorPos) + deletedWordHTML + html.substring(cursorPos);
            }
        }

        const wasScrolledToBottom = this.outputElement.scrollHeight -
            this.outputElement.clientHeight <= this.outputElement.scrollTop + 1;

        this.outputElement.innerHTML = html;

        if (wasScrolledToBottom || this.isCursorBelowViewport()) {
            this.outputElement.scrollTop = this.outputElement.scrollHeight;
        }
    }

    // Check if cursor is below visible viewport
    isCursorBelowViewport() {
        const cursorElement = this.outputElement.querySelector('.tiny_cursive-cursor:last-of-type');
        if (!cursorElement) {
            return false;
        }

        const cursorRect = cursorElement.getBoundingClientRect();
        const outputRect = this.outputElement.getBoundingClientRect();

        return cursorRect.bottom > outputRect.bottom;
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Used in various places to add a keydown, backspace, etc. to the output
    applyKey(key) {
        switch (key) {
            case "Enter":
                return "\n";
            case "Backspace":
                return "";
            case "ControlBackspace":
                return "";
            case " ":
                return " ";
            default:
                return !["Shift", "Ctrl", "Alt", "ArrowDown", "ArrowUp", "Control", "ArrowRight",
                    "ArrowLeft", "Meta", "CapsLock", "Tab", "Escape", "Delete", "PageUp", "PageDown",
                    "Insert", "Home", "End", "NumLock", "AudioVolumeUp", "AudioVolumeDown", "MediaPlayPause",
                ]
                    .includes(key) ? key : "";
        }
    }
}