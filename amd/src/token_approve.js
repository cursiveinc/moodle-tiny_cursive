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
 * @module     tiny_authory_tech/token_approve
 * @category TinyMCE Editor
 * @copyright  CTI <info@cursivetechnology.com>
 * @copyright  2026 Authory Technology S.L. <info@authory.tech>
 * @author kuldeep singh <mca.kuldeep.sekhon@gmail.com>
 */

define(["jquery", "core/ajax", "core/str"], function($, AJAX, str) {
  var usersTable = {
    init: function(page) {
      str
        .get_strings([{key: "field_require", component: "tiny_authory_tech"}])
        .done(function() {
          usersTable.getToken(page);
          usersTable.generateToken();
        });
    },
    getToken: function() {
      $("#approve_token").click(function() {
        var token = $("#id_s_tiny_authory_tech_secretkey").val();
        var promise1 = AJAX.call([
          {
            methodname: "authory_tech_approve_token",
            args: {
              token: token,
            },
          },
        ]);
        promise1[0].done(function(json) {
          var data = JSON.parse(json);
          var messageAlert = "";
          if (data.status == true) {
            messageAlert =
              "<span class='alert alert-success' role='alert'>" +
              data.message +
              "</span>";
          } else {
            messageAlert =
              "<span class='alert alert-danger' role='alert'>" +
              data.message +
              "</span>";
          }
          $("#token_message").html(messageAlert);
        });
      });
    },

    generateToken() {
      const generateToken = $("#generate_authory_tech_token");
      const authoryTechDisable = $("#authory_tech_disable");
      const authoryTechEnable = $("#authory_tech_enable");

      generateToken.on("click", function(e) {
        e.preventDefault();
        var promise1 = AJAX.call([
          {
            methodname: "authory_tech_generate_webtoken",
            args: [],
          },
        ]);
        promise1[0].done(function(data) {
          var messageAlert = "";
          str.get_strings([
            {key: "webservtokengensucc", component: "tiny_authory_tech"},
            {key: "webservtokengenfail", component: "tiny_authory_tech"}
          ]).then(function([success, fail]) {

            if (data.token) {
              $("#id_s_tiny_authory_tech_authory_tech_token").val(data.token);
              messageAlert = `<span class='text-success' role='alert'>${success}</span>`;
            } else {
              messageAlert = `<span class='text-danger' role='alert'>${fail}</span>`;
            }
            $("#authory_tech_token_").html(messageAlert);
            setTimeout(() => {
              $("#authory_tech_token_").empty();
            }, 3000);
            return true;
         }).catch(error => window.console.error(error));
        });
        promise1[0].fail(function(textStatus) {
          var errorMessage = "<span class='text-danger' role='alert'>";
          str
            .get_string("webservtokenerror", "tiny_authory_tech")
            .then((str) => {
              errorMessage += str + " " + textStatus.error + "</span>";

          $("#authory_tech_token_").html(errorMessage);
          // Clear the error message after 3 seconds.
          setTimeout(function() {
            $("#authory_tech_token_").empty();
          }, 3000);
          return true;
        }).catch(error => window.console.error(error));
        });
      });

      authoryTechDisable.on("click", function(e) {
        e.preventDefault();

        var promise1 = AJAX.call([
          {
            methodname: "authory_tech_disable_all_course",
            args: {
              disable: true,
            },
          },
        ]);
        promise1[0].done(function(data) {
          var messageAlert = "";
          str.get_strings([
            {key: "authory_tech:dis:succ", component: "tiny_authory_tech"},
            {key: "authory_tech:dis:fail", component: "tiny_authory_tech"}
          ]).then(function([success, fail]) {
            if (data) {
              messageAlert = `<span class='text-success' role='alert'>${success}</span>`;
            } else {
              messageAlert = `<span class='text-danger' role='alert'>${fail}</span>`;
            }

            $("#authory_tech_disable_").html(messageAlert);
            setTimeout(() => {
              $("#authory_tech_disable_").empty();
            }, 3000);
            return true;
          }).catch(error => window.console.error(error));
        });
        promise1[0].fail(function(textStatus) {
          var errorMessage = "<span class='text-danger' role='alert'>";
          str
            .get_string("authory_tech:status", "tiny_authory_tech")
            .then((str) => {
              errorMessage += str + " " + textStatus.error + "</span>";

          $("#authory_tech_disable_").html(errorMessage);
          // Clear the error message after 3 seconds.
          setTimeout(function() {
            $("#authory_tech_disable_").empty();
          }, 3000);
          return true;
        }).catch(error => window.console.error(error));
        });
      });
      authoryTechEnable.on("click", function(e) {
        e.preventDefault();

        var promise1 = AJAX.call([
          {
            methodname: "authory_tech_disable_all_course",
            args: {
              disable: false,
            },
          },
        ]);
        promise1[0].done(function(data) {
          var messageAlert = "";
          str.get_strings([
            {key: "authory_tech:ena:succ", component: "tiny_authory_tech"},
            {key: "authory_tech:ena:fail", component: "tiny_authory_tech"}
          ]).then(function([success, fail]) {
            if (data) {
              messageAlert = `<span class='text-success' role='alert'>${success}</span>`;
            } else {
              messageAlert = `<span class='text-danger' role='alert'>${fail}</span>`;
            }

            $("#authory_tech_disable_").html(messageAlert);
            setTimeout(() => {
              $("#authory_tech_disable_").empty();
            }, 3000);
            return true;
          }).catch(error => window.console.error(error));
        });
        promise1[0].fail(function(textStatus) {
          var errorMessage = "<span class='text-danger' role='alert'>";
          str.get_string("authory_tech:status", "tiny_authory_tech")
            .then((str) => {
              errorMessage += str + " " + textStatus.error + "</span>";

          $("#authory_tech_disable_").html(errorMessage);
          // Clear the error message after 3 seconds.
          setTimeout(function() {
            $("#authory_tech_disable_").empty();
          }, 3000);
          return true;
        }).catch(error => window.console.error(error));
        });
      });
    },
  };
  return usersTable;
});
