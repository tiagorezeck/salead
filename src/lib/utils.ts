import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatPhone(value: string) {
  if (!value) return "";
  
  // Remove tudo que não é dígito
  const digits = value.replace(/\D/g, "");
  
  // Se tiver o código do país (55), remove para formatar o local
  const cleanDigits = digits.startsWith("55") ? digits.substring(2) : digits;
  
  if (cleanDigits.length <= 10) {
    // Formato (xx) xxxx-xxxx
    return cleanDigits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  
  // Formato (xx) xxxxx-xxxx
  return cleanDigits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
}