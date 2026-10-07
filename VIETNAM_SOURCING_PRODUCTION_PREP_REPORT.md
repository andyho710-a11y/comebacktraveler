# Vietnam Sourcing Production Launch Preparation

## 1. Integration strategy

本輪完成最新 production main 與兩個 Sourcing commit 的歷史保留整合，使用 `codex/vietnam-sourcing-production-prep`。不 rebase 或強推原 Sourcing 分支。使用既有隔離 checkout，D:\astro 原本 scorecard、audit、圖片及 social 未提交檔案保留。

唯一 merge conflict 是 firebase.json；解法同時保留新版 JCB 301 redirect 與 exact /api/vietnam-sourcing rewrite。沒有 eSIM、Mosquito、tracker 衝突或內容修改。

## 2. Main / Sourcing history

- Fetch 後最新 local / origin main：102035b8201073710aeae0867d63f4d408b87de3。
- 查核後 Sourcing HEAD：ee70f4f481c9cd96c4bb89e56dbdfd50889c2533；origin 未有同名分支。
- Sourcing ancestor：79e1735；feature commits：8f58bbf（landing/schema）、ee70f4f（secured backend）。
- 整合 merge commit：732d283。第二 parent 保留 ee70f4f 歷史。
- Latest preparation commit：最終回報提供。此報告本身隨 preparation commit 保存。
- main 中近期 SEO / affiliate / eSIM / mosquito commits 完整保留。本輪 main refs 未移動，無 push。

## 3. Files changed

相對最新 main：Sourcing page/form/controller/schema、BlogLayout sensitiveIntake、privacy、Firebase rewrite/Functions/Firestore/emulator 設定、獨立 Functions package/lock、rules/indexes、root scripts/check dependencies/lock、sourcing tests/tsconfig、既有 sourcing docs。SiteNav / SiteFooter / affiliate tracker / eSIM sources / mosquito sources / CI workflow 不變。

本輪額外準備修正：

- firebase.json 合併保留 JCB redirect。
- seo-affiliate-repair tests 精確允许唯一 Sourcing rewrite 與唯一 sitemap URL；保留全部舊 URLs/noindex/redirect asserts。
- 加入 sourcing-production-prep test 和 current production 檔案 SHA256 fixture，避免寬鬆 regression exemptions。
- sensitiveIntake analytics 僅在三個正式 host 加載 GA；Preview/emulator queue 不送 synthetic conversions。清除 sourcing analytics page_referrer，避免 query/fragment PII。
- 移除 backend test fixture 未使用 hash import 與 UI harness 未使用 argument，新增 typecheck diagnostics 為零。
- 此報告。

本輪最終相對 main 的檔案清單：

```text
.gitignore
docs/vietnam-sourcing-backend.md
docs/vietnam-sourcing-mvp.md
firebase.json
firestore.rfq.indexes.json
firestore.rfq.rules
functions/emulator-tests/intake.test.mjs
functions/environment.example
functions/package-lock.json
functions/package.json
functions/src/firestore-store.ts
functions/src/index.ts
functions/src/service.ts
functions/tests/fixtures.mjs
functions/tests/service.test.mjs
functions/tsconfig.json
package-lock.json
package.json
src/components/VietnamSourcingForm.astro
src/layouts/BlogLayout.astro
src/lib/vietnam-sourcing/rfq.ts
src/pages/privacy.astro
src/pages/vietnam-sourcing.astro
src/scripts/vietnam-sourcing.ts
tests/seo-affiliate-repair.test.mjs
tests/vietnam-sourcing-ui.test.mjs
tests/vietnam-sourcing.test.mjs
tsconfig.sourcing.json
VIETNAM_SOURCING_PRODUCTION_PREP_REPORT.md
tests/fixtures/sourcing-production-baseline.json
tests/sourcing-production-prep.test.mjs
```

## 4. Firebase architecture

Astro 靜態 Hosting + HTTP Functions v2 `vietnamSourcingIntake` + named Firestore `rfq-intake`，region `asia-east1`，Node deployment target 22。Runtime ADC；無 client credential/private key。

