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
 * @module     tiny_authory_tech/key_logger
 * @category TinyMCE Editor
 * @copyright  CTI <info@cursivetechnology.com>
 * @copyright  2026 Authory Technology S.L. <info@authory.tech>
 * @author kuldeep singh <mca.kuldeep.sekhon@gmail.com>
 */

define(["jquery", "core/ajax", "core/str", "core/templates"], function(
  $,
  AJAX,
  str,
  templates) {

  var usersTable = {
    init: function(page) {
      str
        .get_strings([
          {key: "field_require", component: "tiny_authory_tech"}
        ])
        .done(function() {
          $(document).ready(function($) {
            $(".popup_item").on('click', function() {
              var mid = $(this).data("id");
              $("#" + mid).show();
            });
            $(".link_icon").on('click', function() {
              var smid = $(this).data("id");
              $("#" + smid).show();
            });
            $(".modal-close ").on('click', function() {
              $(".modal").hide();
            });
          });
          usersTable.getusers(page);
        });
    },
    getusers: function(page) {
      $("#fgroup_id_buttonar").hide();
      $("#id_coursename").change(function() {
        var courseid = $(this).val();
        var promise1 = AJAX.call([
          {
            methodname: "authory_tech_get_user_list",
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
          // eslint-disable-next-line
          templates
            .render("tiny_authory_tech/user_list", context)
            .then(function(html) {
              var filteredUser = $("#id_username");
              filteredUser.html(html);
              return true;
            });
        });

        var promise2 = AJAX.call([
          {
            methodname: "authory_tech_get_module_list",
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
          // eslint-disable-next-line
          templates
            .render("tiny_authory_tech/module_list", context)
            .then(function(html) {

              var filteredUser = $("#id_modulename");
              filteredUser.html(html);
              return true;
            });
        });
      });
    },
  };
  return usersTable;
});
