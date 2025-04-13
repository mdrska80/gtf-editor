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
  - Obsahuje definice barev `<znak> <#hex_barva>`.
  - Musí být ukončena řádkem `END PALETTE`.
- **Oddělovač Dat:**
  - Řádek `DATA` musí následovat po metadatech a případném bloku `PALETTE` / `END PALETTE`.
- **Bitmapa (Bitmap):**
  - Následuje hned po řádku `DATA`.
  - Skládá se z `<výška>` řádků, každý o délce `<šířka>` znaků.
  - Musí být ukončena řádkem `END DATA`.
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
VERSION 2.1
AUTHOR Gemini
DESCRIPTION Example file with default palette and END tags.
DEFAULT_SIZE 3x3
DEFAULT_PALETTE
  . #000000
  # #FFFFFF
END PALETTE // Optional for DEFAULT_PALETTE?
END HEADER

GLYPH A
UNICODE U+0041
CHAR A
SIZE 3x3
PALETTE
  . #000000
  # #FFFFFF
END PALETTE
DATA
.#.
###
.#.
END DATA
END GLYPH A

GLYPH B
CHAR B
SIZE 3x3
PALETTE
  x #FF0000
  o #00FF00
END PALETTE
DATA
...
.o.
...
END DATA
END GLYPH B

GLYPH Mono
SIZE 2x2
CHAR m
DATA
#.
.#
END DATA
END GLYPH Mono

```

---

## 🛠️ Related Tooling Notes

While not strictly part of the GTF format specification, tools exist to facilitate working with GTF files. For example, the `gtf-editor` application (for which this specification was initially developed) includes a utility to check if a font file contains glyphs for all required characters of specific languages (like Czech, Slovak, etc.). This utility primarily relies on comparing the defined `CHAR` metadata field of existing glyphs against predefined character sets for those languages, helping ensure language coverage.
