// импоорт типов необходимых для migrations
use tauri_plugin_sql::{Migration, MigrationKind};

// аннотация необходимая tauri для мобильных платформ
#[cfg_attr(mobile, tauri::mobile_entry_point)]

// главная функция для запуска приложения
pub fn run() {
    // создание списков миграций
    let migrations = vec![
        // описание
        Migration {
            version: 1,
            description: "create_message_table",

            // берем sql запрос из файла
            sql: include_str!("../migrations/0001_initial.sql"),

            // up - база сдвинется вперед
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add_image_path_to_messages",
            sql: include_str!("../migrations/0002_add_image_path.sql"),
            kind: MigrationKind::Up,
        },
    ];

    // создаем сборщик приложения tauri
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_dialog::init()
        )
        .plugin(
            // сборщик плагинов
            tauri_plugin_sql::Builder::default()
                // связываем migrations c базой sql
                .add_migrations("sqlite:messanger.db", migrations)
                // собираем плагины
                .build(),
        )
        // создаем plugin opener
        .plugin(tauri_plugin_opener::init())
        // запускаем приложение
        .run(tauri::generate_context!())
        // если запуск с ошибкой, то сообщаем
        .expect("error while running tauri application");
}
