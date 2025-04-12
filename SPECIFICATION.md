# Technická Specifikace: GTF Editor

Tento dokument popisuje technickou specifikaci pro editor GTF souborů a slouží ke sledování implementačního stavu jednotlivých funkcionalit.

---

## 1. Cíl Aplikace

- [ ] Vytvořit desktopovou aplikaci pro snadné vytváření, otevírání, úpravu a ukládání souborů ve formátu GTF (Glyph Text Format) v2.

## 2. Technologie

- **Desktop Framework:** Tauri (Rust backend, Webview frontend)
- **Frontend Framework:** Vue.js 3 (Composition API)
- **Build Tool:** Vite
- **Jazyky:** Rust (pro Tauri backend/core logiku), JavaScript/TypeScript (pro Vue.js frontend), HTML, CSS
- **Styling:** Vuetify (UI Component Library)

## 3. Základní Funkcionalita

### 3.1. Správa Souborů
- [x] Otevření existujícího `.gtf` souboru pomocí systémového dialogu.
- [ ] Uložení aktuálně otevřeného souboru (přepsání).
- [x] Uložení jako nový `.gtf` soubor pomocí systémového dialogu.
- [ ] Vytvoření nového, prázdného GTF dokumentu.

### 3.2. Editace Hlavičky
- [x] Zobrazení polí `FONT`, `VERSION`, `AUTHOR`, `DESCRIPTION`.
- [ ] Možnost úpravy hodnot těchto polí.

### 3.3. Správa Glyphů
- [x] Zobrazení seznamu všech glyphů v souboru (např. podle `CHAR` nebo `GLYPH` názvu).
- [x] Možnost vybrat glyph ze seznamu pro detailní editaci.
- [ ] Přidání nového, prázdného glyphu do souboru.
- [ ] Odstranění vybraného glyphu.

### 3.4. Editace Glypha
- **Metadata:**
    - [x] Zobrazení a možnost úpravy polí `GLYPH` (název), `UNICODE`, `CHAR`, `SIZE` (zobrazení a editace hotovo, bez dopadu na bitmapu).
- **Paleta (pro barevné glyphy):**
    - [x] Zobrazení aktuální palety (znak a barva).
    - [x] Možnost přidat/odebrat/upravit barvu v paletě (včetně výběru barvy např. pomocí color pickeru) (bez color pickeru).
    - [x] Přepínání mezi monochromatickým a barevným režimem glyphu (přidání/odebrání sekce `PALETTE`).
- **Bitmapový Editor:**
    - [-] Vizuální zobrazení bitmapy glyphu jako mřížky (gridu) podle `SIZE` (zatím jen textový výpis).
    - [ ] Možnost "kreslit" do mřížky kliknutím myši:
        - [ ] V barevném režimu: Výběr "kreslícího" znaku z palety.
        - [ ] V monochromatickém režimu: Přepínání mezi `#` a `.`.
    - [ ] Aktualizace textové reprezentace bitmapy na základě kreslení.
    - [ ] Při změně `SIZE`: Přizpůsobení mřížky (s možností zachování/oříznutí obsahu).

### 3.5. Parsování a Serializace (Rust Backend)
- [x] Implementace logiky pro načtení (`parse`) `.gtf` souboru do interní datové struktury.
  - **Struktury:** `GtfDocument`, `GtfHeader`, `Glyph`, `Size`, `Palette` (v `gtf.rs`)
  - **Funkce:** `parse_gtf_content` (v `gtf.rs`) - hlavní parser využívající stavový automat a pomocné funkce.
  - **Pomocné funkce:** `parse_header_line`, `parse_glyph_meta_line`, `parse_palette_line`, `validate_end_glyph`, `validate_bitmap_line`, `Size::from_str` (v `gtf.rs`).
  - **Tauri Command:** `load_gtf_file` (v `lib.rs`) - načte soubor a zavolá parser.
- [x] Implementace logiky pro uložení (`serialize`) interní datové struktury zpět do validního `.gtf` formátu.
  - **Funkce:** `serialize_gtf_document` (v `gtf.rs`) - vytvoří textový GTF z `GtfDocument`.
  - **Tauri Command:** `save_gtf_file` (v `lib.rs`) - zavolá serializaci a zapíše do souboru.
- [x] Základní validace formátu při načítání a upozornění uživatele na chyby (implementováno v rámci `parse_gtf_content`).

### 3.6. Nástroje a Utility
- [x] Kontrola Znakové Sady Jazyka (Language Check Dialog):
    - [x] Dialog pro výběr jazyka (CZ, SK, RO, HU, EE + základní ASCII).
    - [x] Zobrazení požadovaných znaků pro vybraný jazyk.
    - [x] Vizuální odlišení existujících (zelené pozadí, fajfka) a chybějících (červené pozadí) glyphů podle `CHAR`.
    - [x] Možnost rychle přidat chybějící glyph kliknutím na tlačítko '+' vedle znaku.

## 4. Uživatelské Rozhraní (UI)
- [-] Jednoduché a intuitivní rozložení.
- [x] Panel pro editaci hlavičky (zobrazení dat).
- [x] Panel se seznamem glyphů (zobrazení a výběr).
- [-] Hlavní oblast pro editaci vybraného glyphu (metadata, paleta, bitmapa) (zobrazení metadat a palety hotovo).
- [ ] Vizuální zpětná vazba při akcích (ukládání, chyby parsování atd.).

## 5. Možná Budoucí Rozšíření (Mimo MVP)
- [ ] Funkce zpět/vpřed (Undo/Redo).
- [ ] Náhled textu renderovaného pomocí fontu.
- [ ] Import/Export do jiných formátů.
- [ ] Pokročilejší nástroje pro kreslení (výplň, čára...).
- [ ] Vyhledávání/filtrování glyphů.

--- 