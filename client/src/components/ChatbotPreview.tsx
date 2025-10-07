import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatbotConfig } from "@shared/schema";

interface ChatbotPreviewProps {
  config: ChatbotConfig;
  companyName?: string;
  logoUrl?: string;
}

interface PreviewMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const WavePattern = ({ color = "#3B82F6", opacity = 0.1 }: { color?: string; opacity?: number }) => (
  <svg 
    className="absolute bottom-0 left-0 w-full" 
    viewBox="0 0 1200 120" 
    preserveAspectRatio="none"
    style={{ height: '40px', transform: 'translateY(1px)' }}
  >
    <path 
      d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" 
      fill={color}
      fillOpacity={opacity}
    />
  </svg>
);

const TypingIndicator = ({ color = "#3B82F6" }: { color?: string }) => (
  <div className="flex items-center gap-1">
    <span className="typing-dot" style={{ backgroundColor: color }}></span>
    <span className="typing-dot" style={{ backgroundColor: color }}></span>
    <span className="typing-dot" style={{ backgroundColor: color }}></span>
  </div>
);

export default function ChatbotPreview({ config, companyName = "Your Company", logoUrl }: ChatbotPreviewProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<PreviewMessage[]>([
    {
      id: "1",
      role: "assistant",
      content: config?.behavior?.welcomeMessage || "Hello! Welcome to our service. How can I help you today?",
    },
  ]);

  const primaryColor = config?.branding?.primaryColor || "#3B82F6";
  const secondaryColor = config?.branding?.secondaryColor || "#10B981";
  const chatWindowBgColor = config?.branding?.chatWindowBgColor || "#FFFFFF";
  const userMessageBgColor = config?.branding?.userMessageBgColor || primaryColor;
  const botMessageBgColor = config?.branding?.botMessageBgColor || "#F3F4F6";
  const thinkingDotsColor = config?.branding?.thinkingDotsColor || primaryColor;
  const sendButtonColor = config?.branding?.sendButtonColor || primaryColor;
  const theme = config?.widgetSettings?.designTheme || "modern";
  const backgroundImageUrl = config?.branding?.backgroundImageUrl;

  const isLightColor = (color: string): boolean => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155;
  };

  const getHeaderStyle = () => {
    const baseStyle: React.CSSProperties = {
      backgroundColor: primaryColor,
    };
    
    if (theme === 'sleek') {
      return {
        ...baseStyle,
        borderRadius: '0',
        borderBottom: 'none',
      };
    } else if (theme === 'soft') {
      return {
        ...baseStyle,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
      };
    } else if (theme === 'glass') {
      return {
        ...baseStyle,
        backgroundColor: `${primaryColor}15`,
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: `1px solid ${primaryColor}20`,
      };
    } else if (theme === 'minimal') {
      return {
        ...baseStyle,
        backgroundColor: 'white',
        color: primaryColor,
        borderBottom: `1px solid #e5e7eb`,
      };
    } else if (theme === 'elevated') {
      return {
        ...baseStyle,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      };
    }
    
    return baseStyle;
  };

  const getMessageStyle = (isUser: boolean): React.CSSProperties => {
    const bgColor = isUser ? userMessageBgColor : botMessageBgColor;
    const textColor = isLightColor(bgColor) ? '#000000' : '#ffffff';
    
    if (isUser) {
      if (theme === 'sleek') {
        return {
          backgroundColor: bgColor,
          color: textColor,
          borderRadius: '8px',
        };
      } else if (theme === 'soft') {
        return {
          backgroundColor: bgColor,
          color: textColor,
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.06)',
        };
      } else if (theme === 'glass') {
        return {
          backgroundColor: `${bgColor}90`,
          backdropFilter: 'blur(12px) saturate(180%)',
          WebkitBackdropFilter: 'blur(12px) saturate(180%)',
          color: textColor,
          border: `1px solid ${bgColor}40`,
        };
      } else if (theme === 'minimal') {
        return {
          backgroundColor: bgColor,
          color: textColor,
          border: `1px solid ${bgColor}`,
          borderRadius: '6px',
        };
      } else if (theme === 'elevated') {
        return {
          backgroundColor: bgColor,
          color: textColor,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.06)',
        };
      }
      return {
        backgroundColor: bgColor,
        color: textColor,
      };
    } else {
      const botTextColor = isLightColor(bgColor) ? '#1f2937' : '#ffffff';
      if (theme === 'sleek') {
        return {
          backgroundColor: bgColor,
          color: botTextColor,
          borderRadius: '8px',
        };
      } else if (theme === 'soft') {
        return {
          backgroundColor: bgColor,
          color: botTextColor,
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
        };
      } else if (theme === 'glass') {
        return {
          backgroundColor: `${bgColor}90`,
          backdropFilter: 'blur(12px) saturate(180%)',
          WebkitBackdropFilter: 'blur(12px) saturate(180%)',
          border: `1px solid rgba(0, 0, 0, 0.06)`,
          color: botTextColor,
        };
      } else if (theme === 'minimal') {
        return {
          backgroundColor: bgColor,
          border: `1px solid #e5e7eb`,
          color: botTextColor,
          borderRadius: '6px',
        };
      } else if (theme === 'elevated') {
        return {
          backgroundColor: bgColor,
          color: botTextColor,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        };
      }
      return {
        backgroundColor: bgColor,
        color: botTextColor,
      };
    }
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    
    const userMsg: PreviewMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage,
    };
    
    setMessages([...messages, userMsg]);
    setInputMessage("");
    
    // Simulate bot response
    setTimeout(() => {
      const botMsg: PreviewMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "This is a preview of how your chatbot will respond to messages.",
      };
      setMessages((prev) => [...prev, botMsg]);
    }, 500);
  };

  const getThemeClasses = () => {
    switch (theme) {
      case 'sleek':
        return 'widget-sleek';
      case 'soft':
        return 'widget-soft';
      case 'glass':
        return 'widget-glass';
      case 'minimal':
        return 'widget-minimal';
      case 'elevated':
        return 'widget-elevated';
      default:
        return 'widget-soft';
    }
  };

  return (
    <div className="sticky top-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Live Preview</h3>
        <p className="text-xs text-muted-foreground">See how your chatbot will look</p>
      </div>
      
      {/* Floating button preview */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="mb-4 rounded-full w-14 h-14"
          style={{
            backgroundColor: primaryColor,
            boxShadow: theme === 'elevated' 
              ? '0 10px 25px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.08)'
              : theme === 'sleek'
              ? '0 4px 12px rgba(0, 0, 0, 0.12)'
              : '0 6px 16px rgba(0, 0, 0, 0.12)',
          }}
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      )}

      {/* Chat widget preview */}
      {isOpen && (
        <Card
          className={cn(
            "flex flex-col transition-all duration-300 overflow-hidden",
            getThemeClasses(),
            isMinimized ? "h-16" : "h-[500px]"
          )}
          style={{
            borderRadius: theme === 'sleek' ? '12px' : theme === 'minimal' ? '8px' : '16px',
            boxShadow: theme === 'elevated' 
              ? '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.08)'
              : theme === 'sleek'
              ? '0 8px 24px rgba(0, 0, 0, 0.12)'
              : theme === 'soft'
              ? '0 4px 16px rgba(0, 0, 0, 0.08)'
              : theme === 'glass'
              ? '0 8px 32px rgba(0, 0, 0, 0.08)'
              : '0 1px 3px rgba(0, 0, 0, 0.12)',
            background: backgroundImageUrl
              ? `url(${backgroundImageUrl})`
              : theme === 'glass' 
                ? 'rgba(255, 255, 255, 0.7)' 
                : chatWindowBgColor,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backdropFilter: theme === 'glass' ? 'blur(20px) saturate(180%)' : undefined,
            WebkitBackdropFilter: theme === 'glass' ? 'blur(20px) saturate(180%)' : undefined,
            border: theme === 'minimal' ? '1px solid #e5e7eb' : theme === 'glass' ? '1px solid rgba(255, 255, 255, 0.2)' : 'none',
          }}
        >
          {/* Header */}
          <div
            className={cn(
              "relative flex items-center justify-between p-4 cursor-pointer overflow-hidden",
              theme === 'minimal' ? 'text-gray-900' : 'text-white',
              theme === 'sleek' ? 'rounded-t-[12px]' : theme === 'minimal' ? 'rounded-t-[8px]' : 'rounded-t-[16px]'
            )}
            style={getHeaderStyle()}
            onClick={() => setIsMinimized(!isMinimized)}
          >
            <div className="flex items-center gap-3 relative z-10">
              {logoUrl ? (
                <img src={logoUrl} alt={companyName} className="w-10 h-10 rounded-full bg-white/20 object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
              )}
              <div>
                <h3 className="font-semibold text-sm">{companyName}</h3>
                {!isMinimized && (
                  <div className="flex items-center gap-1 text-xs opacity-90">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span>Online</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 relative z-10">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMinimized(!isMinimized);
                }}
                className="text-white hover:bg-white/20 p-1 h-7 w-7"
              >
                <ChevronDown className={cn("w-4 h-4 transition-transform", isMinimized && "rotate-180")} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                className="text-white hover:bg-white/20 p-1 h-7 w-7"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {!isMinimized && (
            <>
              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        message.role === "user" ? "text-right" : "text-left"
                      )}
                    >
                      <div
                        className={cn(
                          "inline-block max-w-[85%] p-2.5 text-sm",
                          theme === 'glass' && message.role !== "user" && "glass-effect"
                        )}
                        style={{
                          ...getMessageStyle(message.role === "user"),
                          borderRadius: theme === 'sleek' ? '8px' : theme === 'minimal' ? '6px' : theme === 'soft' ? '16px' : '18px',
                        }}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              {/* Suggested Prompts */}
              {messages.length === 1 && config?.behavior?.suggestedPrompts && config.behavior.suggestedPrompts.length > 0 && (
                <div className="px-4 pb-2">
                  <div className="flex flex-wrap gap-2">
                    {config.behavior.suggestedPrompts.slice(0, 3).map((prompt, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        style={{
                          borderColor: primaryColor,
                          color: primaryColor,
                        }}
                      >
                        {prompt.length > 25 ? prompt.substring(0, 25) + '...' : prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Input area */}
              <div className={cn(
                "p-3 border-t",
                theme === 'glass' && "glass-effect"
              )}>
                <div className="flex gap-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type your message..."
                    className={cn(
                      "flex-1 text-sm h-9",
                      theme === 'glass' && "bg-white/50 backdrop-blur-sm",
                      theme === 'minimal' && "border-black rounded-none"
                    )}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim()}
                    size="sm"
                    className="h-9 w-9 p-0"
                    style={{
                      backgroundColor: sendButtonColor,
                      borderRadius: theme === 'sleek' ? '6px' : theme === 'minimal' ? '4px' : '8px',
                      boxShadow: theme === 'elevated' ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none',
                    }}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