本輪唯讀雲端查核：billingEnabled=true；Firestore 與 Cloud Functions API 查詢回覆 SERVICE_DISABLED。已啟用服務清單中也沒有 Cloud Run、Cloud Build、Artifact Registry。這不是「證明不存在歷史 database/function」，而是 API 尚未可用。沒有啟用 API、建立 database/account/IAM、修改 secrets。

可見 projects 沒有已驗證為 RFQ staging 用途的 project；不猜測其他 project 的用途。採隔離 demo emulator，無 live database writes。

## 5. RFQ data flow

Browser → POST /api/vietnam-sourcing → exact Hosting rewrite → server method/origin/content/payload/field validation → persistent abuse transaction → RFQ + receipt atomic transaction → committed `stored:true` receipt → browser matching submission UUID / server ID validation → success UI + event。

未完成 commit、network/server/storage failure、malformed receipt 都不得成功。表單 busy 時禁用、禁止 concurrent submit；同份 retry 重用 token。RFQ ID = `RFQ-YYYYMMDD-<32 hex>`，cryptographic randomBytes(16)，含 128-bit random component，非 email、phone 或 timestamp-only。

## 6. Firestore design

- Database：rfq-intake / Native / asia-east1。
- Collections：rfqs、_rfq_receipts、_rfq_abuse。
- 所有 browser anonymous/authenticated read/write/list/delete 拒絕；無 browser SDK；writes 經 server。Admin SDK 由 IAM 控制，rules 不限制 Admin。
- Schema：rfq_id、created_at、updated_at、status；company/contact/product；specifications/quantity/frequency/target_price/moq；oem/odm/private_label；certifications/order_timeline/existing_supplier_status；services_requested/additional_notes/attachments；source/utm_source/utm_medium/utm_campaign/utm_content/utm_term/landing_page。timestamps/status server-authoritative，initial new，attachments=[]。
- Receipts：submission UUID SHA256、normalized payload fingerprint、rfq_id、created_at；與 RFQ atomic create。retry 前再次確認 RFQ存在。same payload replay同ID；changed payload 409。
- Indexes：composite 空，三個 collection group 關閉 field indexes；document get/transaction 不需 search index。
- TTL：僅 _rfq_abuse.expires_at；rate limiter 依 reset_at 判斷，不依賴 TTL 即時刪除。RFQ/receipts 不設 TTL，待 owner 決定合法留存/刪除政策，刪 RFQ 同時處理receipt。

## 7. IAM

預期 runtime account `rfq-intake@comeback-traveler-web.iam.gserviceaccount.com`，唯讀清單未找到。不得使用既有 project Editor/Owner runtime account 作替代。

Owner 建立 dedicated account，配置 database-resource IAM condition 僅允許 `projects/comeback-traveler-web/databases/rfq-intake` 的必要 transaction/document read/create/update 權限；以 roles/datastore.user 的 database condition 或經審核較窄 custom role 實施，實際 SDK permissions 必須 cloud staging 驗證。Operator private RFQ inspection 與 deployer iam.serviceAccounts.actAs/Functions deploy permissions 分開。Public HTTP invoker只允許呼叫經驗證的 endpoint，不能授權 Firestore。

硬 gate：runtime account 可使用 named database，且不能存取其他 database。Emulator不能證明 IAM isolation。

## 8. Privacy

RFQ data 不送 GA4：公司/統編/姓名/contact/email/phone/LINE/website/specifications/price/notes/attachments filenames/RFQ IDs 均不進 sourcing event dimensions。

Privacy page保留先前新增用途、必要供應商資料分享與機密圖面事先确认說明。Sensitive intake無 AdSense/Adotone loader；clean canonical analytics page_location，page_referrer清空。本輪不改正式 GA4 property/settings，其他頁面 GA/advertising bytes不變。

## 9. Analytics

維持 vietnam_sourcing_view、vietnam_sourcing_cta_click、vietnam_sourcing_form_start、vietnam_sourcing_form_submit、vietnam_sourcing_form_success。Custom dimensions只含 canonical page_path、enum-normalized product_category、enum-normalized services_requested。

