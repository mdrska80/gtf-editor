use std::collections::HashMap;
use std::fmt::Write; // Required for writeln!
use std::str::FromStr; // Pro parsování čísel

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Size {
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Default)]
pub struct Palette {
    // Map character -> hex color string (e.g., '#' -> "#FFFFFF")
    pub entries: HashMap<char, String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Default)]
pub struct Glyph {
    pub name: String, // Internal name (e.g., "Dot", "GlyphA")
    pub unicode: Option<String>, // e.g., "U+2022"
    pub char_repr: Option<char>, // e.g., Some('•') or None
    pub size: Option<Size>,
    // Palette is always present, even if empty, for color-always mode
    pub palette: Option<Palette>, // Keep Option<> for parsing flexibility, but treat as always color
    pub bitmap: Vec<String>, // Vec of strings, each string is a row
    #[serde(default)] // Ensure warnings field defaults if missing in JSON
    pub validation_warnings: Option<Vec<String>>, // Warnings found during parsing
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Default)]
pub struct GtfHeader {
    pub font_name: Option<String>,
    pub version: Option<String>,
    pub author: Option<String>,
    pub description: Option<String>,
    #[serde(default)] // Default if missing in JSON
    pub default_size: Option<Size>, // Optional default size for new glyphs
    #[serde(default)] // Default if missing in JSON
    pub default_palette: Option<Palette>, // Optional default palette for the font
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Default)]
pub struct GtfDocument {
    pub header: GtfHeader,
    pub glyphs: Vec<Glyph>,
}

// --- Parsing Logic ---

#[derive(Debug, PartialEq)] // Přidáme PartialEq pro snadnější porovnání
enum ParseState {
    Searching,
    InHeader,
    InDefaultPalette,
    InGlyphDefinition,
    InPalette,
    InBitmap,
}

// Pomocná struktura pro parsování SIZE
impl FromStr for Size {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let parts: Vec<&str> = s.split('x').collect();
        if parts.len() != 2 {
            return Err(format!("Invalid SIZE format: '{}'. Expected 'WxH'.", s));
        }
        let width = parts[0].parse::<u32>().map_err(|e| format!("Invalid width: {}. {}", parts[0], e))?;
        let height = parts[1].parse::<u32>().map_err(|e| format!("Invalid height: {}. {}", parts[1], e))?;
        Ok(Size { width, height })
    }
}


