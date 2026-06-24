use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct RawImage {
    pub width: u32,
    pub height: u32,
    pub rgba: Vec<u8>,
}

pub struct AppState {
    pub last_capture: Arc<Mutex<Option<RawImage>>>,
}
