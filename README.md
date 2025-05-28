# Cursive Moodle TinyMCE Plugin #

At Cursive Technology, Inc., we're focused on the writing process. By capturing key event data (also known by the scary euphemism "key logging"), we can make new opportunities for teaching, learning, and research in a low-cost, low-effort way, all in the existing workflows of your course and site.

Currently, the extension captures key event data in a structured JSON object, which a teacher or administrator can download and review. This is for each use of the TinyMCE text editor by a student, sortable by course, assignment, student, and attempt. This data can be utilized with the shared Excel or Google document which provide analysis that may help determine the level of effort by a student.

**Premium/Subscription:** Cursive's plugin is designed to interact with our ML server as a paid service. This integration is optional and adds the following capabilities: 
1. identify student authorship across their submissions, 
2. provide writing analytics automatically, 
3. provide students a running total of their words, pages, typing speed, and assignments across their courses.

Ultimately, we believe in human contribution as captured through the writing process, the beautiful production of written work expressing your individual thoughts that cannot be completed by a third party nor replicated by generative AI. We're excited to work with you.

If you have questions, comments, or would like to request a trial API key, please reach out to us at contact@cursivetechnology.com


## Instatllation

### Install by downloading the ZIP file
- Install by downloading the ZIP file from the Moodle plugins directory
- Download the zip file from GitHub
- Unzip the zip file in /path/to/moodle/lib/editor/tiny/plugins/cursive folder or upload the zip file in the install plugins options from site administration: Site Administration -> Plugins -> Install Plugins -> Upload zip file

### Install using git clone

Go to Moodle Project `root/lib/editor/tiny/plugins/cursive` directory and clone code by using the following commands:

```
git clone https://github.com/cursiveinc/moodle-tinymce_cursive.git cursive
```
- In your Moodle site (as admin), Visit site administration to finish the installation.

**Alternatively, you can run**
``$ php admin/cli/upgrade.php``
to complete the installation from the command line.


## Configuration
After installing the plugin, you can update the settings.

To update the plugin settings, navigate to plugin settings: 

 `Site Administration->Plugins->Cursive`
  
![Screenshot 2024-10-24 132422](https://github.com/user-attachments/assets/f176ce08-37d7-4c52-8a09-cade09fcbb99)

If you want to use Analytics And Diff feature then you need to fill up that informations.
for subscription please reach out to us at **contact@cursivetechnology.com**.
There are several configuration options for the plugin. The free version allows you the following features: 
1. Enable or disable "Cite Source" student copy/paste comment features. 
2. Data Sync Interval with your moodle server to reduce the number of http requests.
3. Global settings for Enabling or Disabling cursive for all courses.

By entering an agreement with Cursive, an API URL and key will be provided to manage the premium ML features. A custom threshold for API-generated values of identify verification is also available to tune the threshold for displaying a green check verification. 

## Supported Activity Modules

Our plugin is designed to work with activities where students provide **written text responses**.  
It supports only text-based inputs such as **Online text** submissions and **Essay-type** questions.  
Other formats, like file uploads or multiple-choice questions, are not supported.

Currently supported Moodle activity modules:

| # | Activity  | Supported Type |
|:-:|-----------|----------------|
| 1 | Assignment | Online text submissions only |
| 2 | Quiz       | Essay question types only |
| 3 | Forum      | Posts and discussion entries |
| 4 | Lesson     | Essay-style lesson questions |
| 5 | OU Blog    | Blog posts and entries |

> **Note:** Across all modules, only **essay-type** responses are supported.


>**Note:** Users who want to use and get Cursive support in the **OU Blog** plugin must install the support plugin. Check for more updates about it at https://cursivetechnology.com.

## License
#### 2023 Cursive Technology, Inc.

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program. If not, see https://www.gnu.org/licenses/.
