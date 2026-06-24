use tauri::{State, AppHandle, Manager, Emitter};
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
pub fn perform_capture_flow(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    // 1. Hide main window immediately to give instant UI feedback
    if let Some(main_window) = app.get_webview_window("main") {
        let _ = main_window.hide();
    }
    
    // 2. Show selection window immediately to overlay the screen (it is also excluded from capture)
    if let Some(selection_window) = app.get_webview_window("selection-window") {
        let _ = selection_window.show();
        let _ = selection_window.set_focus();
    }
    
    // 3. Capture screen in a background thread so we don't block the IPC response!
    let last_capture = state.last_capture.clone();
    let app_clone = app.clone();
    
    std::thread::spawn(move || {
        if let Ok(image_data) = capture_primary_monitor() {
            *last_capture.lock().unwrap() = Some(image_data);
            let _ = app_clone.emit("refresh_capture", ());
        }
    });
    
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
