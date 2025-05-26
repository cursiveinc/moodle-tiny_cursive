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

import { call as fetchJson } from 'core/ajax';
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
        this.originalContent = "";
        this.isPasteEvent = false;

        const element = document.getElementById(elementId);
        if (element) {
            this.outputElement = element;
            this.outputElement.style.whiteSpace = 'pre-wrap';
            this.outputElement.style.wordBreak = 'break-word';
            this.outputElement.style.maxWidth = '100%';
            this.outputElement.style.overflow = 'auto';
            this.outputElement.style.fontFamily = 'monospace';
            this.outputElement.style.padding = '10px';
            this.outputElement.style.border = '1px solid #e0e0e0';
            this.outputElement.style.borderRadius = '4px';
            this.outputElement.style.minHeight = '100px';
            this.outputElement.style.backgroundColor = '#fff';
        } else {
            throw new Error(`Element with id '${elementId}' not found`);
        }

        this.loadJSON(filePath)
            .then((data) => {
                if (data.status) {
                    var val = JSON.parse(data.data);
                    this.logData = val;
                    this.originalContent = data.original;
                    window.console.log("Data: ", data.data);
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
                                var updatedHtml = html.replace('No Submission', str);
                                $('.tiny_cursive').html(updatedHtml);
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
                            var updatedHtml = html.replace('No Submission', str);
                            $('.tiny_cursive').html(updatedHtml);
                            return true;
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
            const playSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
            viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="5,3 19,12 5,21" />
            </svg>`;
            if (this.playButton) {
                this.playButton.querySelector('.play-icon').innerHTML = playSvg;
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
        controlContainer.className = 'replay-control';
        controlContainer.style.display = 'flex';
        controlContainer.style.flexDirection = 'column';
        controlContainer.style.gap = '10px';
        controlContainer.style.margin = '10px 0';
        controlContainer.style.alignItems = 'center';
        controlContainer.style.padding = '10px';
        controlContainer.style.paddingBottom = '10px';
        controlContainer.style.borderRadius = '8px';
        controlContainer.style.backgroundColor = '#f8f9fa';
        controlContainer.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        controlContainer.style.width = '100%';

        // Create first row for play button and scrubber
        const topRow = document.createElement('div');
        topRow.style.display = 'flex';
        topRow.style.width = '100%';
        topRow.style.gap = '12px';
        topRow.style.alignItems = 'center';

        // Create play button
        this.playButton = document.createElement('button');
        this.playButton.className = 'play-button';
        this.playButton.style.minWidth = '36px';
        this.playButton.style.height = '36px';
        this.playButton.style.borderRadius = '50%';
        this.playButton.style.background = '#4285f4';
        this.playButton.style.color = 'white';
        this.playButton.style.border = 'none';
        this.playButton.style.cursor = 'pointer';
        this.playButton.style.display = 'flex';
        this.playButton.style.alignItems = 'center';
        this.playButton.style.justifyContent = 'center';
        this.playButton.style.transition = 'background-color 0.2s, transform 0.1s';
        this.playButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        this.playButton.style.flexShrink = '0';

        const playSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
        viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="5,3 19,12 5,21"></polygon>
        </svg>`;
        this.playButton.innerHTML = `<span class="play-icon">${playSvg}</span>`;
        this.playButton.addEventListener('mouseover', () => {
            this.playButton.style.background = '#3367d6';
            this.playButton.style.transform = 'scale(1.05)';
        });
        this.playButton.addEventListener('mouseout', () => {
            this.playButton.style.background = '#4285f4';
            this.playButton.style.transform = 'scale(1)';
        });
        this.playButton.addEventListener('click', () => {
            if (this.replayInProgress) {
                this.stopReplay();
                const playSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="5,3 19,12 5,21"></polygon>
                </svg>`;
                this.playButton.querySelector('.play-icon').innerHTML = playSvg;
            } else {
                this.startReplay(false);
            }
        });
        topRow.appendChild(this.playButton);

        // Create timeline scrubber
        const scrubberContainer = document.createElement('div');
        scrubberContainer.style.flexGrow = '1';
        scrubberContainer.style.width = '100%';

        this.scrubberElement = document.createElement('input');
        this.scrubberElement.type = 'range';
        this.scrubberElement.id = 'timelineScrubber';
        this.scrubberElement.className = 'timeline-scrubber';
        this.scrubberElement.min = '0';
        this.scrubberElement.max = '100';
        this.scrubberElement.value = '0';
        this.scrubberElement.style.width = '100%';
        this.scrubberElement.style.height = '8px';
        this.scrubberElement.style.borderRadius = '4px';
        this.scrubberElement.style.accentColor = '#4285f4';
        this.scrubberElement.addEventListener('input', () => {
            const scrubberValue = parseInt(this.scrubberElement.value, 10);
            this.skipToTime(scrubberValue);
        });

        scrubberContainer.appendChild(this.scrubberElement);
        topRow.appendChild(scrubberContainer);

        // Create second row for speed controls and time display
        const bottomRow = document.createElement('div');
        bottomRow.style.display = 'flex';
        bottomRow.style.width = '100%';
        bottomRow.style.justifyContent = 'space-between';
        bottomRow.style.alignItems = 'center';
        bottomRow.style.marginTop = '5px';

        // Create Speed controls
        const speedContainer = document.createElement('div');
        speedContainer.className = 'speed-controls';
        speedContainer.style.display = 'flex';
        speedContainer.style.gap = '6px';
        speedContainer.style.flexShrink = '0';
        speedContainer.style.alignItems = 'center';

        const speedLabel = document.createElement('span');
        speedLabel.textContent = 'Speed: ';
        speedLabel.style.fontSize = '14px';
        speedLabel.style.fontWeight = '500';
        speedLabel.style.color = '#333';
        speedLabel.style.marginRight = '4px';
        speedContainer.appendChild(speedLabel);

        // Create a single button like container for speed options
        const speedGroup = document.createElement('div');
        speedGroup.style.display = 'flex';
        speedGroup.style.borderRadius = '6px';
        speedGroup.style.overflow = 'hidden';
        speedGroup.style.border = '1px solid #e0e0e0';

        [1, 1.5, 2, 5, 10].forEach(speedValue => {
            const speedBtn = document.createElement('button');
            speedBtn.textContent = `${speedValue}x`;
            speedBtn.className = `speed-btn ${parseFloat(speedValue) === parseFloat(this.speed) ? 'active' : ''}`;
            speedBtn.style.padding = '6px 10px';
            speedBtn.style.border = 'none';
            speedBtn.style.borderRight = speedValue !== 10 ? '1px solid #e0e0e0' : 'none';
            speedBtn.style.background = parseFloat(speedValue) === parseFloat(this.speed) ? '#4285f4' : 'white';
            speedBtn.style.color = parseFloat(speedValue) === parseFloat(this.speed) ? 'white' : '#333';
            speedBtn.style.cursor = 'pointer';
            speedBtn.style.fontSize = '13px';
            speedBtn.style.fontWeight = '500';
            speedBtn.style.transition = 'background 0.2s, color 0.2s';
            speedBtn.dataset.speed = speedValue;
            speedBtn.addEventListener('mouseover', () => {
                if (!speedBtn.classList.contains('active')) {
                    speedBtn.style.background = '#f1f3f4';
                }
            });
            speedBtn.addEventListener('mouseout', () => {
                if (!speedBtn.classList.contains('active')) {
                    speedBtn.style.background = 'white';
                }
            });
            speedBtn.addEventListener('click', () => {
                document.querySelectorAll('.speed-btn').forEach(btn => {
                    btn.style.background = 'white';
                    btn.style.color = '#333';
                    btn.classList.remove('active');
                });
                speedBtn.style.background = '#4285f4';
                speedBtn.style.color = 'white';
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
        this.timeDisplay.className = 'time-display';
        this.timeDisplay.textContent = '00:00 / 00:00';
        this.timeDisplay.style.fontSize = '14px';
        this.timeDisplay.style.fontFamily = 'sans-serif';
        this.timeDisplay.style.color = '#333';
        this.timeDisplay.style.padding = '5px 0';
        this.timeDisplay.style.flexShrink = '0';
        this.timeDisplay.style.minWidth = '90px';
        this.timeDisplay.style.marginLeft = '15px';
        this.timeDisplay.style.textAlign = 'left';

        topRow.appendChild(this.timeDisplay);

        // Create Paste Events Panel toggle button
        const pasteEventsToggle = document.createElement('div');
        pasteEventsToggle.className = 'paste-events-toggle';
        pasteEventsToggle.style.display = 'flex';
        pasteEventsToggle.style.alignItems = 'center';
        pasteEventsToggle.style.cursor = 'pointer';
        pasteEventsToggle.style.userSelect = 'none';
        pasteEventsToggle.style.color = '#4285f4';
        pasteEventsToggle.style.fontFamily = 'sans-serif';
        pasteEventsToggle.style.fontSize = '14px';
        pasteEventsToggle.style.fontWeight = '500';
        pasteEventsToggle.style.marginLeft = 'auto';

        const pasteEventsIcon = document.createElement('span');
        pasteEventsIcon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
        </svg>`;
        pasteEventsIcon.style.marginRight = '8px';
        pasteEventsIcon.style.display = 'flex';
        pasteEventsIcon.style.alignItems = 'center';

        const pasteEventsText = document.createElement('span');
        pasteEventsText.textContent = 'Paste Events';

        const pasteEventCount = document.createElement('span');
        pasteEventCount.textContent = `(${this.pasteTimestamps.length})`;
        pasteEventCount.className = 'paste-event-count';
        pasteEventCount.style.marginLeft = '2px';

        const chevronIcon = document.createElement('span');
        chevronIcon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chevron-icon">
            <polyline points="6 9 12 15 18 9"></polyline>
        </svg>`;
        chevronIcon.style.marginLeft = '5px';
        chevronIcon.style.transition = 'transform 0.3s ease';

        pasteEventsToggle.appendChild(pasteEventsIcon);
        pasteEventsToggle.appendChild(pasteEventsText);
        pasteEventsToggle.appendChild(pasteEventCount);
        pasteEventsToggle.appendChild(chevronIcon);

        // Create Paste Events Panel
        const pasteEventsPanel = document.createElement('div');
        pasteEventsPanel.className = 'paste-events-panel';
        pasteEventsPanel.style.display = 'none';
        pasteEventsPanel.style.marginTop = '10px';
        pasteEventsPanel.style.border = '1px solid #e0e0e0';
        pasteEventsPanel.style.borderRadius = '4px';
        pasteEventsPanel.style.backgroundColor = '#fff';
        pasteEventsPanel.style.maxHeight = '300px';
        pasteEventsPanel.style.overflowY = 'auto';
        pasteEventsPanel.style.width = '100%';

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

        // Set styles for the output element to handle text wrapping
        if (this.outputElement) {
            this.outputElement.style.whiteSpace = 'pre-wrap';
            this.outputElement.style.wordBreak = 'break-word';
            this.outputElement.style.maxWidth = '100%';
            this.outputElement.style.overflow = 'auto';
            this.outputElement.style.fontFamily = 'monospace';
            this.outputElement.style.padding = '10px';
            this.outputElement.style.border = '1px solid #e0e0e0';
            this.outputElement.style.borderRadius = '4px';
            this.outputElement.style.minHeight = '100px';
            this.outputElement.style.backgroundColor = '#fff';
        }

        // Add persistent styles only once
        if (!document.getElementById('tiny_cursive-replay-control-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'tiny_cursive-replay-control-styles';
            styleElement.textContent = `
                .tiny_cursive-replay-control {
                    margin: 10px 0;
                    border-radius: 8px;
                    background-color: #f8f9fa;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    transition: box-shadow 0.3s ease;
                    width: 100%;
                    box-sizing: border-box;
                }
    
                .tiny_cursive-replay-control:hover {
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }
    
                .tiny_cursive-highlighted-char {
                    color: #34a853;
                    font-weight: bold;
                    transition: opacity 0.3s ease, color 0.3s ease;
                }
    
                .tiny_cursive-deleted-char {
                    color: #ea4335;
                    text-decoration: line-through;
                    opacity: 0.5;
                    transition: opacity 0.3s ease;
                }
    
                .tiny_cursive-cursor {
                    display: inline-block;
                    width: 2px;
                    height: 1.2em;
                    background-color: #4285f4;
                    animation: tiny_cursive-blink 1s infinite;
                    vertical-align: middle;
                    border-radius: 1px;
                }
    
                @keyframes tiny_cursive-blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
    
                .tiny_cursive-timeline-scrubber {
                    width: 100%;
                    height: 8px;
                    border-radius: 4px;
                    appearance: none;
                    background: #e0e0e0;
                    transition: background 0.2s;
                }
    
                .tiny_cursive-timeline-scrubber:hover {
                    background: #d0d0d0;
                }
    
                .tiny_cursive-timeline-scrubber::-webkit-slider-thumb {
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: #4285f4;
                    cursor: pointer;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                    transition: transform 0.1s, box-shadow 0.1s;
                }
    
                .tiny_cursive-timeline-scrubber::-webkit-slider-thumb:hover {
                    transform: scale(1.1);
                    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                }
    
                .tiny_cursive-timeline-scrubber::-moz-range-thumb {
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: #4285f4;
                    cursor: pointer;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                    transition: transform 0.1s;
                }
    
                .tiny_cursive-timeline-scrubber::-moz-range-thumb:hover {
                    transform: scale(1.1);
                    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                }
    
                .tiny_cursive-speed-btn.active {
                    background: #4285f4 !important;
                    color: white !important;
                    font-weight: 500;
                }
            `;
            document.head.appendChild(styleElement);
        }
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
                    const pastePosition = event.rePosition;
                    const timestamp = event.normalizedTime || 0;

                    let pasteEndPosition = pastePosition;
                    let pasteLength = 0;
                    let j = i + 1;

                    while (j < this.logData.length &&
                        ((this.logData[j].key === "v" && this.logData[j].event === "keyUp") ||
                            (this.logData[j].key === "Control" && this.logData[j].event === "keyUp"))) {
                        j++;
                    }

                    if (j < this.logData.length && this.logData[j].rePosition !== undefined) {
                        pasteEndPosition = this.logData[j].rePosition;
                        pasteLength = pasteEndPosition - pastePosition;
                    }

                    let FinalPasteLength = pasteLength;
                    let lastrePosition = pasteEndPosition;
                    for (let k = j; k < this.logData.length; k++) {
                        if (this.logData[k].rePosition === undefined) {
                            continue;
                        }
                        if (this.logData[k].event === "keyDown" && this.logData[k].key === "Backspace") {
                            FinalPasteLength--;
                            k++;
                        } else if (this.logData[k].rePosition > lastrePosition) {
                            break;
                        } else {
                            lastrePosition = this.logData[k].rePosition;
                        }
                    }

                    let pastedText = "";
                    if (FinalPasteLength > 0 && this.originalContent) {
                        const start = Math.min(pastePosition, this.originalContent.length);
                        const end = Math.min(pastePosition + FinalPasteLength, this.originalContent.length);
                        pastedText = this.originalContent.substring(start, end);
                    }

                    this.pasteTimestamps.push({
                        index: pasteCount,
                        time: timestamp,
                        formattedTime: this.formatTime(timestamp),
                        pastedText: pastedText,
                        startPosition: pastePosition,
                        endPosition: pastePosition + FinalPasteLength,
                        timestamp: timestamp
                    });
                    pasteCount++;

                    controlPressed = false;
                } else {
                    controlPressed = false;
                }
            }
        }

        console.log("Paste events:", this.pasteTimestamps);
        if (this.pasteEventsPanel) {
            this.populatePasteEventsPanel(this.pasteEventsPanel);
        }
    }

    populatePasteEventsPanel(panel) {
        panel.innerHTML = '';

        while (panel.firstChild) {
            panel.removeChild(panel.firstChild);
        }

        panel.style.maxHeight = '400px';
        panel.style.marginBottom = '15px';
        panel.style.paddingBottom = '10px';
        panel.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';

        const pasteEvents = this.pasteTimestamps && this.pasteTimestamps.length ?
            this.pasteTimestamps : [];

        if (!pasteEvents || pasteEvents.length === 0) {
            const noEventsMessage = document.createElement('div');
            noEventsMessage.className = 'no-paste-events-message';
            noEventsMessage.textContent = 'No paste events detected for this submission.';
            noEventsMessage.style.padding = '15px';
            panel.appendChild(noEventsMessage);
            return;
        }

        const carouselContainer = document.createElement('div');
        carouselContainer.className = 'paste-events-carousel';
        carouselContainer.style.display = 'flex';
        carouselContainer.style.flexDirection = 'column';
        carouselContainer.style.width = '100%';
        carouselContainer.style.position = 'relative';

        const navigationRow = document.createElement('div');
        navigationRow.className = 'paste-events-navigation';
        navigationRow.style.display = 'flex';
        navigationRow.style.justifyContent = 'space-between';
        navigationRow.style.alignItems = 'center';
        navigationRow.style.padding = '10px 15px';
        navigationRow.style.borderBottom = '1px solid #f0f0f0';

        const counterDisplay = document.createElement('div');
        counterDisplay.className = 'paste-events-counter';
        counterDisplay.textContent = 'Paste Events';
        counterDisplay.style.fontWeight = 'bold';
        counterDisplay.style.color = '#4285f4';

        const navButtons = document.createElement('div');
        navButtons.className = 'paste-events-buttons';
        navButtons.style.display = 'flex';
        navButtons.style.gap = '10px';

        const prevButton = document.createElement('button');
        prevButton.className = 'paste-event-prev-btn';
        prevButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
        </svg>`;
        prevButton.style.border = 'none';
        prevButton.style.background = '#f1f3f4';
        prevButton.style.borderRadius = '50%';
        prevButton.style.width = '30px';
        prevButton.style.height = '30px';
        prevButton.style.display = 'flex';
        prevButton.style.alignItems = 'center';
        prevButton.style.justifyContent = 'center';
        prevButton.style.cursor = 'pointer';
        prevButton.style.color = '#4285f4';
        prevButton.style.transition = 'background-color 0.2s';
        prevButton.disabled = true;
        prevButton.style.opacity = '0.5';

        const nextButton = document.createElement('button');
        nextButton.className = 'paste-event-next-btn';
        nextButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
        </svg>`;
        nextButton.style.border = 'none';
        nextButton.style.background = '#f1f3f4';
        nextButton.style.borderRadius = '50%';
        nextButton.style.width = '30px';
        nextButton.style.height = '30px';
        nextButton.style.display = 'flex';
        nextButton.style.alignItems = 'center';
        nextButton.style.justifyContent = 'center';
        nextButton.style.cursor = 'pointer';
        nextButton.style.color = '#4285f4';
        nextButton.style.transition = 'background-color 0.2s';
        nextButton.disabled = pasteEvents.length <= 1;
        nextButton.style.opacity = pasteEvents.length <= 1 ? '0.5' : '1';

        prevButton.addEventListener('mouseover', () => {
            if (!prevButton.disabled) {
                prevButton.style.background = '#e0e0e0';
            }
        });
        prevButton.addEventListener('mouseout', () => {
            prevButton.style.background = '#f1f3f4';
        });
        nextButton.addEventListener('mouseover', () => {
            if (!nextButton.disabled) {
                nextButton.style.background = '#e0e0e0';
            }
        });
        nextButton.addEventListener('mouseout', () => {
            nextButton.style.background = '#f1f3f4';
        });

        navButtons.appendChild(prevButton);
        navButtons.appendChild(nextButton);

        navigationRow.appendChild(counterDisplay);
        navigationRow.appendChild(navButtons);

        const contentContainer = document.createElement('div');
        contentContainer.className = 'paste-events-content';
        contentContainer.style.padding = '15px';
        contentContainer.style.overflow = 'auto';
        contentContainer.style.position = 'relative';

        // Create initial content with first paste event
        const createPasteEventDisplay = (pasteEvent) => {
            const eventRow = document.createElement('div');
            eventRow.style.display = 'flex';
            eventRow.style.flexDirection = 'column';
            eventRow.style.gap = '10px';

            // Header row with timestamp and play button
            const headerRow = document.createElement('div');
            headerRow.style.display = 'flex';
            headerRow.style.justifyContent = 'space-between';
            headerRow.style.alignItems = 'center';
            headerRow.style.marginBottom = '8px';

            // Timestamp and text container
            const textContainer = document.createElement('div');
            textContainer.style.display = 'flex';
            textContainer.style.flexDirection = 'column';
            textContainer.style.flexGrow = '1';
            textContainer.style.marginRight = '10px';

            const timestampContainer = document.createElement('div');
            timestampContainer.className = 'paste-event-timestamp';
            timestampContainer.style.fontFamily = 'monospace';
            timestampContainer.style.fontSize = '12px';
            timestampContainer.style.color = '#666';
            timestampContainer.style.fontWeight = 'bold';
            timestampContainer.textContent = pasteEvent.formattedTime;

            const pastedTextContainer = document.createElement('div');
            pastedTextContainer.className = 'paste-event-text';
            pastedTextContainer.style.fontFamily = 'monospace';
            pastedTextContainer.style.fontSize = '14px';
            pastedTextContainer.style.wordBreak = 'break-word';
            pastedTextContainer.style.whiteSpace = 'pre-wrap';
            pastedTextContainer.style.color = '#333';
            pastedTextContainer.style.marginTop = '8px';
            pastedTextContainer.textContent = pasteEvent.pastedText;

            textContainer.appendChild(timestampContainer);
            textContainer.appendChild(pastedTextContainer);

            const playButton = document.createElement('button');
            playButton.className = 'paste-event-play-btn';
            playButton.style.minWidth = '32px';
            playButton.style.height = '32px';
            playButton.style.borderRadius = '0';
            playButton.style.background = 'transparent';
            playButton.style.color = 'white';
            playButton.style.border = 'none';
            playButton.style.cursor = 'pointer';
            playButton.style.display = 'flex';
            playButton.style.alignItems = 'center';
            playButton.style.justifyContent = 'center';
            playButton.style.flexShrink = '0';

            const playIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7.58 16.89L13.17 12L7.58 7.11V16.89Z" fill="#4A90E2"/>
            <path d="M16 7V17H18V7H16Z" fill="#4A90E2"/>
            </svg>`;
            playButton.innerHTML = playIcon;

            playButton.addEventListener('mouseover', () => {
                playButton.style.transform = 'scale(1.05)';
            });
            playButton.addEventListener('mouseout', () => {
                playButton.style.transform = 'scale(1)';
            });

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
            const pauseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
            viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="9" y1="4" x2="9" y2="20"></line>
            <line x1="15" y1="4" x2="15" y2="20"></line>
            </svg>`;
            this.playButton.querySelector('.play-icon').innerHTML = pauseSvg;
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
                    "Insert", "Home", "End", "NumLock"]
                    .includes(key) ? key : "";
        }
    }
}