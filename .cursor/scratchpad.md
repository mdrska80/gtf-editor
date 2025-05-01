# GTF Editor Project Scratchpad

## Background and Motivation

- **Project Type:** Frontend application likely for editing GTF (Glyph/Font?) files.
- **Technology Stack:** Vue 3, Vite, Vuetify (UI library), Tauri (for potential desktop builds).
- **Initial Goal:** Understand the project structure, how to run it, and propose potential next steps or features.
- **Current State:** Basic understanding of the tech stack and how to run the development server (`npm run dev`) or Tauri app (`npm run tauri dev`) after `npm install`.

## Key Challenges and Analysis

- **Understanding GTF:** (Status: Done)
- **Tauri Integration:** (Confirmed: Tauri is used for file dialogs and backend Rust logic.)
- **UI Implementation:** **(Update: Core UI components (Header Editor, Glyph Editor, Palette Editor, Bitmap Grid, File Ops, Language Check, Glyph List/Preview) are implemented and functional.)**
- **State Management:** (Update: State managed in `App.vue` via `ref` and computed properties, passed down via props, updates handled via emitted events. Seems functional for current features.)
- **Incomplete Features:** **(Update: Based on user feedback and re-evaluation, all core features including Bitmap Resizing seem to be implemented. Focus shifts to refinements and new features.)**

## High-level Task Breakdown

1.  **Setup & Run:** Ensure the project can be installed (`npm install`) and run locally (`npm run dev`).
    - *Success Criteria:* The application loads successfully in the browser without errors.
2.  **Understand GTF Spec:** **(Done)**
    - *Success Criteria:* Be able to explain the basic structure and purpose of the GTF format. **(Achieved)**
3.  **Explore UI & Code:** **(Done - Re-analysis complete, confirming implementation status accurately)**
    - *Success Criteria:* Identify the main views/components and confirm implemented/missing features compared to `SPECIFICATION.md` and code analysis.
4.  **(Revised Again) Implement Missing Core Features:**
    a.  **Bitmap Resizing Logic:** Connect `SIZE` metadata changes (likely in `GlyphMetadataEditor.vue` or `GlyphEditor.vue`) to update the bitmap data array (padding with '.' or cropping). This logic likely belongs in the `updateGlyphData` function within `App.vue` when the `field` is `size`. **(Update: User confirms this IS implemented.)**
5.  **(Refinement Task) Optimize Glyph Palette Serialization:** Modify Rust saving logic to omit glyph palette entries that are identical to the header's default palette.
    - *Success Criteria:* Saved GTF files are smaller and only contain overriding palette entries within glyphs.
6.  **(Optional/Future) Implement Advanced Features & Refinements:**
    *   **Activate Text Preview Bar:** Uncomment and ensure `GlyphPreviewBar.vue` works for rendering sample text.
    *   **Search/Filter Glyphs:** Add search functionality to the sidebar glyph list.
    *   **Import/Export:** Add options to import/export glyphs or fonts.
    *   **Advanced Drawing Tools:** Implement Fill, Line, etc. in `BitmapGrid.vue`.
    *   **Kerning/Spacing Editor:** Add UI and data structures for kerning.
    *   **Clipboard Support:** Copy/paste glyph bitmap data.
    *   **Theming/UI Customization:** More theme options.
    *   **Improved Language Check:** Add more languages or custom sets.
    *   Add tests (Unit/Integration for both frontend and backend).
    *   Implement remaining `SPECIFICATION.md` items if desired (e.g., color picker for PaletteEditor).

## Project Status Board

- [ ] Setup & Run
- [x] Understand GTF Spec
- [x] Explore UI & Code (Accurate)
- **Core Missing Features:**
    - [x] Implement New File Functionality **(Verified Implemented in `App.vue`)**
    - [x] Implement Add/Remove Glyphs **(Verified Implemented in `App.vue`)**
    - [x] Implement Header Editing Logic **(Verified Implemented via `HeaderEditor.vue` emitting to `App.vue`)**
    - [x] Implement Bitmap Resizing Logic **(Confirmed Implemented by User)**
- **Refinements & New Features:**
    - [ ] Optimize Glyph Palette Serialization (Current Task)
    - [ ] Activate Text Preview Bar
    - [ ] Implement Search/Filter Glyphs
    - [ ] Implement Undo/Redo
    - [ ] Implement Import/Export
    - [ ] Implement Advanced Drawing Tools
    - [ ] Implement Kerning/Spacing Editor
    - [ ] Implement Clipboard Support
    - [ ] Add Theming/UI Customization
    - [ ] Add Improved Language Check
    - [ ] Add Tests
    - [ ] Add Color Picker

## Executor's Feedback or Assistance Requests

- Starting task: Optimize Glyph Palette Serialization.

## Lessons

*(Learnings and reusable notes will be documented here)*
- GTF v2 is a text format with HEADER/GLYPH blocks. Specification files: `glyph_format_spec_v2.md`, `SPECIFICATION.md`.
- Core parsing/saving logic exists in Rust (`src-tauri/src/gtf.rs`, `src-tauri/src/lib.rs`) via `load_gtf_file` and `save_gtf_file` Tauri commands.
- Visual bitmap editor `BitmapGrid.vue` IS implemented.
- `SPECIFICATION.md` checklist is outdated. **(Crucial: Need to read component logic AND function calls like `updateGlyphData` in `App.vue` thoroughly.)**
- File Ops (Open, Save, Save As, New File) implemented in `App.vue` / `FileOperations.vue`.
- Add/Remove Glyphs implemented in `App.vue`.
- Header/Glyph Metadata/Palette editing logic implemented via component events handled in `App.vue`.
- Sidebar glyph list provides Character Map/Overview functionality with grouping and preview (`App.vue`, `GlyphPreview.vue`).
- Bitmap resizing logic IS implemented (User confirmed).
- **All core spec features seem implemented.** Focus is now on refinement/new features. 