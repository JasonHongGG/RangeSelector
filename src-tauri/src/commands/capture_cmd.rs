use tauri::State;
use base64::{Engine as _, engine::general_purpose};
use crate::models::AppState;
use crate::services::capture::capture_primary_monitor;

#[tauri::command]
pub fn capture_screen(state: State<AppState>) -> Result<(), String> {
    let image_data = capture_primary_monitor()?;
    *state.last_capture.lock().unwrap() = Some(image_data);
    Ok(())
}

#[tauri::command]
pub fn get_last_capture(state: State<AppState>) -> Result<Vec<u8>, String> {
    if let Some(data) = state.last_capture.lock().unwrap().as_ref() {
        Ok(data.clone())
    } else {
        Err("No capture found".into())
    }
}

#[tauri::command]
pub fn get_last_capture_base64(state: State<AppState>) -> Result<String, String> {
    if let Some(data) = state.last_capture.lock().unwrap().as_ref() {
        let b64 = general_purpose::STANDARD.encode(data);
        Ok(format!("data:image/png;base64,{}", b64))
    } else {
        Err("No capture found".into())
    }
}
