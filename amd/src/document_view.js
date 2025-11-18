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
 * This module provides functionality for document view management in the Tiny editor,
 * including full page mode display and sidebar information
 * @module     tiny_cursive/document_view
 * @copyright  2025 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Icons from 'tiny_cursive/svg_repo';
export default class DocumentView {

    constructor(User, Rubrics, submission, modulename, editor) {
        this.User = User;
        this.Rubrics = Rubrics;
        this.submission = submission;
        this.module = modulename;
        this.editor = editor;
        this.moduleIcon = Icons.assignment;
    }

    normalMode() {
        if (this.module === 'assign') {
            document.getElementById('tiny_cursive-fullpage-custom-header')?.remove();
            document.getElementById('cursive-fullpagemode-sidebar')?.remove();

            let current = document.querySelector('#id_onlinetext_editor_ifr');
            let p1 = current.parentElement;
            let p2 = p1.parentElement;

            p2.style.backgroundColor = '';
            current.style.width = '';
            current.style.minWidth = '';
            current.style.boxShadow = '';
            Object.assign(p1.style, {
                display: '',
                justifyContent: '',
                outline: '',
                margin: ''
            });
            p1.classList.remove('tiny-cursive-editor-container');
            p2.style.position = '';
            let iframeBody = current.contentDocument?.body || current.contentWindow?.document?.body;
            if (iframeBody) {
                iframeBody.style.padding = '0';
            }
            document.head.querySelector('#tiny_cursive-fullpage-mode-style')?.remove();
        } else if (this.module === 'forum') {
            document.getElementById('tiny_cursive-fullpage-custom-header')?.remove();
            document.getElementById('cursive-fullpagemode-sidebar')?.remove();

            let current = document.querySelector('#id_message_ifr');
            let p1 = current.parentElement;
            let p2 = p1.parentElement;

            p2.style.backgroundColor = '';
            current.style.width = '';
            current.style.minWidth = '';
            current.style.boxShadow = '';
            Object.assign(p1.style, {
                display: '',
                justifyContent: '',
                outline: '',
                margin: ''
            });
            p1.classList.remove('tiny-cursive-editor-container');
            p2.style.position = '';
            let iframeBody = current.contentDocument?.body || current.contentWindow?.document?.body;
            if (iframeBody) {
                iframeBody.style.padding = '0';
            }
            document.head.querySelector('#tiny_cursive-fullpage-mode-style')?.remove();
        }

    }

    fullPageMode() {

        if (this.module === 'assign') {
            this.moduleIcon = Icons.assignment;
            this.fullPageModule('onlinetext_editor');
        } else if (this.module === 'forum') {
            this.moduleIcon = Icons.forum;
            this.fullPageModule('message');
        }
    }

