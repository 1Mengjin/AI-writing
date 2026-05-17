import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...lei: ClassValue[]) {
  return twMerge(clsx(lei));
}
