"""Rebuild the local texture libraries and the offline edition with python3 build.py."""
import base64
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / "assets"


def texture(path):
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:image/webp;base64,{encoded}"


def library(name, paths):
    return f"const {name}=" + json.dumps([texture(path) for path in paths]) + ";\n"


def build():
    koi = [ASSETS / f"koi-{number}.webp" for number in range(1, 7)]
    (ASSETS / "textures.js").write_text(library("pondTextures", [ASSETS / "garden.webp", *koi]))
    species = ASSETS / "species"
    specimens = sorted((p for p in species.glob("*.webp") if p.stem.isdigit()), key=lambda p: int(p.stem))
    views = sorted(species.glob("field-*.webp"), key=lambda p: int(p.stem.split("-")[1]))
    pack = library("specimenTextures", specimens)
    pack += f'const reefTexture="{texture(ASSETS / "reef.webp")}";\n'
    pack += library("fieldTextures", views)
    life = ASSETS / "pondlife"
    pack += library("frogTextures", sorted(life.glob("frog-*.webp")))
    pack += f'const neriteTexture="{texture(life / "nerite.webp")}";\n'
    pack += library("debrisTextures", sorted(life.glob("debris-*.webp")))
    pack += f'const deckTexture="{texture(life / "cedar.webp")}";\n'
    (ASSETS / "specimens.js").write_text(pack)
    page = (ROOT / "index.html").read_text()
    css = (ROOT / "style.css").read_text().replace("url(assets/garden.webp)", "none")
    page = page.replace('<link rel="stylesheet" href="style.css">', f"<style>{css}</style>")
    page = re.sub(r'<script src="([^"]+)"></script>',
                  lambda match: "<script>" + (ROOT / match[1]).read_text() + "</script>", page)
    (ROOT / "镜水庭.html").write_text(page)


if __name__ == "__main__":
    build()
