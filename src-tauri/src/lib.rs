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
fn load_gtf_file(path: String) -> Result<gtf::GtfDocument, String> {
    // Read the file content
    let content = fs::read_to_string(&path)
        .map_err(|err| format!("Failed to read file '{}': {}", path, err))?;

    // Parse the content using our gtf module function
    gtf::parse_gtf_content(&content)
    // We could add more context to the error here if needed
    // .map_err(|parse_err| format!("Error parsing file '{}': {}", path, parse_err))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Import structs from our gtf module (even if unused for now)
    // use gtf::{GtfDocument, GtfHeader, Glyph, Size, Palette};

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        // Register our new command handler
        .invoke_handler(tauri::generate_handler![load_gtf_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
