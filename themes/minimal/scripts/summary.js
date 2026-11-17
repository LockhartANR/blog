hexo.extend.helper.register('minimal_summary', function (post) {
  const html = post.excerpt || post.content || '';
  const first = html.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
  const text = this.strip_html(first ? first[1] : html).replace(/\s+/g, ' ').trim();
  return Array.from(text).slice(0, 180).join('');
});

