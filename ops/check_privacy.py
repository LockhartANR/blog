"""Check tracked files and reachable commit identities before publishing."""
from pathlib import Path
import re
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
def git(*args):
    return subprocess.check_output(['git', '-c', 'safe.directory='+root.as_posix(), '-C', str(root), *args])

problems = []
for rel in git('ls-files','-z').decode().strip('\0').split('\0'):
    path = Path(rel)
    if ((path.name.startswith('.env') and path.name != '.env.example')
            or path.suffix.lower() in ['.db','.sqlite','.sqlite3','.pem','.key','.bundle']
            or any(p in ['.privacy-audit','.public-migration'] for p in path.parts)):
        problems.append(rel+': private file type')
    data = (root/rel).read_bytes()
    if b'\0' in data[:8000]: continue
    text = data.decode('utf-8', errors='replace')
    patterns = {
        'private key': r'-----BEGIN (?:OPENSSH|RSA|EC|DSA|PRIVATE) PRIVATE KEY-----',
        'access token': r'github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|AKI[A][A-Z0-9]{16}',
        'personal filesystem path': r'[A-Za-z]:[\\/]+Users[\\/]+[^\\/\s]+|/home/[A-Za-z0-9_.-]+',
        'QQ contact': r'(?i)\bqq(?:号|号码)?\s*[:：=]?\s*[1-9][0-9]{4,11}',
    }
    for label, pattern in patterns.items():
        if re.search(pattern,text): problems.append(rel+': '+label)

for email in git('log','--all','--format=%ae%n%ce').decode().splitlines():
    if not (email.lower().endswith('@users.noreply.github.com') or email.lower() == 'noreply@github.com'):
        problems.append('commit identity must use a GitHub noreply address')
if problems:
    print('\n'.join(sorted(set(problems))))
    sys.exit(1)
print('Privacy checks passed for tracked files and reachable commit identities')
