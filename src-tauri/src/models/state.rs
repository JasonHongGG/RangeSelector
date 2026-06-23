use std::sync::Mutex;

pub struct AppState {
    pub last_capture: Mutex<Option<Vec<u8>>>,
}
