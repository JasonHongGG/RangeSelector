use tauri::command;
use windows::Graphics::Imaging::BitmapDecoder;
use windows::Media::Ocr::OcrEngine;
use windows::Storage::Streams::{DataWriter, InMemoryRandomAccessStream};
use base64::{Engine as _, engine::general_purpose::STANDARD};
use serde::Serialize;

#[derive(Serialize)]
pub struct OcrWord {
    text: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

#[derive(Serialize)]
pub struct OcrLine {
    text: String,
    words: Vec<OcrWord>,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

#[derive(Serialize)]
pub struct OcrResponse {
    lines: Vec<OcrLine>,
    text: String,
}

#[command]
pub async fn recognize_text(base64_image: String) -> Result<OcrResponse, String> {
    // 1. Decode base64 (strip data URI prefix if present)
    let base64_data = if base64_image.contains(",") {
        base64_image.split(",").last().unwrap_or(&base64_image)
    } else {
        &base64_image
    };
    
    let image_data = STANDARD.decode(base64_data).map_err(|e| e.to_string())?;

    // 2. Create InMemoryRandomAccessStream
    let stream = InMemoryRandomAccessStream::new().map_err(|e| e.to_string())?;
    let writer = DataWriter::CreateDataWriter(&stream).map_err(|e| e.to_string())?;
    writer.WriteBytes(&image_data).map_err(|e| e.to_string())?;
    writer.StoreAsync().map_err(|e| e.to_string())?.await.map_err(|e| e.to_string())?;
    writer.FlushAsync().map_err(|e| e.to_string())?.await.map_err(|e| e.to_string())?;
    
    // Seek back to start
    stream.Seek(0).map_err(|e| e.to_string())?;

    // 3. Create BitmapDecoder
    let decoder = BitmapDecoder::CreateAsync(&stream).map_err(|e| e.to_string())?.await.map_err(|e| e.to_string())?;
    let bitmap = decoder.GetSoftwareBitmapAsync().map_err(|e| e.to_string())?.await.map_err(|e| e.to_string())?;

    // 4. Run OCR using user profile languages
    let engine = OcrEngine::TryCreateFromUserProfileLanguages().map_err(|e| e.to_string())?;
    let result = engine.RecognizeAsync(&bitmap).map_err(|e| e.to_string())?.await.map_err(|e| e.to_string())?;

    // 5. Extract lines and words
    let mut lines_list = Vec::new();
    let lines = result.Lines().map_err(|e| e.to_string())?;
    for line in lines {
        let text = line.Text().map_err(|e| e.to_string())?.to_string_lossy();
        let words = line.Words().map_err(|e| e.to_string())?;
        
        let mut line_words = Vec::new();
        let mut min_x = f64::MAX;
        let mut min_y = f64::MAX;
        let mut max_x = f64::MIN;
        let mut max_y = f64::MIN;

        for word in words {
            let w_text = word.Text().map_err(|e| e.to_string())?.to_string_lossy();
            let rect = word.BoundingRect().map_err(|e| e.to_string())?;
            let x = rect.X as f64;
            let y = rect.Y as f64;
            let w = rect.Width as f64;
            let h = rect.Height as f64;
            
            min_x = f64::min(min_x, x);
            min_y = f64::min(min_y, y);
            max_x = f64::max(max_x, x + w);
            max_y = f64::max(max_y, y + h);

            line_words.push(OcrWord {
                text: w_text,
                x,
                y,
                width: w,
                height: h,
            });
        }

        if line_words.is_empty() {
            continue;
        }

        lines_list.push(OcrLine {
            text,
            words: line_words,
            x: min_x,
            y: min_y,
            width: max_x - min_x,
            height: max_y - min_y,
        });
    }

    let full_text = result.Text().map_err(|e| e.to_string())?.to_string_lossy();

    Ok(OcrResponse {
        lines: lines_list,
        text: full_text,
    })
}
