// Ключевое слово export
// Разрешает другим файлам испортить его
export interface Message{
    id: number;
    author: string;
    body: string;
    image_path: string | null;
    created_at: string;
}
