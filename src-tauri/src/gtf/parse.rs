//! Parsing logic for the GTF text format.
//! Uses a small state machine to walk through HEADER/Glyph blocks
//! and collects warnings for lenient bitmap/palette issues.

use std::str::FromStr; // Pro parsování čísel

use super::types::{Glyph, GtfDocument, GtfHeader, Palette, Size};

// --- Parsing Logic ---

// Parser states for the top-level line scanner.
#[derive(Debug, PartialEq, Clone, Copy)]
enum ParseState {
    Searching,
    InHeader,
    InDefaultPalette,
    InGlyphDefinition,
    InPalette,
    ExpectingDataKeyword,
    InBitmap,
    ExpectingEndGlyph,
}

pub fn parse_gtf_content(content: &str) -> Result<GtfDocument, String> {
    // Main state machine over lines; creates GtfDocument or returns first hard error.
    let mut document = GtfDocument::default();
    let mut current_state = ParseState::Searching;
    let mut current_glyph: Option<Glyph> = None;
    let mut current_glyph_name: Option<String> = None; // Jméno aktuálně parsovaného glyphu
    let mut bitmap_lines_collected: u32 = 0; // Kolik řádků bitmapy jsme už načetli
    let mut found_palette_block = false; // Still useful to check for duplicate PALETTE lines

    for (line_num, line) in content.lines().enumerate() {
        let trimmed_line = line.trim();
        let current_line_num = line_num + 1; // Číslo řádku pro chybové hlášky (1-based)

        if trimmed_line.is_empty() {
            continue; // Skip empty lines
        }

        // --- Zpracování stavů ---
        match current_state {
            ParseState::Searching => {
                // Outside of any block: look for HEADER or GLYPH start.
                if trimmed_line == "HEADER" {
                    current_state = ParseState::InHeader;
                    // Ensure header struct exists (default should handle this, but safety)
                    if document.header.default_palette.is_none() {
                        document.header.default_palette = Some(Palette::default());
                    }
                } else if trimmed_line.starts_with("GLYPH ") {
                    if current_glyph.is_some() {
                        return Err(format!(
                            "Line {}: Found new GLYPH start before previous one ended.",
                            current_line_num
                        ));
                    }
                    let parts: Vec<&str> = trimmed_line.splitn(2, ' ').collect();
                    if parts.len() < 2 || parts[1].is_empty() {
                        return Err(format!(
                            "Line {}: Invalid GLYPH definition, missing name.",
                            current_line_num
                        ));
                    }
                    let name = parts[1].to_string();
                    current_glyph_name = Some(name.clone());
                    found_palette_block = false;
                    // Start a fresh glyph; palette is initialized but may remain empty.
                    current_glyph = Some(Glyph {
                        name: name,
                        palette: Some(Palette::default()),
                        unicode: None,
                        char_repr: None,
                        size: None,
                        bitmap: Vec::new(),
                        validation_warnings: None,
                    });
                    bitmap_lines_collected = 0;
                    current_state = ParseState::InGlyphDefinition;
                } else {
                    // Ignorovat řádky mimo bloky (komentáře atd.)
                }
            }

            ParseState::InHeader => {
                // Header accepts metadata keys and optional DEFAULT_PALETTE block.
                if trimmed_line == "DEFAULT_PALETTE" {
                    // Initialize default palette if somehow still None
                    if document.header.default_palette.is_none() {
                        document.header.default_palette = Some(Palette::default());
                    }
                    current_state = ParseState::InDefaultPalette;
                } else if trimmed_line == "END HEADER" {
                    current_state = ParseState::Searching;
                } else {
                    // Assume regular header metadata
                    parse_header_line(trimmed_line, &mut document.header)
                        .map_err(|e| format!("Line {}: {}", current_line_num, e))?;
                }
            }

            ParseState::InDefaultPalette => {
                // Get mutable ref to default palette (should exist due to checks above)
                let def_palette = document.header.default_palette.as_mut()
                    .ok_or_else(|| format!("Line {}: Internal error: InDefaultPalette state without default_palette initialized.", current_line_num))?;

                if trimmed_line == "END HEADER" {
                    // End of header section, also ends default palette
                    current_state = ParseState::Searching;
                } else {
                    // Assume it's a palette entry
                    parse_palette_line(trimmed_line, def_palette).map_err(|e| {
                        format!(
                            "Line {}: Error parsing default palette entry: {}",
                            current_line_num, e
                        )
                    })?;
                }
            }

            ParseState::InGlyphDefinition => {
                let glyph = current_glyph.as_mut().ok_or_else(|| {
                    format!(
                        "Line {}: Internal error: InGlyphDefinition state without a current glyph.",
                        current_line_num
                    )
                })?;

                if trimmed_line == "PALETTE" {
                    if found_palette_block {
                        return Err(format!(
                            "Line {}: Duplicate PALETTE definition for glyph '{}'.",
                            current_line_num, glyph.name
                        ));
                    }
                    found_palette_block = true;
                    if glyph.palette.is_none() {
                        glyph.palette = Some(Palette::default());
                    }
                    current_state = ParseState::InPalette;
                } else if trimmed_line.starts_with("END GLYPH ") {
                    validate_end_glyph(trimmed_line, current_glyph_name.as_deref())
                        .map_err(|e| format!("Line {}: {}", current_line_num, e))?;
                    if glyph.size.is_some() && glyph.bitmap.is_empty() {
                        return Err(format!("Line {}: END GLYPH found for '{}' but no bitmap data was provided (SIZE was defined).", current_line_num, glyph.name));
                    }
                    document.glyphs.push(glyph.clone());
                    current_glyph = None;
                    current_glyph_name = None;
                    current_state = ParseState::Searching;
                } else if glyph.size.is_some() && !trimmed_line.contains(' ') {
                    // If SIZE is already known and the line has no spaces, treat it as bitmap row.
                    let expected_width = glyph.size.as_ref().unwrap().width as usize;
                    if trimmed_line.chars().count() != expected_width {
                        let warning_msg = format!(
                            "Line {}: Bitmap line length ({}) does not match expected width ({}) for glyph '{}'. Loading as-is.",
                            current_line_num, trimmed_line.chars().count(), expected_width, glyph.name
                          );
                        println!("Parser Warning: {}", warning_msg);
                        if glyph.validation_warnings.is_none() {
                            glyph.validation_warnings = Some(Vec::new());
                        }
                        glyph
                            .validation_warnings
                            .as_mut()
                            .unwrap()
                            .push(warning_msg);
                    }

                    validate_bitmap_line(trimmed_line, glyph, current_line_num);
                    glyph.bitmap.push(trimmed_line.to_string());
                    bitmap_lines_collected = 1;
                    current_state = ParseState::InBitmap;
                } else {
                    // For CHAR lines, use original untrimmed line to preserve spaces
                    let line_to_parse = if line.trim_start().starts_with("CHAR") {
                        line
                    } else {
                        trimmed_line
                    };
                    let meta_result = parse_glyph_meta_line(line_to_parse, glyph);
                    if let Err(e) = meta_result {
                        return Err(format!("Line {}: {}", current_line_num, e));
                    }
                }
            }
            ParseState::InPalette => {
                let glyph = current_glyph.as_mut().ok_or_else(|| {
                    format!(
                        "Line {}: Internal error: InPalette state without a current glyph.",
                        current_line_num
                    )
                })?;
                let palette = glyph.palette.as_mut().ok_or_else(|| {
                    format!(
                        "Line {}: Internal error: InPalette state without a palette structure.",
                        current_line_num
                    )
                })?;

                if trimmed_line == "END PALETTE" {
                    // Found the end of the palette section
                    if glyph.size.is_some() {
                        // Expect DATA next since SIZE was defined
                        current_state = ParseState::ExpectingDataKeyword;
                    } else {
                        // No SIZE defined, so no bitmap expected. Expect END GLYPH next.
                        current_state = ParseState::ExpectingEndGlyph;
                    }
                } else {
                    // If not END PALETTE, assume it's a palette entry
                    parse_palette_line(trimmed_line, palette).map_err(|e| {
                        format!(
                            "Line {}: Error parsing palette entry: {}",
                            current_line_num, e
                        )
                    })?;
                    // Stay in InPalette state to collect more entries
                }
            }
            ParseState::InBitmap => {
                let glyph = current_glyph.as_mut().ok_or_else(|| {
                    format!(
                        "Line {}: Internal error: InBitmap state without a current glyph.",
                        current_line_num
                    )
                })?;
                let size = glyph.size.as_ref().ok_or_else(|| format!("Line {}: Internal error: InBitmap state without size defined for glyph '{}'.", current_line_num, glyph.name))?;
                let expected_height = size.height;

                // Logic based on lines collected vs expected
                if bitmap_lines_collected < expected_height {
                    // --- Still collecting expected lines ---
                    // Process line (lenient width check, add warning if needed)
                    let expected_width = size.width as usize;
                    if trimmed_line.chars().count() != expected_width {
                        let warning_msg = format!(
                            "Line {}: Bitmap line length ({}) does not match expected width ({}) for glyph '{}'. Loading as-is.",
                            current_line_num, trimmed_line.chars().count(), expected_width, glyph.name
                         );
                        println!("Parser Warning: {}", warning_msg);
                        if glyph.validation_warnings.is_none() {
                            glyph.validation_warnings = Some(Vec::new());
                        }
                        glyph
                            .validation_warnings
                            .as_mut()
                            .unwrap()
                            .push(warning_msg);
                    }
                    validate_bitmap_line(trimmed_line, glyph, current_line_num);
                    glyph.bitmap.push(trimmed_line.to_string());
                    bitmap_lines_collected += 1;
                    // Stay in InBitmap state
                } else {
                    // --- Already collected expected_height lines, or potentially more ---
                    // Now we should only find END DATA
                    if trimmed_line == "END DATA" {
                        current_state = ParseState::ExpectingEndGlyph;
                    } else {
                        // Didn't find END DATA where expected (or found yet another extra line)
                        let warning_msg = format!(
                            "Line {}: Expected END DATA after {} bitmap lines for glyph '{}', found '{}'. Ignoring line.",
                            current_line_num, expected_height, glyph.name, trimmed_line
                         );
                        println!("Parser Warning: {}", warning_msg);
                        if glyph.validation_warnings.is_none() {
                            glyph.validation_warnings = Some(Vec::new());
                        }
                        glyph
                            .validation_warnings
                            .as_mut()
                            .unwrap()
                            .push(warning_msg);
                        // IMPORTANT: Stay in InBitmap state, ignoring this line and hoping END DATA appears later.
                        // We intentionally DO NOT increment bitmap_lines_collected here,
                        // as we only count valid or warned *bitmap* lines.
                    }
                }
            }
            ParseState::ExpectingDataKeyword => {
                // We are expecting the DATA keyword here
                let glyph_name = current_glyph_name.as_deref().unwrap_or("Unknown"); // Use stored name for error
                if trimmed_line == "DATA" {
                    current_state = ParseState::InBitmap;
                    bitmap_lines_collected = 0; // Reset for this glyph
                } else {
                    return Err(format!(
                        "Line {}: Expected DATA keyword after palette for glyph '{}', found '{}'.",
                        current_line_num, glyph_name, trimmed_line
                    ));
                }
            }
            ParseState::ExpectingEndGlyph => {
                let glyph = current_glyph.as_ref().ok_or_else(|| format!("Line {}: Internal error: Reached ExpectingEndGlyph without a current glyph.", current_line_num))?;
                if trimmed_line.starts_with("END GLYPH ") {
                    validate_end_glyph(trimmed_line, current_glyph_name.as_deref())?;
                    document.glyphs.push(glyph.clone());
                    current_glyph = None;
                    current_glyph_name = None;
                    current_state = ParseState::Searching;
                } else {
                    // If we are expecting END GLYPH, anything else is an error.
                    return Err(format!(
                        "Line {}: Expected END GLYPH for glyph '{}', found '{}'.",
                        current_line_num, glyph.name, trimmed_line
                    ));
                }
            }
        } // konec match current_state
    } // konec for line

    // Final state check handles EOF in the middle of a block.
    if current_state == ParseState::InBitmap {
        if let Some(glyph) = current_glyph {
            let size = glyph.size.as_ref();
            let expected_height = size.map_or(0, |s| s.height);
            let warning_msg = format!(
                "Parsing ended while in bitmap section for glyph '{}'. Expected {} lines, found {}. Missing END DATA or END GLYPH?", 
                glyph.name, expected_height, bitmap_lines_collected
            );
            println!("Parser Warning: {}", warning_msg);
            // Decide whether to add the incomplete glyph with a warning
            let mut final_glyph = glyph.clone();
            if final_glyph.validation_warnings.is_none() {
                final_glyph.validation_warnings = Some(Vec::new());
            }
            final_glyph
                .validation_warnings
                .as_mut()
                .unwrap()
                .push(warning_msg);
            document.glyphs.push(final_glyph);
        } else {
            return Err(
                "Parsing ended unexpectedly in InBitmap state without a current glyph.".to_string(),
            );
        }
    } else if current_state != ParseState::Searching {
        return Err(format!(
            "Parsing ended unexpectedly in state: {:?}. Missing END statement?",
            current_state
        ));
    } else if current_glyph.is_some() {
        // Should be caught by previous check, but belt-and-suspenders
        return Err(format!(
            "Parsing ended but glyph '{}' was not properly closed with END GLYPH.",
            current_glyph_name.unwrap_or_default()
        ));
    }

    Ok(document)
}

