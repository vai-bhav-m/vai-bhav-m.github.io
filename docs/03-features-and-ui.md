# Features and UI

The agreed feature set for v1, with the implementation notes that aren't obvious.

## Page structure

A single page. Sections stack vertically; the nav scrolls you to them. No router,
no page loads.

```
┌──────────────────────────────────────────────────────────────┐
│  VAIBHAV      About  Projects  Experience  Contact           │  sticky nav
│                                      [ Search… ⌘K ]  [ ☾ ]   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   #about        Name, one-line what-you-do, short bio,       │
│                 [Download Resume]  [GitHub] [LinkedIn]       │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│   #projects     [ all ] [ python ] [ ml ] [ web ]   ← tags   │
│                 ┌────────┐ ┌────────┐ ┌────────┐             │
│                 │ card   │ │ card   │ │ card   │             │
│                 └────────┘ └────────┘ └────────┘             │
├──────────────────────────────────────────────────────────────┤
│   #experience   ●── Role, Company              2024–now      │
│                 │   what you did                             │
│                 ●── Role, Company              2022–2024     │
├──────────────────────────────────────────────────────────────┤
│   #contact      Socials + email  │  Contact form             │
└──────────────────────────────────────────────────────────────┘
```

Each section is `<section id="about">` and the nav links are plain `<a href="#about">`.
Smooth scrolling is one line of CSS: `html { scroll-behavior: smooth }`.

**One gotcha:** a sticky nav covers the top of whatever you scroll to. Fix it on the
sections, not with JavaScript:

```css
section { scroll-margin-top: 5rem; }  /* roughly nav height + breathing room */
```

## Navigation bar

- Sticky to the top. Semi-transparent with `backdrop-blur` so content sliding under it
  stays legible.
- Left: your name, links to `#about`.
- Centre/left: section links.
- Right: search box, then the theme toggle.
- **Mobile (below ~768px):** section links collapse into a hamburger menu. The search
  box collapses to just a magnifier icon. The theme toggle stays visible — it's one
  small button and people look for it.

### Search box placement

On desktop the nav shows a real input, styled to look clickable, with a `⌘K` / `Ctrl K`
hint on the right. It is **not** a working input — clicking or focusing it opens the
full-screen search overlay, which is where typing actually happens.

This is the pattern most documentation sites use, and it's deliberate: a live input in
a cramped nav has nowhere good to put a results dropdown, especially on mobile. The
overlay gets the full viewport, proper keyboard navigation, and one code path on every
screen size. Details of the overlay itself are in
[05-search-design.md](05-search-design.md).

## Light and dark mode

**Behaviour:** default to the OS/browser setting, allow a manual override, remember
the override across visits.

Three states, not two: `system` (follow the OS), `light` (forced), `dark` (forced).
Storing only a boolean means someone who toggles once can never get back to following
their OS. Cycle the button through all three.

### The flash you must prevent

If you decide the theme in React, the browser paints the default (light) HTML first,
then React loads and switches to dark. The visitor sees a white flash. On a dark-themed
site this looks broken, and it's the single most common bug in hand-rolled theme
switchers.

The fix is to set the theme **before the first paint**, with a small blocking script
inline in `index.html` — not in a module, not in React:

```html
<script>
  (function () {
    try {
      var stored = localStorage.getItem('theme')
      var dark = stored === 'dark' ||
        (stored !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)
      if (dark) document.documentElement.classList.add('dark')
    } catch (e) {}
  })()
</script>
```

It's inline and synchronous on purpose: the browser stops and runs it before painting.
The `try/catch` matters because `localStorage` throws in some privacy modes.

React then reads the existing class as its initial state rather than deciding it.

### Tailwind v4 note

