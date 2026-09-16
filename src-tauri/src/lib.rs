// Импорт типов, необходимых для migrations
use tauri_plugin_sql::{Migration, MigrationKind};
use tauri::Manager;
use std::time::{SystemTime, UNIX_EPOCH};

// Аннотация небходимая Tauri для мобильных платформ
// На Win она не мешает
#[cfg_attr(mobile, tauri::mobile_entry_point)]
#[tauri::command]
fn save_attachment(app: tauri::AppHandle, source: String) -> Result<String, String> {
    let app_dir = app.path().app_data_dir()
        .map_err(|e| e.to_string())?;
    let attachment_dir = app_dir.join("attachments");

    std::fs::create_dir_all(&attachment_dir)
        .map_err(|e| e.to_string())?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();
    let extension = std::path::Path::new(&source)
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("png");
    let file_name = format!("image_{timestamp}.{extension}");

    let destination = attachment_dir.join(&file_name);

    std::fs::copy(
        source,
        &destination
    )
        .map_err(|e| e.to_string())?;
    // Во фронтенд и SQLite отдаём только идентификатор вложения,
    // а не путь к файлу в операционной системе.
    Ok(file_name)
}

#[tauri::command]
fn read_attachment(app: tauri::AppHandle, attachment_id: String) -> Result<Vec<u8>, String> {
    let attachments_dir = app.path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("attachments")
        .canonicalize()
        .map_err(|e| e.to_string())?;
    let supplied_path = std::path::Path::new(&attachment_id);
    let attachment_path = if supplied_path.is_absolute() {
        // Поддержка ранее сохранённых сообщений, где был записан полный путь.
        supplied_path.to_path_buf()
    } else {
        attachments_dir.join(supplied_path)
    }
    .canonicalize()
    .map_err(|e| e.to_string())?;

    if !attachment_path.starts_with(&attachments_dir) {
        return Err("Файл находится вне папки вложений".to_string());
    }

    std::fs::read(attachment_path).map_err(|e| e.to_string())
}


// Главная функция для запуска приложения
pub fn run() {
    // Создание списка миграций
    let migrations = vec![
        // Описание первой миграции
        Migration {
            version: 1,

            description: "create_message_table",

            // Берем SQL запрос из нашего файла
            sql: include_str!("../migrations/0001_initial.sql"),

            // up означает, что база сдвинется вперед
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_chats",
            sql: include_str!("../migrations/0002_chats.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add_image_path_to_messages",
            sql: include_str!("../migrations/0003_add_image_path.sql"),
            kind: MigrationKind::Up,
        }
    ];

    // Создаем сбощик приложения Tauri
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            // Сборщик плагинов
            tauri_plugin_sql::Builder::default()
                // Связываем migrations с базой sql
                .add_migrations("sqlite:messenger.db", migrations)
                // Собираем плагины
                .build(),
        )
        .invoke_handler(tauri::generate_handler![save_attachment, read_attachment])
        // Создаем plugin opener
        .plugin(tauri_plugin_opener::init())
        // Запускаем приложение
        .run(tauri::generate_context!())
        // Если запуск завершился с ошибкой, то сообщем об этом
        .expect("Ошиюка при сборке приложения");
}
