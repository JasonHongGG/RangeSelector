mod models;
mod services;
mod utils;
mod commands;

use std::sync::Mutex;
use models::AppState;


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|_app| {

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
            commands::capture_cmd::perform_capture_flow,
            commands::capture_cmd::get_magnifier_region,
            commands::capture_cmd::crop_from_raw,
            commands::history_cmd::save_history,
            commands::history_cmd::get_history_list,
            commands::history_cmd::read_history_image,
            commands::history_cmd::delete_history
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
