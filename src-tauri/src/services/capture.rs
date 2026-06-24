use crate::models::state::RawImage;
use xcap::Monitor;

pub fn capture_primary_monitor() -> Result<RawImage, String> {
    let monitors = Monitor::all().map_err(|e| e.to_string())?;
    let monitor = monitors.into_iter()
        .find(|m| m.is_primary().unwrap_or(false))
        .or_else(|| Monitor::all().unwrap().into_iter().next());
    
    if let Some(monitor) = monitor {
        let image = monitor.capture_image().map_err(|e| e.to_string())?;
        
        Ok(RawImage {
            width: image.width(),
            height: image.height(),
            rgba: image.into_raw(),
        })
    } else {
        Err("No monitor found".into())
    }
}
