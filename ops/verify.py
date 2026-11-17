import json, pathlib, re, sys
from urllib.parse import unquote
root = pathlib.Path(__file__).resolve().parents[1]
cfg = json.loads((root / "ops/project.json").read_text())
out = root / cfg["output"]
assert (out / "index.html").is_file(), "Missing index.html"
if cfg["project"] == "blog":
    assert (out / "archives/index.html").is_file(), "Missing archives"
    assert (out / "favicon.png").is_file(), "Missing favicon"
html = (out / "index.html").read_text(encoding="utf-8")
for ref in re.findall(r'(?:href|src)=["\x27]([^"\x27]+)', html):
    if ref.startswith(("#", "//", "http:", "https:", "data:", "mailto:", "javascript:")): continue
    ref = unquote(ref.split("?")[0].split("#")[0])
    p = out / ref.lstrip("/")
    assert p.is_file() or (p / "index.html").is_file(), "Missing resource: " + ref
print("Verified:", cfg["project"])

