import { convertFileSrc } from "@tauri-apps/api/core";

export function getFileUrl(
    path:string
){
    if (/^\/media\/(stickers\/cat-[0-5]\.svg|gifs\/(reaction-[0-2]|commons-[0-9]+)\.gif)$/.test(path)) return path;
    return convertFileSrc(
        path
    );
}

// Было: С:/documents/encore067-messenger/attachments/image.png
// Теперь: asset://localhost/encore067-messenger/attachments/image.png
