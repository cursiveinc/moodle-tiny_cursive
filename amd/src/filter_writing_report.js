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
 * @module     tiny_cursive/filter_writing_report
 * @category TinyMCE Editor
 * @copyright  CTI <info@cursivetechnology.com>
 * @author Brain Station 23 <elearning@brainstation-23.com>
 */

define(["core/ajax", "core/templates"], function(AJAX, templates) {
  return {
    init: function(page) {
      document.getElementById("id_coursename").addEventListener("change", function() {
        const courseId = this.value;
        const promise1 = AJAX.call([
          {
            methodname: "cursive_filtered_writing",
            args: {
              id: courseId,
            },
          },
        ]);

        promise1[0].done(function(json) {
          const data = JSON.parse(json);
          const context = {
            data: data.data,
            page: page,
          };

          templates.render("tiny_cursive/user_table", context)
            .then(function(html) {
              const filteredUser = document.getElementById("id_username");
              filteredUser.innerHTML = html;
            })
            .catch(function(error) {
              window.console.error("Error rendering template:", error);
            });
        }).fail(function(error) {
          window.console.error("AJAX request failed:", error);
        });
      });
    },
  };
});

