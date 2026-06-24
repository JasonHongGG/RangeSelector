# RangeSelector

This is a Tauri + React + TypeScript application for selecting screen ranges.

## 開發環境設置

- [VS Code](https://code.visualstudio.com/) + [Tauri Extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## 如何自行打包 (Portable 執行檔)

如果您未來需要自行打包最新的程式碼成單一執行檔，請按照以下步驟進行：

1. 確保已經安裝 [Node.js](https://nodejs.org/) 以及 [Rust](https://www.rust-lang.org/tools/install) 開發環境。
2. 開啟終端機 (Terminal) 並進入此專案資料夾。
3. 若是第一次運行，請先安裝相依套件：
   ```bash
   npm install
   ```
4. 執行打包指令：
   ```bash
   npm run tauri build
   ```
5. 打包完成後，您可以在以下路徑找到編譯好的執行檔：
   `src-tauri/target/release/RangeSelector.exe`

這是一個 Portable (免安裝) 版本的執行檔，您可以直接將此檔案複製到任何地方執行。