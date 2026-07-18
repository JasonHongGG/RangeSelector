use crate::models::AppState;
use crate::services::capture::capture_primary_monitor;
use base64::{engine::general_purpose, Engine as _};
use image::codecs::png::{CompressionType, FilterType, PngEncoder};
use image::{ColorType, ImageEncoder, RgbaImage};
use std::io::Cursor;
use tauri::{AppHandle, Emitter, Manager, State};

fn encode_png_base64(img: &RgbaImage, fast: bool) -> Result<String, String> {
    let mut buffer = Cursor::new(Vec::new());
    let encoder = PngEncoder::new_with_quality(
        &mut buffer,
        if fast {
            CompressionType::Fast
        } else {
            CompressionType::Default
        },
        FilterType::NoFilter,
    );
    encoder
        .write_image(
            img.as_raw(),
            img.width(),
            img.height(),
            ColorType::Rgba8.into(),
        )
        .map_err(|e| e.to_string())?;

    let b64 = general_purpose::STANDARD.encode(buffer.into_inner());
    Ok(format!("data:image/png;base64,{}", b64))
}

#[tauri::command]
pub fn perform_capture_flow(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    // 1. 隱藏主視窗與選取視窗，確保截圖時畫面是乾淨的
    if let Some(main_window) = app.get_webview_window("main") {
        let _ = main_window.hide();
    }
    if let Some(selection_window) = app.get_webview_window("selection-window") {
        let _ = selection_window.hide();
    }

    // 給予作業系統短暫時間確實完成視窗隱藏的繪製動作 (視需求可以微調)
    // 增加至 500 毫秒，確保 Windows DWM 的隱藏淡出動畫完全結束，避免截到半透明殘影
    std::thread::sleep(std::time::Duration::from_millis(500));

    // 2. 在背景執行緒進行截圖，避免阻塞 IPC
    let last_capture = state.last_capture.clone();
    let app_clone = app.clone();

    std::thread::spawn(move || {
        if let Ok(raw_image) = capture_primary_monitor() {
            *last_capture.lock().unwrap() = Some(raw_image);

            // 3. 截圖完成後，顯示選取視窗供使用者操作
            if let Some(selection_window) = app_clone.get_webview_window("selection-window") {
                let _ = selection_window.show();
                let _ = selection_window.set_focus();
            }

            let _ = app_clone.emit("capture_ready", ());
        }
    });

    Ok(())
}

#[tauri::command]
pub fn get_magnifier_region(
    state: State<AppState>,
    x: u32,
    y: u32,
    size: u32,
) -> Result<String, String> {
    if let Some(raw) = state.last_capture.lock().unwrap().as_ref() {
        let mut img = RgbaImage::from_raw(raw.width, raw.height, raw.rgba.clone())
            .ok_or("Failed to parse raw image")?;

        let half = size / 2;
        let crop_x = if x > half { x - half } else { 0 };
        let crop_y = if y > half { y - half } else { 0 };

        let crop_width = if crop_x + size > raw.width {
            raw.width - crop_x
        } else {
            size
        };
        let crop_height = if crop_y + size > raw.height {
            raw.height - crop_y
        } else {
            size
        };

        let cropped =
            image::imageops::crop(&mut img, crop_x, crop_y, crop_width, crop_height).to_image();

        // Fast encode for magnifier
        encode_png_base64(&cropped, true)
    } else {
        Err("No capture ready".into())
    }
}

#[tauri::command]
pub fn crop_from_raw(
    state: State<AppState>,
    x: u32,
    y: u32,
    width: u32,
    height: u32,
) -> Result<String, String> {
    if let Some(raw) = state.last_capture.lock().unwrap().as_ref() {
        let mut img = RgbaImage::from_raw(raw.width, raw.height, raw.rgba.clone())
            .ok_or("Failed to parse raw image")?;

        let crop_x = x.min(raw.width);
        let crop_y = y.min(raw.height);
        let crop_w = width.min(raw.width - crop_x);
        let crop_h = height.min(raw.height - crop_y);

        let cropped = image::imageops::crop(&mut img, crop_x, crop_y, crop_w, crop_h).to_image();

        // High quality encode for final result
        encode_png_base64(&cropped, false)
    } else {
        Err("No capture ready".into())
    }
}
