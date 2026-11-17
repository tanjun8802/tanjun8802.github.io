"""Export a standalone copy of the portfolio that opens directly in a browser."""

import argparse
import base64
import json
import mimetypes
import re
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1] / "dist"


def script_json(value):
    return json.dumps(value, ensure_ascii=False).replace("<", "\\u003c")


def collect_assets(html, data):
    assets = {}

    def add(value):
        if isinstance(value, list):
            for item in value:
                add(item)
        elif isinstance(value, dict):
            for item in value.values():
                add(item)
        elif isinstance(value, str) and (value.startswith(("assets/", "attachments/")) or urlsplit(value).path == "cv.html"):
            path = unquote(urlsplit(value).path)
            file = ROOT / path
            if path not in assets:
                raw = file.read_bytes()
                if path == "cv.html":
                    css = re.sub(r"^@import [^\n]+\n", "", (ROOT / "css/style.css").read_text())
                    raw = raw.decode("utf-8").replace(
                        '<link rel="stylesheet" href="css/style.css">', f"<style>\n{css}</style>"
                    ).replace('<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">', "").encode("utf-8")
                assets[path] = {
                    "type": mimetypes.guess_type(file)[0] or "application/octet-stream",
                    "data": base64.b64encode(raw).decode("ascii"),
                }

    add(data)
    for path in re.findall(r'(?:src|href)="((?:assets|attachments)/[^"]+|cv\.html(?:#[^"]+)?)"', html):
        add(path)
    return assets


def build(output):
    html = (ROOT / "index.html").read_text()
    css = (ROOT / "css/style.css").read_text()
    javascript = (ROOT / "js/script.js").read_text()
    data = json.loads((ROOT / "data.json").read_text())
    assets = collect_assets(html, data)

    # Use system fonts in the portable copy so all visual assets work offline.
    css = re.sub(r"^@import [^\n]+\n", "", css)
    html = re.sub(r'<link rel="stylesheet" href="css/style.css(?:\?[^"]*)?">', lambda _: f"<style>\n{css}</style>", html)
    html = re.sub(r'<script src="js/script.js(?:\?[^"]*)?" defer></script>', '', html)
    html = re.sub(r'<script type="application/json" id="portfolio-data">.*?</script>', '', html, flags=re.S)
    # Delay loading local asset URLs until they are replaced with embedded data.
    html = re.sub(r'(src|href)="((?:assets|attachments)/[^"]+|cv\.html(?:#[^"]+)?)"', r'data-preview-\1="\2"', html)
    bootstrap = r"""
(() => {
  const assets = JSON.parse(document.getElementById('portfolio-assets').textContent);
  const urls = new Map();
  function resolve(value) {
    if (typeof value !== 'string' || !/^(?:(?:assets|attachments)\/|cv\.html(?:#|$))/.test(value)) return value;
    const [path, fragment] = value.split('#', 2);
    const key = decodeURIComponent(path);
    const asset = assets[key];
    if (!asset) return value;
    if (!urls.has(key)) {
      const url = ['application/pdf', 'text/html'].includes(asset.type)
        ? URL.createObjectURL(new Blob(
            [Uint8Array.from(atob(asset.data), char => char.charCodeAt(0))],
            {type: asset.type}))
        : `data:${asset.type};base64,${asset.data}`;
      urls.set(key, url);
    }
    return urls.get(key) + (fragment ? '#' + fragment : '');
  }
  const content = document.getElementById('portfolio-data');
  content.textContent = JSON.stringify(JSON.parse(content.textContent, (_, value) => resolve(value)));
  for (const attribute of ['src', 'href']) {
    const original = 'data-preview-' + attribute;
    for (const element of document.querySelectorAll('[' + original + ']')) {
      element.setAttribute(attribute, resolve(element.getAttribute(original)));
      element.removeAttribute(original);
    }
  }
})();
"""
    bundle = (
        f'<script type="application/json" id="portfolio-data">{script_json(data)}</script>\n'
        f'<script type="application/json" id="portfolio-assets">{script_json(assets)}</script>\n'
        f"<script>{bootstrap}</script>\n<script>{javascript}</script>\n"
    )
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(html.replace("</body>", bundle + "</body>"), encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path, help="path to the generated HTML file")
    build(parser.parse_args().output)
