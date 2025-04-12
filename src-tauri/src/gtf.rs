use std::collections::HashMap;
use std::fmt::Write; // Required for writeln!
use std::str::FromStr; // Pro parsování čísel

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

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Default)]
pub struct Glyph {
    pub name: String, // Internal name (e.g., "Dot", "GlyphA")
    pub unicode: Option<String>, // e.g., "U+2022"
    pub char_repr: Option<char>, // e.g., Some('•') or None
    pub size: Option<Size>,
    pub palette: Option<Palette>, // None for monochrome glyphs
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
                    // Vytvoříme nový glyph s výchozími hodnotami
                    current_glyph = Some(Glyph {
                        name: name,
                        unicode: None,
                        char_repr: None,
                        size: None,
                        palette: None,
                        bitmap: Vec::new(),
                        validation_warnings: None, // Initialize warnings as None
                    });
                    bitmap_lines_collected = 0;
                    current_state = ParseState::InGlyphDefinition;
                } else {
                    // Ignorovat řádky mimo bloky (komentáře atd.)
                }
            }

            ParseState::InHeader => {
                if trimmed_line == "END HEADER" {
                    current_state = ParseState::Searching;
                } else {
                    parse_header_line(trimmed_line, &mut document.header)
                        .map_err(|e| format!("Line {}: {}", current_line_num, e))?;
                }
            }

            ParseState::InGlyphDefinition => {
                let glyph = current_glyph.as_mut().ok_or_else(|| format!("Line {}: Internal error: InGlyphDefinition state without a current glyph.", current_line_num))?;

                if trimmed_line == "PALETTE" {
                     if glyph.palette.is_some() {
                         return Err(format!("Line {}: Duplicate PALETTE definition for glyph '{}'.", current_line_num, glyph.name));
                     }
                     glyph.palette = Some(Palette { entries: HashMap::new() });
                     current_state = ParseState::InPalette;
                } else if trimmed_line.starts_with("END GLYPH ") {
                    validate_end_glyph(trimmed_line, current_glyph_name.as_deref())
                         .map_err(|e| format!("Line {}: {}", current_line_num, e))?;
                    // Pokud jsme zde, bitmapa nebyla nalezena, což je chyba, pokud byla očekávána size
                    if glyph.size.is_some() && glyph.bitmap.is_empty() {
                         return Err(format!("Line {}: END GLYPH found for '{}' but no bitmap data was provided (SIZE was defined).", current_line_num, glyph.name));
                    }
                    // Pokud size nebyla definována, je to OK (glyph bez vizuální reprezentace?)
                    document.glyphs.push(glyph.clone()); // Push clone
                    current_glyph = None;
                    current_glyph_name = None;
                    current_state = ParseState::Searching;
                } else if glyph.size.is_some() && !trimmed_line.contains(' ') { // Potenciální začátek bitmapy
                     // Potřebujeme zkontrolovat, jestli řádek odpovídá šířce
                     let expected_width = glyph.size.as_ref().unwrap().width as usize;
                     if trimmed_line.chars().count() != expected_width {
                          return Err(format!("Line {}: Bitmap line length ({}) does not match expected width ({}) for glyph '{}'.",
                                              current_line_num, trimmed_line.chars().count(), expected_width, glyph.name));
                     }
                     // Validate characters and collect warnings
                     validate_bitmap_line(trimmed_line, glyph, current_line_num);
                     glyph.bitmap.push(trimmed_line.to_string());
                     bitmap_lines_collected = 1;
                     current_state = ParseState::InBitmap;
                }
                 else {
                    // Předpokládáme metadata
                    parse_glyph_meta_line(trimmed_line, glyph)
                         .map_err(|e| format!("Line {}: {}", current_line_num, e))?;
                 }
            }
            ParseState::InPalette => {
                 let glyph = current_glyph.as_mut().ok_or_else(|| format!("Line {}: Internal error: InPalette state without a current glyph.", current_line_num))?;
                 let palette = glyph.palette.as_mut().ok_or_else(|| format!("Line {}: Internal error: InPalette state without a palette structure.", current_line_num))?;

                 if trimmed_line.starts_with("END GLYPH ") {
                     validate_end_glyph(trimmed_line, current_glyph_name.as_deref())
                          .map_err(|e| format!("Line {}: {}", current_line_num, e))?;
                     // Pokud jsme zde, bitmapa nebyla nalezena
                     if glyph.size.is_some() && glyph.bitmap.is_empty() {
                          return Err(format!("Line {}: END GLYPH found for '{}' but no bitmap data was provided after PALETTE.", current_line_num, glyph.name));
                     }
                     document.glyphs.push(glyph.clone());
                     current_glyph = None;
                     current_glyph_name = None;
                     current_state = ParseState::Searching;
                 } else if glyph.size.is_some() && !trimmed_line.contains(' ') { // Potenciální začátek bitmapy hned po paletě
                     let expected_width = glyph.size.as_ref().unwrap().width as usize;
                     if trimmed_line.chars().count() != expected_width {
                         return Err(format!("Line {}: Bitmap line length ({}) does not match expected width ({}) for glyph '{}'.",
                                             current_line_num, trimmed_line.chars().count(), expected_width, glyph.name));
                     }
                     // Validate characters and collect warnings
                     validate_bitmap_line(trimmed_line, glyph, current_line_num);
                     glyph.bitmap.push(trimmed_line.to_string());
                     bitmap_lines_collected = 1;
                     current_state = ParseState::InBitmap;
                 } else {
                     // Předpokládáme definici palety
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

                    if bitmap_lines_collected != expected_height {
                         return Err(format!("Line {}: Expected {} bitmap lines for glyph '{}' based on SIZE, but found {}.",
                                             current_line_num, expected_height, glyph.name, bitmap_lines_collected));
                    }

                    document.glyphs.push(glyph.clone());
                    current_glyph = None;
                    current_glyph_name = None;
                    current_state = ParseState::Searching;
                } else {
                    // Další řádek bitmapy
                    if bitmap_lines_collected >= expected_height {
                         return Err(format!("Line {}: Found more bitmap lines than expected ({}) for glyph '{}'.",
                                             current_line_num, expected_height, glyph.name));
                    }
                    if trimmed_line.chars().count() != expected_width {
                         return Err(format!("Line {}: Bitmap line length ({}) does not match expected width ({}) for glyph '{}'.",
                                             current_line_num, trimmed_line.chars().count(), expected_width, glyph.name));
                    }
                    // Validate characters and collect warnings
                    validate_bitmap_line(trimmed_line, glyph, current_line_num);
                    glyph.bitmap.push(trimmed_line.to_string());
                    bitmap_lines_collected += 1;
                    // Zůstáváme ve stavu InBitmap
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
    let value = parts[1].trim().to_string();

    match key {
        "FONT" => header.font_name = Some(value),
        "VERSION" => header.version = Some(value),
        "AUTHOR" => header.author = Some(value),
        "DESCRIPTION" => header.description = Some(value),
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
             if !value.starts_with("U+") { // Základní kontrola formátu
                 return Err(format!("Invalid UNICODE format: '{}'. Expected 'U+XXXX'.", value));
             }
             glyph.unicode = Some(value.to_string());
         }
         "CHAR" => {
             // Očekáváme jeden znak
             let chars: Vec<char> = value.chars().collect();
             if chars.len() != 1 {
                  return Err(format!("Invalid CHAR format: '{}'. Expected a single character.", value));
             }
             glyph.char_repr = Some(chars[0]);
         }
         "SIZE" => {
             let size = Size::from_str(value)?; // Použije naši implementaci FromStr
             glyph.size = Some(size);
         }
         _ => return Err(format!("Unknown glyph metadata key: '{}'", key)),
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

     if !color_part.starts_with('#') || !(color_part.len() == 7 || color_part.len() == 4) { // #RRGGBB nebo #RGB
         return Err(format!("Invalid palette color format: '{}'. Expected '#RRGGBB' or '#RGB'.", color_part));
     }
     // TODO: Možná přidat detailnější validaci hex barev

     if palette.entries.insert(palette_char, color_part.to_string()).is_some() {
          return Err(format!("Duplicate palette definition for character '{}'", palette_char));
     }

     Ok(())
}

fn validate_end_glyph(line: &str, expected_name: Option<&str>) -> Result<(), String> {
     let parts: Vec<&str> = line.splitn(3, ' ').collect(); // splitn 3 pro "END GLYPH name"
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

// Updated: Now collects warnings instead of returning Err for palette mismatches
fn validate_bitmap_line(line: &str, glyph: &mut Glyph, line_num: usize) {
    // Check if glyph is in color mode (has a palette)
    if let Some(palette) = &glyph.palette {
        // Color mode: Check each character against the palette
        for (char_index, char) in line.chars().enumerate() {
            if !palette.entries.contains_key(&char) {
                let warning = format!(
                    "Line {}: Invalid character '{}' at position {} in bitmap for glyph '{}'. Character not found in palette.",
                    line_num, char, char_index + 1, glyph.name
                );
                // Add warning to the glyph
                if glyph.validation_warnings.is_none() {
                    glyph.validation_warnings = Some(Vec::new());
                }
                glyph.validation_warnings.as_mut().unwrap().push(warning);
                // Don't return Err, just record the warning
            }
        }
    } else {
        // Monochrome mode: Check if characters are '#' or '.'
        for (char_index, char) in line.chars().enumerate() {
            if char != '#' && char != '.' {
                 let warning = format!(
                     "Line {}: Invalid character '{}' at position {} in bitmap for monochrome glyph '{}'. Only '#' or '.' allowed.",
                     line_num, char, char_index + 1, glyph.name
                 );
                 // Also add this as a warning
                 if glyph.validation_warnings.is_none() {
                     glyph.validation_warnings = Some(Vec::new());
                 }
                 glyph.validation_warnings.as_mut().unwrap().push(warning);
            }
        }
    }
    // No return value needed (or implicitly returns ()) 
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
        // Description might be multi-line, but GTF v2 expects single line value
        // We'll replace newlines with spaces for safety, though ideally description is single line.
        let single_line_description = description.replace('\n', " ");
        writeln!(output, "DESCRIPTION {}", single_line_description).map_err(|e| e.to_string())?;
    }
    writeln!(output, "END HEADER").map_err(|e| e.to_string())?;
    writeln!(output).map_err(|e| e.to_string())?; // Blank line after header

    // --- Serialize Glyphs ---
    for glyph in &document.glyphs {
        writeln!(output, "GLYPH {}", glyph.name).map_err(|e| e.to_string())?;

        // Metadata
        if let Some(unicode) = &glyph.unicode {
            writeln!(output, "UNICODE {}", unicode).map_err(|e| e.to_string())?;
        }
        if let Some(char_repr) = glyph.char_repr {
            writeln!(output, "CHAR {}", char_repr).map_err(|e| e.to_string())?;
        }
        if let Some(size) = &glyph.size {
            writeln!(output, "SIZE {}x{}", size.width, size.height).map_err(|e| e.to_string())?;
        }

        // Palette (if present)
        if let Some(palette) = &glyph.palette {
            writeln!(output, "PALETTE").map_err(|e| e.to_string())?;
            // Sort entries by char for consistent output
            let mut sorted_entries: Vec<_> = palette.entries.iter().collect();
            sorted_entries.sort_by_key(|(k, _)| *k);
            for (char, color) in sorted_entries {
                writeln!(output, "{} {}", char, color).map_err(|e| e.to_string())?;
            }
            // No END PALETTE in GTF v2, bitmap follows directly
        }

        // Bitmap (if present and size is defined)
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