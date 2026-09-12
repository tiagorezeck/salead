import * as React from "react";
import { cn } from "@/lib/utils";
import { 
  maskPhoneInput, 
  validatePhone, 
  maskCPF, 
  validateCPF, 
  maskCNPJ, 
  validateCNPJ, 
  maskCEP, 
  validateCEP, 
  maskDateBR, 
  validateDateBR, 
  maskTime, 
  validateTime, 
  maskCurrencyInput, 
  validateEmail, 
  formatSKU 
} from "@/lib/validators";

export type MaskType = "phone" | "cpf" | "cnpj" | "cep" | "date" | "time" | "currency" | "email" | "sku" | "none";

export interface MaskedInputProps extends Omit<React.ComponentProps<"input">, "onChange"> {
  maskType?: MaskType;
  value: string;
  onChange: (value: string, isValid?: boolean) => void;
  showErrorMsg?: boolean;
  onValidationChange?: (isValid: boolean, errorMsg?: string) => void;
}

export const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ className, maskType = "none", value, onChange, showErrorMsg = true, onValidationChange, onBlur, ...props }, ref) => {
    const [error, setError] = React.useState<string | undefined>(undefined);

    const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      let masked = raw;
      let valid = true;
      let errMsg: string | undefined = undefined;

      switch (maskType) {
        case "phone":
          masked = maskPhoneInput(raw);
          if (masked.length > 0) {
            const res = validatePhone(masked);
            valid = res.isValid;
            errMsg = res.error;
          }
          break;

        case "cpf":
          masked = maskCPF(raw);
          if (masked.replace(/\D/g, "").length === 11) {
            const res = validateCPF(masked);
            valid = res.isValid;
            errMsg = res.error;
          } else if (masked.length > 0) {
            valid = false;
            errMsg = "CPF incompleto (exige 11 dígitos).";
          }
          break;

        case "cnpj":
          masked = maskCNPJ(raw);
          if (masked.replace(/\D/g, "").length === 14) {
            const res = validateCNPJ(masked);
            valid = res.isValid;
            errMsg = res.error;
          } else if (masked.length > 0) {
            valid = false;
            errMsg = "CNPJ incompleto (exige 14 dígitos).";
          }
          break;

        case "cep":
          masked = maskCEP(raw);
          if (masked.replace(/\D/g, "").length === 8) {
            const res = validateCEP(masked);
            valid = res.isValid;
            errMsg = res.error;
          } else if (masked.length > 0) {
            valid = false;
            errMsg = "CEP deve ter 8 dígitos.";
          }
          break;

        case "date":
          masked = maskDateBR(raw);
          if (masked.length === 10) {
            const res = validateDateBR(masked);
            valid = res.isValid;
            errMsg = res.error;
          } else if (masked.length > 0) {
            valid = false;
            errMsg = "Data incompleta (DD/MM/AAAA).";
          }
          break;

        case "time":
          masked = maskTime(raw);
          if (masked.length === 5) {
            const res = validateTime(masked);
            valid = res.isValid;
            errMsg = res.error;
          } else if (masked.length > 0) {
            valid = false;
            errMsg = "Hora incompleta (HH:MM).";
          }
          break;

        case "currency":
          masked = maskCurrencyInput(raw);
          break;

        case "email":
          masked = raw.trim().toLowerCase();
          if (masked.length > 0) {
            const res = validateEmail(masked);
            valid = res.isValid;
            errMsg = res.error;
          }
          break;

        case "sku":
          masked = formatSKU(raw);
          break;

        default:
          masked = raw;
          break;
      }

      setError(errMsg);
      if (onValidationChange) onValidationChange(valid, errMsg);
      onChange(masked, valid);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Re-valida ao perder o foco para garantir feedback claro
      if (value) {
        if (maskType === "phone") {
          const res = validatePhone(value);
          setError(res.isValid ? undefined : res.error);
        } else if (maskType === "cpf") {
          const res = validateCPF(value);
          setError(res.isValid ? undefined : res.error);
        } else if (maskType === "cnpj") {
          const res = validateCNPJ(value);
          setError(res.isValid ? undefined : res.error);
        } else if (maskType === "email") {
          const res = validateEmail(value);
          setError(res.isValid ? undefined : res.error);
        } else if (maskType === "date") {
          const res = validateDateBR(value);
          setError(res.isValid ? undefined : res.error);
        }
      }
      if (onBlur) onBlur(e);
    };

    return (
      <div className="w-full space-y-1">
        <input
          ref={ref}
          value={value || ""}
          onChange={handleValueChange}
          onBlur={handleBlur}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            error ? "border-rose-500 focus-visible:ring-rose-500" : "",
            className
          )}
          {...props}
        />
        {showErrorMsg && error && (
          <p className="text-[10px] font-bold text-rose-500 animate-in fade-in duration-150">
            ⚠️ {error}
          </p>
        )}
      </div>
    );
  }
);

MaskedInput.displayName = "MaskedInput";
