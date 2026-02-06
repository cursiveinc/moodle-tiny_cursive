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
 * Tiny cursive plugin upgrade script.
 *
 * @package tiny_cursive
 * @copyright  CTI <info@cursivetechnology.com>
 * @author kuldeep singh <mca.kuldeep.sekhon@gmail.com>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */


/**
 * Run all ClamAV plugin upgrade steps between the current DB version and the current version on disk.
 *
 * @param int $oldversion The old version of atto in the DB.
 * @return bool
 */
function xmldb_tiny_cursive_upgrade($oldversion) {
    global $DB;

    $dbman = $DB->get_manager();

    if ($oldversion < 2023041937) {
        $table = new xmldb_table('tiny_cursive_files');
        $field = new xmldb_field('questionid', XMLDB_TYPE_INTEGER, '20', null, null, null, '0', 'uploaded');

        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }
        upgrade_plugin_savepoint(true, 2023041937, 'tiny', 'cursive');
    }

    if ($oldversion < 2024060227) {
        $table = new xmldb_table('tiny_cursive_writing_diff');
        // Check if the table exists.
        if ($dbman->table_exists($table)) {
            // Drop the existing table.
            $dbman->drop_table($table);
        }

        // Define table fields.
        $table->add_field('id', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, XMLDB_SEQUENCE, null);
        $table->add_field('file_id', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, null);
        $table->add_field('reconstructed_text', XMLDB_TYPE_TEXT, 'long', null, XMLDB_NOTNULL, null, null);
        $table->add_field('submitted_text', XMLDB_TYPE_TEXT, 'long', null, XMLDB_NOTNULL, null, null);
        $table->add_field('meta', XMLDB_TYPE_TEXT, 'medium', null, null, null, null);

        // Define table keys.
        $table->add_key('primary', XMLDB_KEY_PRIMARY, ['id']);

        // Create the new table.
        $dbman->create_table($table);

        // Save upgrade path.
        upgrade_plugin_savepoint(true, 2024060227, 'tiny', 'cursive');
    }

    if ($oldversion < 2024060228) {
        $table = new xmldb_table('tiny_cursive_files');
        $field = new xmldb_field('content', XMLDB_TYPE_TEXT, null, null, null, null, null, 'filename');

        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }
        upgrade_plugin_savepoint(true, 2024060228, 'tiny', 'cursive');
    }

    if ($oldversion < 2024060282) {
        $table = new xmldb_table('tiny_cursive_quality_metrics');

        $table->add_field('id', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, XMLDB_SEQUENCE, null);
        $table->add_field('file_id', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, null);
        $table->add_field('total_active_time', XMLDB_TYPE_NUMBER, '10, 5', null, XMLDB_NOTNULL, null, null);
        $table->add_field('edits', XMLDB_TYPE_NUMBER, '10, 5', null, XMLDB_NOTNULL, null, '0');
        $table->add_field('verbosity', XMLDB_TYPE_NUMBER, '10, 5', null, XMLDB_NOTNULL, null, null);
        $table->add_field('word_count', XMLDB_TYPE_NUMBER, '10, 5', null, XMLDB_NOTNULL, null, '0');
        $table->add_field('sentence_count', XMLDB_TYPE_NUMBER, '10, 5', null, XMLDB_NOTNULL, null, '0');
        $table->add_field('q_count', XMLDB_TYPE_NUMBER, '10, 5', null, XMLDB_NOTNULL, null, '0');
        $table->add_field('word_len_mean', XMLDB_TYPE_NUMBER, '10, 5', null, XMLDB_NOTNULL, null, '0');
        $table->add_field('sent_word_count_mean', XMLDB_TYPE_NUMBER, '10, 5', null, XMLDB_NOTNULL, null, '0');
        $table->add_field('p_burst_mean', XMLDB_TYPE_NUMBER, '10, 5', null, XMLDB_NOTNULL, null, '0');
        $table->add_field('p_burst_cnt', XMLDB_TYPE_NUMBER, '10, 5', null, XMLDB_NOTNULL, null, '0');

        $table->add_key('primary', XMLDB_KEY_PRIMARY, ['id']);
        $table->add_key('file_id_fk', XMLDB_KEY_FOREIGN, ['file_id'], 'tiny_cursive_files', ['id']);

        if (!$dbman->table_exists($table)) {
            $dbman->create_table($table);
        }

        upgrade_plugin_savepoint(true, 2024060282, 'tiny', 'cursive');
    }

    if ($oldversion < 2024060283) {
        $table = new xmldb_table('tiny_cursive_user_writing');
        $field = new xmldb_field('quality_access', XMLDB_TYPE_INTEGER, 2, null, XMLDB_NOTNULL, null, '0', 'copy_behavior');

        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }
        upgrade_plugin_savepoint(true, 2024060283, 'tiny', 'cursive');
    }

    if ($oldversion < 2024060285) {
        $table = new xmldb_table('tiny_cursive_quality_metrics');

        // Add each new field if it doesn't already exist.
        $fields = [
            'total_active_time_static' => [
                'type' => XMLDB_TYPE_NUMBER,
                'precision' => '10, 5',
                'notnull' => XMLDB_NOTNULL,
                'default' => '0',
                'previous' => 'total_active_time',
            ],
            'edits_static' => [
                'type' => XMLDB_TYPE_NUMBER,
                'precision' => '10, 5',
                'notnull' => XMLDB_NOTNULL,
                'default' => '0',
                'previous' => 'edits',
            ],
            'verbosity_static' => [
                'type' => XMLDB_TYPE_NUMBER,
                'precision' => '10, 5',
                'notnull' => XMLDB_NOTNULL,
                'default' => '0',
                'previous' => 'verbosity',
            ],
            'word_count_static' => [
                'type' => XMLDB_TYPE_NUMBER,
                'precision' => '10, 5',
                'notnull' => XMLDB_NOTNULL,
                'default' => '0',
                'previous' => 'word_count',
            ],
            'sentence_count_static' => [
                'type' => XMLDB_TYPE_NUMBER,
                'precision' => '10, 5',
                'notnull' => XMLDB_NOTNULL,
                'default' => '0',
                'previous' => 'sentence_count',
            ],
            'q_count_static' => [
                'type' => XMLDB_TYPE_NUMBER,
                'precision' => '10, 5',
                'notnull' => XMLDB_NOTNULL,
                'default' => '0',
                'previous' => 'q_count',
            ],
            'word_len_mean_static' => [
                'type' => XMLDB_TYPE_NUMBER,
                'precision' => '10, 5',
                'notnull' => XMLDB_NOTNULL,
                'default' => '0',
                'previous' => 'word_len_mean',
            ],
            'sent_word_count_mean_static' => [
                'type' => XMLDB_TYPE_NUMBER,
                'precision' => '10, 5',
                'notnull' => XMLDB_NOTNULL,
                'default' => '0',
                'previous' => 'sent_word_count_mean',
            ],
            'p_burst_mean_static' => [
                'type' => XMLDB_TYPE_NUMBER,
                'precision' => '10, 5',
                'notnull' => XMLDB_NOTNULL,
                'default' => '0',
                'previous' => 'p_burst_mean',
            ],
            'p_burst_cnt_static' => [
                'type' => XMLDB_TYPE_NUMBER,
                'precision' => '10, 5',
                'notnull' => XMLDB_NOTNULL,
                'default' => '0',
                'previous' => 'p_burst_cnt',
            ], ];

        foreach ($fields as $fieldname => $attributes) {
            $field = new xmldb_field(
                $fieldname,
                $attributes['type'],
                $attributes['precision'],
                null,
                $attributes['notnull'],
                null,
                $attributes['default'],
                $attributes['previous'],
            );

            // Check if the field exists, and if not, add it.
            if (!$dbman->field_exists($table, $field)) {
                $dbman->add_field($table, $field);
            }
        }

        // Save the upgrade step.
        upgrade_plugin_savepoint(true, 2024060285, 'tiny', 'cursive');
    }

    if ($oldversion < 2024062004) {
        $table = new xmldb_table('tiny_cursive_files');
        $field = new xmldb_field('original_content', XMLDB_TYPE_TEXT, null, null, false, null, null, 'content');

        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }
        upgrade_plugin_savepoint(true, 2024062004, 'tiny', 'cursive');
    }

    // Added Indexing into existing tables.
    if ($oldversion < 2026013002) {
        $table = new xmldb_table('tiny_cursive_files');

        // Composite index for the most common query pattern (non-quiz modules).
        $index = new xmldb_index(
            'idx_files_lookup',
            XMLDB_INDEX_NOTUNIQUE,
            ['cmid', 'modulename', 'resourceid', 'userid']
        );
        if (!$dbman->index_exists($table, $index)) {
            $dbman->add_index($table, $index);
        }

        // Composite index for quiz queries that include questionid.
        $index = new xmldb_index(
            'idx_files_quiz_lookup',
            XMLDB_INDEX_NOTUNIQUE,
            ['cmid', 'modulename', 'resourceid', 'userid', 'questionid']
        );
        if (!$dbman->index_exists($table, $index)) {
            $dbman->add_index($table, $index);
        }

        // Supporting index for user-level queries.
        $index = new xmldb_index('idx_files_userid', XMLDB_INDEX_NOTUNIQUE, ['userid']);
        if (!$dbman->index_exists($table, $index)) {
            $dbman->add_index($table, $index);
        }

        // Supporting index for course-level queries.
        $index = new xmldb_index('idx_files_courseid', XMLDB_INDEX_NOTUNIQUE, ['courseid']);
        if (!$dbman->index_exists($table, $index)) {
            $dbman->add_index($table, $index);
        }

        // Index for upload status queries.
        $index = new xmldb_index('idx_files_uploaded', XMLDB_INDEX_NOTUNIQUE, ['uploaded']);
        if (!$dbman->index_exists($table, $index)) {
            $dbman->add_index($table, $index);
        }

        $table = new xmldb_table('tiny_cursive_comments');

        // Composite index for the most common query pattern (non-quiz modules).
        $index = new xmldb_index(
            'idx_comments_lookup',
            XMLDB_INDEX_NOTUNIQUE,
            ['cmid', 'modulename', 'resourceid', 'userid']
        );
        if (!$dbman->index_exists($table, $index)) {
            $dbman->add_index($table, $index);
        }

        // Composite index for quiz queries that include questionid.
        $index = new xmldb_index(
            'idx_comments_quiz_lookup',
            XMLDB_INDEX_NOTUNIQUE,
            ['cmid', 'modulename', 'resourceid', 'userid', 'questionid']
        );
        if (!$dbman->index_exists($table, $index)) {
            $dbman->add_index($table, $index);
        }

        // Supporting index for user-level queries.
        $index = new xmldb_index('idx_comments_userid', XMLDB_INDEX_NOTUNIQUE, ['userid']);
        if (!$dbman->index_exists($table, $index)) {
            $dbman->add_index($table, $index);
        }

        // Supporting index for course-level queries.
        $index = new xmldb_index('idx_comments_courseid', XMLDB_INDEX_NOTUNIQUE, ['courseid']);
        if (!$dbman->index_exists($table, $index)) {
            $dbman->add_index($table, $index);
        }

        $table = new xmldb_table('tiny_cursive_user_writing');

        // Index for efficient joins with tiny_cursive_files.
        $index = new xmldb_index('idx_user_writing_fileid', XMLDB_INDEX_NOTUNIQUE, ['file_id']);
        if (!$dbman->index_exists($table, $index)) {
            $dbman->add_index($table, $index);
        }

        $table = new xmldb_table('tiny_cursive_writing_diff');

        // Index for efficient joins with tiny_cursive_files.
        $index = new xmldb_index('idx_writing_diff_fileid', XMLDB_INDEX_NOTUNIQUE, ['file_id']);
        if (!$dbman->index_exists($table, $index)) {
            $dbman->add_index($table, $index);
        }

        // Savepoint reached.
        upgrade_plugin_savepoint(true, 2026013002, 'tiny', 'cursive');
    }

    return true;
}
