# AdSense 重新送審前 — 最終自查清單

> 對照 comebacktraveler.com 現況整理。✅ = 已用程式驗證／已完成；☐ = 送審前需親自確認或操作。
> 最後核對日期：2026-06-20

---

## A. 技術與政策硬指標（已驗證通過）

- ✅ `public/ads.txt` 正確：`google.com, pub-2666904599101446, DIRECT, f08c47fec0942fa0`
- ✅ `public/robots.txt` 允許爬取且指向 `sitemap-index.xml`
- ✅ sitemap 已含全部新頁：`/klook-deals`、`/esim-quiz`、`/life-restart-naval`、`/about`、`/contact`、`/privacy`
- ✅ 全站每頁都有 `<title>`、`meta description`、`canonical`
- ✅ AdSense 程式碼在內容頁；`/services`（純銷售頁）已移除廣告
- ✅ `/privacy`：含 AdSense／Cookie／第三方廣告／聯盟揭露
- ✅ `/contact`：Email／LINE／電話／社群（真實聯絡方式）
- ✅ `/about`：作者身分、內容產出方式、營利揭露
- ✅ 含聯盟連結的頁面 100% 都有「利益揭露」（AffiliateDisclosure 元件）
- ✅ 站內導航：頂部 SiteNav + 統一頁尾 SiteFooter（含 關於／聯絡／隱私權）

## B. 內容與商業密度（結構已到位，建議再目視一次）

- ✅ 首頁第一屏為「作者故事＋網站導覽」，折扣連結移到底部低調文字 → `/klook-deals`
- ✅ 首頁無優惠碼牆、無服務促銷卡
- ✅ eSIM 文章每篇只剩 1 個主 CTA
- ☐ 隨機目視抽查 3–5 頁：第一眼看到的是內容，不是廣告/導購
- ☐ 確認沒有「建置中／敬請期待／Lorem ipsum」空殼頁

## C. 送審前必須親自確認／操作

- ☐ 寄一封測試信到 `andyho710@gmail.com`、點一次 `/contact` 的 LINE 連結，確認都有效
- ☐ Search Console 已驗證網域，並對新頁「網址審查 → 要求建立索引」：
      `/klook-deals`、`/esim-quiz`、`/life-restart-naval`、`/about`、`/contact`
- ☐ 確認最新部署已上線（GitHub Actions 綠燈），且 `/about`、`/contact`、`/privacy` 都打得開
- ☐ 手機實機開首頁：版面正常、無破圖、無跑版
- ☐ `/privacy` 的「最後更新日期」改成近期日期
- ☐ 確認站上有足夠數量的實質原創文章（目前約 30 頁，OK）

## D. 在 AdSense 後台按「重新請求審查」當下

- ☐ AdSense 帳號內網站為 `comebacktraveler.com`（apex，與 canonical 一致）
- ☐ 狀態頁沒有其他未解政策警告
- ☐ 送審後保持網站可正常瀏覽、審查期間不要同時大改版

---

## 快速重新驗證指令（每次送審前可重跑）

```bash
npm run build
# 1) 含聯盟連結卻缺揭露的頁面（理想輸出 0）
for f in dist/*.html dist/esim/*.html; do
  grep -q 'rel="[^"]*sponsored' "$f" &&
  ! grep -q '利益揭露\|不影響你的價格\|聯盟連結\|聯盟行銷' "$f" &&
  echo "缺揭露: $f"
done
# 2) 缺 SEO 標籤的頁面（理想無輸出）
for f in dist/*.html dist/esim/*.html; do
  grep -q '<title>' "$f" || echo "缺 title: $f"
  grep -q 'name="description"' "$f" || echo "缺 description: $f"
  grep -q 'rel="canonical"' "$f" || echo "缺 canonical: $f"
done
# 3) services 不應有廣告（理想輸出 0）
grep -c 'adsbygoogle' dist/services.html
```
