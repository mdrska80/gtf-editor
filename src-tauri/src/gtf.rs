use std::collections::HashMap;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Size {
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Palette {
    // Map character -> hex color string (e.g., '#' -> "#FFFFFF")
    pub entries: HashMap<char, String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Glyph {
    pub name: String, // Internal name (e.g., "Dot", "GlyphA")
    pub unicode: Option<String>, // e.g., "U+2022"
    pub char_repr: Option<char>, // e.g., Some('•') or None
    pub size: Option<Size>,
    pub palette: Option<Palette>, // None for monochrome glyphs
    pub bitmap: Vec<String>, // Vec of strings, each string is a row
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Default)]
pub struct GtfHeader {
    pub font_name: Option<String>,
    pub version: Option<String>,
    pub author: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Default)]
pub struct GtfDocument {
    pub header: GtfHeader,
    pub glyphs: Vec<Glyph>,
}

// --- Parsing Logic ---

enum ParseState {
    Searching,
    InHeader,
    InGlyphDefinition,
    InPalette,
    InBitmap,
}

pub fn parse_gtf_content(content: &str) -> Result<GtfDocument, String> {
    let mut document = GtfDocument::default();
    let mut current_state = ParseState::Searching;
    let mut current_glyph: Option<Glyph> = None;
    // TODO: Add variables to store current glyph name, expected bitmap lines etc.

    for line in content.lines() {
        let trimmed_line = line.trim();
        if trimmed_line.is_empty() {
            continue; // Skip empty lines
        }

        match current_state {
            ParseState::Searching => {
                if trimmed_line == "HEADER" {
                    current_state = ParseState::InHeader;
                } else if trimmed_line.starts_with("GLYPH ") {
                    // TODO: Extract glyph name
                    // TODO: Initialize current_glyph
                    current_state = ParseState::InGlyphDefinition;
                } else {
                    // Ignore lines outside known blocks for now
                }
            }
            ParseState::InHeader => {
                if trimmed_line == "END HEADER" {
                    current_state = ParseState::Searching;
                } else {
                    // TODO: Parse header key-value pairs (FONT, VERSION, etc.)
                    // Example: parse_header_line(trimmed_line, &mut document.header);
                }
            }
            ParseState::InGlyphDefinition => {
                if trimmed_line == "PALETTE" {
                    current_state = ParseState::InPalette;
                    // Initialize palette in current_glyph
                } else if is_start_of_bitmap(trimmed_line) { // Need a helper function
                    current_state = ParseState::InBitmap;
                    // TODO: Check if size is defined, start collecting bitmap lines
                } else if trimmed_line.starts_with("END GLYPH ") {
                   // TODO: Validate END GLYPH name
                   // TODO: Push completed current_glyph to document.glyphs
                   current_glyph = None;
                   current_state = ParseState::Searching;
                } else {
                    // TODO: Parse glyph metadata (UNICODE, CHAR, SIZE)
                    // Example: parse_glyph_meta_line(trimmed_line, current_glyph.as_mut().unwrap());
                }
            }
            ParseState::InPalette => {
                if is_start_of_bitmap(trimmed_line) { // Check if bitmap starts immediately after palette
                    current_state = ParseState::InBitmap;
                     // TODO: Check if size is defined, start collecting bitmap lines
                } else if trimmed_line.starts_with("END GLYPH ") { // Or if glyph ends immediately
                    // TODO: Validate END GLYPH name, push glyph, reset state
                    current_glyph = None;
                    current_state = ParseState::Searching;
                } else {
                   // TODO: Parse palette entry (char color)
                   // Example: parse_palette_line(trimmed_line, current_glyph.as_mut().unwrap().palette.as_mut().unwrap());
                }
            }
            ParseState::InBitmap => {
                 if trimmed_line.starts_with("END GLYPH ") {
                     // TODO: Check if expected number of bitmap lines received
                     // TODO: Validate END GLYPH name, push glyph, reset state
                     current_glyph = None;
                     current_state = ParseState::Searching;
                 } else {
                    // TODO: Add line to current_glyph bitmap
                 }
            }
        }
    }

    // TODO: Add final checks (e.g., was a glyph left unfinished?)

    Ok(document) // Return the (currently empty) document or an Err
}

// Helper function (example)
fn is_start_of_bitmap(line: &str) -> bool {
    // Simple check: does it look like bitmap data? (#, ., or other chars)
    // This needs refinement based on palette or monochrome status.
    !line.starts_with(char::is_uppercase) && !line.is_empty()
} 