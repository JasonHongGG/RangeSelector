mod models;
mod services;
mod utils;
mod commands;

use std::sync::Mutex;
use models::AppState;
use tauri::Manager;

#[cfg(target_os = "windows")]
use windows::Win32::UI::WindowsAndMessaging::{SetWindowDisplayAffinity, WDA_EXCLUDEFROMCAPTURE};
#[cfg(target_os = "windows")]
use windows::Win32::Foundation::HWND;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(target_os = "windows")]
            {
                if let Some(window) = app.get_webview_window("main") {
                    if let Ok(hwnd) = window.hwnd() {
                        unsafe {
                            let _ = SetWindowDisplayAffinity(HWND(hwnd.0 as _), WDA_EXCLUDEFROMCAPTURE);
                        }
                    }
                }
                if let Some(window) = app.get_webview_window("selection-window") {
                    if let Ok(hwnd) = window.hwnd() {
                        unsafe {
                            let _ = SetWindowDisplayAffinity(HWND(hwnd.0 as _), WDA_EXCLUDEFROMCAPTURE);
                        }
                    }
                }
            }
            Ok(())
        })
        .manage(AppState {
            last_capture: std::sync::Arc::new(Mutex::new(None)),
        })
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::capture_cmd::capture_screen, 
            commands::capture_cmd::perform_capture_flow,
            commands::capture_cmd::get_last_capture,
            commands::capture_cmd::get_last_capture_base64,
            commands::history_cmd::save_history,
            commands::history_cmd::get_history_list,
            commands::history_cmd::read_history_image,
            commands::history_cmd::delete_history
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
