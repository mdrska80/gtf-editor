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
            save_gtf_file // Add the new save command
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
