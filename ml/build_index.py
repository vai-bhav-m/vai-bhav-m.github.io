"""
Builds the semantic search index.

Reads the same Markdown files the frontend renders and embeds every item in
full: one "card" chunk (title + summary + tags) plus one chunk per section of
the body. At query time the frontend scores every chunk and keeps each item's
best, so one project still produces one result - the chunking is invisible in
the UI.

Runs on your machine, not in CI. Installing PyTorch on every deploy would add
minutes and be the most fragile part of the pipeline, so the small JSON output
is committed instead.

    npm run build:index

See docs/05-search-design.md
"""

from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import yaml
from sentence_transformers import SentenceTransformer

from chunking import MAX_WORDS, chunk_body

# Must match the model the browser loads (Xenova/all-MiniLM-L6-v2, its ONNX
# export). Vectors from two different models compare without erroring and return
# confident nonsense, so the frontend asserts on the `model` field below.
MODEL = "sentence-transformers/all-MiniLM-L6-v2"

# Hard ceiling. Anything above this is being silently truncated by the model, so
# the build fails rather than shipping a quietly broken index.
HARD_LIMIT = 185

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content"
OUT = ROOT / "src" / "data" / "search-index.json"

FRONTMATTER = re.compile(r"^---\r?\n(.*?)\r?\n---\r?\n?", re.DOTALL)


def parse(path: Path) -> tuple[dict, str]:
    raw = path.read_text(encoding="utf-8")
    match = FRONTMATTER.match(raw)
    if not match:
        raise SystemExit(f"{path.relative_to(ROOT)}: missing frontmatter block")

    data = yaml.safe_load(match.group(1))
    if not isinstance(data, dict):
        raise SystemExit(f"{path.relative_to(ROOT)}: frontmatter is not a mapping")

    return data, raw[match.end() :].strip()


def strip_markdown(text: str) -> str:
    """
    Flatten Markdown to prose. **bold**, `code` and bullet markers carry no
    meaning to the model and just dilute the vector.
    """
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = re.sub(r"\*(.*?)\*", r"\1", text)
    text = re.sub(r"`(.*?)`", r"\1", text)
    text = re.sub(r"\[(.*?)\]\(.*?\)", r"\1", text)
    text = re.sub(r"^\s*[-*]\s+", "", text, flags=re.MULTILINE)
    return re.sub(r"\s+", " ", text).strip()


def build_chunks(item: dict, body: str) -> list[str]:
    """
    The strings that actually get embedded for one item.

    The first is a "card" chunk - title, summary and tags - so short queries
    land on the item as a whole. The rest cover the body.

    Every body chunk is prefixed with the title. That isn't about weighting the
    title; it's context. A chunk reading "It handles retries with exponential
    backoff" is nearly unsearchable when you don't know what "it" is.
    """
    title = item["title"]
    chunks: list[str] = []

    card = f"{title}. {item['summary']}"
    if item["tags"]:
        card += f" Tags: {', '.join(item['tags'])}."
    chunks.append(card)

    for heading, text in chunk_body(body):
        flat = strip_markdown(text)
        if not flat:
            continue
        prefix = f"{title} - {heading}: " if heading else f"{title}. "
        chunks.append(prefix + flat)

    return chunks


def collect() -> list[tuple[dict, str]]:
    """Returns (item metadata, body) pairs in the same shape as SearchItem."""
    # About is deliberately not indexed - general-purpose bio prose scored
    # mid-table on almost every unrelated query. Must stay in sync with the
    # same exclusion in src/lib/content.ts.
    out: list[tuple[dict, str]] = []

    for path in sorted((CONTENT / "projects").glob("*.md")):
        data, body = parse(path)
        slug = data.get("slug") or path.stem
        out.append(
            (
                {
                    "id": f"projects/{slug}",
                    "kind": "project",
                    "title": data["title"],
                    "summary": data["summary"],
                    "tags": [str(t) for t in data.get("tags", [])],
                    "url": f"#{slug}",
                },
                body,
            )
        )

    for path in sorted((CONTENT / "experience").glob("*.md")):
        data, body = parse(path)
        slug = data.get("slug") or path.stem
        out.append(
            (
                {
                    "id": f"experience/{slug}",
                    "kind": "experience",
                    "title": f"{data['role']} — {data['org']}",
                    "summary": data["summary"],
                    "tags": [str(t) for t in data.get("tags", [])],
                    "url": f"#{slug}",
                },
                body,
            )
        )

    return out


def main() -> None:
    items = collect()

    records: list[tuple[str, str]] = []  # (item id, chunk text)
    for item, body in items:
        for text in build_chunks(item, body):
            records.append((item["id"], text))

    print(f"{len(items)} items -> {len(records)} chunks")

    # Fail loudly rather than ship an index with silently truncated vectors.
    oversized = [(i, t) for i, t in records if len(t.split()) > HARD_LIMIT]
    if oversized:
        print(f"\nERROR: {len(oversized)} chunk(s) exceed {HARD_LIMIT} words and", file=sys.stderr)
        print("would be silently truncated by the model:\n", file=sys.stderr)
        for item_id, text in oversized:
            print(f"  {item_id}: {len(text.split())} words", file=sys.stderr)
            print(f"    {text[:90]}...\n", file=sys.stderr)
        print(f"Split the content, or lower MAX_WORDS ({MAX_WORDS}) in ml/chunking.py.", file=sys.stderr)
        raise SystemExit(1)

    longest = max(records, key=lambda r: len(r[1].split()))
    print(f"longest chunk: {len(longest[1].split())} words ({longest[0]}), limit {HARD_LIMIT}")

    model = SentenceTransformer(MODEL)

    # normalize_embeddings=True makes every vector unit length, which turns the
    # browser-side cosine similarity into a plain dot product.
    vectors = model.encode([t for _, t in records], normalize_embeddings=True, show_progress_bar=False)

    index = {
        "model": MODEL,
        "dim": int(vectors.shape[1]),
        "normalized": True,
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        # Only the item id and the vector ship. Titles, summaries and urls already
        # live in the bundle via content.ts, and chunk text is never displayed.
        "chunks": [
            {"item": item_id, "vector": [round(float(v), 5) for v in vector]}
            for (item_id, _), vector in zip(records, vectors)
        ],
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(index, ensure_ascii=False), encoding="utf-8")

    size_kb = OUT.stat().st_size / 1024
    per_item = len(records) / len(items)
    print(f"wrote {OUT.relative_to(ROOT)}")
    print(f"  {len(records)} chunks ({per_item:.1f}/item), {index['dim']}d, {size_kb:.0f} KB")


if __name__ == "__main__":
    main()