只有有效持久化 receipt 才觸發success；所有 failure cases tests無假success。Preview/emulator 不加載正式 GA tag。Cloud GA DebugView ingestion/Enhanced Measurement 設定覆核列入下一步 operator launch check；本輪證明 controller/transport事件與傳送邊界，不宣稱production GA ingestion。

## 10. Anti-abuse

保留 honeypot、consent、strict field allowlist/type/enums/length、64 KiB rawBody cap、base64/attachments/injected fields拒絕。一般text300、規格/notes4000、UTM200字元。Method POST / origin exact allowlist / JSON content type。

Persistent per-provider hash address10/10分鐘、global100/10分鐘；transaction counters跨instance一致。只採最後 provider-appended XFF valid IP，socket fallback，無 rawIP logs；不能採 caller first XFF。此策略防 caller 自選 bucket，但 Hosting proxy chain可能把多人集中一bucket；真正 cloud chain/cost protection需 cloud staging，不能用emulator代替。

同 token retry/idempotency/concurrent duplicate通過；conflicting retry409。Safe errors無stacktrace。maxInstances2、concurrency10、timeout30s是compute限制，並非spending cap；monitoring/budget alerts需owner落實。

## 11. Browser QA

可見內建browser（wmux不存在）。Preview `/vietnam-sourcing`：320、390、1280，Hero/CTA/services/form/FAQ/footer；document scrollWidths305/375/1265，無 overflow。Required/email/consent errors、keyboard FAQ、honeypot隱藏不可聚焦、uploads0。

Preview純靜態，無 backend rewrite；synthetic submit明確顯示未確認錯誤且保留資料，無fake success、無production GA loader。Honeypot blocking及server拒絕另由controller/backend tests驗證，未從browser强行填寫hidden honeypot。

同build local Hosting emulator在320/390/1280實際送合成RFQ成功，明確 TEST COMPANY - DO NOT CONTACT / Test User / test@example.com。额外本機 response-delay QA proxy只延遲真正 emulator receipt4秒：觀察正在處理需求…、disabled、aria-busy=true，然後真正成功；未mock persistence。未送真人資料。

## 12. Tests

- Astro build：45 pages。
- Frontend / all production regression：105/105，failed0，skipped0。
- Backend：13/13，failed0；TypeScript compile成功。
- Real emulator integration：5/5，failed0；Hosting rewrite→Function→named Firestore、replay/concurrency/409、durable rates、failed storage、32 anonymous/authenticated denied browser REST operations。
- Full astro check：既有59 errors /0 warnings /1 hint；新增 diagnostics0。
- Sourcing-only typecheck：0 errors/0 warnings/0 hints。
- Backend npm ci audit：0 vulnerabilities。Root npm audit：13 項（2 moderate、10 high、1 critical），包含 Astro 6.1.10 critical 與 Vite 6.1.1 high；13 個 advisory packages 的 lock 版本均與最新 main 相同，非本輪新增。未在此整合改動套件；正式 launch 前須完成工具鏈安全覆核及必要修補，再重跑 frozen production gates。靜態 Hosting 沒有 Astro server，但不能據此免除 build dependencies 的安全覆核。

過程中Windows Functions discovery預設10秒timeout，使用本機 FUNCTIONS_DISCOVERY_TIMEOUT=60後載入成功；emulator runtime Node24（deployment target Node22），cloud Node22未測。Hosting emulator .html normalization未完全比照live，保持原test不放寬，改在真實Preview完成301 gate。暫時 network timeout已由成功Preview suite覆蓋。

## 13. Regression

Current production baseline 102035b 的既有HTML（privacy除外）及所有既有JS/CSS逐檔hash一致。eSIM links/WaySim internal/JCB/tracker/affiliate_cta_view/Mosquito experiment ID/product keys/freeze dates完全保留。LsI9l/parked active0。Privacy只增加合法RFQ用途。

Required九個production routes HTTP200且bytes與baseline一致；Preview所有HTML/JS/CSS/sitemap bytes等於integration build。Sitemap唯一新增 `/vietnam-sourcing`；既有excluded URLs仍排除。无新增 affiliate experiment。

## 14. Staging result

