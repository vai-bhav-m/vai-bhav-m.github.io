"""
Splits a Markdown body into pieces small enough to embed without truncation.

all-MiniLM-L6-v2 silently discards input past 256 tokens (~190 words) - no
error, no warning - so a chunk that overruns produces a vector representing only
its opening. Every chunk this module emits is checked against MAX_WORDS.

See docs/05-search-design.md
"""

from __future__ import annotations

import re

# Comfortably under the ~190-word truncation point, leaving room for the title
# prefix each chunk carries.
MAX_WORDS = 150

# Below this a chunk is too vague to be useful - it embeds to a mushy vector
# that matches everything weakly and pollutes results. Merged into its neighbour.
MIN_WORDS = 12

HEADING = re.compile(r"^##+\s+(.*)$", re.MULTILINE)


def _words(text: str) -> int:
    return len(text.split())


BULLET = re.compile(r"^\s*[-*]\s+")


def _split_block(block: str) -> list[str]:
    """
    Break one block into chunks.

    A bullet list becomes one chunk *per bullet*. That matters more than it
    sounds: each of your bullets is a distinct claim ("Dockerized and deployed a
    TensorRT engine on AWS EC2"), and folding six of them into one vector
    averages each claim away until none of them is findable. One bullet per
    vector keeps each claim sharp.

    Prose blocks are only split when they exceed MAX_WORDS.
    """
    lines = block.splitlines()
    bullets = [line for line in lines if BULLET.match(line)]

    # Treat it as a list only if it's mostly bullets - a stray dash in prose
    # shouldn't shatter a paragraph.
    if bullets and len(bullets) >= len(lines) - 1:
        return [line.strip() for line in bullets]

    if _words(block) <= MAX_WORDS:
        return [block]

    out: list[str] = []
    current: list[str] = []

    for line in lines:
        if current and _words(" ".join(current)) + _words(line) > MAX_WORDS:
            out.append("\n".join(current))
            current = []
        current.append(line)

    if current:
        out.append("\n".join(current))

    return out


def _sections(body: str) -> list[tuple[str | None, str]]:
    """
    Split on '##' headings, which are authored semantic boundaries - you already
    decided those parts are about different things.
    """
    matches = list(HEADING.finditer(body))
    if not matches:
        return [(None, body)]

    sections: list[tuple[str | None, str]] = []

    lead = body[: matches[0].start()].strip()
    if lead:
        sections.append((None, lead))

    for i, match in enumerate(matches):
        end = matches[i + 1].start() if i + 1 < len(matches) else len(body)
        text = body[match.end() : end].strip()
        if text:
            sections.append((match.group(1).strip(), text))

    return sections


def chunk_body(body: str) -> list[tuple[str | None, str]]:
    """
    Returns (heading, text) pairs, each under MAX_WORDS.

    Headings come back separately so the caller can decide how to fold them into
    the embedded string.
    """
    if not body.strip():
        return []

    pieces: list[tuple[str | None, str]] = []

    for heading, section in _sections(body):
        blocks = [b.strip() for b in re.split(r"\n\s*\n", section) if b.strip()]

        packed: list[str] = []

        for block in blocks:
            for part in _split_block(block):
                # Each part stands alone - deliberately NOT packed back up to
                # MAX_WORDS. Packing would undo the per-bullet split above and
                # re-dilute every claim.
                #
                # The one exception: a fragment too short to carry meaning on its
                # own gets glued to its neighbour, since a stub like "## Setup"
                # embeds to a vague vector that matches everything weakly.
                if packed and _words(part) < MIN_WORDS:
                    packed[-1] = f"{packed[-1]} {part}"
                else:
                    packed.append(part)

        for text in packed:
            pieces.append((heading, text))

    return pieces
