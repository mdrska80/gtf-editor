//! Handler functions for each `ParseState` variant.
//!
//! Each function processes a single non-empty line while in the given state
//! and mutates the shared `ParseContext` accordingly.

use crate::gtf::types::{Glyph, GtfDocument, Palette};

use super::helpers::{
    parse_glyph_meta_line, 
    parse_header_line, 
    parse_palette_line, 
    push_warning,
    validate_bitmap_line, 
    validate_end_glyph,
};

use super::{ParseContext, ParseState};

// ── Searching ────────────────────────────────────────────────────────────────

pub(super) fn handle_searching(
    ctx: &mut ParseContext,
    trimmed: &str,
    line_num: usize,
) -> Result<(), String>
{
    // format ma dve hlavni casti:
    // HEADER
    // FONT geebeeyay
    // VERSION 1.0
    // AUTHOR Martin Drška
    // DESCRIPTION Downloaded from here: https://opengameart.org/content/bitmap-font-pack
    // DEFAULT_SIZE 8x8
    // DEFAULT_PALETTE
    // # #FFFFFF
    // , #666666
    // . #000000
    // 1 #FFE707
    // 2 #FF972F
    // 3 #973f00
    // END HEADER
    if trimmed == "HEADER"
    {
        ctx.state = ParseState::InHeader;
        if ctx.document.header.default_palette.is_none()
        {
            ctx.document.header.default_palette = Some(Palette::default());
        }
    }

    // a potom sadu glyphu:
    //
    // GLYPH NewGlyph1
    // UNICODE U+0041
    // CHAR A
    // SIZE 8x8
    // PALETTE
    // # #FFFFFF
    // , #666666
    // . #000000
    // 1 #FFE707
    // 2 #FF972F
    // 3 #973f00
    // END PALETTE
    // DATA
    // ,,,,,,,.
    // ,321113,
    // ,21...1,
    // ,211111,
    // ,21,,,1,
    // ,21,.,1,
    // ,22,.,2,
    // ,,,,.,,,
    // END DATA
    // END GLYPH NewGlyph1    
    else if trimmed.starts_with("GLYPH ")
    {
        if ctx.current_glyph.is_some()
        {
            return Err(format!(
                "Line {}: Found new GLYPH start before previous one ended.",
                line_num
            ));
        }
        let parts: Vec<&str> = trimmed.splitn(2, ' ').collect();
        if parts.len() < 2 || parts[1].is_empty()
        {
            return Err(format!(
                "Line {}: Invalid GLYPH definition, missing name.",
                line_num
            ));
        }
        let name = parts[1].to_string();
        ctx.current_glyph_name = Some(name.clone());
        ctx.found_palette_block = false;
        ctx.current_glyph = Some(Glyph {
            name,
            palette: Some(Palette::default()),
            unicode: None,
            char_repr: None,
            size: None,
            bitmap: Vec::new(),
            validation_warnings: None,
        });
        ctx.bitmap_lines_collected = 0;
        ctx.state = ParseState::InGlyphDefinition;
    }
    Ok(())
}

// ── InHeader ─────────────────────────────────────────────────────────────────

pub(super) fn handle_in_header(
    ctx: &mut ParseContext,
    trimmed: &str,
    line_num: usize,
) -> Result<(), String>
{
    if trimmed == "DEFAULT_PALETTE"
    {
        if ctx.document.header.default_palette.is_none()
        {
            ctx.document.header.default_palette = Some(Palette::default());
        }
        ctx.state = ParseState::InDefaultPalette;
    }
    else if trimmed == "END HEADER"
    {
        ctx.state = ParseState::Searching;
    }
    else
    {
        parse_header_line(trimmed, &mut ctx.document.header)
            .map_err(|e| format!("Line {}: {}", line_num, e))?;
    }
    Ok(())
}

// ── InDefaultPalette ─────────────────────────────────────────────────────────

pub(super) fn handle_in_default_palette(
    ctx: &mut ParseContext,
    trimmed: &str,
    line_num: usize,
) -> Result<(), String>
{
    let def_palette = ctx
        .document
        .header
        .default_palette
        .as_mut()
        .ok_or_else(|| {
            format!(
                "Line {}: Internal error: InDefaultPalette state without default_palette initialized.",
                line_num
            )
        })?;

    if trimmed == "END HEADER"
    {
        ctx.state = ParseState::Searching;
    }
    else
    {
        parse_palette_line(trimmed, def_palette).map_err(|e| {
            format!(
                "Line {}: Error parsing default palette entry: {}",
                line_num, e
            )
        })?;
    }
    Ok(())
}

