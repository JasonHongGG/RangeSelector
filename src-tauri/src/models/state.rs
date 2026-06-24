use std::sync::{Arc, Mutex};

pub struct AppState {
    pub last_capture: Arc<Mutex<Option<Vec<u8>>>>,
}
