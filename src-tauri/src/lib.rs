mod gtf;
use std::fs;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run()
{
    // Import structs from our gtf module (even if unused for now)
    // use gtf::{GtfDocument, GtfHeader, Glyph, Size, Palette};

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        // Register command handlers
        .invoke_handler(tauri::generate_handler![
            load_gtf_file, 
            save_gtf_file,
            resize_bitmap
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
