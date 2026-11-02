# tiny_cursive

Moodle TinyMCE plugin (`lib/editor/tiny/plugins/cursive`). Feature branches start from `dev`; pull
requests target `dev`, never `main`.

## Accessibility is a release gate

Every user-facing change in this repository follows the Blackboard baseline accessibility standard:
WCAG 2.2 AA, the ARIA Authoring Practices Guide for every interactive widget, and ATAG 2.0 AA for the
editor-side surfaces. When the `blackboard-baseline-ax` skill is available, load it before scoping,
designing, implementing, reviewing or testing any UI, including Mustache templates, AMD modules,
injected controls on core pages and the report pages.

At each stage, answer that skill's stage questions before moving on:

- **Design**: name the APG pattern for each widget, the focus model (where focus goes on open, close,
  submit and mode switch), the live-region policy, contrast from the shared palette in `styles.css`,
  and the 320 px reflow and 200 % zoom behaviour.
- **Implementation**: strings come from `lang/en/tiny_cursive.php`; attribution and state are never
  conveyed by colour alone; `prefers-reduced-motion` is respected; injected controls sit outside the
  content they describe; no fixed heights on text containers.
- **Review and test**: every new page or page state gets an axe-core scenario in
  `tests/behat/accessibility.feature` (tag `@accessibility`, steps
  `the page should meet accessibility standards` and
  `... with "best-practice" extra tests`); a live measured pass on the dev site before the PR is
  reported complete; findings carry a severity tier and WCAG success criterion. Critical findings
  cannot be waived; Major ones need a documented waiver.

CI runs `moodle-plugin-ci behat`, so a scan violation fails the pull request.

## Local checks that mirror CI

```bash
# inside the moodle-docker webserver container, from /var/www/html
node_modules/.bin/grunt amd --root=lib/editor/tiny/plugins/cursive
npx eslint --max-warnings=0 lib/editor/tiny/plugins/cursive/amd/src
npx stylelint lib/editor/tiny/plugins/cursive/styles.css
vendor/bin/phpcs --standard=moodle lib/editor/tiny/plugins/cursive
vendor/bin/behat --config /var/www/behatdata/behatrun/behat/behat.yml --tags @tiny_cursive
```

Renaming or removing a lang string key must be followed by a sweep of every `get_string`,
`getString`, `{{#str}}` and `lang_string` use: an unknown key fails the CI install step, not just
the page that uses it.