pub fn parse_gtf_content(content: &str) -> Result<GtfDocument, String> {
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
                if trimmed_line == "HEADER" {
                    current_state = ParseState::InHeader;
                    // Ensure header struct exists (default should handle this, but safety)
                    if document.header.default_palette.is_none() {
                        document.header.default_palette = Some(Palette::default());
                    }
                } else if trimmed_line.starts_with("GLYPH ") {
                    if current_glyph.is_some() {
                        return Err(format!("Line {}: Found new GLYPH start before previous one ended.", current_line_num));
                    }
                    let parts: Vec<&str> = trimmed_line.splitn(2, ' ').collect();
                    if parts.len() < 2 || parts[1].is_empty() {
                        return Err(format!("Line {}: Invalid GLYPH definition, missing name.", current_line_num));
                    }
                    let name = parts[1].to_string();
                    current_glyph_name = Some(name.clone());
                    found_palette_block = false;
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
                     parse_palette_line(trimmed_line, def_palette)
                         .map_err(|e| format!("Line {}: Error parsing default palette entry: {}", current_line_num, e))?;
                 }
            }

            ParseState::InGlyphDefinition => {
                let glyph = current_glyph.as_mut().ok_or_else(|| format!("Line {}: Internal error: InGlyphDefinition state without a current glyph.", current_line_num))?;

                if trimmed_line == "PALETTE" {
                     if found_palette_block {
                         return Err(format!("Line {}: Duplicate PALETTE definition for glyph '{}'.", current_line_num, glyph.name));
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
                          glyph.validation_warnings.as_mut().unwrap().push(warning_msg);
                     }
                     
                     validate_bitmap_line(trimmed_line, glyph, current_line_num);
                     glyph.bitmap.push(trimmed_line.to_string());
                     bitmap_lines_collected = 1;
                     current_state = ParseState::InBitmap;
                }
                 else {
                    let meta_result = parse_glyph_meta_line(trimmed_line, glyph);
                     if let Err(e) = meta_result {
                        return Err(format!("Line {}: {}", current_line_num, e));
                    } 
                 }
            }
            ParseState::InPalette => {
                 let glyph = current_glyph.as_mut().ok_or_else(|| format!("Line {}: Internal error: InPalette state without a current glyph.", current_line_num))?;
                 let palette = glyph.palette.as_mut().ok_or_else(|| format!("Line {}: Internal error: InPalette state without a palette structure.", current_line_num))?;

                 if trimmed_line.starts_with("END GLYPH ") {
                     validate_end_glyph(trimmed_line, current_glyph_name.as_deref())
                          .map_err(|e| format!("Line {}: {}", current_line_num, e))?;
                     if glyph.size.is_some() && glyph.bitmap.is_empty() {
                          return Err(format!("Line {}: END GLYPH found for '{}' but no bitmap data was provided after PALETTE.", current_line_num, glyph.name));
                     }
                     document.glyphs.push(glyph.clone());
                     current_glyph = None;
                     current_glyph_name = None;
                     current_state = ParseState::Searching;
                 } else if glyph.size.is_some() && !trimmed_line.contains(' ') {
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
                          glyph.validation_warnings.as_mut().unwrap().push(warning_msg);
                     }
                     
                     validate_bitmap_line(trimmed_line, glyph, current_line_num);
                     glyph.bitmap.push(trimmed_line.to_string());
                     bitmap_lines_collected = 1;
                     current_state = ParseState::InBitmap;
                 } else {
                     parse_palette_line(trimmed_line, palette)
                          .map_err(|e| format!("Line {}: {}", current_line_num, e))?;
                 }
            }
            ParseState::InBitmap => {
                let glyph = current_glyph.as_mut().ok_or_else(|| format!("Line {}: Internal error: InBitmap state without a current glyph.", current_line_num))?;
                let size = glyph.size.as_ref().ok_or_else(|| format!("Line {}: Internal error: InBitmap state without size defined for glyph '{}'.", current_line_num, glyph.name))?;
                let expected_height = size.height;
                let expected_width = size.width as usize;

                if trimmed_line.starts_with("END GLYPH ") {
                    validate_end_glyph(trimmed_line, current_glyph_name.as_deref())
                         .map_err(|e| format!("Line {}: {}", current_line_num, e))?;

                    if bitmap_lines_collected < expected_height {
                        // Add warning for too few lines
                        let warning_msg = format!(
                            "Line {}: Expected {} bitmap lines for glyph '{}' based on SIZE, but only found {}. Glyph might be incomplete.",
                            current_line_num, expected_height, glyph.name, bitmap_lines_collected
                        );
                        println!("Parser Warning: {}", warning_msg); // Log on backend

                        if glyph.validation_warnings.is_none() {
                            glyph.validation_warnings = Some(Vec::new());
                        }
                        // This unwrap is safe because we just checked/initialized
                        glyph.validation_warnings.as_mut().unwrap().push(warning_msg);
                        // Continue to add the glyph despite the warning
                    }
                    // If bitmap_lines_collected == expected_height, it's fine.
                    // If bitmap_lines_collected > expected_height, we already logged warnings and ignored extra lines,
                    // so we still add the glyph here with the lines we *did* collect (up to expected_height).

                    document.glyphs.push(glyph.clone());
                    current_glyph = None;
                    current_glyph_name = None;
                    current_state = ParseState::Searching;
                } else {
                    // --- MODIFIED Check: Warn instead of error for too many lines --- 
                    if bitmap_lines_collected >= expected_height {
                         // Don't error, add a warning instead
                         let warning_msg = format!(
                            "Line {}: Found more bitmap lines than expected ({}) for glyph '{}'. Extra line ignored.",
                            current_line_num, expected_height, glyph.name
                         );
                         println!("Parser Warning: {}", warning_msg); // Log on backend

                         if glyph.validation_warnings.is_none() {
                             glyph.validation_warnings = Some(Vec::new());
                         }
                         // This unwrap is safe because we just checked/initialized
                         glyph.validation_warnings.as_mut().unwrap().push(warning_msg);

                         // Skip processing this extra line for the bitmap itself
                         // Let the loop continue to find END GLYPH or next line
                         continue; // Skips the rest of this 'else' block iteration
                         // --- END MODIFIED Check --- 
                    }
                    
                    // This code now only runs if bitmap_lines_collected < expected_height
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
                          glyph.validation_warnings.as_mut().unwrap().push(warning_msg);
                    }
                    
                    validate_bitmap_line(trimmed_line, glyph, current_line_num);
                    glyph.bitmap.push(trimmed_line.to_string());
                    bitmap_lines_collected += 1;
                }
            }
        } // konec match current_state
    } // konec for line

    // Finální kontrola stavu
    if current_state != ParseState::Searching {
        return Err(format!("Parsing ended unexpectedly in state: {:?}. Missing END statement?", current_state));
    }
    if current_glyph.is_some() {
         return Err(format!("Parsing ended but glyph '{}' was not properly closed with END GLYPH.",
                            current_glyph_name.unwrap_or_default()));
    }

    Ok(document)
}

