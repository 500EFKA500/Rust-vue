import { convertFileSrc } from "@tauri-apps/api/core";

export function getFileUrl(
    path:string
){
    return convertFileSrc(
        path
    );
}

// Было: С:/documents/encore067-messenger/attachments/image.png
// Теперь: asset://localhost/encore067-messenger/attachments/image.png