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
 * @module     tiny_cursive/token_approve
 * @category TinyMCE Editor
 * @copyright  CTI <info@cursivetechnology.com>
 * @author kuldeep singh <mca.kuldeep.sekhon@gmail.com>
 */

define(["jquery", "core/ajax", "core/str"], function($, AJAX, str) {
  /**
   * Write a result into one of the persistent status regions on the settings page.
   *
   * The regions exist in the page before any update (role="status"), so the text is announced
   * and stays until the next action replaces it.
   *
   * @param {string} selector Region selector.
   * @param {string} text Translated message.
   * @param {boolean} ok Success or failure styling.
   */
  const showResult = (selector, text, ok) => {
    $(selector)
      .removeClass("text-success text-danger alert alert-success alert-danger")
      .addClass(ok ? "text-success" : "text-danger")
      .text(text);
  };

  /**
   * Clear a status region before starting a new request.
   *
   * @param {string} selector Region selector.
   */
  const clearResult = (selector) => {
    $(selector).removeClass("text-success text-danger").text("");
  };

  var usersTable = {
    init: function(page) {
      str
        .get_strings([{key: "field_require", component: "tiny_cursive"}])
        .done(function() {
          usersTable.getToken(page);
          usersTable.generateToken();
        });
    },
    getToken: function() {
      $("#cursive_approve_token, #tiny_cursive_approve_token").on("click", function(e) {
        e.preventDefault();
        clearResult("#cursive_token_message");
        var token = $("#id_s_tiny_cursive_secretkey").val();
        var promise1 = AJAX.call([
          {
            methodname: "tiny_cursive_approve_token",
            args: {
              token: token,
            },
          },
        ]);
        promise1[0].done(function(json) {
          var data = JSON.parse(json);
          if (data.status == true) {
            str.get_string("connected", "tiny_cursive").then((connected) => {
              showResult("#cursive_token_message", connected, true);
              return connected;
            }).catch(error => window.console.error(error));
          } else {
            showResult("#cursive_token_message", data.message, false);
          }
        });
        promise1[0].fail(function(error) {
          window.console.error(error);
          str.get_string("webservtokenerror", "tiny_cursive").then((message) => {
            showResult("#cursive_token_message", message, false);
            return message;
          }).catch(err => window.console.error(err));
        });
      });
    },

    generateToken() {
      const generateToken = $("#generate_cursivetoken");
      const cursiveDisable = $("#cursivedisable");
      const cursiveEnable = $("#cursiveenable");

      generateToken.on("click", function(e) {
        e.preventDefault();
        clearResult("#cursivetoken_");
        var promise1 = AJAX.call([
          {
            methodname: "tiny_cursive_generate_webtoken",
            args: [],
          },
        ]);
        promise1[0].done(function(data) {
          str.get_strings([
            {key: "webservtokengensucc", component: "tiny_cursive"},
            {key: "webservtokengenfail", component: "tiny_cursive"}
          ]).then(function([success, fail]) {
            if (data.token) {
              $("#id_s_tiny_cursive_cursivetoken").val(data.token);
              showResult("#cursivetoken_", success, true);
            } else {
              showResult("#cursivetoken_", fail, false);
            }
            return true;
          }).catch(error => window.console.error(error));
        });
        promise1[0].fail(function(error) {
          window.console.error(error);
          str.get_string("webservtokenerror", "tiny_cursive").then((message) => {
            showResult("#cursivetoken_", message, false);
            return message;
          }).catch(err => window.console.error(err));
        });
      });

      /**
       * Enable or disable Cursive on every course and report the outcome.
       *
       * @param {boolean} disable True to disable, false to enable.
       * @param {string} successKey Lang string key for success.
       * @param {string} failKey Lang string key for failure.
       */
      const toggleAllCourses = (disable, successKey, failKey) => {
        clearResult("#cursivedisable_");
        var promise1 = AJAX.call([
          {
            methodname: "tiny_cursive_disable_all_course",
            args: {
              disable: disable,
            },
          },
        ]);
        promise1[0].done(function(data) {
          str.get_strings([
            {key: successKey, component: "tiny_cursive"},
            {key: failKey, component: "tiny_cursive"}
          ]).then(function([success, fail]) {
            showResult("#cursivedisable_", data ? success : fail, Boolean(data));
            return true;
          }).catch(error => window.console.error(error));
        });
        promise1[0].fail(function(error) {
          window.console.error(error);
          str.get_string("cursive:status", "tiny_cursive").then((message) => {
            showResult("#cursivedisable_", message, false);
            return message;
          }).catch(err => window.console.error(err));
        });
      };

      cursiveDisable.on("click", function(e) {
        e.preventDefault();
        toggleAllCourses(true, "cursive:dis:succ", "cursive:dis:fail");
      });
      cursiveEnable.on("click", function(e) {
        e.preventDefault();
        toggleAllCourses(false, "cursive:ena:succ", "cursive:ena:fail");
      });
    },
  };
  return usersTable;
});