// ── InGlyphDefinition ────────────────────────────────────────────────────────

pub(super) fn handle_in_glyph_definition(
    ctx: &mut ParseContext,
    trimmed: &str,
    original_line: &str,
    line_num: usize,
) -> Result<(), String>
{
    let glyph = ctx.current_glyph.as_mut().ok_or_else(|| {
        format!(
            "Line {}: Internal error: InGlyphDefinition state without a current glyph.",
            line_num
        )
    })?;

    if trimmed == "PALETTE"
    {
        if ctx.found_palette_block
        {
            return Err(format!(
                "Line {}: Duplicate PALETTE definition for glyph '{}'.",
                line_num, glyph.name
            ));
        }
        ctx.found_palette_block = true;
        if glyph.palette.is_none()
        {
            glyph.palette = Some(Palette::default());
        }
        ctx.state = ParseState::InPalette;
    }
    else if trimmed.starts_with("END GLYPH ")
    {
        validate_end_glyph(trimmed, ctx.current_glyph_name.as_deref())
            .map_err(|e| format!("Line {}: {}", line_num, e))?;
        if glyph.size.is_some() && glyph.bitmap.is_empty()
        {
            return Err(format!(
                "Line {}: END GLYPH found for '{}' but no bitmap data was provided (SIZE was defined).",
                line_num, glyph.name
            ));
        }
        ctx.document.glyphs.push(glyph.clone());
        ctx.current_glyph = None;
        ctx.current_glyph_name = None;
        ctx.state = ParseState::Searching;
    }
    else if glyph.size.is_some() && !trimmed.contains(' ')
    {
        let expected_width = glyph.size.as_ref().unwrap().width as usize;
        if trimmed.chars().count() != expected_width
        {
            let warning_msg = format!(
                "Line {}: Bitmap line length ({}) does not match expected width ({}) for glyph '{}'. Loading as-is.",
                line_num, trimmed.chars().count(), expected_width, glyph.name
            );
            println!("Parser Warning: {}", warning_msg);
            push_warning(glyph, warning_msg);
        }

        validate_bitmap_line(trimmed, glyph, line_num);
        glyph.bitmap.push(trimmed.to_string());
        ctx.bitmap_lines_collected = 1;
        ctx.state = ParseState::InBitmap;
    }
    else
    {
        let line_to_parse = if original_line.trim_start().starts_with("CHAR")
        {
            original_line
        }
        else
        {
            trimmed
        };
        parse_glyph_meta_line(line_to_parse, glyph)
            .map_err(|e| format!("Line {}: {}", line_num, e))?;
    }
    Ok(())
}

// ── InPalette ────────────────────────────────────────────────────────────────

pub(super) fn handle_in_palette(
    ctx: &mut ParseContext,
    trimmed: &str,
    line_num: usize,
) -> Result<(), String>
{
    let glyph = ctx.current_glyph.as_mut().ok_or_else(|| {
        format!(
            "Line {}: Internal error: InPalette state without a current glyph.",
            line_num
        )
    })?;
    let palette = glyph.palette.as_mut().ok_or_else(|| {
        format!(
            "Line {}: Internal error: InPalette state without a palette structure.",
            line_num
        )
    })?;

    if trimmed == "END PALETTE"
    {
        if glyph.size.is_some()
        {
            ctx.state = ParseState::ExpectingDataKeyword;
        }
        else
        {
            ctx.state = ParseState::ExpectingEndGlyph;
        }
    }
    else
    {
        parse_palette_line(trimmed, palette).map_err(|e| {
            format!(
                "Line {}: Error parsing palette entry: {}",
                line_num, e
            )
        })?;
    }
    Ok(())
}

// ── InBitmap ─────────────────────────────────────────────────────────────────

