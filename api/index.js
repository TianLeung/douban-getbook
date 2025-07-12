import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  const q = req.query.q || req.url.split('?q=')[1] || '';
  if (!q) {
    return res.status(400).json({ error: '请提供参数 q（书名）' });
  }

  try {
    // 第一步：调用豆瓣建议接口，拿到 book id
    const suggestRes = await fetch(`https://book.douban.com/j/subject_suggest?q=${encodeURIComponent(q)}`);
    const suggestList = await suggestRes.json();
    if (!suggestList || suggestList.length === 0) {
      return res.status(404).json({ error: '未找到书籍' });
    }

    const book = suggestList[0];
    const bookId = book.id;
    const bookUrl = `https://book.douban.com/subject/${bookId}/`;

    // 第二步：抓取详情页 HTML 内容
    const htmlRes = await fetch(bookUrl);
    const html = await htmlRes.text();
    const $ = cheerio.load(html);

    // 提取详情字段
    const extract = (label) => {
      const el = $(`span.pl:contains("${label}")`).parent().text();
      return el.replace(label, '').trim();
    };

    const summary = $('#link-report .intro p').first().text().trim();

    res.status(200).json({
      book_name: book.title,
      url: bookUrl,
      authors: [extract('作者:')],
      publisher: extract('出版社:'),
      pub_date: extract('出版年:'),
      isbn: extract('ISBN:'),
      summary
    });
  } catch (e) {
    res.status(500).json({ error: '解析失败', detail: e.message });
  }
}
