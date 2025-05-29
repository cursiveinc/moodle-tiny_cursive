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
 * @module     tiny_cursive/key_logger
 * @category TinyMCE Editor
 * @copyright  CTI <info@cursivetechnology.com>
 * @author Brain Station 23 <elearning@brainstation-23.com>
 */

define(["core/ajax", "core/str", "core/templates"], function(AJAX, str, templates) {
  var usersTable = {
    init: function(page) {
      str
        .get_strings([
          {key: "field_require", component: "tiny_cursive"}
        ])
        .done(function() {
          document.addEventListener("DOMContentLoaded", function() {
            document.querySelectorAll(".popup_item").forEach(function(element) {
              element.addEventListener("click", function() {
                var mid = this.dataset.id;
                document.getElementById(mid).style.display = 'block';
              });
            });

            document.querySelectorAll(".link_icon").forEach(function(element) {
              element.addEventListener("click", function() {
                var smid = this.dataset.id;
                document.getElementById(smid).style.display = 'block';
              });
            });

            document.querySelectorAll(".modal-close").forEach(function(element) {
              element.addEventListener("click", function() {
                document.querySelectorAll(".modal").forEach(function(modal) {
                  modal.style.display = 'none';
                });
              });
            });
          });

          usersTable.getusers(page);
        });
    },

    getusers: function(page) {
      document.getElementById("fgroup_id_buttonar").style.display = 'none';
      document.getElementById("id_coursename").addEventListener("change", function() {
        var courseid = this.value;

        var promise1 = AJAX.call([
          {
            methodname: "cursive_get_user_list",
            args: {
              courseid: courseid,
            },
          },
        ]);

        promise1[0].done(function(json) {
          var data = JSON.parse(json);
          var context = {
            tabledata: data,
            page: page,
          };
          templates.render("tiny_cursive/user_list", context).then(function(html) {
            document.getElementById("id_username").innerHTML = html;
          });
        });

        var promise2 = AJAX.call([
          {
            methodname: "cursive_get_module_list",
            args: {
              courseid: courseid,
            },
          }
        ]);

        promise2[0].done(function(json) {
          var data = JSON.parse(json);
          var context = {
            tabledata: data,
            page: page,
          };
          templates.render("tiny_cursive/module_list", context).then(function(html) {
            document.getElementById("id_modulename").innerHTML = html;
          });
        });
      });
    },
  };

  return usersTable;
});
