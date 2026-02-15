use crate::gtf::types::GtfDocument;
use base64::Engine;
use serde::Deserialize;

pub mod departure_board;

#[derive(Debug, Deserialize)]
pub struct RenderRequest {
    pub display_width: u32,
    pub display_height: u32,
    pub pixel_scale: u32,
    pub show_grid: bool,
    pub show_header: bool,
    pub header_lines: Vec<HeaderLine>,
    pub show_footer: bool,
    pub footer_text: String,
    pub columns: Vec<ColumnDef>,
    pub rows: Vec<RenderRow>,
    pub gtf_data: GtfDocument,
}

#[derive(Debug, Deserialize)]
pub struct HeaderLine {
    pub text: String,
    pub color: String,
}

#[derive(Debug, Deserialize)]
pub struct ColumnDef {
    pub label: String,
    pub x: i32,
    pub width: i32,
    pub align: String, // "left", "center", "right"
    pub color: String,
}

#[derive(Debug, Deserialize)]
pub struct RenderRow {
    pub cells: Vec<String>,
}

#[tauri::command]
pub fn render_departure_board(request: RenderRequest) -> Result<String, String> {
    let png_bytes = departure_board::render_board(&request)?;
    Ok(base64::engine::general_purpose::STANDARD.encode(png_bytes))
}
