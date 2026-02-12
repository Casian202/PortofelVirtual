import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 

export function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) return "0,00";
  const num = Number(value);
  if (isNaN(num)) return "0,00";
  return num.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export const isIframe = window.self !== window.top;
