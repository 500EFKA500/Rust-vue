// Импорт типов, необходимых для migrations
use tauri_plugin_sql::{Migration, MigrationKind};
use std::time::{SystemTime, UNIX_EPOCH};

// Аннотация небходимая Tauri для мобильных платформ
// На Win она не мешает
#[cfg_attr(mobile, tauri::mobile_entry_point)]
#[tauri::command]
fn save_attachment(source: String) -> Result<String, String> {
    let app_dir = std::env::current_dir() // Проверка где запущенно приложение
        .map_err(|e| e.to_string())?; // Функция возможностей ошибки (нет доступа)

    let attachment_dir = app_dir.join("attachment");
    // join - буквально создат к существующему пути до папки новую папку "atttachment"

    std::fs::create_dir_all(&attachment_dir)
        .map_err(|e| e.to_string())?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();
    let file_name = format!("image_{timestamp}.png");

    let destination = attachment_dir.join(&file_name);

    std::fs::copy(
        source,
        &destination
    )
        .map_err(|e| e.to_string())?;
    Ok(
        format!(
            "attachment '{}' successfully created"
            , file_name
        )
    )
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
        }
    ];

    // Создаем сбощик приложения Tauri
    tauri::Builder::default()
        .plugin(
            // Сборщик плагинов
            tauri_plugin_sql::Builder::default()
                // Связываем migrations с базой sql
                .add_migrations("sqlite:messenger.db", migrations)
                // Собираем плагины
                .build(),
        )
        .invoke_handler(tauri::generate_handler![save_attachment])
        // Создаем plugin opener
        .plugin(tauri_plugin_opener::init())
        // Запускаем приложение
        .run(tauri::generate_context!())
        // Если запуск завершился с ошибкой, то сообщем об этом
        .expect("Ошиюка при сборке приложения");
}
