#!/usr/bin/env python3
"""Embed site.json into index.html so it also works when opened as file://."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
HTML_PATH = ROOT / "index.html"
CONFIG_PATH = ROOT / "site.json"
START = "<!-- SITE_CONFIG_START -->"
END = "<!-- SITE_CONFIG_END -->"

config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
json_text = json.dumps(config, ensure_ascii=False, indent=2)
json_text = json_text.replace("&", "\\u0026").replace("<", "\\u003c").replace(">", "\\u003e")
block = f'{START}\n<script id="site-config" type="application/json">{json_text}</script>\n{END}'

html = HTML_PATH.read_text(encoding="utf-8")
start = html.index(START)
end = html.index(END, start) + len(END)
HTML_PATH.write_text(html[:start] + block + html[end:], encoding="utf-8")
print("Configuração do site embutida em index.html.")
