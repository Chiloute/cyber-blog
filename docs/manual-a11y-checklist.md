# Manual accessibility checklist

Target: WCAG 2.2 AA. Automated checks (`npm run test:a11y`, `npm run check:contrast`) do not replace this list. Run every section in BOTH themes (light and dark, via the Theme radios in the header). Use a production build: `npm run build && npm run preview` (Pagefind search needs the build).

Mark each item once checked. Record results at the end.

## 1. Keyboard only

Unplug or ignore the mouse. Use Tab, Shift+Tab, Enter, Space, arrows, Escape.

- [ ] Tab order follows the visual order on every page type (home, writeups list, a writeup, notes, projects, search, legal pages). Expected: no jumps, no hidden elements receiving focus.
- [ ] Skip link: first Tab on a page shows "skip to content"; Enter moves focus to `#main`; the next Tab goes to the first element inside the content.
- [ ] Focus is always visible, with enough contrast against the background, including on links in callouts and in the footer.
- [ ] Theme radios: Tab reaches the group, arrows change the value, the theme changes immediately and persists after reload.
- [ ] Mobile menu (narrow window): the button opens the menu with Enter/Space; links are reachable; Escape closes it and returns focus to the button.
- [ ] Writeups filters: each control is reachable and operable; the result list updates; nothing steals focus.
- [ ] Flag button: Enter/Space reveals the flag; focus stays on the control; the state is conveyed (expanded/collapsed).
- [ ] Copy button on terminal blocks: reachable, activated with Enter/Space, copies commands only (paste to check: no prompt, no output).
- [ ] Spoiler `<details>`: summary is focusable; Enter/Space toggles it.
- [ ] Scrollable code blocks and terminals are focusable (Tab) and scroll with arrow keys.
- [ ] No keyboard trap: from any control, Tab/Shift+Tab can leave it (mobile menu, search, details).
- [ ] Search page: type a query, results are reachable by keyboard, and links open with Enter.

## 2. Screen readers

Combinations: NVDA with Firefox (Windows), VoiceOver with Safari (macOS and iOS). Note the version of each.

For each combination:

- [ ] Landmarks: banner, navigation (labelled), main, contentinfo are announced; the landmark list contains no duplicates without labels.
- [ ] Headings: navigating by heading gives a logical outline, one `h1`, no skipped levels (writeup headings start at `h2`).
- [ ] Live announcements: changing the theme announces "Theme set to ...".
- [ ] Live announcements: changing a writeups filter announces the updated result count.
- [ ] Live announcements: a search announces the number of results (`#search-status`).
- [ ] Live announcements: the copy button announces that the text was copied.
- [ ] Live announcements: the Flag button announces the revealed state.
- [ ] Link names: each link makes sense out of context (links list); no bare "click here" or "read more" without context.
- [ ] External links: it is clear that the link leaves the site (name or hint); no unexpected new window.
- [ ] Tables (if any on the page): header cells are announced when moving between cells.
- [ ] Callouts, terminal blocks and badges: announced with a meaningful name and text (category/difficulty are read as text).
- [ ] Decorative images and icons are ignored; informative images have a useful description.
- [ ] iOS VoiceOver: swipe through a writeup page and the mobile menu without losing content.

## 3. Zoom and reflow

- [ ] 200% browser zoom: all content and functionality remain available; nothing is cut off or overlapping.
- [ ] Reflow at 320 CSS px width (for example 1280 px viewport at 400% zoom): no horizontal scroll, except inside code blocks and terminals.
- [ ] Header and navigation remain usable at 320 px (mobile menu).
- [ ] Long flags and URLs wrap instead of overflowing.

## 4. Text spacing (WCAG 1.4.12)

Apply a text-spacing bookmarklet or extension that sets line-height 1.5, paragraph spacing 2x, letter spacing 0.12em, word spacing 0.16em.

- [ ] No loss of content or functionality: no clipped text, no overlapping elements, buttons and badges still show their labels.

## 5. Reduced motion

Enable "reduce motion" in the OS (or emulate `prefers-reduced-motion: reduce` in DevTools).

- [ ] No animations or transitions remain (theme change, menu, scrolling).
- [ ] No content depends on motion.

## 6. Forced colors (bonus)

Windows High Contrast (or emulate `forced-colors: active` in DevTools).

- [ ] Text, links, focus indicator, form controls and borders stay visible.
- [ ] Controls remain distinguishable (theme radios, buttons, details).
- [ ] Icons carrying meaning are still understandable.

## 7. Target size (WCAG 2.5.8)

- [ ] Interactive targets are at least 24x24 CSS px, or have enough spacing: header links, theme radios, filter controls, copy and Flag buttons, summary elements, footer links, pagination.

## 8. Colour is not the only cue

- [ ] Category and difficulty badges show text, not only colour (check in both themes).
- [ ] Links inside body text are distinguishable without colour (underline).
- [ ] Callout types are identified by an icon and a text label, not only by colour.
- [ ] Filter states and the active theme are conveyed without relying on colour alone.

## Recording results

For each run, note: date, page(s) tested, theme, browser and version, OS, assistive technology and version, and the result per section (pass, fail with details). Keep the notes in the issue or pull request that fixes the failures.

Then update the Accessibility statement (`src/pages/accessibility.astro`): the `updated` prop and the "Date" section, the conformance status, the list of testing methods, and "Known limitations" with any failure that stays open. Re-run `npm run test:a11y` after fixes.
