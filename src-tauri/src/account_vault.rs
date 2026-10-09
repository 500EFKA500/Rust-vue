use tauri::Manager;

// DPAPI привязывает зашифрованные сессии к текущему пользователю Windows.
#[cfg(target_os = "windows")]
mod windows {
    #[repr(C)]
    struct Blob { size: u32, data: *mut u8 }

    #[link(name = "crypt32")]
    extern "system" {
        fn CryptProtectData(input: *const Blob, description: *const u16, entropy: *const Blob,
            reserved: *mut core::ffi::c_void, prompt: *mut core::ffi::c_void, flags: u32, output: *mut Blob) -> i32;
        fn CryptUnprotectData(input: *const Blob, description: *mut *mut u16, entropy: *const Blob,
            reserved: *mut core::ffi::c_void, prompt: *mut core::ffi::c_void, flags: u32, output: *mut Blob) -> i32;
    }
    #[link(name = "kernel32")]
    extern "system" { fn LocalFree(memory: *mut core::ffi::c_void) -> *mut core::ffi::c_void; }

    pub fn transform(bytes: &[u8], encrypt: bool) -> Result<Vec<u8>, String> {
        let input = Blob { size: bytes.len() as u32, data: bytes.as_ptr() as *mut u8 };
        let mut output = Blob { size: 0, data: std::ptr::null_mut() };
        unsafe {
            let ok = if encrypt {
                CryptProtectData(&input, std::ptr::null(), std::ptr::null(), std::ptr::null_mut(), std::ptr::null_mut(), 1, &mut output)
            } else {
                CryptUnprotectData(&input, std::ptr::null_mut(), std::ptr::null(), std::ptr::null_mut(), std::ptr::null_mut(), 1, &mut output)
            };
            if ok == 0 { return Err("Не удалось открыть защищённое хранилище Windows".into()); }
            let result = std::slice::from_raw_parts(output.data, output.size as usize).to_vec();
            LocalFree(output.data as *mut core::ffi::c_void);
            Ok(result)
        }
    }
}

#[cfg(all(test, target_os = "windows"))]
mod tests {
    #[test]
    fn protected_sessions_round_trip() {
        let plain = br#"{"accounts":[{"token":"test-session"}]}"#;
        let encrypted = super::windows::transform(plain, true).unwrap();
        assert_ne!(encrypted, plain);
        assert_eq!(super::windows::transform(&encrypted, false).unwrap(), plain);
        assert!(super::windows::transform(b"invalid vault", false).is_err());
    }
}

#[tauri::command]
pub fn load_account_vault(app: tauri::AppHandle) -> Result<String, String> {
    let path = app.path().app_data_dir().map_err(|e| e.to_string())?.join("accounts.enc");
    if !path.exists() { return Ok("null".into()); }
    let bytes = std::fs::read(path).map_err(|e| e.to_string())?;
    #[cfg(target_os = "windows")]
    { String::from_utf8(windows::transform(&bytes, false)?).map_err(|e| e.to_string()) }
    #[cfg(not(target_os = "windows"))]
    { let _ = bytes; Err("Защищённое сохранение аккаунтов пока поддерживается только на Windows".into()) }
}

#[tauri::command]
pub fn save_account_vault(app: tauri::AppHandle, value: String) -> Result<(), String> {
    if value.len() > 64 * 1024 { return Err("Слишком много аккаунтов".into()); }
    #[cfg(target_os = "windows")]
    {
        let bytes = windows::transform(value.as_bytes(), true)?;
        let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        let temporary = dir.join("accounts.enc.tmp");
        std::fs::write(&temporary, bytes).map_err(|e| e.to_string())?;
        std::fs::rename(temporary, dir.join("accounts.enc")).map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    { let _ = (app, value); Err("Защищённое сохранение аккаунтов пока поддерживается только на Windows".into()) }
}

#[tauri::command]
pub fn read_attachment(app: tauri::AppHandle, path: String) -> Result<String, String> {
    use base64::Engine;
    let root = app.path().app_data_dir().map_err(|e| e.to_string())?.join("attachments")
        .canonicalize().map_err(|e| e.to_string())?;
    let file = std::path::Path::new(&path).canonicalize().map_err(|e| e.to_string())?;
    if !file.starts_with(root) || !file.is_file() { return Err("Файл недоступен".into()); }
    if file.metadata().map_err(|e| e.to_string())?.len() > 8 * 1024 * 1024 { return Err("Файл больше 8 МБ".into()); }
    let mime = match file.extension().and_then(|e| e.to_str()).unwrap_or("") {
        "png" => "image/png", "jpg" | "jpeg" => "image/jpeg", "gif" => "image/gif", "webp" => "image/webp",
        _ => return Err("Неподдерживаемое изображение".into())
    };
    let data = std::fs::read(&file).map_err(|e| e.to_string())?;
    Ok(format!("data:{};base64,{}", mime, base64::engine::general_purpose::STANDARD.encode(data)))
}
