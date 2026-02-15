mod exporters;
mod gtf;
mod importers;
mod rendering;
mod state;
use base64::Engine;
use std::fs;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
// We remove the default greet function
// #[tauri::command]
// fn greet(name: &str) -> String {
//     format!("Hello, {}! You've been greeted from Rust!", name)
// }

/// Načte a zparsuje GTF soubor a uloží ho do globálního stavu Rustu.
#[tauri::command]
fn load_gtf_file(
    path: String,
    state: tauri::State<'_, state::AppState>,
) -> Result<gtf::GtfDocument, String> {
    // 1. Přečteme obsah souboru z disku
    let content = fs::read_to_string(&path)
        .map_err(|err| format!("Failed to read file '{}': {}", path, err))?;

    // 2. Zparsujeme text na GTF strukturu
    let doc = gtf::parse_gtf_content(&content)?;

    // 3. Uložíme dokument, cestu a resetujeme 'dirty' příznak v globálním stavu
    // lock() nám zajistí, že v tuhle chvíli s daty nepracuje jiný příkaz.
    *state.document.lock().unwrap() = Some(doc.clone());
    *state.file_path.lock().unwrap() = Some(path);
    *state.is_dirty.lock().unwrap() = false;

    // Vrátíme dokument frontendu pro první zobrazení
    Ok(doc)
}

/// Uloží aktuální dokument ze stavu na disk.
#[tauri::command]
fn save_gtf_file(
    path: Option<String>,
    state: tauri::State<'_, state::AppState>,
) -> Result<(), String> {
    // Získáme lock na dokument
    let doc_lock = state.document.lock().unwrap();
    let doc = doc_lock.as_ref().ok_or("No document loaded to save")?;

    // Určíme cestu (buď předaná, nebo ta z dřívějška)
    let final_path = match path {
        Some(p) => {
            *state.file_path.lock().unwrap() = Some(p.clone());
            p
        }
        None => state
            .file_path
            .lock()
            .unwrap()
            .clone()
            .ok_or("No path specified")?,
    };

    // Serializace do textu (GTF formát)
    let content = gtf::serialize_gtf_document(&doc)?;

    // Zápis na disk
    fs::write(&final_path, content)
        .map_err(|err| format!("Failed to write file '{}': {}", final_path, err))?;

    // Soubor je uložen, už není 'dirty'
    *state.is_dirty.lock().unwrap() = false;

    Ok(())
}

#[tauri::command]
fn get_current_document(
    state: tauri::State<'_, state::AppState>,
) -> Result<Option<gtf::GtfDocument>, String> {
    Ok(state.document.lock().unwrap().clone())
}

#[tauri::command]
fn init_new_document(state: tauri::State<'_, state::AppState>) -> Result<gtf::GtfDocument, String> {
    let new_doc = gtf::GtfDocument::default();
    *state.document.lock().unwrap() = Some(new_doc.clone());
    *state.file_path.lock().unwrap() = None;
    *state.is_dirty.lock().unwrap() = true; // Nový nesoubor je technicky 'dirty'
    Ok(new_doc)
}
/// Vrátí základní informace o stavu (jestli je dokument načten, cesta, is_dirty).
#[tauri::command]
fn get_state_info(state: tauri::State<'_, state::AppState>) -> state::StateInfo {
    state::StateInfo {
        has_document: state.document.lock().unwrap().is_some(),
        file_path: state.file_path.lock().unwrap().clone(),
        is_dirty: *state.is_dirty.lock().unwrap(),
    }
}

/// Aktualizuje (nebo přidá) konkrétní glyf v dokumentu.
#[tauri::command]
fn update_glyph(
    glyph_name: String,
    updated_glyph: gtf::types::Glyph,
    state: tauri::State<'_, state::AppState>,
) -> Result<(), String> {
    let mut doc_lock = state.document.lock().unwrap();
    let doc = doc_lock.as_mut().ok_or("No document loaded")?;

    if let Some(pos) = doc.glyphs.iter().position(|g| g.name == glyph_name) {
        doc.glyphs[pos] = updated_glyph;
    } else {
        // Pokud neexistuje pod starým jménem, prostě ho přidáme (např. u nového glyfu)
        doc.glyphs.push(updated_glyph);
    }
    *state.is_dirty.lock().unwrap() = true;
    Ok(())
}

/// Smaže glyf z dokumentu.
#[tauri::command]
fn remove_glyph(
    glyph_name: String,
    state: tauri::State<'_, state::AppState>,
) -> Result<(), String> {
    let mut doc_lock = state.document.lock().unwrap();
    let doc = doc_lock.as_mut().ok_or("No document loaded")?;

    if let Some(pos) = doc.glyphs.iter().position(|g| g.name == glyph_name) {
        doc.glyphs.remove(pos);
        *state.is_dirty.lock().unwrap() = true;
        Ok(())
    } else {
        Err(format!("Glyph '{}' not found", glyph_name))
    }
}

