import rss from '@astrojs/rss';
import { allArticles } from '../data/articles.js';

// 全站文章 RSS：https://comebacktraveler.com/rss.xml
// 文章清單來自 src/data/articles.js（首頁也用同一份），依發布日由新到舊排序。
export function GET(context) {
  const items = [...allArticles]
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
    .map((article) => ({
      title: article.title,
      description: article.desc,
      pubDate: new Date(article.pubDate),
      link: article.href,
    }));

  return rss({
    title: '重來的旅人',
    description:
      '2026 出國上網 eSIM 比較、日本／韓國／越南旅遊攻略與省錢指南。把踩過的坑，整理成你的攻略。',
    // context.site 來自 astro.config.mjs 的 site 欄位，用來產生絕對連結。
    site: context.site,
    items,
    customData: '<language>zh-TW</language>',
  });
}
