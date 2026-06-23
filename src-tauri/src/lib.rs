use std::io::Cursor;
use std::sync::Mutex;
use std::fs;
use tauri::State;
use xcap::Monitor;
use image::ImageFormat;
use base64::{Engine as _, engine::general_purpose::STANDARD};
use chrono::Local;
use serde::{Serialize, Deserialize};

struct AppState {
    last_capture: Mutex<Option<Vec<u8>>>,
}

#[derive(Serialize, Deserialize)]
struct HistoryItem {
    id: String,
    timestamp: String,
    path: String,
}

#[tauri::command]
fn capture_screen(state: State<AppState>) -> Result<(), String> {
    let monitors = Monitor::all().map_err(|e| e.to_string())?;
    // Get the primary monitor or the first one
    let monitor = monitors.into_iter().find(|m| m.is_primary().unwrap_or(false)).or_else(|| Monitor::all().unwrap().into_iter().next());
    
    if let Some(monitor) = monitor {
        let image = monitor.capture_image().map_err(|e| e.to_string())?;
        
        let mut buffer = Cursor::new(Vec::new());
        image.write_to(&mut buffer, ImageFormat::Png).map_err(|e| e.to_string())?;
        
        *state.last_capture.lock().unwrap() = Some(buffer.into_inner());
        Ok(())
    } else {
        Err("No monitor found".into())
    }
}

#[tauri::command]
fn get_last_capture(state: State<AppState>) -> Result<Vec<u8>, String> {
    if let Some(data) = state.last_capture.lock().unwrap().as_ref() {
        Ok(data.clone())
    } else {
        Err("No capture found".into())
    }
}

#[tauri::command]
fn save_history(base64_data: String) -> Result<String, String> {
    let current_dir = std::env::current_dir().map_err(|e| e.to_string())?;
    let history_dir = current_dir.join(".runtime").join("history");
    fs::create_dir_all(&history_dir).map_err(|e| e.to_string())?;
    
    let timestamp = Local::now().format("%Y%m%d_%H%M%S").to_string();
    let filename = format!("capture_{}.png", timestamp);
    let filepath = history_dir.join(&filename);
    
    let b64 = base64_data.split(',').last().unwrap_or(&base64_data);
    let bytes = STANDARD.decode(b64).map_err(|e| e.to_string())?;
    
    fs::write(&filepath, bytes.clone()).map_err(|e| e.to_string())?;
    
    let history_json_path = current_dir.join(".runtime").join("history.json");
    let mut history: Vec<HistoryItem> = if history_json_path.exists() {
        let content = fs::read_to_string(&history_json_path).unwrap_or_else(|_| "[]".to_string());
        serde_json::from_str(&content).unwrap_or_else(|_| vec![])
    } else {
        vec![]
    };
    
    history.push(HistoryItem {
        id: timestamp.clone(),
        timestamp,
        path: filepath.to_string_lossy().to_string(),
    });
    
    let updated_json = serde_json::to_string_pretty(&history).map_err(|e| e.to_string())?;
    fs::write(&history_json_path, updated_json).map_err(|e| e.to_string())?;
    
    Ok(filepath.to_string_lossy().to_string())
}

#[tauri::command]
fn get_history_list() -> Result<Vec<HistoryItem>, String> {
    let current_dir = std::env::current_dir().map_err(|e| e.to_string())?;
    let history_json_path = current_dir.join(".runtime").join("history.json");
    if history_json_path.exists() {
        let content = fs::read_to_string(&history_json_path).map_err(|e| e.to_string())?;
        let mut history: Vec<HistoryItem> = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        history.reverse(); // Newest first
        Ok(history)
    } else {
        Ok(vec![])
    }
}

#[tauri::command]
fn read_history_image(path: String) -> Result<Vec<u8>, String> {
    fs::read(path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            last_capture: Mutex::new(None),
        })
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            capture_screen, 
            get_last_capture,
            save_history,
            get_history_list,
            read_history_image
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
