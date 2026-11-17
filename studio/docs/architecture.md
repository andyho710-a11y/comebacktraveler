# 環境盤點與架構決策

日期：2026-11-16（Asia/Taipei）。read-only GitHub metadata 與 PR 搜尋，git fetch main 後以 `5688d2b` 為本次開發基底。遠端為公開 `andyho710-a11y/comebacktraveler`，default branch main，查詢時無 open PR。

原工作目錄 `D:/astro` 在 `codex/vietnam-sourcing-mvp`，有 `docs/affiliate-weekly-scorecard.md` 修改及多個未追蹤工作目錄／文件／圖片。全部保留。新 worktree `D:/astro/.worktrees/kaohsiung-transfer`，分支 `codex/kaohsiung-transfer-studio`。必要設定不做覆寫，以基底 Git 版本作回復依據；無讀取或備份憑證。

## 目前 owning source（supplied AGENTS 的架構說明已有落差）

| 項目 | 檢查結果 |
|---|---|
| 語言／框架 | Astro 7.2.8、JS/TS、Tailwind 4、Vite 8；靜態輸出 |
| 部署 | `.github/workflows/deploy.yml` main push 建置，Firebase CLI Hosting deploy；不是舊文件所述 action-hosting-deploy |
| 旅遊站 | `src/layouts/BlogLayout.astro`，現有 GA4 `G-XW4LBK8PYF`、聯盟追蹤、中文／英文內容 |
| `/services` | 獨立 Astro feature，Supabase 2.117.3 client、Auth／RLS／Edge Functions／通知及私有照片保護；正式已合併並有 release 文件 |
| sourcing | 既有獨立 Functions codebase `rfq-intake` 與 Firestore 設定；不以文件推斷當前雲端可用性 |
| 重用 | Astro 生態、GitHub repo、設計與測試經驗；不共用客戶資料、Auth、GA4 或正式來源設定 |
| 未驗證 | 當前雲端服務帳單、線上後端健康、GA4 Admin／Search Console 權限；未登入或修改雲端設定 |

## A 與 B

| 面向 | A：新增旅遊站路徑 | B：獨立工作室（本次） |
|---|---|---|
| 獲客 | 舊站可能提供初始曝光，但旅遊讀者不等同高雄接送客群 | 品牌與在地交通意圖集中；新網址需要累積曝光 |
| SEO | 原網域可共用，但不保證排名或搜尋量 | 可用獨立網域；搜尋主題與商家資料一致，需重新驗證 GSC |
| 維護 | 共用 build 較少依賴，後端仍需獨立 | 獨立 lockfile／建置與安全維護，成本較高但變更可隔離 |
| 風險 | 主站 CI、追蹤與 CSS 較容易受影響 | 不加入原 pages／layout／deploy；可在獨立目錄移到新 repo |
| 託管 | 原 Firebase Hosting 只解決靜態頁 | 先本機完成，未來可評估同 Firebase project 的獨立 Hosting site；安全收單另需後端 |

選 B，先同 repo 的 `studio/`，不另購服務。不把個人接送訂單塞入多人媒合 `/services` 或 sourcing DB。也不為了共用而給單人接送後台讀取既有客戶資料。

資料流程：訪客 → 同源 Node API → 驗證／限流 → 單一 SQLite 交易（加密詢單＋重試紀錄＋彙總計數）→ 管理員 cookie 授權 API → 人工判斷與車隊合法預約。客人不會因伺服器儲存而收到預約成功。

## 託管提案（尚未執行）

本機開發 NT$0 增量雲端費用，不含既有電腦與電費。可 review 的第一選項：獨立常駐 Node＋持久化磁碟＋HTTPS 反向代理；託管、備份與監控需先取得實際供應商報價再核准，**目前沒有可驗證月費**。不使用交易 bot VM，也不把家用電腦直接開公網。

第二選項：Firebase 獨立 Hosting target＋Functions／Firestore／Auth，重用平台而隔離資料及 IAM；需要另行確認 Blaze、費用、預算與 API 啟用。這不是本版 SQLite 的直接部署路徑，須另做儲存 adapter、授權及 emulator 驗收。兩方案都不假稱永遠免費，也不擅自建立資源。

整個 `studio/` 由根 `.gitignore` 排除再逐一 force-track 來源，以免原站 Tailwind 自動掃描新增測試／文案而改動旅遊 CSS。原部署設定與流程未改；新增 CI 只在本分支／此目錄 PR 做檢查，不含 deploy 權限。
