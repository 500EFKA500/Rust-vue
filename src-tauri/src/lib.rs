
// Импорт типов, необходимых для migrations
use tauri_plugin_sql::{Migration, MigrationKind};

use std::path::Path;

use std::time::{
    SystemTime,
    UNIX_EPOCH,
};

use tauri::Manager;
// Аннотация небходимая Tauri для мобильных платформ
// На Win она не мешает
#[cfg_attr(mobile, tauri::mobile_entry_point)]

#[tauri::command]
fn save_attachment(app: tauri::AppHandle, source: String) -> Result<String, String> {
    // app: tauri::AppHandle - получаем через него системные директории приложения

    // Создаём Path из строки
    let source_path = Path::new(&source);

    // Проверка - действительно ли такой файл существует
    if !source_path.is_file() {
        return Err(
            "Выбранный форман не существует"
                .to_string()
        );
    }
    // Получение расширения файла (у файла kirill.png - получим png)
    let extension = source_path.
        extension()
        // extension() возвращает специальный системный тип OsStr
        // Превращение его в обычный &str
        .and_then(
            |extension| extension.to_str()
        )
        // Привод расширения к нижнему регистру
        .map(
            |extension| extension.to_ascii_lowercase()
        )
        // Ошибка, если расширения нет вообще
        .ok_or_else(
            ||
                "У файла нет расширения"
                    .to_string()
        )?;

    let allowed_extensions = [
        "png",
        "jpg",
        "jpeg",
        "webp",
        "gif",
    ];

    // Проверка, находится ли расширение в списке разрешенных
    if !allowed_extensions
        .contains(
            &extension.as_str()
        )
    {
        return Err(
            "Этот формат изображения не поддерживается"
                .to_string()
        );
    }

    // Получаем системный путь до файла
    let app_data_dir =
        app
            .path()
            .app_data_dir()
            .map_err(
                |error|
                    error.to_string()
            )?;


    // Внутри app data создаётся: attachments
    let attachments_dir =
        app_data_dir
            .join("attachments");


    // Создание папку, если её ещё нет.
    std::fs::create_dir_all(
        &attachments_dir
    )
        .map_err(
            |error|
                error.to_string()
        )?;

    // Получение времени компьютера
    let timestamp =
        SystemTime::now()

            .duration_since(
                UNIX_EPOCH
            )
            .map_err(
                |error|
                    error.to_string()
            )?
            .as_nanos();

    // Подготовка имени файла
    let file_name =
    format!(
        "image_{}.{}",
        timestamp,
        extension,
    );

    // Создание полного пути назначения.
    let destination =
        attachments_dir
            .join(&file_name);

    // Копирование файла в папку копий
    std::fs::copy(
        source_path,
        &destination,
    )
        .map_err(
            |error|
                error.to_string()
        )?;

    // По умолчанию destination сейчас PathBuf но на фронтент дано вернуть string
    let saved_path =
        destination
            .to_str()

            // Если путь окажется не в UTF-8 - то это будет ошибка
            .ok_or_else(
                ||
                    "Не удалось преобразовать путь файла"
                        .to_string()
            )?

            .to_string();

    // Возврат итогового пути
    Ok(saved_path)
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
            description: "message_attachments",
            sql: include_str!("../migrations/0003_message_attachments.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "create_users_and_link_messages",
            sql: include_str!("../migrations/0004_users.sql"),
            kind: MigrationKind::Up,
        }
    ];

    // Создаем сбощик приложения Tauri
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        // Подключаем sql плагин
        .plugin(
            // Сборщик плагинов
            tauri_plugin_sql::Builder::default()
                // Связываем migrations с базой sql
                .add_migrations("sqlite:messenger.db", migrations)
                // Собираем плагины
                .build(),
        )
        // Создаем plugin opener
        .plugin(tauri_plugin_opener::init())
        // Запускаем приложение
        .invoke_handler(
            tauri::generate_handler![
                save_attachment
            ]
        )
        .run(tauri::generate_context!())
        // Если запуск завершился с ошибкой, то сообщем об этом
        .expect("Ошиюка при сборке приложения");
}
