use crate::gtf::types::GtfDocument;
use serde::Serialize;
use std::sync::Mutex;

/// Toto je hlavní stav naší aplikace uložený v Rustu.
/// Používáme Mutex, protože k datům může přistupovat více vláken najednou (např. když přijde víc invoke příkazů).
/// Option v GtfDocument znamená: Buď máme otevřený soubor (Some), nebo ne (None).
pub struct AppState {
    pub document: Mutex<Option<GtfDocument>>,
    pub file_path: Mutex<Option<String>>,
    pub is_dirty: Mutex<bool>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            document: Mutex::new(None),
            file_path: Mutex::new(None),
            is_dirty: Mutex::new(false),
        }
    }
}

/// Pomocná struktura, kterou posíláme do frontendu, abychom mu řekli, co se děje.
#[derive(Serialize)]
pub struct StateInfo {
    pub has_document: bool,
    pub file_path: Option<String>,
    pub is_dirty: bool,
}