In Tailwind v4, `dark:` follows `prefers-color-scheme` by default and ignores your
class. To make it respond to the `.dark` class above, declare the variant once in your
CSS:

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
```

Miss this and your toggle will appear to do nothing while the system preference still
works — a confusing failure, since it half-works.

### Also do this

- Add `<meta name="color-scheme" content="light dark">` so form controls, scrollbars
  and the browser's own UI match.
- When someone is on `system`, listen for changes to the media query so the site
  follows if they switch their OS theme while the tab is open.
- Pick both palettes before writing components. Retrofitting dark mode onto colours
  chosen only for light mode is genuinely annoying.

## Scroll-spy nav highlighting

The nav item for the section currently in view is highlighted.

Use `IntersectionObserver`, not a scroll event listener — scroll handlers fire
constantly and are a common source of janky pages.

```ts
const observer = new IntersectionObserver(callback, {
  rootMargin: '-20% 0px -70% 0px',
})
```

That `rootMargin` shrinks the detection zone to a band near the top of the viewport, so
a section becomes "active" when it reaches reading position rather than when its first
pixel appears. Without it, two sections are frequently "visible" at once and the
highlight flickers between them.

**Edge case:** the last section is often too short to reach that band, so it never
highlights. Special-case "scrolled to the bottom" and activate the final item.

Respect `prefers-reduced-motion` by disabling `scroll-behavior: smooth` for people who
ask for less motion.

## Projects and tag filtering

Each project is a Markdown file with frontmatter:

```markdown
---
title: Semantic Search Portfolio
slug: semantic-search
summary: One sentence a recruiter reads in three seconds.
tags: [python, ml, react]
repo: https://github.com/you/repo
demo: https://...
featured: true
---
```

Tags are collected from the files themselves — never maintain a separate list, it will
drift. Filter buttons render from the union of all tags found.

- Filtering is client-side array filtering. No library needed.
- Keep an "All" option, selected by default.
- Reflect the active tag in the URL hash (`#projects?tag=ml`) so a filtered view is
  shareable. Optional, but cheap.
- Animate cards in and out only if it's easy. Do not block v1 on it.
- Show the filter UI only when you have enough projects for it to be useful — with
  three projects it's clutter.

## Resume download

Put `resume.pdf` in `public/`, link to `/resume.pdf` with a `download` attribute.

- Name the file something meaningful — `Vaibhav-Resume.pdf`, not `resume-final-v3.pdf`.
  It's what lands in the downloader's folder.
- Button in the About section, and optionally in the nav. Recruiters look for this
  before anything else, so make it obvious.
- Anything in `public/` is copied to the site root untouched and is publicly
  accessible. Your resume will be indexed by search engines. That's normally fine, but
  it means the phone number and address on it are public too — consider what's on it.

## Contact section

Two halves: direct links, and a form.

### Links

Email, GitHub, LinkedIn, anything else. Use real `<a>` tags with `aria-label`s — icon-
only links are invisible to screen readers otherwise.

A plain-text email address on a public page does get scraped. Mitigations range from
mild (render it from parts in JS) to none (accept it, spam filters are good now).
Your call; it's a real but small cost.

### The form — Google Forms, and its one catch

**Yes, this works, and it keeps the site fully static.** You do not embed the ugly
iframe; you build your own form, matching your design and dark mode, and POST to the
Google Form's submit endpoint.

Setup:

1. Create the Google Form with the fields you want (name, email, message).
2. Open the "Get pre-filled link" option, fill in dummy values, and copy the generated
   link. It contains `entry.123456789=...` parameters — those numeric IDs are the field
   names you'll POST.
3. Your form's endpoint is
   `https://docs.google.com/forms/d/e/{FORM_ID}/formResponse`.
4. POST a `FormData` built with those `entry.*` keys, using `mode: 'no-cors'`.

**The catch, stated plainly:** Google does not send CORS headers on that endpoint, so
`mode: 'no-cors'` gives your JavaScript an *opaque* response. The submission goes
through, but your code cannot read the status. You can detect a network failure; you
cannot detect a rejected submission. In practice you show "thanks, I'll be in touch"
optimistically.

For a contact form, that's a real cost — a silent failure means a missed opportunity
and neither of you knows. Two things make it acceptable:

- **Always show your email address next to the form**, so there's a path that doesn't
  depend on the form working.
- **Submit a test message yourself after every deploy** that touches the form, and
  check the responses sheet.

**The alternative, for honesty:** Web3Forms or Formspree are purpose-built for static
sites, also free, also require no hosting, take about the same 15 minutes — and they
return a real success/error response *and* email you directly instead of leaving
messages sitting in a spreadsheet you have to remember to check.

Google Forms wins on: you already know it, responses land in a spreadsheet, unlimited
submissions, no account with a new service. If those matter more to you than knowing
whether a submission succeeded, it's a reasonable pick — just add the email fallback.

Either way: add a honeypot field (a hidden input that real users leave empty, bots fill
in) and drop submissions where it's non-empty. It costs five lines and stops most
automated spam.

## Accessibility and polish checklist

Not optional extras — these are what separates a portfolio that looks considered from
one that looks templated.

- Every interactive element reachable by Tab, with a visible focus ring.
- The search overlay traps focus while open and closes on Escape.
- Colour contrast at least 4.5:1 for body text, **in both themes**. Dark mode is where
  contrast usually fails — pure `#000` backgrounds with grey text is the classic
  mistake.
- Images have `alt` text.
- One `<h1>` on the page; heading levels don't skip.
- A `<title>` and `<meta name="description">` that read well in search results, plus an
  OG image so the link previews properly when you share it.
- Test at 390px wide before you consider anything done.
