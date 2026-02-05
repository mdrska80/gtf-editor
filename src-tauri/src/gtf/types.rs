use std::collections::HashMap;
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
    pub name: String,            // Internal name (e.g., "Dot", "GlyphA")
    pub unicode: Option<String>, // e.g., "U+2022"
    pub char_repr: Option<char>, // e.g., Some('•') or None
    pub size: Option<Size>,
    // Palette is always present, even if empty, for color-always mode
    pub palette: Option<Palette>, // Keep Option<> for parsing flexibility, but treat as always color
    pub bitmap: Vec<String>,      // Vec of strings, each string is a row
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

// Pomocná struktura pro parsování SIZE
impl FromStr for Size {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let parts: Vec<&str> = s.split('x').collect();
        if parts.len() != 2 {
            return Err(format!("Invalid SIZE format: '{}'. Expected 'WxH'.", s));
        }
        let width = parts[0]
            .parse::<u32>()
            .map_err(|e| format!("Invalid width: {}. {}", parts[0], e))?;
        let height = parts[1]
            .parse::<u32>()
            .map_err(|e| format!("Invalid height: {}. {}", parts[1], e))?;
        Ok(Size { width, height })
    }
}
