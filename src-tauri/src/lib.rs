use std::fs;
use std::path::PathBuf;
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use sha2::{Digest, Sha256};

const APP_SALT: &[u8] = b"claude-code-settings-encryption-salt";

fn get_encryption_key() -> Result<[u8; 32], String> {
    let machine_id = machine_uid::get().map_err(|e| format!("Failed to get machine ID: {}", e))?;
    let mut hasher = Sha256::new();
    hasher.update(machine_id.as_bytes());
    hasher.update(APP_SALT);
    let result = hasher.finalize();
    let key: [u8; 32] = result.into();
    Ok(key)
}

fn encrypt_data(plaintext: &str) -> Result<String, String> {
    let key = get_encryption_key()?;
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| format!("Failed to create cipher: {}", e))?;

    // Generate a random nonce
    let nonce_bytes: [u8; 12] = rand::random();
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| format!("Encryption failed: {}", e))?;

    // Prepend nonce to ciphertext and encode as base64
    let mut combined = nonce_bytes.to_vec();
    combined.extend(ciphertext);
    Ok(base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &combined))
}

fn decrypt_data(ciphertext_b64: &str) -> Result<String, String> {
    let key = get_encryption_key()?;
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| format!("Failed to create cipher: {}", e))?;

    let combined = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, ciphertext_b64)
        .map_err(|e| format!("Base64 decode failed: {}", e))?;

    if combined.len() < 12 {
        return Err("Invalid ciphertext length".to_string());
    }

    let (nonce_bytes, ciphertext) = combined.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes.try_into().unwrap());

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("Decryption failed: {}", e))?;

    String::from_utf8(plaintext).map_err(|e| format!("Invalid UTF-8: {}", e))
}

#[tauri::command]
fn get_settings_path() -> Result<String, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    let path = home.join(".claude").join("settings.json");
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
fn read_settings() -> Result<String, String> {
    let path = get_settings_path()?;
    let content = fs::read_to_string(&path).map_err(|e| {
        if e.kind() == std::io::ErrorKind::NotFound {
            "Settings file not found".to_string()
        } else {
            format!("Failed to read settings: {}", e)
        }
    })?;
    Ok(content)
}

#[tauri::command]
fn write_settings(content: String) -> Result<(), String> {
    let path = get_settings_path()?;
    let parent = PathBuf::from(&path)
        .parent()
        .ok_or("Invalid path")?
        .to_path_buf();

    if !parent.exists() {
        fs::create_dir_all(&parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    fs::write(&path, content).map_err(|e| format!("Failed to write settings: {}", e))?;
    Ok(())
}

#[tauri::command]
fn encrypt(plaintext: String) -> Result<String, String> {
    encrypt_data(&plaintext)
}

#[tauri::command]
fn decrypt(ciphertext: String) -> Result<String, String> {
    decrypt_data(&ciphertext)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            get_settings_path,
            read_settings,
            write_settings,
            encrypt,
            decrypt
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
