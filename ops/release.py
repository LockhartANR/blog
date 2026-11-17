"""Validate and extract a static release without trusting archive paths."""
import hashlib
import json
from pathlib import PurePosixPath
import re
import stat
import zipfile


def unpack(archive, project, commit, dest):
    if not re.fullmatch(r'[0-9a-f]{40}', commit):
        raise ValueError('A full commit SHA is required')
    with zipfile.ZipFile(archive) as z:
        names = z.namelist()
        if len(set(names)) != len(names):
            raise ValueError('Duplicate archive members')
        meta = json.loads(z.read('.release.json'))
        if meta['project'] != project or meta['commit'] != commit:
            raise ValueError('Artifact version mismatch')
        if set(names) != set(meta['files']) | {'.release.json'}:
            raise ValueError('Unexpected archive members')
        if 'index.html' not in meta['files']:
            raise ValueError('Missing index.html')
        for rel, digest in meta['files'].items():
            path = PurePosixPath(rel)
            if (not path.parts or path.is_absolute() or '..' in path.parts or '\\' in rel
                    or ':' in rel or any(p.startswith('.') for p in path.parts)
                    or path.as_posix() != rel):
                raise ValueError('Unsafe archive path')
            if stat.S_ISLNK(z.getinfo(rel).external_attr >> 16):
                raise ValueError('Symlink archive member')
            if not re.fullmatch(r'[0-9a-f]{64}', digest):
                raise ValueError('Invalid file digest')
            data = z.read(rel)
            if hashlib.sha256(data).hexdigest() != digest:
                raise ValueError('Artifact corrupted')
            target = dest.joinpath(*path.parts)
            if any(p.is_symlink() for p in (target, *target.parents)):
                raise ValueError('Symlink extraction destination')
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
    return meta
