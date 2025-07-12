import fetch from 'node-fetch';
import cheerio from 'cheerio';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');

  if (!q) {
    return new Response(JSON.stringify({ error: '缺少查询参数 q（书名）' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const suggestRes = await fetch(`https://book.douban.com/j/subject_suggest?q=${encodeURIComponent(q)}`);
    const suggestList = await suggestRes.json();
    if (!suggestList || suggestList.length === 0) {
      return new Response(JSON.stringify({ error: '未找到书籍' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const book = suggestList[0];
    const bookId = book.id;
    const bookUrl = `https://book.douban.com/subject/${bookId}/`;

    const htmlRes = await fetch(bookUrl);
    const html = await htmlRes.text();
    const $ = cheerio.load(html);

    const extract = (label) => {
      const el = $(`span.pl:contains("${label}")`).parent().text();
      return el.replace(label, '').trim();
    };

    const summary = $('#link-report .intro p').first().text().trim();

    const data = {
      book_name: book.title,
      url: bookUrl,
      authors: [extract('作者:')],
      publisher: extract('出版社:'),
      pub_date: extract('出版年:'),
      isbn: extract('ISBN:'),
      summary,
    };

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: '解析失败', detail: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
