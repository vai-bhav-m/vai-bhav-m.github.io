# Portfolio site — planning docs

Plans for a personal portfolio at `https://<username>.github.io`: React, single-page,
light/dark, deployed automatically from GitHub, with search that runs entirely in the
visitor's browser.

## Read in this order

| Doc | What it answers |
| --- | --- |
| [01-decisions.md](01-decisions.md) | What we're building and *why each choice was made*. Start here — it explains the one constraint that shaped everything else. |
| [02-architecture.md](02-architecture.md) | How the pieces fit, what lives where, repo layout. |
| [03-features-and-ui.md](03-features-and-ui.md) | Nav, sections, theming, contact form, resume, tag filtering — the feature spec. |
| [04-roadmap.md](04-roadmap.md) | The phased build plan. Your working checklist. |
| [05-search-design.md](05-search-design.md) | Search: what ships in v1, and how the ML layer slots in later. |
| [06-local-development.md](06-local-development.md) | Running and previewing it on your machine. |
| [07-deployment.md](07-deployment.md) | GitHub Pages + Actions, and the gotchas that bite everyone once. |
| [08-glossary.md](08-glossary.md) | Plain-English definitions of every term used above. |

## The one-paragraph version

Content lives as Markdown files in the repo. React renders a single page with an About,
Projects, Experience and Contact section, a sticky nav with search and a theme toggle,
and light/dark following the OS with a manual override. GitHub Actions builds and
publishes on every push. Search ships as fast keyword matching; later, a Python script
embeds one vector per project and experience entry into a small JSON file, and the
browser scores queries against it locally. No server, no database, no API keys, no
monthly bill.

## Settled decisions

| | |
| --- | --- |
| **Hosting** | GitHub Pages, user site at `<username>.github.io` |
| **Frontend** | React + TypeScript + Vite + Tailwind v4 |
| **Content** | Markdown files with frontmatter, in-repo |
| **Layout** | Single page, anchor-scrolled sections, sticky nav |
| **Sections** | About · Projects · Experience · Contact |
| **Theme** | System preference + manual toggle, persisted |
| **Search** | Keyword (MiniSearch) + semantic (self-hosted MiniLM), merged |
| **Contact** | Social links + Google Forms POST (**not yet configured**) |
| **Extras** | Domain filtering, scroll-spy nav, archived-item disclosure, OG image |
| **Resume** | Withheld — carries a phone number, gitignored |
| **Backend** | None. Flask when a real trigger appears — see [01-decisions.md](01-decisions.md#where-flask-went) |

## Status

**Built and live at https://vai-bhav-m.github.io.** These documents describe the
system as it exists, not a plan — they were updated after implementation.

Phases 0, 1, 2 and 4 are complete; Phase 3 is partly done; Phase 5 was never
triggered. See [04-roadmap.md](04-roadmap.md#what-is-actually-left) for the
outstanding items.

If you are an agent picking this up: the code is the source of truth, but these
docs record *why* things are the way they are, including several decisions that
look wrong until you know what they are avoiding. The ones most likely to catch
you out:

- Search excludes the About section, in **two** places that must stay in sync.
- `env.allowRemoteModels = false` is load-bearing — without it a broken local
  model path silently falls back to a CDN.
- `ml/build_index.py` is **not** run in CI, on purpose. Regenerate locally and
  commit `src/data/search-index.json`.
- `robots.txt` allows every AI crawler deliberately. Do not "harden" it.
