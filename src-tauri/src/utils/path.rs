use std::path::PathBuf;

pub fn get_runtime_dir() -> PathBuf {
    let mut current_dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    if current_dir.file_name().and_then(|n| n.to_str()) == Some("src-tauri") {
        current_dir = current_dir.parent().unwrap().to_path_buf();
    }
    current_dir.join(".runtime")
}