// --- Pomocné parsovací funkce ---

fn parse_header_line(line: &str, header: &mut GtfHeader) -> Result<(), String> {
    let parts: Vec<&str> = line.splitn(2, ' ').collect();
    if parts.len() != 2 {
        return Err(format!(
            "Invalid header line format: '{}'. Expected 'KEY value'.",
            line
        ));
    }
    let key = parts[0];
    let value = parts[1].trim();

    match key {
        "FONT" => header.font_name = Some(value.to_string()),
        "VERSION" => header.version = Some(value.to_string()),
        "AUTHOR" => header.author = Some(value.to_string()),
        "DESCRIPTION" => header.description = Some(value.to_string()),
        "DEFAULT_SIZE" => {
            header.default_size = Some(Size::from_str(value)?); // Parse using FromStr
        }
        // Ignore DEFAULT_PALETTE keyword here, handled by state machine
        "DEFAULT_PALETTE" => {
            return Err(
                "DEFAULT_PALETTE keyword should not have a value on the same line.".to_string(),
            );
        }
        _ => return Err(format!("Unknown header key: '{}'", key)),
    }
    Ok(())
}

fn parse_glyph_meta_line(line: &str, glyph: &mut Glyph) -> Result<(), String> {
    // Special handling for CHAR lines before general parsing
    if line.starts_with("CHAR") {
        if line.len() < 5 {
            return Err(format!(
                "Invalid CHAR format: '{}'. Expected 'CHAR <character>' (missing character).",
                line
            ));
        } else if line.len() >= 5 && line.starts_with("CHAR ") {
            let char_value = &line[5..]; // Everything after "CHAR "

            if char_value.trim().is_empty() {
                // This is a space character (possibly with trailing whitespace)
                glyph.char_repr = Some(' ');
                return Ok(());
            } else {
                let chars: Vec<char> = char_value.chars().collect();
                if chars.len() != 1 {
                    return Err(format!("Invalid CHAR format: '{}'. Expected exactly one character after 'CHAR ', found {} characters.", line, chars.len()));
                }
                glyph.char_repr = Some(chars[0]);
                return Ok(());
            }
        } else {
            return Err(format!("Invalid CHAR format: '{}'. Expected 'CHAR <character>' (missing space after CHAR).", line));
        }
    }

    // General key-value parsing for other metadata
    let parts: Vec<&str> = line.splitn(2, ' ').collect();
    if parts.len() != 2 {
        return Err(format!(
            "Invalid glyph metadata line format: '{}'. Expected 'KEY value'.",
            line
        ));
    }
    let key = parts[0];

    match key {
        "UNICODE" => {
            let value = parts[1].trim();
            if !value.starts_with("U+") {
                return Err(format!(
                    "Invalid UNICODE format: '{}'. Expected 'U+XXXX'.",
                    value
                ));
            }
            glyph.unicode = Some(value.to_string());
        }
        "SIZE" => {
            let value = parts[1].trim();
            let size = Size::from_str(value)?;
            glyph.size = Some(size);
        }
        _ => return Err(format!("Unknown or invalid glyph metadata key: '{}'", key)),
    }
    Ok(())
}

