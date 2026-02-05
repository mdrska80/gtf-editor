use std::fmt::Write; // Required for writeln!

use super::types::{Glyph, GtfDocument};

// --- Serialization Logic ---

pub fn serialize_gtf_document(document: &GtfDocument) -> Result<String, String> {
    let mut output = String::new();

    // --- Serialize Header ---
    writeln!(output, "HEADER").map_err(|e| format!("Failed to write HEADER: {}", e))?;
    if let Some(name) = &document.header.font_name {
        writeln!(output, "FONT {}", name).map_err(|e| format!("Failed to write FONT: {}", e))?;
    }
    if let Some(version) = &document.header.version {
        writeln!(output, "VERSION {}", version)
            .map_err(|e| format!("Failed to write VERSION: {}", e))?;
    }
    if let Some(author) = &document.header.author {
        writeln!(output, "AUTHOR {}", author)
            .map_err(|e| format!("Failed to write AUTHOR: {}", e))?;
    }
    if let Some(description) = &document.header.description {
        let single_line_description = description.replace('\n', " ");
        writeln!(output, "DESCRIPTION {}", single_line_description)
            .map_err(|e| format!("Failed to write DESCRIPTION: {}", e))?;
    }

    // Serialize Default Size if present
    if let Some(size) = &document.header.default_size {
        writeln!(output, "DEFAULT_SIZE {}x{}", size.width, size.height)
            .map_err(|e| format!("Failed to write DEFAULT_SIZE: {}", e))?;
    }

    // Serialize Default Palette if present and not empty
    if let Some(def_palette) = &document.header.default_palette {
        if !def_palette.entries.is_empty() {
            writeln!(output, "DEFAULT_PALETTE")
                .map_err(|e| format!("Failed to write DEFAULT_PALETTE line: {}", e))?;
            let mut sorted_entries: Vec<_> = def_palette.entries.iter().collect();
            sorted_entries.sort_by_key(|(k, _)| *k);
            for (char, color) in sorted_entries {
                writeln!(output, "{} {}", char, color)
                    .map_err(|e| format!("Failed to write palette entry for '{}': {}", char, e))?;
            }
        }
    }

    writeln!(output, "END HEADER").map_err(|e| format!("Failed to write END HEADER: {}", e))?;
    writeln!(output).map_err(|e| format!("Failed to write blank line after header: {}", e))?;

    // --- Serialize Glyphs ---
    for glyph in &document.glyphs {
        serialize_glyph(&mut output, glyph)?;
    }

    Ok(output.trim_end().to_string()) // Return the final string, removing trailing newline
}

fn serialize_glyph(output: &mut String, glyph: &Glyph) -> Result<(), String> {
    writeln!(output, "GLYPH {}", glyph.name)
        .map_err(|e| format!("Failed to write GLYPH for '{}': {}", glyph.name, e))?;

    // Write Metadata
    if let Some(unicode) = &glyph.unicode {
        writeln!(output, "UNICODE {}", unicode)
            .map_err(|e| format!("Failed to write UNICODE for '{}': {}", glyph.name, e))?;
    }
    if let Some(char_repr) = glyph.char_repr {
        writeln!(output, "CHAR {}", char_repr)
            .map_err(|e| format!("Failed to write CHAR for '{}': {}", glyph.name, e))?;
    }
    if let Some(size) = &glyph.size {
        writeln!(output, "SIZE {}x{}", size.width, size.height)
            .map_err(|e| format!("Failed to write SIZE for '{}': {}", glyph.name, e))?;
    }

    // Write Palette Block (if entries exist)
    if let Some(palette) = &glyph.palette {
        if !palette.entries.is_empty() {
            writeln!(output, "PALETTE")
                .map_err(|e| format!("Failed to write PALETTE for '{}': {}", glyph.name, e))?;
            let mut sorted_entries: Vec<_> = palette.entries.iter().collect();
            sorted_entries.sort_by_key(|(k, _)| *k);
            for (char, color) in sorted_entries {
                writeln!(output, "{} {}", char, color).map_err(|e| {
                    format!("Failed to write palette entry for '{}': {}", glyph.name, e)
                })?;
            }
            // Write END PALETTE
            writeln!(output, "END PALETTE")
                .map_err(|e| format!("Failed to write END PALETTE for '{}': {}", glyph.name, e))?;
        }
    }

    // Write DATA section (if size is defined OR bitmap exists)
    let has_bitmap_data = !glyph.bitmap.is_empty();
    let has_size = glyph.size.is_some();

    if has_size || has_bitmap_data {
        // Write DATA keyword
        writeln!(output, "DATA")
            .map_err(|e| format!("Failed to write DATA for '{}': {}", glyph.name, e))?;

        // Write Bitmap lines (write what exists)
        for row in &glyph.bitmap {
            writeln!(output, "{}", row)
                .map_err(|e| format!("Failed to write bitmap line for '{}': {}", glyph.name, e))?;
        }

        // Write END DATA
        writeln!(output, "END DATA")
            .map_err(|e| format!("Failed to write END DATA for '{}': {}", glyph.name, e))?;
    }

    // Write END GLYPH
    writeln!(output, "END GLYPH {}", glyph.name)
        .map_err(|e| format!("Failed to write END GLYPH for '{}': {}", glyph.name, e))?;
    writeln!(output).map_err(|e| {
        format!(
            "Failed to write blank line after glyph '{}': {}",
            glyph.name, e
        )
    })?; // Blank line after each glyph block

    Ok(())
}
