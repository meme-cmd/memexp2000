import type { DialogId } from "@/store/dialog-store";

export interface IconData {
  id: DialogId;
  title: string;
  image: string;
}

export const ICONS: IconData[] = [
  {
    id: "AGENTS",
    title: "Agents",
    image: "/ai-technology.png",
  },
  {
    id: "BACKROOMS",
    title: "Backrooms",
    image: "/backroom.png",
  },
  {
    id: "USER",
    title: "User",
    image: "/user.png",
  },
];
