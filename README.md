# RangeSelector

RangeSelector 是一款由 Tauri + React (TypeScript) 打造的現代化截圖、標註與 OCR 辨識工具。它具備原生的跨平台截圖體驗、流暢的繪圖標註功能，以及強大且精準的文字辨識能力。

## 核心特色功能

- **全域快捷鍵截圖**：無論軟體在背景或系統匣，隨時隨地按下快捷鍵即可啟動截圖。
- **放大鏡精準截圖**：自帶原生放大鏡與精準十字游標，完美捕捉每一像素。
- **豐富的標註工具**：提供多種顏色的畫筆、無痕橡皮擦 (不破壞原圖)，以及支援無限次上一步/下一步 (Undo/Redo)。
- **智慧 OCR 文字辨識**：內建原生 Windows OCR 引擎，精準抓取文字邊界，直接在圖片上反白複製文字。自動適應各種圖片底色。
- **歷史紀錄管理**：自動保存您的截圖與標註紀錄，隨時回顧與再編輯。

---

## 快捷鍵指南 (Hotkeys)

| 功能 | 快捷鍵 | 說明 |
| :--- | :--- | :--- |
| **啟動截圖 (Global)** | `Alt + X` | **全域支援**：即使軟體縮小在背景，也能隨時觸發截圖流程 |
| **還原 (Undo)** | `Ctrl + Z` | 取消上一步的畫筆標註 |
| **重做 (Redo)** | `Ctrl + Y` 或 `Ctrl + Shift + Z` | 恢復上一步取消的標註 |
| **結束選取** | `Esc` | 在截圖模式中按 `Esc` 可取消截圖；在主畫面中可關閉特定視窗 |

---

## 如何打包與建置 (Build Instructions)

本專案基於 **Tauri v2** 架構，前端使用 React + Vite，後端使用 Rust。

### 開發環境需求
1. [Node.js](https://nodejs.org/) (建議 v18 以上)
2. [Rust](https://www.rust-lang.org/tools/install) (需要安裝 C++ build tools)

### 1. 安裝依賴套件
第一次載入專案時，請先安裝前端依賴：
```bash
npm install
```

### 2. 本地開發測試 (Dev Mode)
啟動具有熱模組替換 (HMR) 功能的開發環境：
```bash
npm run tauri dev
```

### 3. 打包正式版執行檔 (Build for Production)
當您準備好將專案打包成單一的 Windows 安裝檔 (`.msi` / `.exe`) 時，請執行：
```bash
npm run tauri build
```
打包完成後，您的應用程式安裝檔將會生成在：
`src-tauri/target/release/bundle/` 目錄底下。
