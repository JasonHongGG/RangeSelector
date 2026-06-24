use std::io::Cursor;
use xcap::Monitor;
use image::{ColorType, ImageEncoder};
use image::codecs::png::{PngEncoder, CompressionType, FilterType};

pub fn capture_primary_monitor() -> Result<Vec<u8>, String> {
    let monitors = Monitor::all().map_err(|e| e.to_string())?;
    let monitor = monitors.into_iter()
        .find(|m| m.is_primary().unwrap_or(false))
        .or_else(|| Monitor::all().unwrap().into_iter().next());
    
    if let Some(monitor) = monitor {
        let image = monitor.capture_image().map_err(|e| e.to_string())?;
        
        let mut buffer = Cursor::new(Vec::new());
        
        // Use fast PNG encoding to significantly reduce capture latency
        let encoder = PngEncoder::new_with_quality(
            &mut buffer,
            CompressionType::Fast,
            FilterType::NoFilter,
        );
        
        encoder.write_image(
            image.as_raw(),
            image.width(),
            image.height(),
            ColorType::Rgba8.into(),
        ).map_err(|e| e.to_string())?;
        
        Ok(buffer.into_inner())
    } else {
        Err("No monitor found".into())
    }
}
