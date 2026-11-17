# 實車照片更新

首頁改為車主提供的 Toyota Corolla Cross Hybrid 外觀照片，新增後座與行李廂照片。照片可放大查看，手機採單欄排版；下方照片延遲載入。未依照片推定年份、等級、行李件數容量或設備承諾。

## 公開資產

以下皆在 `studio/public/photos/`，每張提供 720 與 1440 像素寬的 WebP：

- `vehicle-exterior-720.webp`、`vehicle-exterior-1440.webp`：外觀。
- `vehicle-rear-seat-720.webp`、`vehicle-rear-seat-1440.webp`：後座。
- `vehicle-luggage-720.webp`、`vehicle-luggage-1440.webp`：行李廂。

原始照片未加入儲存庫或部署。使用內建 image_gen 工具遮蔽證件、照片中的人像／文字資料與車牌，再以 Sharp 編碼 WebP。WebP 未保留 EXIF、XMP、IPTC；六個檔案合計約 731 KiB。生成式遮蔽輸出已人工對照車輛外觀、座椅與行李廂配置，不能視為逐像素等同原圖。

## 最終遮蔽提示詞

三張照片各獨立呼叫，使用以下共同提示詞，`TARGETS` 依下列清單替換：

> Use case: precise-object-edit. Edit target: the attached actual vehicle photograph for a transport website. Privacy redaction ONLY: obscure TARGETS with strong opaque neutral gray privacy masks so no original personal information can be read or recovered. Keep EVERYTHING ELSE as close to pixel-identical as possible: exact car model, original framing and perspective, seats, trunk capacity, equipment, objects, lighting, colors and background. Do not enhance, beautify, remove objects, invent details or add text. Keep original landscape aspect ratio. Produce one single photo, no collage.

- Exterior TARGETS: all vehicle registration plates including the already blurred front plate and distant background vehicles, plus any papers or credentials visible through the windshield.
- Rear-seat TARGETS: the entire driver credential / identification card and number label mounted behind the front seat below the tablet (cover portrait AND all text), and any vehicle plates visible in the side mirror or background.
- Luggage TARGETS: the entire driver credential / identification card mounted below the tablet between the headrests (portrait AND all text), plus the background car registration plate visible through the windshield.

## 驗證

- 11 項功能測試通過；受限環境無法連線迴圈網路，取得執行權限後全數通過。
- 預設 build / check-build 與公開 build / check-public 通過。
- 六張 WebP 均無 EXIF、XMP、IPTC。
- 可見瀏覽器桌面與 390 px 手機視窗確認照片正常載入、無水平溢出、圖說未遮擋；瀏覽器無 console error。
- 保留 Google 網站擁有權驗證標記及現有 sitemap / robots / canonical / schema。
- 發布目標僅為 `kaohsiung-safe-transfer`，不合併主分支、不部署旅遊部落格。
