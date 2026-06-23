use crate::models::HistoryItem;
use crate::services::history;

#[tauri::command]
pub fn save_history(base64_data: String) -> Result<String, String> {
    history::save_history(&base64_data)
}

#[tauri::command]
pub fn get_history_list() -> Result<Vec<HistoryItem>, String> {
    history::get_history_list()
}

#[tauri::command]
pub fn read_history_image(path: String) -> Result<Vec<u8>, String> {
    history::read_history_image(&path)
}

#[tauri::command]
pub fn delete_history(id: String) -> Result<(), String> {
    history::delete_history(&id)
}
