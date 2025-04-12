# Glyph Text Format (GTF)

Tento dokument popisuje jednoduchý a čitelný textový formát pro ukládání znaků (glyphů) v bitmapové podobě, včetně barev a základních metadat. Formát je navržen tak, aby byl lidsky srozumitelný a snadno parsovatelný strojem.

---

## 🧩 Struktura souboru

Soubor se skládá ze dvou hlavních částí:

1. **Hlavička souboru** (`HEADER` ... `END HEADER`)
2. **Jedna nebo více definic glyphů** (`GLYPH` ... `END GLYPH`)

*Poznámka: Následující popis odpovídá GTF v2.*

---

## 🔖 Hlavička (Header)

- Začíná řádkem `HEADER`.
- Obsahuje klíč-hodnota páry pro metadata fontu:
  - `FONT <název>`: Název fontu.
  - `VERSION <verze>`: Verze fontu nebo formátu.
  - `AUTHOR <autor>`: Autor fontu.
  - `DESCRIPTION <popis>`: Volitelný popis fontu.
  - `DEFAULT_SIZE <šířka>x<výška>`: Definuje výchozí rozměr pro nově vytvořené glyphy (např. `5x7`).
- **Sekce Výchozí Palety (Default Palette):** (Volitelná)
  - Pokud je přítomna, začíná řádkem `DEFAULT_PALETTE`.
  - Obsahuje definice výchozích barev pro znaky:
    - `<znak> <#hex_barva>`
  - Tato paleta definuje výchozí barvy pro celý font. Glyphy mohou tuto paletu přepsat definicí vlastní `PALETTE` sekce.
  - *Neukončuje* se `END DEFAULT_PALETTE`.
- Končí řádkem `END HEADER`.
- Za `END HEADER` následuje jeden prázdný řádek.

---

## 🔤 Definice Glypha (Glyph)

- Každá definice začíná řádkem `GLYPH <název_glyphu>`.
  - `<název_glyphu>` je unikátní identifikátor glyphu v rámci souboru.
- Následují metadata glyphu (klíč-hodnota, volitelné kromě SIZE, pokud je bitmapa):
  - `UNICODE <hodnota>`: Unicode kódový bod (např. `U+0041`).
  - `CHAR <znak>`: Reprezentativní znak glyphu (např. `A`).
  - `SIZE <šířka>x<výška>`: Rozměry bitmapy glyphu (např. `5x7`). Povinné, pokud má glyph bitmapu.
- **Sekce Palety (Palette):** (Volitelná)
  - Pokud je přítomna, začíná řádkem `PALETTE`.
  - Obsahuje definice barev pro znaky použité v bitmapě *pro tento specifický glyph*.
  - Pokud je definována, kompletně přepisuje `DEFAULT_PALETTE` z hlavičky pro tento glyph.
  - Pokud sekce `PALETTE` chybí, glyph použije (implicitně nebo explicitně dle editoru) `DEFAULT_PALETTE` z hlavičky, pokud existuje.
- **Bitmapa (Bitmap):** (Povinná, pokud je definováno `SIZE`)
  - Následuje hned po metadatech nebo po sekci palety.
  - Skládá se z `<výška>` řádků.
  - Každý řádek má délku `<šířka>` znaků.
  - Pokud je definována neprázdná paleta (ať už glyphu nebo výchozí), všechny znaky v bitmapě by měly odpovídat znakům definovaným v příslušné paletě.
- Každá definice končí řádkem `END GLYPH <název_glyphu>`.
  - `<název_glyphu>` se musí shodovat s názvem na začátku definice.
- Za každým `END GLYPH` blokem následuje jeden prázdný řádek.

---

## 📝 Komentáře a Prázdné řádky

- Prázdné řádky jsou povoleny a ignorovány (s výjimkou povinných prázdných řádků po `END HEADER` a `END GLYPH`).
- Komentáře nejsou standardně definovány, parser je může ignorovat, pokud nezačínají jako validní klíčové slovo.

---

## 🧪 Příklad

```gtf
HEADER
FONT ExampleFont
VERSION 1.0
AUTHOR Gemini
DESCRIPTION Example file with default palette.
DEFAULT_SIZE 3x3
DEFAULT_PALETTE
  . #000000 // Black for '.'
  # #FFFFFF // White for '#'
  ? #FF00FF // Magenta for unknown/error?
END HEADER

GLYPH A // Uses default palette implicitly and default size
UNICODE U+0041
CHAR A
SIZE 3x3 // Explicit size (could be omitted if matching default)
.#.
###
.#.
END GLYPH A

GLYPH B // Overrides default palette, uses default size
UNICODE U+0042
CHAR B
SIZE 3x3 // Explicit size
PALETTE
  x #FF0000 // Red
  o #00FF00 // Green
xox
ooo
xox
END GLYPH B

```

---

## 🛠️ Related Tooling Notes

While not strictly part of the GTF format specification, tools exist to facilitate working with GTF files. For example, the `gtf-editor` application (for which this specification was initially developed) includes a utility to check if a font file contains glyphs for all required characters of specific languages (like Czech, Slovak, etc.). This utility primarily relies on comparing the defined `CHAR` metadata field of existing glyphs against predefined character sets for those languages, helping ensure language coverage.
