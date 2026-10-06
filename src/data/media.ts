import gifLibrary from "../assets/gif-library.json";
import type { MediaItem } from "../types/media";

// Названия нужны для поиска и доступности, на превью они не выводятся.
export const stickers: MediaItem[] = [
  { name: "Привет", path: "/media/stickers/cat-0.svg" },
  { name: "Любовь", path: "/media/stickers/cat-1.svg" },
  { name: "Круто", path: "/media/stickers/cat-2.svg" },
  { name: "Грусть", path: "/media/stickers/cat-3.svg" },
  { name: "Ура", path: "/media/stickers/cat-4.svg" },
  { name: "Вау", path: "/media/stickers/cat-5.svg" },
];

export const builtInGifs: MediaItem[] = [
  { name: "Гуляющий кот", path: "/media/gifs/reaction-0.gif" },
  { name: "Любовь", path: "/media/gifs/reaction-1.gif" },
  { name: "Спящий кот", path: "/media/gifs/reaction-2.gif" },
  ...gifLibrary,
];
