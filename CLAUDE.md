# CLAUDE.md

Portfolio site for Vaibhav Mahapatra. React + TypeScript + Vite + Tailwind v4, static,
deployed to GitHub Pages at https://vai-bhav-m.github.io.

Read [`README.md`](README.md) for what the repo is, and [`docs/`](docs/) for why things
are the way they are. **The docs describe the system as built, not as planned** — they
were rewritten after implementation.

---

## Commands

```powershell
npm run dev -- --host   # dev server + a LAN URL for phone testing
npm run build           # tsc --noEmit && vite build
npm run preview         # serves dist/ — what Pages will actually serve
npm run check           # types only, fast

npm run build:index     # regenerate search vectors  (needs .venv)
npm run build:og        # regenerate public/og.png    (needs .venv)
npm run build:assets    # both
```

## Two Pythons on this machine — use the right one

`python` on PATH is an **MSYS2 build**. Its venv reports platform `mingw_x86_64`, and
PyTorch only publishes `win_amd64` wheels, so `pip install torch` finds nothing and
tries to build from source.

Always use the venv, which was created from real CPython via `py -3.11`:

```powershell
.venv\Scripts\python.exe ml/build_index.py
```

Recreating it:

```powershell
py -3.11 -m venv .venv
.venv\Scripts\python.exe -m pip install torch --index-url https://download.pytorch.org/whl/cpu
.venv\Scripts\python.exe -m pip install -r ml/requirements.txt
```

Install CPU-only torch first — the default wheel pulls ~2 GB of CUDA that is never used.

---

## Things that look wrong but are deliberate

Do not "fix" these without reading the linked rationale.

| | Why |
| --- | --- |
| **About is excluded from search**, in `src/lib/content.ts` *and* `ml/build_index.py` | Generic bio prose scored 0.336 on "fluid dynamics" — noise crowding out real hits. **Both files must stay in sync.** |
| **`env.allowRemoteModels = false`** in `src/lib/embedder.ts` | Load-bearing. Without it a broken local model path silently falls back to the HF CDN, and self-hosting breaks invisibly. |
| **`ml/build_index.py` never runs in CI** | Installing PyTorch on every deploy would add minutes and be the most fragile step. The index is committed instead. |
| **`public/robots.txt` allows every AI crawler** | Job-seeking site; being found is the point. Do not harden it. |
| **Filtering uses `domain`, not `tags`** | 26 tags across 9 projects, 20 used once. A chip matching one item is a label, not a filter. |
| **Resume PDF is gitignored** | Carries a phone number; `public/` is world-readable and indexed. |
| **`search()` is async and guards stale responses** | Seam for the embedding layer, which genuinely is async. |

---

## Content

Markdown + YAML frontmatter under `content/` — `about.md`, `projects/*.md`,
`experience/*.md`. React renders from these files and the indexer reads the same ones,
so search cannot drift from the page.

**All content access goes through `src/lib/content.ts`.** It is the single seam where
"where content comes from" is decided. Components must not import Markdown directly.

Project frontmatter needs `domain` (required — build fails without it, naming the file).
`archived: true` hides an item behind a "Show N earlier" toggle while keeping it
searchable.

### After ANY change under `content/`

```powershell
npm run build:index
```

…and commit `src/data/search-index.json`. Forgetting means the live site shows text that
search cannot find — a silent failure with no error anywhere.

`summary` does double duty: card text **and** the first thing embedded. Search quality is
summary quality.

---

## Windows / tooling gotchas

**Never round-trip source files through PowerShell `Get-Content`/`Set-Content`.** It reads
UTF-8 as cp1252 and re-encodes: `©` → `Â©`, `—` → `â€”`, plus a stray BOM. Use `sed`,
Python, or the Edit tool. This has already shipped broken text once.

**`git commit -m` with a PowerShell here-string breaks** on embedded quotes — PowerShell
re-splits the argument. Write the message to a file and use `git commit -F`.

**Git uses Windows OpenSSH**, set via `core.sshCommand`. Git's bundled MSYS2 `ssh.exe`
cannot reach the Windows ssh-agent, which produces `Permission denied (publickey)` even
when `ssh -T git@github.com` succeeds.

**PowerShell reports native stderr as a failure.** `git push` "errors" that end with
`main -> main` succeeded.

**First `npm run dev` after a dependency change takes ~2 minutes** — Vite pre-bundles
onnxruntime-web. Subsequent starts are <1s.

---

## Deploying

Push to `main`. GitHub Actions builds and publishes; nothing else to do.

Pages **Source must be "GitHub Actions"**, not "Deploy from a branch". If it reverts, the
site serves the repo verbatim and renders blank — the tell is deployed HTML referencing
`/src/main.tsx` instead of `/assets/index-*.js`.

Run `npm run build` locally before pushing. A failing build blocks the deploy, and the
Actions log is a worse place to read the same error.

---

## Known incomplete

- `FORM_ID` in `src/components/Contact.tsx` is `''` — Contact renders a setup note, not a
  form. Needs a Google Form and three `entry.*` ids.
- The `content/about.md` body is assistant-written placeholder prose. It should be
  rewritten in Vaibhav's voice; it is also what appears on the OG card.
- No design pass: everything is functional Tailwind defaults.

Deliberately not built: service worker / offline, per-project routes, analytics, any
backend. See [`docs/01-decisions.md`](docs/01-decisions.md).

---

## Working style

Verify rather than assume — this project has had several bugs that looked fine and were
not (silent model truncation, CDN fallback, encoding corruption, a green workflow
publishing nothing). Where a claim is checkable, check it and show the numbers.