/// Změní jeden pixel v bitmapě konkrétního glyfu.
/// Ideální pro kreslení tužkou ve Vue.
#[tauri::command]
fn update_glyph_pixel(
    glyph_name: String,
    row: usize,
    col: usize,
    new_char: char,
    state: tauri::State<'_, state::AppState>,
) -> Result<(), String> {
    let mut doc_lock = state.document.lock().unwrap();
    let doc = doc_lock.as_mut().ok_or("No document loaded")?;

    if let Some(glyph) = doc.glyphs.iter_mut().find(|g| g.name == glyph_name) {
        if row < glyph.bitmap.len() {
            let row_str = &mut glyph.bitmap[row];
            if col < row_str.chars().count() {
                // V Rustu jsou stringy UTF-8, takže musíme opatrně měnit znak na pozici
                let mut chars: Vec<char> = row_str.chars().collect();
                chars[col] = new_char;
                *row_str = chars.into_iter().collect();

                *state.is_dirty.lock().unwrap() = true;
                return Ok(());
            }
        }
        Err("Pixel coordinates out of bounds".to_string())
    } else {
        Err(format!("Glyph '{}' not found", glyph_name))
    }
}

/// Aktualizuje hlavičku dokumentu ve stavu.
#[tauri::command]
fn update_header(
    new_header: gtf::types::GtfHeader,
    state: tauri::State<'_, state::AppState>,
) -> Result<(), String> {
    let mut doc_lock = state.document.lock().unwrap();
    let doc = doc_lock.as_mut().ok_or("No document loaded")?;

    doc.header = new_header;
    *state.is_dirty.lock().unwrap() = true;
    Ok(())
}

/// Aktualizuje globální paletu fontu ve stavu.
#[tauri::command]
fn update_default_palette(
    new_palette: gtf::types::Palette,
    state: tauri::State<'_, state::AppState>,
) -> Result<(), String> {
    let mut doc_lock = state.document.lock().unwrap();
    let doc = doc_lock.as_mut().ok_or("No document loaded")?;

    doc.header.default_palette = Some(new_palette);
    *state.is_dirty.lock().unwrap() = true;
    Ok(())
}

/// Resizes a bitmap to new dimensions.
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

/// Importuje font ze souboru, zparsuje ho a uloží do globálního stavu.
#[tauri::command]
fn import_font_file(
    path: String,
    format: Option<String>,
    state: tauri::State<'_, state::AppState>,
) -> Result<gtf::GtfDocument, String> {
    let fmt = match format {
        Some(f) => f,
        None => {
            // Auto-detekce podle přípony
            path.rsplit('.').next().unwrap_or("gtf").to_string()
        }
    };

    let doc = importers::import_file(&path, &fmt)?;

    // Synchronizace do stavu
    *state.document.lock().unwrap() = Some(doc.clone());
    *state.file_path.lock().unwrap() = Some(path);
    *state.is_dirty.lock().unwrap() = true; // Importovaný soubor považujeme za nový/změněný vůči gtf

    Ok(doc)
}

/// Exportuje aktuální dokument ze stavu do zvoleného formátu.
#[tauri::command]
fn export_font_file(
    path: String,
    format: String,
    state: tauri::State<'_, state::AppState>,
) -> Result<(), String> {
    let doc_lock = state.document.lock().unwrap();
    let doc = doc_lock.as_ref().ok_or("No document loaded to export")?;

    exporters::export_file(doc, &path, &format)
}

/// Get info about all available importers (for UI display).
#[tauri::command]
fn get_importers() -> Vec<importers::ImporterInfo> {
    importers::get_all_importer_info()
}

/// Get info about all available exporters (for UI display).
#[tauri::command]
fn get_exporters() -> Vec<exporters::ExporterInfo> {
    exporters::get_all_exporter_info()
}

/// Save base64-encoded PNG data to a file path.
#[tauri::command]
fn save_png_file(path: String, base64_data: String) -> Result<(), String> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&base64_data)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    fs::write(&path, &bytes).map_err(|e| format!("Failed to write file '{}': {}", path, e))
}

/// Copy base64-encoded PNG data to the system clipboard as an image.
#[tauri::command]
fn copy_image_to_clipboard(base64_data: String) -> Result<(), String> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&base64_data)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    // Decode PNG to raw RGBA pixels
    let img = image::load_from_memory_with_format(&bytes, image::ImageFormat::Png)
        .map_err(|e| format!("Failed to decode PNG image: {}", e))?;

    let rgba = img.to_rgba8();
    let (width, height) = rgba.dimensions();

    let img_data = arboard::ImageData {
        width: width as usize,
        height: height as usize,
        bytes: std::borrow::Cow::Owned(rgba.into_raw()),
    };

    let mut clipboard =
        arboard::Clipboard::new().map_err(|e| format!("Failed to access clipboard: {}", e))?;

    clipboard
        .set_image(img_data)
        .map_err(|e| format!("Failed to copy image to clipboard: {}", e))
}

/// Copy text to the system clipboard.
#[tauri::command]
fn copy_text_to_clipboard(text: String) -> Result<(), String> {
    let mut clipboard =
        arboard::Clipboard::new().map_err(|e| format!("Failed to access clipboard: {}", e))?;

    clipboard
        .set_text(text)
        .map_err(|e| format!("Failed to copy text to clipboard: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(state::AppState::new()) // Tímto říkáme Tauri, ať si AppState schová do paměti
        // Register command handlers
        .invoke_handler(tauri::generate_handler![
            load_gtf_file,
            save_gtf_file,
            init_new_document,
            get_current_document,
            get_state_info,
            update_glyph,
            remove_glyph,
            update_glyph_pixel,
            update_header,
            update_default_palette,
            resize_bitmap,
            import_font_file,
            export_font_file,
            get_importers,
            get_exporters,
            save_png_file,
            copy_image_to_clipboard,
            copy_text_to_clipboard,
            rendering::render_departure_board
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