fn parse_palette_line(line: &str, palette: &mut Palette) -> Result<(), String> {
    // Palette lines are strict: single character + hex color.
    let parts: Vec<&str> = line.split_whitespace().collect();
    if parts.len() != 2 {
        return Err(format!(
            "Invalid palette line format: '{}'. Expected 'char #HEXCOLOR'.",
            line
        ));
    }
    let char_part = parts[0];
    let color_part = parts[1];

    let chars: Vec<char> = char_part.chars().collect();
    if chars.len() != 1 {
        return Err(format!(
            "Invalid palette character definition: '{}'. Expected a single character.",
            char_part
        ));
    }
    let palette_char = chars[0];

    if !color_part.starts_with('#') || !(color_part.len() == 7 || color_part.len() == 4) {
        return Err(format!(
            "Invalid palette color format: '{}'. Expected '#RRGGBB' or '#RGB'.",
            color_part
        ));
    }

    if palette
        .entries
        .insert(palette_char, color_part.to_string())
        .is_some()
    {
        return Err(format!(
            "Duplicate palette definition for character '{}'",
            palette_char
        ));
    }

    Ok(())
}

fn validate_end_glyph(line: &str, expected_name: Option<&str>) -> Result<(), String> {
    let parts: Vec<&str> = line.splitn(3, ' ').collect();
    if parts.len() < 3 || parts[0] != "END" || parts[1] != "GLYPH" {
        return Err(format!("Invalid END GLYPH format: '{}'.", line));
    }
    let name = parts[2];
    if let Some(expected) = expected_name {
        if name != expected {
            return Err(format!(
                "END GLYPH name mismatch: Found '{}', expected '{}'.",
                name, expected
            ));
        }
    } else {
        return Err("Found END GLYPH outside of a glyph definition.".to_string());
    }
    Ok(())
}

