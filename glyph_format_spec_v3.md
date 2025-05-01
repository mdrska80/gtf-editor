# Glyph Text Format (GTF) Specification

**Version:** 3.0
**Date:** 2024-08-16

## 1. Overview

This document specifies the Glyph Text Format (GTF) version 3.0, a human-readable, text-based format for storing bitmap glyphs (characters). It includes support for glyph metadata, monochrome and color bitmap data via palettes, and font-level information.

This version standardizes the palette optimization previously implemented in tools like `gtf-editor`.

## 2. Design Goals

-   **Readability:** The format should be easily understandable and editable by humans using a standard text editor.
-   **Parsability:** The format should be straightforward for software to parse and serialize reliably.
-   **Extensibility:** While defining core features, the key-value structure allows for potential future additions.
-   **Efficiency:** Minimize redundancy, particularly in palette definitions.

## 3. File Structure

A GTF file consists of exactly two sections in order:

1.  **Header:** Contains font metadata and the optional default color palette. Delimited by `HEADER` and `END HEADER`.
2.  **Glyph Definitions:** Contains one or more glyph definitions. Each glyph is delimited by `GLYPH <name>` and `END GLYPH <name>`.

A single blank line MUST follow the `END HEADER` line and each `END GLYPH` line.

## 4. Header Section

The header section begins with the keyword `HEADER` on its own line and ends with the keyword `END HEADER` on its own line.

It contains key-value pairs defining font properties. Keys are case-sensitive. The following keys are defined:

-   `FONT <name>`: (Optional) The human-readable name of the font.
-   `VERSION <version_string>`: (Optional) A string indicating the font's version.
-   `AUTHOR <author_name>`: (Optional) The name of the font's creator.
-   `DESCRIPTION <text>`: (Optional) A brief description of the font. Newlines in the value should be treated as spaces upon serialization.
-   `DEFAULT_SIZE <width>x<height>`: (Optional) Defines the default dimensions (positive integers) for newly created glyphs (e.g., `5x7`).

### 4.1. Default Palette Subsection

-   If present, this subsection begins with the keyword `DEFAULT_PALETTE` on its own line.
-   It MUST appear after all other header key-value pairs and before `END HEADER`.
-   It consists of one or more palette entry lines.
-   Each entry line defines a mapping from a single character to a color:
    `<char> <#hex_color>`
    -   `<char>`: A single printable ASCII or UTF-8 character used within bitmap data.
    -   `<#hex_color>`: The color represented as a 3-digit (`#RGB`) or 6-digit (`#RRGGBB`) hexadecimal string.
-   This palette defines the default color mappings for all glyphs in the font.
-   The `DEFAULT_PALETTE` subsection does **not** have its own `END` keyword; it is terminated by the `END HEADER` line.

**Example Header:**

```gtf
HEADER
FONT Example Mono
VERSION 1.0
AUTHOR Spec Writer
DEFAULT_SIZE 6x8
DEFAULT_PALETTE
  . #101010
  # #E0E0E0
  * #FF0000
END HEADER

```

## 5. Glyph Definition Section

Each glyph definition begins with `GLYPH <name>` on its own line and ends with `END GLYPH <name>` on its own line, where `<name>` is a unique identifier for the glyph within the file (case-sensitive, should not contain spaces).

Each glyph definition contains the following parts in order:

1.  **Glyph Metadata:** Key-value pairs describing the glyph.
2.  **Glyph Palette:** (Optional) An overriding palette for this specific glyph. Delimited by `PALETTE` and `END PALETTE`.
3.  **Bitmap Data:** (Optional, but required if `SIZE` is defined) The pixel data for the glyph. Delimited by `DATA` and `END DATA`.

### 5.1. Glyph Metadata

Key-value pairs appearing after `GLYPH <name>` and before `PALETTE` or `DATA`.

-   `UNICODE <codepoint>`: (Optional) The Unicode code point for the glyph (e.g., `U+0041`, `U+20AC`).
-   `CHAR <char>`: (Optional) The representative single character for the glyph (e.g., `A`, `€`). Useful for simple mapping and tools.
-   `SIZE <width>x<height>`: (Required if bitmap data is present) The dimensions of the glyph's bitmap (positive integers).

### 5.2. Glyph Palette Subsection

-   If present, this subsection begins with `PALETTE` on its own line and ends with `END PALETTE` on its own line.
-   It MUST appear after glyph metadata and before the `DATA` keyword.
-   It contains zero or more palette entry lines, following the same format as `DEFAULT_PALETTE` entries (`<char> <#hex_color>`).
-   **Semantic Meaning & Optimization:**
    -   Entries in the glyph `PALETTE` **override** entries with the same `<char>` in the `DEFAULT_PALETTE`.
    -   Characters used in the glyph's bitmap data should resolve their color by checking the glyph `PALETTE` first, and then the `DEFAULT_PALETTE` if not found.
    -   **Serialization:** To reduce redundancy, serializers (like `gtf-editor`) should only write entries to the glyph `PALETTE` section if:
        a.  The `<char>` is not present in the `DEFAULT_PALETTE`.
        b.  The `<char>` *is* present in the `DEFAULT_PALETTE`, but the `<#hex_color>` is different.
    -   Therefore, a glyph `PALETTE` section might be omitted entirely if the glyph uses only colors identical to the `DEFAULT_PALETTE`.
    -   **Parsing:** Parsers MUST correctly handle both optimized (omitted identical entries) and non-optimized (all entries present) glyph palettes.

### 5.3. Bitmap Data Section

-   If present, this section begins with `DATA` on its own line and ends with `END DATA` on its own line.
-   It MUST appear after glyph metadata and the optional `PALETTE` / `END PALETTE` block.
-   It MUST be present if `SIZE` metadata is defined.
-   It consists of exactly `<height>` lines of text.
-   Each line MUST contain exactly `<width>` characters.
-   Each character in the bitmap data should correspond to a `<char>` defined in either the glyph's `PALETTE` or the `DEFAULT_PALETTE` to be rendered correctly.

## 6. Comments and Blank Lines

-   Blank lines are ignored, except for the single required blank lines after `END HEADER` and `END GLYPH`.
-   Lines not matching any defined keywords or key-value patterns within the expected context may be ignored by parsers (no formal comment syntax is defined).

## 7. Example

```gtf
HEADER
FONT OptimizedExample
VERSION 3.0
DEFAULT_SIZE 3x3
DEFAULT_PALETTE
  . #000000
  # #FFFFFF
END HEADER

GLYPH Dot
CHAR .
SIZE 1x1
DATA
.
END DATA
END GLYPH Dot

GLYPH A_DefaultColor
UNICODE U+0041
CHAR A
SIZE 3x3
// No PALETTE block needed - uses default colors
DATA
.#.
###
.#.
END DATA
END GLYPH A_DefaultColor

GLYPH B_Override
CHAR B
SIZE 3x3
PALETTE
  # #FF0000 // Override default '#' color just for this glyph
END PALETTE
DATA
.#.
###
.#.
END DATA
END GLYPH B_Override

GLYPH C_NewColor
CHAR C
SIZE 3x3
PALETTE
  * #00FF00 // New color not in default palette
END PALETTE
DATA
.*.
.*.
***
END DATA
END GLYPH C_NewColor

```

## 8. Version History

-   **v3.0 (2024-08-16):** Formalized palette optimization (glyph palettes only store overrides/new entries). Restructured document.
-   **v2.0 (Initial):** Defined basic Header/Glyph structure with palettes and bitmap data. 