const fs = require('node:fs');
const path = require('node:path');
// Reserve PNG layout space without changing the author's Markdown.
hexo.extend.filter.register('after_post_render', data => {
  const source = path.resolve(hexo.source_dir);
  data.content = data.content.replace(/<img\b[^>]*>/gi, tag => {
    const match = tag.match(/\bsrc="([^"]+)"/i);
    if (!match || !match[1].startsWith('/') || !match[1].split('?')[0].endsWith('.png')) return tag;
    let file;
    try { file = path.resolve(source, '.' + decodeURIComponent(match[1].split('?')[0])); } catch { return tag; }
    if (!file.startsWith(source + path.sep)) return tag;
    let fd;
    try {
      fd = fs.openSync(file, 'r'); const header = Buffer.alloc(24); fs.readSync(fd, header, 0, 24, 0);
      if (header.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') return tag;
      if (/\b(?:width|height)=/i.test(tag)) return tag;
      return tag.replace(/\s*\/?>$/, ' width="' + header.readUInt32BE(16) + '" height="' + header.readUInt32BE(20) + '" decoding="async">');
    } catch { return tag; } finally { if(fd !== undefined) fs.closeSync(fd); }
  });
  return data;
});

