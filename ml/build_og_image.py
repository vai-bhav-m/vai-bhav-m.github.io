"""
Generates the Open Graph preview card shown when the site URL is pasted into
Slack, LinkedIn, iMessage or a tweet.

Reads name and tagline from content/about.md so the card can never drift out of
sync with the page. Writes a PNG - social platforms do not render SVG.

    npm run build:og
"""

from __future__ import annotations

import re
from pathlib import Path

import yaml
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "og.png"

# 1200x630 is the size every major platform crops to.
WIDTH, HEIGHT = 1200, 630
PAD = 90

BG = (10, 10, 12)
FG = (245, 245, 245)
MUTED = (150, 152, 158)
ACCENT = (56, 150, 240)

FONT_BOLD = "C:/Windows/Fonts/segoeuib.ttf"
FONT_SEMI = "C:/Windows/Fonts/seguisb.ttf"
FONT_REG = "C:/Windows/Fonts/segoeui.ttf"

FRONTMATTER = re.compile(r"^---\r?\n(.*?)\r?\n---\r?\n?", re.DOTALL)


def read_about() -> dict:
    raw = (ROOT / "content" / "about.md").read_text(encoding="utf-8")
    match = FRONTMATTER.match(raw)
    if not match:
        raise SystemExit("content/about.md: missing frontmatter")
    return yaml.safe_load(match.group(1))


def wrap(draw: ImageDraw.ImageDraw, text: str, font, max_width: int) -> list[str]:
    lines: list[str] = []
    current = ""
    for word in text.split():
        trial = f"{current} {word}".strip()
        if draw.textlength(trial, font=font) <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def read_domains() -> list[str]:
    """Domains in use, busiest first — same derivation as getDomains() in the app."""
    counts: dict[str, int] = {}
    for path in (ROOT / "content" / "projects").glob("*.md"):
        match = FRONTMATTER.match(path.read_text(encoding="utf-8"))
        if not match:
            continue
        data = yaml.safe_load(match.group(1)) or {}
        domain = data.get("domain")
        if domain:
            counts[domain] = counts.get(domain, 0) + 1
    return [d for d, _ in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))]


def main() -> None:
    about = read_about()
    domains = read_domains()

    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)

    name_font = ImageFont.truetype(FONT_BOLD, 76)
    tag_font = ImageFont.truetype(FONT_REG, 34)
    meta_font = ImageFont.truetype(FONT_SEMI, 26)

    # Accent rule down the left edge, so the card reads as designed rather than
    # as a screenshot of text on black.
    draw.rectangle([0, 0, 10, HEIGHT], fill=ACCENT)

    tag_lines = wrap(draw, about["tagline"], tag_font, WIDTH - 2 * PAD)[:3]

    # Centre the text block rather than hanging it from the top, which left a
    # dead zone through the middle of the card.
    block_height = 104 + len(tag_lines) * 48 + (56 if domains else 0)
    y = (HEIGHT - block_height) // 2 - 20

    draw.text((PAD, y), about["name"], font=name_font, fill=FG)
    y += 104

    for line in tag_lines:
        draw.text((PAD, y), line, font=tag_font, fill=MUTED)
        y += 48

    if domains:
        y += 18
        draw.text((PAD, y), "  ·  ".join(domains), font=meta_font, fill=ACCENT)

    # Footer: location on the left, url on the right.
    footer_y = HEIGHT - PAD - 26
    location = about.get("location", "")
    if location:
        draw.text((PAD, footer_y), location, font=meta_font, fill=MUTED)

    url = "vai-bhav-m.github.io"
    url_width = draw.textlength(url, font=meta_font)
    draw.text((WIDTH - PAD - url_width, footer_y), url, font=meta_font, fill=ACCENT)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    image.save(OUT, "PNG", optimize=True)

    size_kb = OUT.stat().st_size / 1024
    print(f"wrote {OUT.relative_to(ROOT)}  ({WIDTH}x{HEIGHT}, {size_kb:.0f} KB)")


if __name__ == "__main__":
    main()