pub(super) fn handle_in_bitmap(
    ctx: &mut ParseContext,
    trimmed: &str,
    line_num: usize,
) -> Result<(), String>
{
    let glyph = ctx.current_glyph.as_mut().ok_or_else(|| {
        format!(
            "Line {}: Internal error: InBitmap state without a current glyph.",
            line_num
        )
    })?;
    let (expected_width, expected_height) = match glyph.size.as_ref()
    {
        Some(size) => (size.width as usize, size.height),
        None =>
        {
            return Err(format!(
                "Line {}: Internal error: InBitmap state without size defined for glyph '{}'.",
                line_num, glyph.name
            ));
        }
    };

    if ctx.bitmap_lines_collected < expected_height
    {
        if trimmed.chars().count() != expected_width
        {
            let warning_msg = format!(
                "Line {}: Bitmap line length ({}) does not match expected width ({}) for glyph '{}'. Loading as-is.",
                line_num, trimmed.chars().count(), expected_width, glyph.name
            );
            println!("Parser Warning: {}", warning_msg);
            push_warning(glyph, warning_msg);
        }
        validate_bitmap_line(trimmed, glyph, line_num);
        glyph.bitmap.push(trimmed.to_string());
        ctx.bitmap_lines_collected += 1;
    }
    else
    {
        if trimmed == "END DATA"
        {
            ctx.state = ParseState::ExpectingEndGlyph;
        }
        else
        {
            let warning_msg = format!(
                "Line {}: Expected END DATA after {} bitmap lines for glyph '{}', found '{}'. Ignoring line.",
                line_num, expected_height, glyph.name, trimmed
            );
            println!("Parser Warning: {}", warning_msg);
            push_warning(glyph, warning_msg);
        }
    }
    Ok(())
}

// ── ExpectingDataKeyword ─────────────────────────────────────────────────────

pub(super) fn handle_expecting_data(
    ctx: &mut ParseContext,
    trimmed: &str,
    line_num: usize,
) -> Result<(), String>
{
    let glyph_name = ctx.current_glyph_name.as_deref().unwrap_or("Unknown");
    if trimmed == "DATA"
    {
        ctx.state = ParseState::InBitmap;
        ctx.bitmap_lines_collected = 0;
    }
    else
    {
        return Err(format!(
            "Line {}: Expected DATA keyword after palette for glyph '{}', found '{}'.",
            line_num, glyph_name, trimmed
        ));
    }
    Ok(())
}

// ── ExpectingEndGlyph ────────────────────────────────────────────────────────

pub(super) fn handle_expecting_end_glyph(
    ctx: &mut ParseContext,
    trimmed: &str,
    line_num: usize,
) -> Result<(), String>
{
    let glyph = ctx.current_glyph.as_ref().ok_or_else(|| {
        format!(
            "Line {}: Internal error: Reached ExpectingEndGlyph without a current glyph.",
            line_num
        )
    })?;
    if trimmed.starts_with("END GLYPH ")
    {
        validate_end_glyph(trimmed, ctx.current_glyph_name.as_deref())?;
        ctx.document.glyphs.push(glyph.clone());
        ctx.current_glyph = None;
        ctx.current_glyph_name = None;
        ctx.state = ParseState::Searching;
    }
    else
    {
        return Err(format!(
            "Line {}: Expected END GLYPH for glyph '{}', found '{}'.",
            line_num, glyph.name, trimmed
        ));
    }
    Ok(())
}

// ── Finalize (EOF handling) ──────────────────────────────────────────────────

pub(super) fn finalize(mut ctx: ParseContext) -> Result<GtfDocument, String>
{
    if ctx.state == ParseState::InBitmap
    {
        if let Some(mut glyph) = ctx.current_glyph
        {
            let expected_height = glyph.size.as_ref().map_or(0, |s| s.height);
            let warning_msg = format!(
                "Parsing ended while in bitmap section for glyph '{}'. Expected {} lines, found {}. Missing END DATA or END GLYPH?",
                glyph.name, expected_height, ctx.bitmap_lines_collected
            );
            println!("Parser Warning: {}", warning_msg);
            push_warning(&mut glyph, warning_msg);
            ctx.document.glyphs.push(glyph);
        }
        else
        {
            return Err(
                "Parsing ended unexpectedly in InBitmap state without a current glyph.".to_string(),
            );
        }
    }
    else if ctx.state != ParseState::Searching
    {
        return Err(format!(
            "Parsing ended unexpectedly in state: {:?}. Missing END statement?",
            ctx.state
        ));
    }
    else if ctx.current_glyph.is_some()
    {
        return Err(format!(
            "Parsing ended but glyph '{}' was not properly closed with END GLYPH.",
            ctx.current_glyph_name.unwrap_or_default()
        ));
    }

    Ok(ctx.document)
}
