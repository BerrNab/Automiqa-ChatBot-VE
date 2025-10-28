import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Language {
  code: string;
  name: string;
  rtl: boolean;
}

interface LanguageSwitcherProps {
  languages: Language[];
  currentLanguage: string;
  onLanguageChange: (languageCode: string) => void;
  primaryColor?: string;
  compact?: boolean;
}

export function LanguageSwitcher({
  languages,
  currentLanguage,
  onLanguageChange,
  primaryColor = "#3B82F6",
  compact = false,
}: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const currentLang = languages.find(lang => lang.code === currentLanguage) || languages[0];

  if (languages.length <= 1) {
    return null; // Don't show switcher if only one language
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "sm" : "default"}
          className={cn(
            "gap-2 transition-colors",
            compact && "h-8 px-2"
          )}
          style={{
            color: primaryColor,
          }}
        >
          <Globe className={cn(compact ? "w-4 h-4" : "w-5 h-5")} />
          {!compact && <span className="font-medium">{currentLang.name}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[150px]">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => {
              onLanguageChange(language.code);
              setIsOpen(false);
            }}
            className={cn(
              "flex items-center justify-between cursor-pointer",
              language.rtl && "flex-row-reverse"
            )}
          >
            <span className={language.rtl ? "text-right" : "text-left"}>
              {language.name}
            </span>
            {currentLanguage === language.code && (
              <Check className="w-4 h-4" style={{ color: primaryColor }} />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