// --- Pomocné parsovací funkce ---

fn parse_header_line(line: &str, header: &mut GtfHeader) -> Result<(), String> {
    let parts: Vec<&str> = line.splitn(2, ' ').collect();
    if parts.len() != 2 {
        return Err(format!("Invalid header line format: '{}'. Expected 'KEY value'.", line));
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
              return Err("DEFAULT_PALETTE keyword should not have a value on the same line.".to_string());
         }
         _ => return Err(format!("Unknown header key: '{}'", key)),
     }
     Ok(())
}

fn parse_glyph_meta_line(line: &str, glyph: &mut Glyph) -> Result<(), String> {
     let parts: Vec<&str> = line.splitn(2, ' ').collect();
    if parts.len() != 2 {
        return Err(format!("Invalid glyph metadata line format: '{}'. Expected 'KEY value'.", line));
    }
    let key = parts[0];
    let value = parts[1].trim();

     match key {
         "UNICODE" => {
             if !value.starts_with("U+") {
                 return Err(format!("Invalid UNICODE format: '{}'. Expected 'U+XXXX'.", value));
             }
             glyph.unicode = Some(value.to_string());
         }
         "CHAR" => {
             let chars: Vec<char> = value.chars().collect();
             if chars.len() != 1 {
                  return Err(format!("Invalid CHAR format: '{}'. Expected a single character.", value));
             }
             glyph.char_repr = Some(chars[0]);
         }
         "SIZE" => {
             let size = Size::from_str(value)?;
             glyph.size = Some(size);
         }
         _ => return Err(format!("Unknown or invalid glyph metadata key: '{}'", key)),
     }
     Ok(())
}

fn parse_palette_line(line: &str, palette: &mut Palette) -> Result<(), String> {
    let parts: Vec<&str> = line.split_whitespace().collect();
     if parts.len() != 2 {
         return Err(format!("Invalid palette line format: '{}'. Expected 'char #HEXCOLOR'.", line));
     }
     let char_part = parts[0];
     let color_part = parts[1];

     let chars: Vec<char> = char_part.chars().collect();
     if chars.len() != 1 {
          return Err(format!("Invalid palette character definition: '{}'. Expected a single character.", char_part));
     }
     let palette_char = chars[0];

     if !color_part.starts_with('#') || !(color_part.len() == 7 || color_part.len() == 4) {
         return Err(format!("Invalid palette color format: '{}'. Expected '#RRGGBB' or '#RGB'.", color_part));
     }

     if palette.entries.insert(palette_char, color_part.to_string()).is_some() {
          return Err(format!("Duplicate palette definition for character '{}'", palette_char));
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
              return Err(format!("END GLYPH name mismatch: Found '{}', expected '{}'.", name, expected));
         }
     } else {
          return Err("Found END GLYPH outside of a glyph definition.".to_string());
     }
     Ok(())
}

