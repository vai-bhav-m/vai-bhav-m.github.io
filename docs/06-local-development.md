# Local development

Everything runs on your machine. Nothing here needs GitHub, an account, or an internet
connection (except the first `npm install`). You can build the entire site and look at
it before a single thing is pushed.

## One-time setup

| Tool | Version | Check with | Why |
| --- | --- | --- | --- |
| Node.js | LTS (24.x installed) | `node --version` | Runs Vite and the build |
| npm | ships with Node | `npm --version` | Packages |
| Python | 3.11+ **CPython** | `py -3.11 --version` | Embedding index + OG image |
| Git | any recent | `git --version` | Version control, deploys |

Then, once:

```powershell
npm install
```

## The two ways to run it locally

This distinction matters more than it looks, and knowing it will save you a confusing
afternoon at some point.

### `npm run dev` — the development server

```powershell
npm run dev
```

Opens on `http://localhost:5173`. Use this ~95% of the time.

- Edits appear in the browser in milliseconds, without a refresh, usually without
  losing your place on the page.
- Errors show up as a readable overlay in the browser.
- Source maps mean the browser devtools show *your* code, not bundled output.

But it is **not what gets deployed**. It serves unbundled modules with dev-only
behaviour. A few classes of bug exist only in the production build and are invisible
here.

### `npm run build && npm run preview` — the real thing

```powershell
npm run build
npm run preview
```

Opens on `http://localhost:4173`, serving the exact contents of `dist/` — byte for
byte what GitHub Pages will serve. No hot reload; re-run `build` to see changes.

**Run this before every push.** It's the closest thing to seeing the deployed site
without deploying, and it catches things `dev` hides:

- Broken asset paths (`/image.png` that only worked because the dev server was lenient)
- Code that fails only when minified
- Anything relying on a dev-only environment variable
- The real bundle size, and whether your first paint is actually fast
- Dynamic imports splitting into chunks the way you expected

> Rule of thumb: build features with `dev`. Check your work with `preview`. If
> something works in `dev` but breaks on the deployed site, `preview` is where you
> reproduce it.

## Seeing it on your phone

Your phone is where at least half your visitors will be, and devtools' responsive mode
is only an approximation — it doesn't show you real touch targets, real font rendering,
or how the sticky nav behaves with a mobile browser's chrome.

```powershell
npm run dev -- --host
```

Vite prints a second **Network** URL like `http://192.168.1.42:5173`. Open that on your
phone, on the same Wi-Fi. Hot reload works there too.

If it doesn't connect, Windows Firewall is almost certainly blocking Node — allow it
for private networks when prompted, or check that both devices are actually on the same
network (guest Wi-Fi is often isolated).

## Python environment (Phase 4 only)

Not needed until you build the embedding index.

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r ml/requirements.txt
```

> **Use `py -3.11`, not `python`.** On this machine `python` resolves to an MSYS2
> build whose venv reports platform `mingw_x86_64`. PyTorch only publishes
> `win_amd64` wheels, so `pip install torch` finds nothing and tries to build from
> source. The `py` launcher points at real CPython in `C:\Program Files\Python311`.
>
> Install the **CPU-only** torch wheel first — the default pulls ~2 GB of CUDA you
> will never use.

**If activation is blocked** with "running scripts is disabled on this system", that's
PowerShell's execution policy. Allow it for the current terminal only:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
```

`-Scope Process` means it resets when you close the window — it doesn't change anything
system-wide.

Your prompt shows `(.venv)` when it's active. Add `.venv/` to `.gitignore`; it's
hundreds of megabytes and fully reproducible from `ml/requirements.txt`.

Then:

```powershell
npm run build:index    # python ml/build_index.py  -> src/data/search-index.json
npm run build:og       # python ml/build_og_image.py -> public/og.png
npm run build:assets   # both
```

**Commit both outputs.** They are build artifacts, but committing them is what keeps
PyTorch out of the deploy pipeline.

Re-run `build:index` after **any** change under `content/`. Forgetting means the live
site shows new text that search cannot find — a silent failure with no error anywhere.

## Useful scripts to define

In `package.json`:

```jsonc
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "build:index": "python ml/build_index.py",   // Phase 4
    "check": "tsc --noEmit"                      // types only, fast
  }
}
```

`check` is worth having separately — it tells you about type errors in a couple of
seconds without waiting for a full build.

## Before you push

1. `npm run check` — no type errors.
2. `npm run build` — build succeeds. **A failing build here means a failing deploy**,
   and the Actions log is a far worse place to read the same error.
3. `npm run preview` — click through every section, use the search, toggle the theme,
   download the resume.
4. Test both themes. Switch your OS theme and reload to confirm the system default is
   respected and doesn't flash.
5. Resize to 390px, or check on your phone.
6. If you changed content, re-run `npm run build:index` (Phase 4 onward).

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `Port 5173 is in use` | A dev server is still running in another terminal. Close it, or let Vite pick the next port — it offers. |
| Blank white page, console error about MIME types | Usually a bad import path. Check the browser console; the real error is there, not in the terminal. |
| Changes don't appear | Hard-refresh (Ctrl+Shift+R). If that fixes it, it was a stale cache. If not, check the terminal — the dev server may have crashed. |
| Tailwind classes do nothing | `@import "tailwindcss"` missing from your CSS, or the CSS file isn't imported in `main.tsx`, or the `@tailwindcss/vite` plugin isn't registered in `vite.config.ts`. |
| `dark:` classes ignore the toggle but follow the OS | The `@custom-variant dark` line is missing from your CSS. See [03-features-and-ui.md](03-features-and-ui.md#tailwind-v4-note). This half-works, which makes it confusing. |
| White flash before dark mode loads | The theme script isn't inline and blocking in `index.html`. See [03-features-and-ui.md](03-features-and-ui.md#the-flash-you-must-prevent). |
| Works in `dev`, breaks in `preview` | Almost always an absolute vs relative asset path, or a missing file that `dev` resolved leniently. |
| `"default" is not exported by …` at build time, but `npm run check` passes | A package's ESM build has only named exports while its TypeScript types advertise a default. `import { load } from 'js-yaml'`, not `import yaml from 'js-yaml'`. Types and bundler disagree here, so the typecheck won't warn you. |
| A content file breaks the whole page | `content.ts` throws on missing frontmatter fields, by design — a loud error beats a silently blank section. The message names the file and the field. |
| `'python' is not recognized` | Python isn't on PATH. Reinstall with "Add to PATH" checked, or try `py` instead. |
| Git warns about `LF will be replaced by CRLF` | Normal on Windows. `git config core.autocrlf true` and ignore it. |
| Search overlay opens but finds nothing | Check `getSearchItems()` actually returns items — `console.log` its length. An empty array searches fine and finds nothing, silently. |

## A note on reading errors

When something breaks, the useful message is usually in one of two places and people
new to this stack often check neither:

- **The terminal running `npm run dev`** — build, TypeScript, and import errors.
- **The browser console (F12)** — runtime errors, failed network requests, React
  warnings.

Read the *first* error, not the last. Errors cascade, and the last one on screen is
usually a downstream symptom of the first.
