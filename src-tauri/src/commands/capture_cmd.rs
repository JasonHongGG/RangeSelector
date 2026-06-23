use tauri::State;
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