    docSideBar(status) {

        let url = new URL(window.location.href);
        let replyId = url.searchParams.get("reply");
        let toggle = document.querySelector('#cursive-fullpagemode-sidebar-toggle');

        const container = this.create('div');
        container.id = 'cursive-fullpagemode-sidebar';
        container.className = 'bg-white h-100 shadow';
        container.style.width = '300px';
        container.style.overflow = 'auto';

        let crossBtn = this.create('span');
        crossBtn.className = 'btn p-2';
        crossBtn.innerHTML = Icons.close;
        crossBtn.id = 'cursive-collapse-sidebar';

        crossBtn.addEventListener('click', () => {
            container.style.transition = 'width 0.3s ease';
            container.style.width = '0';
            toggle.style.display = 'flex';
        });
        toggle?.addEventListener('click', function(){
            toggle.style.display = 'none';
            container.style.width = '300px';
        });

        let btnWrapper = this.create('div');
        btnWrapper.style.padding = '0 1rem';
        btnWrapper.style.position = 'sticky';
        btnWrapper.style.top = '0';
        btnWrapper.style.backgroundColor = 'white';
        btnWrapper.append(crossBtn);


        const header = this.create('div');
        header.className = 'border-bottom p-4';
        header.style.position = 'sticky';
        header.style.top = '0';
        header.style.backgroundColor = 'white';

        const headerTitle = this.create('h3');
        headerTitle.className = 'mb-1';
        headerTitle.textContent = 'Assignment Details';
        headerTitle.style.fontWeight = '600';

        let wordCount = this.wordCounter(status);

        header.append(headerTitle, wordCount);

        const content = this.create('div');
        content.className = 'p-3';

        let courseName = document.querySelector('#page-navbar > nav > ol > li:nth-child(1) > a');
        let courseDes = document.querySelector('#intro');
        let Dates = document.querySelector('.activity-dates');
        let openDate, dueDate = null;

        if (Dates) {
            openDate = Dates.querySelector('div:nth-child(1)');
            dueDate = Dates.querySelector('div:nth-child(2)');
        }
        if (this.module === 'forum') {
            this.checkForumSubject();
        }
        content.append(
            this.createBox({
                bg: 'bg-info',
                titleColor: 'text-info',
                icon: Icons.people,
                title: 'Student Information',
                bodyHTML: this.generateStudentInfo(this.User, courseName)
            })
        );


        if (courseDes && courseDes?.textContent.trim() !== '') {
            content.append(
                this.createBox({
                    bg: 'bg-gray',
                    titleColor: 'text-dark',
                    icon: this.moduleIcon,
                    title: 'Assignment Description',
                    bodyHTML: courseDes.innerHTML
                })
            );
        }

        if (this.module === 'forum' && replyId) {
            let replyPost = document.querySelector(`#post-content-${replyId}`);
            if (replyPost?.textContent.trim()) {
                content.append(
                    this.createBox({
                        bg: 'bg-gray',
                        titleColor: 'text-dark',
                        icon: this.moduleIcon,
                        title: 'Replying to Post',
                        bodyHTML: replyPost.textContent.trim()
                    })
                );
            }
        }

        if (Object.keys(this.Rubrics).length) {
            content.append(
                this.createBox({
                    bg: 'bg-gray',
                    titleColor: 'text-dark',
                    icon: this.moduleIcon,
                    title: 'Assessment Rubrics',
                    bodyHTML: this.generateRubrics(this.Rubrics)
                })
            );
        }

        if (Dates) {
            content.append(
                this.createBox({
                    bg: 'bg-amber',
                    titleColor: 'text-dark',
                    icon: Icons.time,
                    title: 'Important Dates',
                    bodyHTML: this.generateImportantDates(openDate, dueDate)
                })
            );
        }

        content.append(
            this.createBox({
                bg: 'bg-green',
                titleColor: 'text-success',
                icon: this.moduleIcon,
                title: 'Submission Status',
                bodyHTML: this.submissionStatus(this.submission)
            })
        );

        container.append(btnWrapper, header, content);
        return container;

    }
    // Helper to create info boxes
    createBox({ bg, titleColor, icon, title, bodyHTML }) {
        const box = this.create('div');
        box.className = `tiny_cursive-fullpage-card ${bg}`;

        const heading = this.create('h4');
        heading.className = `tiny_cursive-fullpage-card-header ${titleColor}  mb-2 d-flex align-items-center`;
        heading.innerHTML = `${icon} ${title}`;

        const body = this.create('div');
        body.className = `tiny_cursive-fullpage-card-body`;
        body.innerHTML = bodyHTML;

        box.append(heading, body);
        return box;
    }

    generateRubrics(Rubrics) {
        const wrapper = this.create('div');

        Rubrics.forEach(rubric => {
            const rubricDiv = this.create('div');
            rubricDiv.className = 'tiny_cursive-rubric-card';

            const title = this.create('h3');
            title.className = 'tiny_cursive-rubric-title';
            title.textContent = rubric.description;
            rubricDiv.appendChild(title);

            Object.values(rubric.levels).forEach(level => {
                const levelDiv = this.create('div');
                const score = Number(level.score);

                // Assign background color class based on score
                if (score === 0) {
                    levelDiv.className = 'tiny_cursive-rubric-level tiny_cursive-rubric-low';
                } else if (score <= 2) {
                    levelDiv.className = 'tiny_cursive-rubric-level tiny_cursive-rubric-mid';
                } else {
                    levelDiv.className = 'tiny_cursive-rubric-level tiny_cursive-rubric-high';
                }

                levelDiv.textContent = `${level.definition} / ${level.score}`;
                rubricDiv.appendChild(levelDiv);
            });

            wrapper.appendChild(rubricDiv);
        });

        return wrapper.innerHTML;
    }

