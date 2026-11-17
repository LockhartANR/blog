"""Package previously verified static output for an exact clean Git commit."""
import hashlib, json, pathlib, subprocess, zipfile
root = pathlib.Path(__file__).resolve().parents[1]
cfg = json.loads((root / "ops/project.json").read_text())
subprocess.run(["python" if __import__("os").name == "nt" else "python3", str(root/"ops/verify.py")], check=True)
def git(*args): return subprocess.check_output(["git", "-C", str(root), *args], text=True).strip()
assert not git("status","--porcelain"), "Commit changes before packaging"
commit = git("rev-parse","HEAD")
out = root/cfg["output"]
files = {p.relative_to(out).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in out.rglob("*") if p.is_file()}
dest = root/"release.zip"
with zipfile.ZipFile(dest,"w",zipfile.ZIP_DEFLATED) as z:
    for rel in files: z.write(out/rel, rel)
    z.writestr(".release.json", json.dumps({"project": cfg["project"],"commit":commit,"files":files}))
print(dest)


subprocess.run(["git", "bundle", "create", str(root/"source.bundle"), "HEAD"], cwd=root, check=True)
