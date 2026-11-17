import hashlib
import json
from pathlib import Path
import tempfile
import unittest
import zipfile
from release import unpack


class ReleaseTests(unittest.TestCase):
    def archive(self, path, members):
        with zipfile.ZipFile(path, 'w') as z:
            for name, data in members.items():
                z.writestr(name, data)
            z.writestr('.release.json', json.dumps({'project':'landing','commit':'a'*40,
                'files':{k:hashlib.sha256(v).hexdigest() for k,v in members.items()}}))

    def test_round_trip_and_wrong_commit(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.archive(root/'release.zip', {'index.html':b'valid','assets/main.js':b'js'})
            with self.assertRaises(ValueError):
                unpack(root/'release.zip', 'landing', 'b'*40, root/'wrong')
            unpack(root/'release.zip', 'landing', 'a'*40, root/'out')
            self.assertEqual((root/'out/index.html').read_bytes(), b'valid')

    def test_rejects_traversal_and_hidden_paths(self):
        for name in ['../escape','/escape','C:/escape','assets/../../escape','.env','assets/.env','assets\\escape']:
            with self.subTest(name=name), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                self.archive(root/'release.zip', {'index.html':b'valid', name:b'bad'})
                with self.assertRaises(ValueError):
                    unpack(root/'release.zip', 'landing', 'a'*40, root/'out')
                self.assertFalse((root/'escape').exists())

    def test_rejects_corruption(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            with zipfile.ZipFile(root/'release.zip', 'w') as z:
                z.writestr('index.html', b'changed')
                z.writestr('.release.json', json.dumps({'project':'landing','commit':'a'*40,'files':{'index.html':'0'*64}}))
            with self.assertRaises(ValueError):
                unpack(root/'release.zip','landing','a'*40,root/'out')

if __name__ == '__main__': unittest.main()