    submissionStatus(submission) {
        const wrapper = this.create('div');

        const statusWrapper = this.create('div');
        statusWrapper.className = 'tiny_cursive-status-row';

        const statusName = this.create('span');
        statusName.textContent = 'Status: ';

        const statusValue = this.create('span');
        const isNew = submission?.current?.status === 'new';
        statusValue.textContent = isNew ? 'Draft (Not submitted)' : 'Draft (Submitted)';
        statusValue.className = `tiny_cursive-status-value ${isNew ? 'tiny_cursive-status-red' : 'tiny_cursive-status-green'}`;

        statusWrapper.append(statusName, statusValue);

        const modifiedWrapper = this.create('div');
        modifiedWrapper.className = 'tiny_cursive-status-row';

        const modifiedName = this.create('span');
        modifiedName.textContent = 'Last Modified: ';
        const modifiedValue = this.create('span');
        if (submission?.current?.timemodified) {
            const date = new Date(submission.current.timemodified * 1000);
            modifiedValue.textContent = this.formatDate(date);
        } else {
            modifiedValue.textContent = 'N/A';
        }
        modifiedWrapper.append(modifiedName, modifiedValue);

        const gradeWrapper = this.create('div');
        gradeWrapper.className = 'tiny_cursive-status-row';

        const gradeName = this.create('span');
        gradeName.textContent = 'Grading Status: ';

        const gradeValue = this.create('span');

        if (submission?.grade) {
            gradeValue.textContent = Number(submission.grade.grade) > 0
                ? submission.grade.grade
                : 'Not graded';
        } else {
            gradeValue.textContent = 'Not graded';
        }

        gradeWrapper.append(gradeName, gradeValue);

        wrapper.append(statusWrapper, gradeWrapper, modifiedWrapper);
        return wrapper.innerHTML;
    }

    wordCounter(status) {
        const wordCount = this.create('div');
        wordCount.className = 'tiny_cursive-word-counter';
        wordCount.textContent = '0 words';

        const observer = new MutationObserver(() => {
            const newText = status.textContent.trim();
            wordCount.textContent = `${newText}`;
        });
        observer.observe(status, {
            characterData: true,
            subtree: true,
            childList: true
        });

        return wordCount;
    }


    generateStudentInfo(user, course) {

        const wrapper = this.create('div');

        const nameWrapper = this.create('div');
        const usernameWrapper = this.create('div');
        const courseWrapper = this.create('div');

        const nameLabel = this.create('span');
        const nameValue = this.create('span');
        const usernameLabel = this.create('span');
        const usernameValue = this.create('span');
        const courseLabel = this.create('span');
        const courseValue = this.create('span');

        nameLabel.textContent = 'Name: ';
        nameValue.textContent = user.fullname;

        usernameLabel.textContent = 'Username: ';
        usernameValue.textContent = user.username;

        courseLabel.textContent = 'Course: ';
        courseValue.textContent = course.title;

        nameWrapper.className = 'd-flex justify-content-between';
        usernameWrapper.className = 'd-flex justify-content-between';
        courseWrapper.className = 'd-flex justify-content-between';

        nameWrapper.append(nameLabel, nameValue);
        usernameWrapper.append(usernameLabel, usernameValue);
        courseWrapper.append(courseLabel, courseValue);

        wrapper.append(nameWrapper, usernameWrapper, courseWrapper);

        return wrapper.innerHTML;

    }

    generateImportantDates(open, due) {

        const wrapper = this.create('div');

        const openedWrapper = this.create('div');
        const dueWrapper = this.create('div');
        const remainingWrapper = this.create('div');

        const openedLabel = this.create('span');
        const openedValue = this.create('span');
        const dueLabel = this.create('span');
        const dueValue = this.create('span');
        const remainingLabel = this.create('span');
        const remainingValue = this.create('span');

        let openDate = open?.textContent.replace("Opened:", "")?.trim();
        let dueDate = due?.textContent.replace("Due:", "")?.trim();

        openedLabel.textContent = 'Opened: ';
        openedValue.textContent = this.formatDate(openDate ? new Date(openDate) : null);
        openedValue.className = 'text-dark';

        dueLabel.textContent = 'Due: ';
        dueValue.textContent = this.formatDate(dueDate ? new Date(dueDate) : null);
        dueValue.className = 'text-danger';

        remainingLabel.textContent = 'Remaining: ';
        remainingValue.textContent = this.calculateDate(dueDate);
        remainingValue.className = 'text-danger';

        openedWrapper.className = 'd-flex justify-content-between';
        dueWrapper.className = 'd-flex justify-content-between';
        remainingWrapper.className = 'd-flex align-items-center justify-content-between mt-2 pt-2 border-top';

        openedWrapper.append(openedLabel, openedValue);
        dueWrapper.append(dueLabel, dueValue);
        remainingWrapper.append(remainingLabel, remainingValue);

        wrapper.append(openedWrapper, dueWrapper, remainingWrapper);

        return wrapper.innerHTML;
    }

