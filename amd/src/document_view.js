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

    constructor(User, Rubrics, submission, modulename, editor, quizInfo) {
        this.User = User;
        this.Rubrics = Rubrics;
        this.submission = submission;
        this.module = modulename;
        this.editor = editor;
        this.moduleIcon = Icons.assignment;
        this.quizInfo = quizInfo;
        this.initStrings();
    }

    normalMode() {
        let id = this.editor?.id + "_ifr";
        if (this.module === 'assign') {
            this.normalizePage(id);
        } else if (this.module === 'quiz') {
            this.normalizePage(id);
        } else if (this.module === 'forum') {
            this.normalizePage(id);
        } else if (this.module === 'lesson') {
            this.normalizePage(id);
        } else if(this.module === 'pdfannotator') {
            this.normalizePage(id);
        }
    }

    fullPageMode() {

        if (this.module === 'assign') {
            this.moduleIcon = Icons.assignment;
            this.fullPageModule(this.editor?.id);
        } else if (this.module === 'forum') {
            this.moduleIcon = Icons.forum;
            this.fullPageModule(this.editor?.id);
        } else if (this.module === 'quiz' && this.editor?.id) {
            this.moduleIcon = Icons.quiz;
            this.fullPageModule(this.editor?.id);
        } else if (this.module === 'lesson') {
            this.moduleIcon = Icons.lesson;
            this.fullPageModule(this.editor?.id);
        } else if (this.module === 'pdfannotator') {
            this.moduleIcon = Icons.pdfannotator;
            this.fullPageModule(this.editor?.id);
        }
    }

    docSideBar(status) {

        const url = new URL(window.location.href);
        const replyId = url.searchParams.get("reply");
        const toggle = document.querySelector('#cursive-fullpagemode-sidebar-toggle');
        const timelimitBlock = this.getTimerBlock(this.module);
        const headerInfo = this.getSidebarTitle();
        const progressBar = document.querySelector('.box.progress_bar');

        const courseName = document.querySelector('#page-navbar > nav > ol > li:nth-child(1) > a');
        const courseDes = document.querySelector('#intro');
        const Dates = document.querySelector('.activity-dates');

        let openDate = Dates?.querySelector('div:nth-child(1)');
        let dueDate = Dates?.querySelector('div:nth-child(2)');

        const container = this.create('div');
        Object.assign(container, {
            id: 'cursive-fullpagemode-sidebar',
            className: 'bg-white h-100 shadow'
        });
        Object.assign(container.style, {
            width: '300px',
            overflow: 'auto'
        });

        const crossBtn = this.create('span');
        Object.assign(crossBtn, {
            id: 'cursive-collapse-sidebar',
            className: 'btn p-2',
            innerHTML: Icons.close
        });

        crossBtn.addEventListener('click', () => {
            container.style.transition = 'width 0.3s ease';
            container.style.width = '0';
            toggle.style.display = 'flex';
        });
        toggle?.addEventListener('click', function() {
            toggle.style.display = 'none';
            container.style.width = '300px';
        });

        const btnWrapper = this.create('div');
        Object.assign(btnWrapper, {
            padding: '0 1rem',
            position: 'sticky',
            top: '0',
            backgroundColor: 'white'
        });
        btnWrapper.append(crossBtn);


        const header = this.create('div');
        header.className = 'border-bottom p-3 bg-light';
        Object.assign(header.style, {
            position: 'sticky',
            top: '0'
        });

        const headerTitle = this.create('h3');
        headerTitle.className = 'mb-3 d-flex align-items-center';
        headerTitle.textContent = `${headerInfo.title} ${this.details}`;
        headerTitle.style.fontWeight = '600';

        const headerIcon = document.querySelector('.page-header-image > div');
        if (headerIcon) {
            headerTitle.prepend(headerIcon.cloneNode(true));
        }

        let wordCount = this.wordCounter(status);
        if (timelimitBlock?.textContent) {
            header.append(headerTitle, wordCount, this.timerCountDown(timelimitBlock));
        } else {
            header.append(headerTitle, wordCount);
        }

        const content = this.create('div');
        content.className = 'p-3';

        content.append(
            this.createBox({
                bg: 'bg-info',
                titleColor: 'text-info',
                icon: Icons.people,
                title: this.studentInfo,
                bodyHTML: this.generateStudentInfo(this.User, courseName)
            })
        );

        if (this.module === 'lesson' && progressBar) {
            content.append(
                this.createBox({
                    bg: 'bg-gray',
                    titleColor: 'text-dark',
                    icon: this.moduleIcon,
                    title: this.progress,
                    bodyHTML: progressBar.innerHTML
                })
            );
        }

        if (courseDes && courseDes?.textContent.trim() !== '') {
            let fileSubDiv = document.querySelectorAll('.fileuploadsubmission');
            if (fileSubDiv) {
                fileSubDiv.forEach(Element => {
                    Element.style.verticalAlign = 'middle';
                });
            }
            content.append(
                this.createBox({
                    bg: 'bg-gray',
                    titleColor: 'text-dark',
                    icon: this.moduleIcon,
                    title: `${this.getSidebarTitle().title} ${this.description}`,
                    bodyHTML: courseDes.innerHTML
                })
            );
        }

        if (this.module === 'forum' && replyId) {
            this.checkForumSubject();
            let replyPost = document.querySelector(`#post-content-${replyId}`);
            if (replyPost?.textContent.trim()) {
                content.append(
                    this.createBox({
                        bg: 'bg-gray',
                        titleColor: 'text-dark',
                        icon: this.moduleIcon,
                        title: this.replyingto,
                        bodyHTML: replyPost.textContent.trim()
                    })
                );
            }
        }

        if (this.module === 'quiz' && this.editor?.id) {

            let questionId = this.getQuestionId(this.editor?.id);
            let question = document.querySelector(`#question-${questionId} .qtext`);
            let intro = atob(this.quizInfo.intro);

            if (question?.textContent.trim()) {
                content.append(
                    this.createBox({
                        bg: 'bg-amber',
                        titleColor: 'text-dark',
                        icon: this.moduleIcon,
                        title: this.answeringto,
                        bodyHTML: question.textContent
                    })
                );
            }

            if (intro && intro.trim() !== '') {
                content.append(
                    this.createBox({
                        bg: 'bg-gray',
                        titleColor: 'text-dark',
                        icon: this.moduleIcon,
                        title: `${this.quiz} ${this.description}`,
                        bodyHTML: intro
                    })
                );
            }

            if (Number(this.quizInfo.open)) {
                content.append(
                    this.createBox({
                        bg: 'bg-amber',
                        titleColor: 'text-dark',
                        icon: Icons.time,
                        title: this.importantdates,
                        bodyHTML: this.generateImportantDates(Number(this.quizInfo.open), Number(this.quizInfo.close))
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
                    title: this.rubrics,
                    bodyHTML: this.generateRubrics(this.Rubrics)
                })
            );
        }

        if (Dates && openDate) {
            content.append(
                this.createBox({
                    bg: 'bg-amber',
                    titleColor: 'text-dark',
                    icon: Icons.time,
                    title: this.importantdates,
                    bodyHTML: this.generateImportantDates(openDate, dueDate)
                })
            );
        }
        if (this.module === 'assign') {
            content.append(
                this.createBox({
                    bg: 'bg-green',
                    titleColor: 'text-success',
                    icon: this.moduleIcon,
                    title: this.subStatus,
                    bodyHTML: this.submissionStatus(this.submission)
                })
            );
        }

        container.append(btnWrapper, header, content);
        return container;

    }
    // Helper to create info boxes
    createBox({bg, titleColor, icon, title, bodyHTML}) {
        const box = this.create('div');
        box.className = `tiny_cursive-fullpage-card ${bg}`;

        const heading = this.create('h4');
        heading.className = `tiny_cursive-fullpage-card-header ${titleColor} d-flex align-items-center`;
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
        statusName.textContent = `${this.status}:`;

        const statusValue = this.create('span');
        const isNew = submission?.current?.status === 'new';
        statusValue.textContent = isNew ? this.draftnot : this.draft;
        statusValue.className = `tiny_cursive-status-value ${isNew ? 'tiny_cursive-status-red' : 'tiny_cursive-status-green'}`;

        statusWrapper.append(statusName, statusValue);

        const modifiedWrapper = this.create('div');
        modifiedWrapper.className = 'tiny_cursive-status-row';

        const modifiedName = this.create('span');
        modifiedName.textContent = `${this.lastModified}: `;

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
        gradeName.textContent = `${this.gradings}: `;

        const gradeValue = this.create('span');

        if (submission?.grade) {
            gradeValue.textContent = Number(submission.grade.grade) > 0
                ? submission.grade.grade
                : this.gradenot;
        } else {
            gradeValue.textContent = this.gradenot;
        }

        gradeWrapper.append(gradeName, gradeValue);
        wrapper.append(statusWrapper, gradeWrapper, modifiedWrapper);
        return wrapper.innerHTML;
    }

    wordCounter(status) {
        const wordCount = this.create('div');
        const labelDiv = this.create('div');
        const label = this.create('span');
        const value = this.create('span');
        const icon = this.create('span');

        icon.className = 'me-2';
        icon.innerHTML = Icons.assignment;

        labelDiv.appendChild(icon);
        labelDiv.append(label);

        label.textContent = `${this.wordCount}:`;
        value.textContent = '0';
        value.className = 'text-primary';
        value.style.fontWeight = '600';
        value.style.fontSize = '14px';

        wordCount.className = 'bg-white rounded shadow-sm p-2 d-flex justify-content-between my-2';
        wordCount.append(labelDiv, value);
        wordCount.style.fontSize = '12px';

        const observer = new MutationObserver(() => {
            const newText = status.textContent.trim();
            value.textContent = `${newText.replace('words', '')}`;
        });

        observer.observe(status, {
            characterData: true,
            subtree: true,
            childList: true
        });

        return wordCount;
    }


    timerCountDown(timer) {

        let warningDiv = document.querySelector('#user-notifications > div');
        if (warningDiv) {
            let clone = warningDiv.cloneNode(true);
            clone.querySelector('button')?.remove();
            this.editor.notificationManager.open({
                text: clone.textContent,
                type: 'error'
            });
        }


        const timerCount = this.create('div');
        timerCount.className = 'bg-white rounded shadow-sm p-2 d-flex justify-content-between my-2';

        const labelDiv = this.create('div');
        const label = this.create('span');
        const value = this.create('span');
        const icon = this.create('span');
        icon.innerHTML = Icons.time;

        labelDiv.appendChild(icon);
        labelDiv.append(label);

        label.textContent = `${this.timeleft}:`;
        value.textContent = '00:00:00';
        value.className = warningDiv ? 'text-danger' : 'text-primary';
        Object.assign(value.style, {
            fontWeight: '600',
            fontSize: '14px'
        });


        timerCount.append(labelDiv, value);
        timerCount.style.fontSize = '12px';
        if (timer) {
            const observer = new MutationObserver(() => {
                const newText = timer.textContent.trim();
                value.textContent = `${newText}`;
            });
            observer.observe(timer, {
                characterData: true,
                subtree: true,
                childList: true
            });
        } else {
            value.textContent = this.nolimit;
        }


        return timerCount;
    }


    generateStudentInfo(user, course) {

        const wrapper = this.create('div');

        const nameWrapper = this.create('div');
        const usernameWrapper = this.create('div');
        const courseWrapper = this.create('div');

        const nameLabel = this.create('strong');
        const nameValue = this.create('span');
        const usernameLabel = this.create('strong');
        const usernameValue = this.create('span');
        const courseLabel = this.create('strong');
        const courseValue = this.create('span');

        nameLabel.textContent = `${this.name}`;
        nameValue.textContent = user.fullname;

        usernameLabel.textContent = `${this.userename}: `;
        usernameValue.textContent = user.username;

        courseLabel.textContent = `${this.course}: `;
        courseValue.textContent = course.title;

        usernameLabel.className = 'cfw-bold me-2';
        usernameValue.className = 'cursiveFw-wrap';
        courseLabel.className = 'cfw-bold me-2';
        courseValue.className = 'cursiveFw-wrap';
        nameLabel.className = 'cfw-bold me-2';
        nameValue.className = 'cursiveFw-wrap';

        nameWrapper.append(nameLabel, nameValue);
        usernameWrapper.append(usernameLabel, usernameValue);
        courseWrapper.append(courseLabel, courseValue);

        wrapper.append(nameWrapper, usernameWrapper, courseWrapper);

        return wrapper.innerHTML;

    }

    generateImportantDates(open, due) {

        const wrapper = this.create('div');
        let openDate = null;
        let dueDate = null;

        if (this.module === 'quiz') {
            // For quiz, open/due are timestamps - only set if non-zero
            openDate = open ? open * 1000 : null;
            dueDate = due ? due * 1000 : null;
        } else {
            // For other modules, check the text content to determine which is which
            // Moodle only renders divs for dates that are set, so we need to check labels
            const openText = open?.textContent?.toLowerCase() || '';
            const dueText = due?.textContent?.toLowerCase() || '';

            // Check if 'open' div actually contains an open date or a due date
            if (openText.includes('opened') || openText.includes('open')) {
                openDate = this.extractDate(open?.textContent);
            } else if (openText.includes('due') || openText.includes('close')) {
                // First div is actually the due date (no open date was set)
                dueDate = this.extractDate(open?.textContent);
            }

            // Check 'due' div if it exists
            if (due && (dueText.includes('due') || dueText.includes('close'))) {
                dueDate = this.extractDate(due?.textContent);
            }
        }

        // Only show open date if it exists
        if (openDate) {
            const openedWrapper = this.create('div');
            const openedLabel = this.create('span');
            const openedValue = this.create('span');

            openedLabel.textContent = `${this.opened}: `;
            openedValue.textContent = this.formatDate(new Date(openDate));
            openedValue.className = 'text-dark';

            openedWrapper.className = 'd-flex justify-content-between';
            openedWrapper.append(openedLabel, openedValue);
            wrapper.append(openedWrapper);
        }

        // Only show due date and remaining time if due date exists
        if (dueDate) {
            const dueWrapper = this.create('div');
            const dueLabel = this.create('span');
            const dueValue = this.create('span');

            dueLabel.textContent = `${this.due}: `;
            dueValue.textContent = this.formatDate(new Date(dueDate));
            dueValue.className = 'text-danger';

            dueWrapper.className = 'd-flex justify-content-between';
            dueWrapper.append(dueLabel, dueValue);
            wrapper.append(dueWrapper);

            // Remaining time - only show if due date exists
            const remainingWrapper = this.create('div');
            const remainingLabel = this.create('span');
            const remainingValue = this.create('span');

            remainingLabel.textContent = `${this.remaining}: `;
            remainingValue.textContent = this.calculateDate(dueDate);
            remainingValue.className = 'text-danger';

            remainingWrapper.className = 'd-flex align-items-center justify-content-between mt-2 pt-2 border-top';
            remainingWrapper.append(remainingLabel, remainingValue);
            wrapper.append(remainingWrapper);
        }

        return wrapper.innerHTML;
    }

    formatDate(date) {
        if (!date) {
            return '-';
        }

        let options = {year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true};
        return date.toLocaleString('en-US', options);
    }

    extractDate(text) {
        if (!text) {
            return null;
        }
        // Split on first colon and return the right part
        const parts = text?.split(':');
        if (parts.length > 1) {
            const dateStr = parts.slice(1).join(':').trim();
            // Return null if empty or invalid
            return dateStr || null;
        }

        return text.trim() || null;
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
        let current = this.module === 'quiz' ?
            document.getElementById(`${module}_ifr`) : document.querySelector(`#${module}_ifr`);

        let p1 = current.parentElement;
        let p2 = p1.parentElement;
        let p3 = p2.parentElement;
        let p4 = p3.parentElement;

        let statusBar = document.querySelector('.tox-statusbar__right-container > button');
        let assignName = document.querySelector('.page-context-header');
        let header = this.create('div');
        let btn = null;

        assignName.classList.remove('mb-2');
        header.id = 'tiny_cursive-fullpage-custom-header';
        Object.assign(header.style, {
            backgroundColor: 'white',
            display: 'flex',
            justifyContent: 'space-between'
        });

        if (this.module === 'quiz') {
            btn = document.querySelector('#mod_quiz-next-nav').cloneNode(true);
            btn.className = 'tiny_cursive-fullpage-submit-btn';
            btn.style.margin = '.5rem';
        } else {
            btn = this.create('input');
            btn.className = 'tiny_cursive-fullpage-submit-btn';
            btn.value = this.savechanges;
            btn.type = 'submit';
            btn.style.margin = '.5rem';
        }

        if (this.module === 'pdfannotator') {
            const style = document.createElement('style');
            style.id = 'cursiveForceStyle';
            style.textContent = `
                .path-mod-pdfannotator #comment-wrapper h4,
                .path-mod-pdfannotator #comment-nav {
                    margin: 0 !important;
                }
            `;
            document.head.appendChild(style);
        }

        const leftSide = this.create('div');
        const rightSide = this.create('div');
        let commonStyle = {
            display: 'flex',
            alignItems: 'center',
            margin: '0 1rem'
        };

        Object.assign(leftSide.style, commonStyle);
        rightSide.id = 'tiny_cursive-fullpage-right-wrapper';
        Object.assign(rightSide.style, commonStyle);

        rightSide.appendChild(btn);
        leftSide.appendChild(assignName.cloneNode(true));

        header.appendChild(leftSide);
        header.appendChild(rightSide);

        p4.insertBefore(header, p4.firstChild);
        p2.style.backgroundColor = '#efefef';
        Object.assign(current.style, {
            width: '750px',
            minWidth: '750px',
            boxShadow: '0 10px 15px -3px rgb(0 0 0/0.1),0 4px 6px -4px rgb(0 0 0/0.1)'
        });

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
            }`;
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

    normalizePage(editorId) {
        document.getElementById('tiny_cursive-fullpage-custom-header')?.remove();
        document.getElementById('cursive-fullpagemode-sidebar')?.remove();

        let current = document.getElementById(editorId);
        let p1 = current.parentElement;
        let p2 = p1.parentElement;

        Object.assign(p2.style, {
            backgroundColor: "",
            position: ""
        });

        Object.assign(current.style, {
            width: '',
            minWidth: '',
            boxShadow: '',
        });

        Object.assign(p1.style, {
            display: '',
            justifyContent: '',
            outline: '',
            margin: ''
        });

        p1.classList.remove('tiny-cursive-editor-container');

        let iframeBody = current.contentDocument?.body || current.contentWindow?.document?.body;
        if (iframeBody) {
            iframeBody.style.padding = '0';
        }
        document.head.querySelector('#tiny_cursive-fullpage-mode-style')?.remove();
        document.head.querySelector('#cursiveForceStyle')?.remove();
    }

    checkForumSubject() {
        const form = document.querySelector('#tiny_cursive-fullpage-right-wrapper > input');
        const msg = this.subjectnot;

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

    getSidebarTitle() {
        const [assign, discus, quiz, lesson] = this.getText('sbTitle');
        switch (this.module) {
            case 'assign':
                return {title: assign, icon: Icons.assignment};
            case 'forum':
                return {title: discus, icon: Icons.forum};
            case 'lesson':
                return {title: lesson, icon: Icons.forum};
            case 'quiz':
                return {title: quiz, icon: Icons.quiz};
            case 'pdfannotator':
                return {title: 'PDF Annotation', icon: Icons.pdfannotator};
            default:
                return {title: 'Page', icon: Icons.quiz};
        }
    }

    getTimerBlock(module) {
        switch (module) {
            case 'assign':
                return document.querySelector('#mod_assign_timelimit_block > div > div');
            case 'forum':
                return document.querySelector('#mod_forum_timelimit_block');
            case 'lesson':
                return document.querySelector('#lesson-timer');
            case 'quiz':
                return document.querySelector('#quiz-time-left');
            default:
                return null;
        }
    }

    getQuestionId(editoId) {
        try {
            if (!editoId || typeof editoId !== 'string') {
                return '';
            }
            return editoId.replace(/^q(\d+):(\d+)_.*$/, "$1-$2");
        } catch (error) {
            window.console.error('Error getting question ID:', error);
            return '';
        }
    }

    initStrings() {
        [
            this.details,
            this.studentInfo,
            this.progress,
            this.description,
            this.replyingto,
            this.answeringto,
            this.importantdates,
            this.rubrics,
            this.subStatus,
            this.status,
            this.draft,
            this.draftnot,
            this.lastModified,
            this.gradings,
            this.gradenot,
            this.wordCount,
            this.timeleft,
            this.nolimit,
            this.name,
            this.userename,
            this.course,
            this.opened,
            this.due,
            this.overdue,
            this.remaining,
            this.savechanges,
            this.subjectnot
        ] = this.getText('docSideBar');
    }

    getText(key) {
        return JSON.parse(localStorage.getItem(key)) || [];
    }

    create(tag) {
        return document.createElement(tag);
    }

}