fn validate_bitmap_line(line: &str, glyph: &mut Glyph, line_num: usize) {
    // Only validate against palette if we have palette data.
    if let Some(palette) = &glyph.palette {
        if !palette.entries.is_empty() {
            for (char_index, char) in line.chars().enumerate() {
                if !palette.entries.contains_key(&char) {
                    let warning = format!(
                        "Line {}: Invalid character '{}' at position {} in bitmap for glyph '{}'. Character not found in palette.",
                        line_num, char, char_index + 1, glyph.name
                    );
                    if glyph.validation_warnings.is_none() {
                        glyph.validation_warnings = Some(Vec::new());
                    }
                    glyph.validation_warnings.as_mut().unwrap().push(warning);
                }
            }
        } else {
            let warning = format!(
                "Line {}: Cannot validate bitmap characters for glyph '{}' because palette data is missing unexpectedly.",
                line_num, glyph.name
            );
            if glyph.validation_warnings.is_none() {
                glyph.validation_warnings = Some(Vec::new());
            }
            glyph.validation_warnings.as_mut().unwrap().push(warning);
        }
    } else {
        let warning = format!(
            "Line {}: Cannot validate bitmap characters for glyph '{}' because palette data is missing unexpectedly.",
            line_num, glyph.name
        );
        if glyph.validation_warnings.is_none() {
            glyph.validation_warnings = Some(Vec::new());
        }
        glyph.validation_warnings.as_mut().unwrap().push(warning);
    }
}
