use std::fs;
use base64::{Engine as _, engine::general_purpose::STANDARD};
use chrono::Local;
use crate::models::HistoryItem;
use crate::utils::path::get_runtime_dir;

pub fn save_history(base64_data: &str) -> Result<String, String> {
    let runtime_dir = get_runtime_dir();
    let history_dir = runtime_dir.join("history");
    fs::create_dir_all(&history_dir).map_err(|e| e.to_string())?;
    
    let now = Local::now();
    let id = now.format("%Y%m%d_%H%M%S_%3f").to_string();
    let display_time = now.format("%Y-%m-%d %H:%M:%S").to_string();
    let filename = format!("capture_{}.png", id);
    let filepath = history_dir.join(&filename);
    
    let b64 = base64_data.split(',').last().unwrap_or(base64_data);
    let bytes = STANDARD.decode(b64).map_err(|e| e.to_string())?;
    
    fs::write(&filepath, bytes).map_err(|e| e.to_string())?;
    
    let history_json_path = runtime_dir.join("history.json");
    let mut history: Vec<HistoryItem> = if history_json_path.exists() {
        let content = fs::read_to_string(&history_json_path).unwrap_or_else(|_| "[]".to_string());
        serde_json::from_str(&content).unwrap_or_else(|_| vec![])
    } else {
        vec![]
    };
    
    // Deduplicate any exact existing IDs just in case
    history.retain(|item| item.id != id);
    
    history.push(HistoryItem {
        id,
        timestamp: display_time,
        path: filepath.to_string_lossy().to_string(),
    });
    
    let updated_json = serde_json::to_string_pretty(&history).map_err(|e| e.to_string())?;
    fs::write(&history_json_path, updated_json).map_err(|e| e.to_string())?;
    
    Ok(filepath.to_string_lossy().to_string())
}

pub fn get_history_list() -> Result<Vec<HistoryItem>, String> {
    let runtime_dir = get_runtime_dir();
    let history_json_path = runtime_dir.join("history.json");
    if history_json_path.exists() {
        let content = fs::read_to_string(&history_json_path).map_err(|e| e.to_string())?;
        let mut history: Vec<HistoryItem> = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        history.reverse(); // Newest first
        Ok(history)
    } else {
        Ok(vec![])
    }
}

pub fn read_history_image(path: &str) -> Result<Vec<u8>, String> {
    fs::read(path).map_err(|e| e.to_string())
}

pub fn delete_history(id: &str) -> Result<(), String> {
    let runtime_dir = get_runtime_dir();
    let history_json_path = runtime_dir.join("history.json");
    
    if history_json_path.exists() {
        let content = fs::read_to_string(&history_json_path).map_err(|e| e.to_string())?;
        let mut history: Vec<HistoryItem> = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        
        let initial_len = history.len();
        
        // Remove files for matching items
        for item in history.iter().filter(|i| i.id == id) {
            let _ = fs::remove_file(&item.path);
        }
        
        // Remove from list
        history.retain(|item| item.id != id);
        
        if history.len() < initial_len {
            let updated_json = serde_json::to_string_pretty(&history).map_err(|e| e.to_string())?;
            fs::write(&history_json_path, updated_json).map_err(|e| e.to_string())?;
        }
    }
    
    Ok(())
}