    formatDate(date) {
        if (!date) {
            return '-';
        }
        let options = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true };
        return date.toLocaleString('en-US', options);
    }

    calculateDate(date) {
        if (!date) {
            return '-';
        }
        const date1 = new Date(date); // Due date (local time)
        const now = new Date(); // Current date/time

        // Calculate the difference in milliseconds
        const diffMs = date1 - now;

        // Convert to days, hours, minutes
        if (diffMs <= 0) {
            return "Overdue";
        } else {
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);

            return `${diffDays} days, ${diffHours} hours`;
        }

    }

    fullPageModule(module) {
        let current = document.querySelector(`#id_${module}_ifr`);
        let p1 = current.parentElement;
        let p2 = p1.parentElement;
        let p3 = p2.parentElement;
        let p4 = p3.parentElement;

        let statusBar = document.querySelector('.tox-statusbar__right-container > button');
        let assignName = document.querySelector('.page-context-header');
        assignName.classList.remove('mb-2');

        let header = this.create('div');
        header.id = 'tiny_cursive-fullpage-custom-header';
        header.style.backgroundColor = 'white';
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';

        let btn = this.create('input');
        btn.className = 'tiny_cursive-fullpage-submit-btn';
        btn.value = 'Save changes';
        btn.type = 'submit';
        btn.style.margin = '.5rem';

        const leftSide = this.create('div');
        leftSide.style.display = 'flex';
        leftSide.style.alignItems = 'center';
        leftSide.style.margin = '0 1rem';

        const rightSide = this.create('div');
        rightSide.style.display = 'flex';
        rightSide.style.alignItems = 'center';
        rightSide.style.margin = '0 1rem';
        rightSide.id = 'tiny_cursive-fullpage-right-wrapper';

        rightSide.appendChild(btn);
        leftSide.appendChild(assignName.cloneNode(true));


        header.appendChild(leftSide);
        header.appendChild(rightSide);

        p4.insertBefore(header, p4.firstChild);
        p2.style.backgroundColor = '#efefef';
        current.style.width = '750px';
        current.style.minWidth = '750px';
        current.style.boxShadow = '0 10px 15px -3px rgb(0 0 0/0.1),0 4px 6px -4px rgb(0 0 0/0.1)';
        Object.assign(p1.style, {
            display: 'flex',
            justifyContent: 'center',
            outline: 'none',
            margin: '2rem 0 0'
        });
        const style = this.create('style');
        style.id = 'tiny_cursive-fullpage-mode-style';
        style.textContent = `
            .tox.tox-edit-focus .tox-edit-area::before {
                opacity: 0;
            }
            `;
        document.head.appendChild(style);

        let iframeBody = current.contentDocument?.body || current.contentWindow?.document?.body;

        if (iframeBody) {
            iframeBody.style.padding = '0.5in';
        }
        p2.style.position = 'relative';
        document.getElementById('cursive-fullpagemode-sidebar')?.remove();

        let toggle = this.create('div');
        toggle.id = 'cursive-fullpagemode-sidebar-toggle';
        toggle.innerHTML = Icons.hamburger;
        p2.appendChild(toggle);
        p2.appendChild(this.docSideBar(statusBar));
    }

    checkForumSubject() {
        const form = document.querySelector('#tiny_cursive-fullpage-right-wrapper > input');
        const msg = 'Subject or message cannot be empty.';

        if (form) {
            form.addEventListener('click', (e) => {
                const subjectInput = document.getElementById('id_subject');
                let content = this.editor.getContent().trim();
                if (!subjectInput || subjectInput.value.trim() === '' || content === '') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.editor.windowManager.alert(msg);
                }
            });
        }
    }


    create(tag) {
        return document.createElement(tag);
    }

}