fn validate_bitmap_line(line: &str, glyph: &mut Glyph, line_num: usize) {
    if let Some(palette) = &glyph.palette {
        if !palette.entries.is_empty() {
            for (char_index, char) in line.chars().enumerate() {
                if !palette.entries.contains_key(&char) {
                    let warning = format!(
                        "Line {}: Invalid character '{}' at position {} in bitmap for glyph '{}'. Character not found in palette.",
                        line_num, char, char_index + 1, glyph.name
                    );
                    if glyph.validation_warnings.is_none() { glyph.validation_warnings = Some(Vec::new()); }
                    glyph.validation_warnings.as_mut().unwrap().push(warning);
                }
            }
        } else {
            let warning = format!(
                "Line {}: Cannot validate bitmap characters for glyph '{}' because palette data is missing unexpectedly.",
                line_num, glyph.name
            );
            if glyph.validation_warnings.is_none() { glyph.validation_warnings = Some(Vec::new()); }
            glyph.validation_warnings.as_mut().unwrap().push(warning);
        }
    } else {
        let warning = format!(
            "Line {}: Cannot validate bitmap characters for glyph '{}' because palette data is missing unexpectedly.",
            line_num, glyph.name
        );
        if glyph.validation_warnings.is_none() { glyph.validation_warnings = Some(Vec::new()); }
        glyph.validation_warnings.as_mut().unwrap().push(warning);
    }
}

// --- Serialization Logic ---

pub fn serialize_gtf_document(document: &GtfDocument) -> Result<String, String> {
    let mut output = String::new();

    // --- Serialize Header ---
    writeln!(output, "HEADER").map_err(|e| e.to_string())?;
    if let Some(name) = &document.header.font_name {
        writeln!(output, "FONT {}", name).map_err(|e| e.to_string())?;
    }
    if let Some(version) = &document.header.version {
        writeln!(output, "VERSION {}", version).map_err(|e| e.to_string())?;
    }
    if let Some(author) = &document.header.author {
        writeln!(output, "AUTHOR {}", author).map_err(|e| e.to_string())?;
    }
    if let Some(description) = &document.header.description {
        let single_line_description = description.replace('\n', " ");
        writeln!(output, "DESCRIPTION {}", single_line_description).map_err(|e| e.to_string())?;
    }
    
    // Serialize Default Size if present
    if let Some(size) = &document.header.default_size {
        writeln!(output, "DEFAULT_SIZE {}x{}", size.width, size.height).map_err(|e| e.to_string())?;
    }

    // Serialize Default Palette if present and not empty
    if let Some(def_palette) = &document.header.default_palette {
        if !def_palette.entries.is_empty() {
             writeln!(output, "DEFAULT_PALETTE").map_err(|e| e.to_string())?;
             let mut sorted_entries: Vec<_> = def_palette.entries.iter().collect();
             sorted_entries.sort_by_key(|(k, _)| *k);
             for (char, color) in sorted_entries {
                 writeln!(output, "{} {}", char, color).map_err(|e| e.to_string())?;
             }
        }
    }

    writeln!(output, "END HEADER").map_err(|e| e.to_string())?;
    writeln!(output).map_err(|e| e.to_string())?; // Blank line after header

    // --- Serialize Glyphs ---
    for glyph in &document.glyphs {
        writeln!(output, "GLYPH {}", glyph.name).map_err(|e| e.to_string())?;

        if let Some(unicode) = &glyph.unicode {
            writeln!(output, "UNICODE {}", unicode).map_err(|e| e.to_string())?;
        }
        if let Some(char_repr) = glyph.char_repr {
            writeln!(output, "CHAR {}", char_repr).map_err(|e| e.to_string())?;
        }
        if let Some(size) = &glyph.size {
            writeln!(output, "SIZE {}x{}", size.width, size.height).map_err(|e| e.to_string())?;
        }

        if let Some(palette) = &glyph.palette {
            if !palette.entries.is_empty() {
                writeln!(output, "PALETTE").map_err(|e| e.to_string())?;
                let mut sorted_entries: Vec<_> = palette.entries.iter().collect();
                sorted_entries.sort_by_key(|(k, _)| *k);
                for (char, color) in sorted_entries {
                    writeln!(output, "{} {}", char, color).map_err(|e| e.to_string())?;
                }
            }
        }

        if glyph.size.is_some() && !glyph.bitmap.is_empty() {
            for row in &glyph.bitmap {
                writeln!(output, "{}", row).map_err(|e| e.to_string())?;
            }
        }

        writeln!(output, "END GLYPH {}", glyph.name).map_err(|e| e.to_string())?;
        writeln!(output).map_err(|e| e.to_string())?; // Blank line after each glyph block
    }

    Ok(output.trim_end().to_string()) // Return the final string, removing trailing newline
} 