//! Low-level line parsers and validators used by the state handlers.

use std::str::FromStr;

use crate::gtf::types::{Glyph, GtfHeader, Palette, Size};

/// Append a validation warning to a glyph, initialising the vec if needed.
pub(super) fn push_warning(glyph: &mut Glyph, warning: String)
{
    glyph
        .validation_warnings
        .get_or_insert_with(Vec::new)
        .push(warning);
}

pub(super) fn parse_header_line(line: &str, header: &mut GtfHeader) -> Result<(), String>
{
    let parts: Vec<&str> = line.splitn(2, ' ').collect();
    if parts.len() != 2
    {
        return Err(format!(
            "Invalid header line format: '{}'. Expected 'KEY value'.",
            line
        ));
    }
    let key = parts[0];
    let value = parts[1].trim();

    match key
    {
        "FONT" => header.font_name = Some(value.to_string()),
        "VERSION" => header.version = Some(value.to_string()),
        "AUTHOR" => header.author = Some(value.to_string()),
        "DESCRIPTION" => header.description = Some(value.to_string()),
        "DEFAULT_SIZE" =>
        {
            header.default_size = Some(Size::from_str(value)?);
        }
        "DEFAULT_PALETTE" =>
        {
            return Err(
                "DEFAULT_PALETTE keyword should not have a value on the same line.".to_string(),
            );
        }
        _ => return Err(format!("Unknown header key: '{}'", key)),
    }
    Ok(())
}

pub(super) fn parse_glyph_meta_line(line: &str, glyph: &mut Glyph) -> Result<(), String>
{
    // CHAR lines need special handling to preserve space characters
    if line.starts_with("CHAR")
    {
        if line.len() < 5
        {
            return Err(format!(
                "Invalid CHAR format: '{}'. Expected 'CHAR <character>' (missing character).",
                line
            ));
        }
        else if line.len() >= 5 && line.starts_with("CHAR ")
        {
            let char_value = &line[5..];

            if char_value.trim().is_empty()
            {
                glyph.char_repr = Some(' ');
                return Ok(());
            }
            else
            {
                let chars: Vec<char> = char_value.chars().collect();
                if chars.len() != 1
                {
                    return Err(format!(
                        "Invalid CHAR format: '{}'. Expected exactly one character after 'CHAR ', found {} characters.",
                        line, chars.len()
                    ));
                }
                glyph.char_repr = Some(chars[0]);
                return Ok(());
            }
        }
        else
        {
            return Err(format!(
                "Invalid CHAR format: '{}'. Expected 'CHAR <character>' (missing space after CHAR).",
                line
            ));
        }
    }

    let parts: Vec<&str> = line.splitn(2, ' ').collect();
    if parts.len() != 2
    {
        return Err(format!(
            "Invalid glyph metadata line format: '{}'. Expected 'KEY value'.",
            line
        ));
    }
    let key = parts[0];

    match key
    {
        "UNICODE" =>
        {
            let value = parts[1].trim();
            if !value.starts_with("U+")
            {
                return Err(format!(
                    "Invalid UNICODE format: '{}'. Expected 'U+XXXX'.",
                    value
                ));
            }
            glyph.unicode = Some(value.to_string());
        }
        "SIZE" =>
        {
            let value = parts[1].trim();
            let size = Size::from_str(value)?;
            glyph.size = Some(size);
        }
        _ => return Err(format!("Unknown or invalid glyph metadata key: '{}'", key)),
    }
    Ok(())
}

pub(super) fn parse_palette_line(line: &str, palette: &mut Palette) -> Result<(), String>
{
    let parts: Vec<&str> = line.split_whitespace().collect();
    if parts.len() != 2
    {
        return Err(format!(
            "Invalid palette line format: '{}'. Expected 'char #HEXCOLOR'.",
            line
        ));
    }
    let char_part = parts[0];
    let color_part = parts[1];

    let chars: Vec<char> = char_part.chars().collect();
    if chars.len() != 1
    {
        return Err(format!(
            "Invalid palette character definition: '{}'. Expected a single character.",
            char_part
        ));
    }
    let palette_char = chars[0];

    if !color_part.starts_with('#') || !(color_part.len() == 7 || color_part.len() == 4)
    {
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

pub(super) fn validate_end_glyph(line: &str, expected_name: Option<&str>) -> Result<(), String>
{
    // Split the line into at most 3 parts using space as delimiter.
    // This helps extract the "END", "GLYPH", and the glyph name.
    //
    // splitn is a method that splits a string into a vector of substrings, based on a delimiter.
    // It takes two arguments:
    // - The first argument is the number of substrings to split the string into.
    // - The second argument is the delimiter to split the string on.
    // It returns a vector of substrings.
    // In this case, we are splitting the string into at most 3 substrings, based on the space delimiter.
    // The first substring is the "END" keyword, the second substring is the "GLYPH" keyword, and the third substring is the glyph name.
    // If the string does not contain at least 3 substrings, or if the first substring is not "END" or the second substring is not "GLYPH", we return an error.
    // If the glyph name does not match the expected name, we return an error.
    // 
    // collect is a method that collects the substrings into a vector.
    // It takes a vector of substrings and returns a vector.
    // In this case, we are collecting the substrings into a vector.
    // The vector is then stored in the parts variable.
    // The parts variable is a vector of substrings.
    // The first substring is the "END" keyword, the second substring is the "GLYPH" keyword, and the third substring is the glyph name.
    // If the string does not contain at least 3 substrings, or if the first substring is not "END" or the second substring is not "GLYPH", we return an error.
    // If the glyph name does not match the expected name, we return an error.
    let parts: Vec<&str> = line.splitn(3, ' ').collect();
    if parts.len() < 3 || parts[0] != "END" || parts[1] != "GLYPH"
    {
        return Err(format!("Invalid END GLYPH format: '{}'.", line));
    }
    let name = parts[2];
    if let Some(expected) = expected_name
    {
        if name != expected
        {
            return Err(format!(
                "END GLYPH name mismatch: Found '{}', expected '{}'.",
                name, expected
            ));
        }
    }
    else
    {
        return Err("Found END GLYPH outside of a glyph definition.".to_string());
    }
    Ok(())
}

pub(super) fn validate_bitmap_line(line: &str, glyph: &mut Glyph, line_num: usize)
{
    let warnings: Vec<String> = if let Some(palette) = &glyph.palette
    {
        if !palette.entries.is_empty()
        {
            line.chars()
                .enumerate()
                .filter(|(_, ch)| !palette.entries.contains_key(ch))
                .map(|(i, ch)|
                {
                    format!(
                        "Line {}: Invalid character '{}' at position {} in bitmap for glyph '{}'. Character not found in palette.",
                        line_num, ch, i + 1, glyph.name
                    )
                })
                .collect()
        }
        else
        {
            vec![format!(
                "Line {}: Cannot validate bitmap characters for glyph '{}' because palette data is missing unexpectedly.",
                line_num, glyph.name
            )]
        }
    }
    else
    {
        vec![format!(
            "Line {}: Cannot validate bitmap characters for glyph '{}' because palette data is missing unexpectedly.",
            line_num, glyph.name
        )]
    };

    for warning in warnings
    {
        push_warning(glyph, warning);
    }
}
