mod gtf;
mod importers;
mod exporters;
use std::fs;
use base64::Engine;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
// We remove the default greet function
// #[tauri::command]
// fn greet(name: &str) -> String {
//     format!("Hello, {}! You've been greeted from Rust!", name)
// }

/// Loads and parses a GTF file from the given path.
#[tauri::command]
fn load_gtf_file(path: String) -> Result<gtf::GtfDocument, String>
{
    // Read the file content
    let content = fs::read_to_string(&path)
        .map_err(|err| format!("Failed to read file '{}': {}", path, err))?;

    // Parse the content using our gtf module function
    gtf::parse_gtf_content(&content)
    // We could add more context to the error here if needed
    // .map_err(|parse_err| format!("Error parsing file '{}': {}", path, parse_err))
}

/// Serializes the GtfDocument and saves it to the specified path.
#[tauri::command]
fn save_gtf_file(path: String, document: gtf::GtfDocument) -> Result<(), String> {
    // Serialize the document
    let content = gtf::serialize_gtf_document(&document)?;
    // Note: serialize_gtf_document itself returns Result<String, String>,
    // the `?` operator propagates the error if serialization fails.

    // Write the content to the file
    fs::write(&path, content)
        .map_err(|err| format!("Failed to write file '{}': {}", path, err))
}

/// Resizes a bitmap to new dimensions.
/// 
/// Takes the current bitmap (Vec<String> where each string is a row),
/// old size, and new size. Returns a resized bitmap with:
/// - Height adjustment: Adds rows filled with default_char ('.') or removes rows
/// - Width adjustment: Pads rows with default_char or truncates them
#[tauri::command]
fn resize_bitmap(
    bitmap: Vec<String>,
    old_size: gtf::Size,
    new_size: gtf::Size,
) -> Result<Vec<String>, String> {
    // Validate inputs
    if new_size.width == 0 || new_size.height == 0 {
        return Err("New size dimensions must be greater than zero".to_string());
    }

    if old_size.width == 0 || old_size.height == 0 {
        return Err("Old size dimensions must be greater than zero".to_string());
    }

    // Default character for padding (always '.')
    const DEFAULT_CHAR: char = '.';

    let mut result = bitmap;

    // 1. Adjust Height
    let current_height = result.len() as u32;
    if new_size.height > current_height {
        // Add rows
        let row_to_add: String = std::iter::repeat(DEFAULT_CHAR)
            .take(new_size.width as usize)
            .collect();
        for _ in current_height..new_size.height {
            result.push(row_to_add.clone());
        }
    } else if new_size.height < current_height {
        // Remove rows
        result.truncate(new_size.height as usize);
    }

    // 2. Adjust Width (applied to the potentially height-adjusted bitmap)
    if new_size.width != old_size.width {
        result = result
            .into_iter()
            .map(|row| {
                let current_row = row.as_str();
                if new_size.width > old_size.width {
                    // Add padding
                    let current_width = current_row.chars().count();
                    let padding_needed = (new_size.width as usize).saturating_sub(current_width);
                    if padding_needed > 0 {
                        let padding: String = std::iter::repeat(DEFAULT_CHAR)
                            .take(padding_needed)
                            .collect();
                        format!("{}{}", current_row, padding)
                    } else {
                        current_row.to_string()
                    }
                } else {
                    // Truncate - take only the first new_size.width characters
                    current_row
                        .chars()
                        .take(new_size.width as usize)
                        .collect::<String>()
                }
            })
            .collect();
    }

    Ok(result)
}

/// Import a font file using the appropriate format importer.
/// The format is auto-detected from the file extension, or can be specified explicitly.
#[tauri::command]
fn import_font_file(path: String, format: Option<String>) -> Result<gtf::GtfDocument, String>
{
    let fmt = match format
    {
        Some(f) => f,
        None =>
        {
            // Auto-detect from file extension
            path.rsplit('.')
                .next()
                .unwrap_or("gtf")
                .to_string()
        }
    };
    importers::import_file(&path, &fmt)
}

/// Export a font document using the appropriate format exporter.
#[tauri::command]
fn export_font_file(
    path: String,
    format: String,
    document: gtf::GtfDocument,
) -> Result<(), String>
{
    exporters::export_file(&document, &path, &format)
}

/// Get info about all available importers (for UI display).
#[tauri::command]
fn get_importers() -> Vec<importers::ImporterInfo>
{
    importers::get_all_importer_info()
}

/// Get info about all available exporters (for UI display).
#[tauri::command]
fn get_exporters() -> Vec<exporters::ExporterInfo>
{
    exporters::get_all_exporter_info()
}

/// Save base64-encoded PNG data to a file path.
#[tauri::command]
fn save_png_file(path: String, base64_data: String) -> Result<(), String>
{
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&base64_data)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    fs::write(&path, &bytes)
        .map_err(|e| format!("Failed to write file '{}': {}", path, e))
}

/// Copy base64-encoded PNG data to the system clipboard as an image.
#[tauri::command]
fn copy_image_to_clipboard(base64_data: String) -> Result<(), String>
{
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&base64_data)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    // Decode PNG to raw RGBA pixels
    let img = image::load_from_memory_with_format(&bytes, image::ImageFormat::Png)
        .map_err(|e| format!("Failed to decode PNG image: {}", e))?;

    let rgba = img.to_rgba8();
    let (width, height) = rgba.dimensions();

    let img_data = arboard::ImageData
    {
        width: width as usize,
        height: height as usize,
        bytes: std::borrow::Cow::Owned(rgba.into_raw()),
    };

    let mut clipboard = arboard::Clipboard::new()
        .map_err(|e| format!("Failed to access clipboard: {}", e))?;

    clipboard.set_image(img_data)
        .map_err(|e| format!("Failed to copy image to clipboard: {}", e))
}

/// Copy text to the system clipboard.
#[tauri::command]
fn copy_text_to_clipboard(text: String) -> Result<(), String>
{
    let mut clipboard = arboard::Clipboard::new()
        .map_err(|e| format!("Failed to access clipboard: {}", e))?;

    clipboard.set_text(text)
        .map_err(|e| format!("Failed to copy text to clipboard: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run()
{
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        // Register command handlers
        .invoke_handler(tauri::generate_handler![
            load_gtf_file,
            save_gtf_file,
            resize_bitmap,
            import_font_file,
            export_font_file,
            get_importers,
            get_exporters,
            save_png_file,
            copy_image_to_clipboard,
            copy_text_to_clipboard
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
