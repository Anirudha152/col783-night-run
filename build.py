"""Inline src/chapters/*.html into src/template.html -> index.html (order = filename order)."""
from pathlib import Path

root = Path(__file__).parent
chapters = sorted((root / "src" / "chapters").glob("*.html"))
body = "\n".join(p.read_text() for p in chapters)
html = (root / "src" / "template.html").read_text().replace("<!--CHAPTERS-->", body)
(root / "index.html").write_text(html)
print(f"built index.html from {len(chapters)} chapters")
