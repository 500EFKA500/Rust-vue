// Ключевое слово export
// Разрешает другим файлам испортить его
export interface Message{
    id: number;
    chat_id: number;
    author_id: number;
    author_name: string;
    author_avatar: string | null;
    type: "text" | "image";
    body: string | null;
    attachment: string | null;
    created_at: string;
}