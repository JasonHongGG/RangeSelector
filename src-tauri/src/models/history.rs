use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct HistoryItem {
    pub id: String,
    pub timestamp: String,
    pub path: String,
}