Hosting Preview： https://comeback-traveler-web--vietnam-sourcing-production-pre-plrb1onp.web.app/vietnam-sourcing

Expiry：2026-10-14T01:59:55.427938064Z。Preview是UI审閱環境，沒有production function rewrite。真正持久化僅在隔離 demo-rfq-intake / rfq-intake emulator驗證，不宣稱cloud staging或production backend可用。

四筆browser RFQ（320/390/1280/延遲loading）確認全部必備欄位、new、attachments空及stored receipt。加上integration fixtures共6筆；驗證後清除 demo RFQs/receipts/abuse，三collection剩餘均0。production未寫入。Emulator結束後不保留測試服務。

## 15. Production prerequisites

正式launch checklist共13項：READY1項，OWNER ACTION REQUIRED12項。

| 項目 | 狀態 | 具體要求 / 現況 |
|---|---|---|
| Firebase billing | READY | 唯讀 billingEnabled=true；launch operator另配置budget alerts |
| APIs | OWNER ACTION REQUIRED | Firestore、Cloud Functions、Cloud Run、Cloud Build、Artifact Registry核准啟用；目前未啟用 |
| Database creation | OWNER ACTION REQUIRED | 建立 Native rfq-intake / asia-east1；不碰其他database |
| Rules | OWNER ACTION REQUIRED | 僅deploy rfq-intake deny-all rules；部署後再次32操作拒絕gate |
| Indexes | OWNER ACTION REQUIRED | 僅deploy firestore.rfq.indexes.json至named database，確認field exclusions |
| TTL | OWNER ACTION REQUIRED | 在 _rfq_abuse.expires_at 啟用 cleanup，核對實際 policy |
| Service account | OWNER ACTION REQUIRED | 建立 dedicated rfq-intake runtime account，未找到既有account |
| IAM | OWNER ACTION REQUIRED | database-only condition，分離operator/deployer，實測拒絕另一database |
| Environment variables | OWNER ACTION REQUIRED | 設RFQ_SERVICE_ACCOUNT；RFQ_INTAKE_ENABLED=false起步，驗收完成才true；不複製demo .env.local |
| Function deployment | OWNER ACTION REQUIRED | 先在核准cloud staging測Node22/ADC/proxy chain/persistence/retries/failures，再只發布reviewed function且初始disabled |
| Hosting rewrite | OWNER ACTION REQUIRED | source exact rewrite已整合並emulator驗證；正式需function先ready再另行核准Hosting release；保留JCB redirect |
| Admin monitoring | OWNER ACTION REQUIRED | 指定private daily RFQ review owner，監控非PII stored/failure logs、billing alerts、刪除流程與安全GA驗收 |
| Toolchain security review | OWNER ACTION REQUIRED | 覆核目前 main 既存 13 項 dependency advisories（含 1 critical）；必要修補需獨立 review 並重跑 production byte/regression gates |

TTL 正確collection group：`_rfq_abuse`，field `expires_at`；設定來源firestore.rfq.indexes.json。

## 16. Owner actions / notifications

目前沒有可重用的repo email notification service，也未找到已接通Telegram/Slack notification workflow；不新增paid provider、credentials或external send。

A. Email：先考慮non-PII Cloud Logging metric → Cloud Monitoring email notification；後續若核准existing email provider則server/Secret Manager整合，仅通知有新需求與private inspection入口，不把完整RFQ寄出。

B. Telegram / Slack：若owner確認既有安全bot/channel，可加server notification workflow及Secret Manager credentials；同樣只送constant new-RFQ提示與private admin入口，不送RFQ ID、contact/specifications。這些僅建議，未建立服務、未送訊息。

Operator第一次launch必須manual inspection可行；不自動把RFQ傳供應商。若案件包含成交服務費，正式委託前约定。頁面沒有固定10,000/20,000/3%/5%費率、支付/收款功能、supplier/Buyer accounts、marketplace、CRM/file upload。

## 17. Release recommendation

整合與本輪Preview/emulator release gates完成，可進入人工production setup；尚不可merge/push main或deploy production。本輪沒有改live Hosting release、APIs、database、IAM、Functions、secrets、GA4 property。

READY FOR PRODUCTION SETUP
