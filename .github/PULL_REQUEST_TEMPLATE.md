## Summary

<!-- What changes and why. Link the Linear ticket(s). -->

## Checklist

- [ ] Targets `dev` (feature branch → dev → main → release)
- [ ] eslint, stylelint and phpcs (moodle) pass with zero warnings; AMD build committed
- [ ] New or renamed lang strings exist in `lang/en/tiny_cursive.php` and every use was updated
- [ ] AX code review performed (Blackboard baseline: WCAG 2.2 AA, ARIA APG; see `CLAUDE.md`)
- [ ] Any new page or page state has an axe-core scenario in `tests/behat/accessibility.feature`
- [ ] Verified manually on the dev site in the affected roles (student, teacher, admin)

## Accessibility notes

<!-- Focus model, live regions, keyboard behaviour, contrast; or "no UI change". -->
