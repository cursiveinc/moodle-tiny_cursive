<?php
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
 * Tiny cursive plugin.
 *
 * @package tiny_cursive
 * @copyright  CTI <info@cursivetechnology.com>
 * @author kuldeep singh <mca.kuldeep.sekhon@gmail.com>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$string['allmodule'] = 'All Modules';
$string['alluser'] = 'All Users';
$string['analytics'] = 'Analytics';
$string['api_addr_url'] = 'API address URL';
$string['api_url'] = 'API URL';
$string['attemptid'] = 'Attempt id';
$string['authorship'] = 'Authorship Confidence ';
$string['authorship_desc'] = 'TypeID verification status';
$string['average_min'] = 'Average Words Per minute:';
$string['backspace'] = 'Revision %';
$string['backspace_desc'] = 'Percentage of backspace and delete usage';
$string['backspace_percent'] = 'Backspace percent';
$string['character_count'] = 'Character count';
$string['characters_per_minute'] = 'Characters per minute';
$string['cite_src'] = 'Enable Site-Source';
$string['cite_src_des'] = 'Show site-source comments under post when enabled';
$string['close'] = 'Close';
$string['comments'] = "Comments";
$string['confidence_threshold'] = '0.65';
$string['confidence_thresholds'] = 'Confidence Threshold';
$string['copy_behave'] = 'Copy Behavior:';
$string['copybehavior'] = 'Copy behavior';
$string['course'] = "Course";
$string['courseid'] = 'Course ID';
$string['coursename'] = 'Course name';
$string['curlerror'] = 'Curl error';
$string['cursive:dis:fail'] = "Failed to disable Cursive.";
$string['cursive:dis:succ'] = "Cursive disabled successfully.";
$string['cursive:editsettings'] = 'Access Plugin Settings';
$string['cursive:ena:fail'] = "Failed to enable Cursive.";
$string['cursive:ena:succ'] = "Cursive enabled successfully.";
$string['cursive:state:active'] = "Cursive is active:";
$string['cursive:state:active:des'] = "Your drafting and editing are now being captured as part of your submission.";
$string['cursive:status'] = "Something went wrong while disabling Cursive.";
$string['cursive:use'] = "Use TinyMCE Cursive";
$string['cursive:view'] = 'View Writing Reports';
$string['cursive:write'] = 'Write JSON File or Insert records';
$string['cursive:writingreport'] = 'Access to analytics';
$string['cursive_status'] = 'Cursive Status';
$string['cursivedisable'] = "Cursive Global Settings";
$string['cursivedisable_des'] = "This setting will disable or enable Cursive for all courses. You can also re-enable or disable it individually through each course's settings.";
$string['data_save'] = 'Data saved successfully';
$string['difference'] = 'Difference';
$string['disable'] = 'Disable';
$string['disabled'] = 'Disabled';
$string['download'] = 'Download';
$string['download_attempt_json'] = 'Download Attempt JSON';
$string['download_csv'] = 'Download cumulative Report';
$string['edits'] = "Edits";
$string['edits_des'] = "Edits are exactly what you think they are, movement of words, changes to characters and text, and updates you make as part of the editing process. This is simply the count of use of keys like Ctrl, Delete, and Backspace. Higher editing can lead to more concise, clear, and refined writing.";
$string['editspastesai'] = 'Edits/Pastes/AI  ';
$string['effort_ratio'] = 'Effort';
$string['effort_ratio_desc'] = 'Total characters from verified effort / total characters in submission';
$string['email'] = 'Email';
$string['enable'] = 'Enable';
$string['enabled'] = 'Enabled';
$string['enter_nonzerovalue'] = 'Please Select at least 5 seconds';
$string['enter_numericvalue'] = 'Please Enter Numeric Value';
$string['enter_time'] = 'Enter time';
$string['errorverifyingtoken'] = 'Error verifying token';
$string['failed'] = 'failed';
$string['field_require'] = 'This field is required';
$string['filenotfound'] = 'File not found!';
$string['filesizelimit'] = "File exceeds the 16MB size limit.";
$string['fullname'] = 'Full name';
$string['generate'] = 'Generate';
$string['host_domain'] = 'You Host domain.';
$string['invalidjson'] = "Invalid JSON content in file.";
$string['invalidparameters'] = 'Invalid parameters have been given.';
$string['key_count'] = 'Key count';
$string['keys_per_minute'] = 'Keys per minute';
$string['last_modified'] = 'Last modified';
$string['learn_more'] = 'Learn More';
$string['module_name'] = 'Module Name';
$string['modulename'] = 'Module Name';
$string['moodle_host'] = 'Moodle Host';
$string['no_submission'] = 'No Submission';
$string['nopaylod'] = 'No payload data received yet';
$string['orderby'] = 'Order By';
$string['original_text'] = 'Original Text';
$string['p_burst_cnt'] = "P-burst Count";
$string['p_burst_cnt_des'] = "A p-burst is a common feature of writing analytics. In short, it's a sequence of writing until the point at which a writer pauses for 2 seconds or longer. A writing session is invariably made up of many p-bursts which can be quantified. Specifically, this feature reflects the total number of sequences in the writing session or sessions in this document.
This number can be compared to the average, but lower or higher numbers do not necessarily translate to good or bad.";
$string['p_burst_mean'] = "P-Burst Mean";
$string['p_burst_mean_des'] = "The p-burst mean is the average number of sequential presses between pauses. This is a quick calculation of your ability to string words and thoughts together during the writing process. You may find that your p-burst mean is higher for certain types of writing or when you're writing about certain topics. Higher numbers here can reflect a deeper understanding of the topic, more organized thinking, and fewer distractions while writing.";
$string['pastecount'] = "Paste Count";
$string['pastewarning'] = "You cannot paste text without providing source";
$string['pluginname'] = 'Cursive';
$string['pluginname_desc'] = 'This plugin configuration provides copy+paste interruption by default. To connect to the Cursive Machine Learning Server for authorship and writing analytics, please enter your token and server details below. If you do not have these, please contact info@cursivetechnology.com.';
$string['privacy:metadata:database:tiny_cursive'] = 'Information about the tiny cursive data.';
$string['privacy:metadata:database:tiny_cursive:content'] = "User keystorke date for generating analytics report";
$string['privacy:metadata:database:tiny_cursive:original_content'] = "User original submission content data";
$string['privacy:metadata:database:tiny_cursive:timemodified'] = 'The time when the data was last modified.';
$string['privacy:metadata:database:tiny_cursive:userid'] = 'The ID of the user who provided the data.';
$string['privacy:metadata:database:tiny_cursive_comments'] = 'Information about the tiny cursive comments data.';
$string['privacy:metadata:database:tiny_cursive_comments:commenttext'] = 'The text of the comment.';
$string['privacy:metadata:database:tiny_cursive_comments:timemodified'] = 'The time when the comment was last modified.';
$string['privacy:metadata:database:tiny_cursive_comments:userid'] = 'The ID of the user who provided the comment.';
$string['privacy:metadata:tiny_cursive'] = 'Tiny cursive plugin user data.';
$string['q_count'] = "Q Count";
$string['q_count_des'] = "Q is our stand-in for character. It is any alphanumeric key on your keyboard (spaces not included). These are all additive keys. This differs from Verbosity in its exclusion of edits and space.";
$string['quality'] = 'Quality';
$string['quality_access'] = 'Custom configuration';
$string['quality_access_des'] = 'Activate or Deactive this Advance configuration features.';
$string['queswise'] = 'Question-wise';
$string['quizname'] = 'Activity name';
$string['random_reflex'] = 'Your Random Reflection Prompt';
$string['refer'] = "References";
$string['replay'] = 'Replay';
$string['score'] = 'Score';
$string['secretkey'] = 'Cursive Secret Key';
$string['secretkey_desc'] = 'The API Secret Key of Cursive account';
$string['sectionadvance'] = "Advanced";
$string['sectionadvance_desc'] = "Custom configurations for Quality Metrics";
$string['select_time'] = 'Select time option';
$string['selectcrs'] = 'Select Course';
$string['selectmodule'] = 'Select Module';
$string['selectquiz'] = 'Select a quiz';
$string['selectuser'] = 'Select a User';
$string['sent_word_count_mean'] = "Word Count per Sentence Mean";
$string['sent_word_count_mean_des'] = "This simple calculation is the total estimated word count divided by the number of sentences providing an average of words per sentence. Sentence length increases as writing skills develop and writers progress from simple noun plus verb configurations to compound and complex sentences with advanced punctuation.";
$string['sentence_count'] = "Sentence Count";
$string['sentence_count_des'] = "The total number of sentences in your writing is a product of your use of punctuation, which reflects the calculated value here.";
$string['stats'] = 'Stats';
$string['stndtime'] = 'Standard time';
$string['student_writing_statics'] = 'Writing Statistics';
$string['success'] = 'success';
$string['syncinterval'] = 'Sync Interval';
$string['syncinterval_des'] = 'Specify how frequently (in seconds) the user\'s writing keystrokes should be synchronized with the server. A lower value provides more real-time tracking but may increase server load. Recommended range is 10-30 seconds.';
$string['test_token'] = 'Test Token';
$string['thresold_description'] = 'Each site may set its threshold for providing the successful match “green check” to the TypeID column for student submissions. We recommend .65. However, there may be arguments for lower or higher thresholds depending on your experience or academic honesty policy.';
$string['time_writing'] = 'Time Writing ';
$string['time_writing_desc'] = 'Total duration less inactive periods';
$string['timesave_success'] = 'Time saved successfully';
$string['tiny_cursive'] = 'Authorship and Analytics';
$string['tiny_cursive_placeholder'] = "Write your comment or paste your link here…";
$string['tiny_cursive_srcurl'] = "Please provide a comment";
$string['tiny_cursive_srcurl_des'] = "Insert a comment, link, or information to provide context for the pasted text. This will be displayed as part of the submission.";
$string['total_active_time'] = "Total Active Time";
$string['total_active_time_des'] = "Total active time is the duration of your active writing time (pressing keys, manipulating text) minus periods of inactivity longer than 30 seconds.";
$string['total_time'] = 'Total time';
$string['total_time_seconds'] = 'Total time';
$string['total_words'] = 'Total words';
$string['total_words_desc'] = 'Estimated total words from verified effort';
$string['typeid'] = 'TypeID';
$string['userename'] = 'User name';
$string['verbosity'] = "Verbosity";
$string['verbosity_des'] = "This is a count of total activity in the form of key presses. This includes both additions and deletions to your overall text. Every part of the writing process through a keyboard contributes to this number.";
$string['warning'] = 'You have no permissions to access the page.';
$string['warningpayload'] = "Something Went Wrong! or File Not Found!";
$string['webservicetoken'] = 'Web Service Token';
$string['webservicetoken_des'] = 'Webservice token';
$string['webservtokenerror'] = "An error occurred while generating the token: ";
$string['webservtokengenfail'] = "Webservice Token Generation Failed.";
$string['webservtokengensucc'] = "Webservice Token Generation Successful.";
$string['word_count'] = 'Word count';
$string['word_count_des'] = "How many words you typed is estimated based on your usage of the space bar.";
$string['word_len_mean'] = "Average Word Length";
$string['word_len_mean_des'] = "Average word length is calculated by dividing the estimated word count by the total number of characters. Word length varies based on your vocabulary, the audience that you're writing for, and the subject. Longer word lengths have an impact on readability and grade-level readability estimates.";
$string['words_per_minute'] = 'Writing Speed';
$string['words_per_minute_desc'] = 'Words per Minute';
$string['wractivityreport'] = 'Writing Activitiy Report';
