import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import type { ChatbotWithClient, ChatbotConfig } from "../../shared/schema";
import { MessageCircle, Send, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getTranslations } from "@/lib/translations";
import { MarkdownMessage } from "@/components/MarkdownMessage";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  responseOptions?: string[];
  links?: Array<{ title: string, url: string }>;
}

interface UserDetails {
  name: string;
  phone: string;
  timestamp: number;
}

interface TypingIndicatorProps {
  primaryColor?: string;
}

const TypingIndicator = ({ primaryColor = "#3B82F6" }: TypingIndicatorProps) => (
  <div className="flex items-center gap-1">
    <span className="typing-dot" style={{ backgroundColor: primaryColor }}></span>
    <span className="typing-dot" style={{ backgroundColor: primaryColor }}></span>
    <span className="typing-dot" style={{ backgroundColor: primaryColor }}></span>
  </div>
);

// SVG Wave Pattern Component
const WavePattern = ({ color = "#3B82F6", opacity = 0.1 }: { color?: string; opacity?: number }) => (
  <svg
    className="absolute inset-x-0 bottom-0 w-full"
    viewBox="0 0 1200 120"
    preserveAspectRatio="none"
    style={{ height: '60px', transform: 'translateY(1px)' }}
  >
    <path
      d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
      fill={color}
      fillOpacity={opacity}
    />
  </svg>
);

// Animated Background Pattern
const AnimatedBackground = ({ theme }: { theme: string }) => {
  if (theme === 'gradient') {
    return (
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 animate-pulse" />
      </div>
    );
  } else if (theme === 'wave') {
    return (
      <div className="absolute inset-0 overflow-hidden opacity-5">
        <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-to-r from-blue-400 to-purple-400 animate-spin-slow" style={{ animationDuration: '20s' }} />
      </div>
    );
  }
  return null;
};

export default function WidgetFullpage() {
  const { chatbotId } = useParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [sessionId] = useState(`fullpage-${Date.now()}`);

  // Pre-chat form states
  const [userDetailsProvided, setUserDetailsProvided] = useState(false);
  const [userName, setUserName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [preChatError, setPreChatError] = useState("");
  const [isPreChatSubmitting, setIsPreChatSubmitting] = useState(false);

  // Language and RTL states
  const [currentLanguage, setCurrentLanguage] = useState<string>("en");
  const [isRTL, setIsRTL] = useState(false);

  const { data: chatbot, isLoading: chatbotLoading, error } = useQuery<ChatbotWithClient>({
    queryKey: ["/api/widget", chatbotId],
    enabled: !!chatbotId,
  });

  // Cast config to ChatbotConfig type for proper typing
  const config = chatbot?.config as ChatbotConfig | undefined;
  const theme = config?.widgetSettings?.designTheme || 'modern';

  // Initialize language from config
  useEffect(() => {
    if (config?.widgetSettings?.defaultLanguage) {
      const defaultLang = config.widgetSettings.defaultLanguage;
      setCurrentLanguage(defaultLang);

      // Check if the language is RTL
      const lang = config.widgetSettings.supportedLanguages?.find(l => l.code === defaultLang);
      setIsRTL(lang?.rtl || false);
    }
  }, [config]);

  // Handle language change
  const handleLanguageChange = (languageCode: string) => {
    setCurrentLanguage(languageCode);
    const lang = config?.widgetSettings?.supportedLanguages?.find(l => l.code === languageCode);
    setIsRTL(lang?.rtl || false);
  };

  // Get translations for current language
  const t = getTranslations(currentLanguage);

  // Get theme-specific classes
  const getThemeClasses = () => {
    switch (theme) {
      case 'wave':
        return 'widget-wave';
      case 'glass':
        return 'widget-glass';
      case 'minimal':
        return 'widget-minimal';
      case 'gradient':
        return 'widget-gradient';
      default:
        return 'widget-modern';
    }
  };

  // Helper to create glass effect with primary color tint
  const getGlassStyle = (opacity: number = 0.7): React.CSSProperties => {
    // Convert hex to RGB and add primary color tint
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 255, g: 255, b: 255 };
    };

    const rgb = hexToRgb(primaryColor);
    // Mix white with primary color (80% white, 20% primary)
    const mixedR = Math.round(255 * 0.8 + rgb.r * 0.2);
    const mixedG = Math.round(255 * 0.8 + rgb.g * 0.2);
    const mixedB = Math.round(255 * 0.8 + rgb.b * 0.2);

    return {
      background: `rgba(${mixedR}, ${mixedG}, ${mixedB}, ${opacity})`,
      backdropFilter: 'blur(10px) saturate(180%)',
      WebkitBackdropFilter: 'blur(10px) saturate(180%)',
      border: `1px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`,
    };
  };

  const getContainerStyle = (): React.CSSProperties => {
    if (theme === 'glass') {
      return getGlassStyle(0.7);
    } else if (theme === 'gradient') {
      return {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      };
    } else if (theme === 'minimal') {
      return {
        background: '#ffffff',
      };
    }
    return {
      background: '#ffffff',
    };
  };

  const getHeaderStyle = () => {
    const baseStyle: React.CSSProperties = {};
    const primaryColor = config?.branding?.primaryColor || '#3B82F6';
    const secondaryColor = config?.branding?.secondaryColor || '#10B981';

    if (theme === 'gradient') {
      return {
        ...baseStyle,
        backgroundColor: primaryColor,
        backgroundImage: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
        boxShadow: `0 4px 20px ${primaryColor}40`,
      };
    } else if (theme === 'wave') {
      return {
        ...baseStyle,
        backgroundColor: primaryColor,
        backgroundImage: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
        position: 'relative' as const,
      };
    } else if (theme === 'glass') {
      return {
        ...baseStyle,
        backgroundColor: primaryColor,
        borderBottom: `1px solid ${secondaryColor}30`,
      };
    } else if (theme === 'minimal') {
      return {
        ...baseStyle,
        backgroundColor: primaryColor,
        borderBottom: `2px solid ${secondaryColor}`,
      };
    }

    return {
      ...baseStyle,
      backgroundColor: primaryColor,
    };
  };

  // Helper to check if color is light or dark
  const isLightColor = (color: string): boolean => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155;
  };

  const getMessageStyle = (isUser: boolean): React.CSSProperties => {
    const primaryColor = config?.branding?.primaryColor || '#3B82F6';
    const secondaryColor = config?.branding?.secondaryColor || '#10B981';
    const textColor = isLightColor(primaryColor) ? '#000000' : '#ffffff';

    if (isUser) {
      if (theme === 'gradient') {
        return {
          backgroundColor: primaryColor,
          backgroundImage: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
          color: textColor,
          boxShadow: `0 2px 8px ${primaryColor}30`,
        };
      } else if (theme === 'wave') {
        return {
          backgroundColor: primaryColor,
          backgroundImage: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
          color: textColor,
          boxShadow: `0 2px 8px ${primaryColor}30`,
        };
      } else if (theme === 'glass') {
        return {
          backgroundColor: primaryColor,
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          color: textColor,
          border: `1px solid ${secondaryColor}40`,
          boxShadow: `0 4px 12px ${primaryColor}20`,
        };
      } else if (theme === 'minimal') {
        return {
          backgroundColor: primaryColor,
          color: textColor,
          border: `1px solid ${secondaryColor}`,
        };
      }
      return {
        backgroundColor: primaryColor,
        color: textColor,
        boxShadow: `0 2px 8px ${primaryColor}30`,
      };
    } else {
      const botBgColor = isLightColor(primaryColor) ? '#f8f9fa' : '#ffffff';
      if (theme === 'glass') {
        return {
          backgroundColor: botBgColor,
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: `1px solid ${primaryColor}15`,
          color: '#1f2937',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        };
      } else if (theme === 'gradient' || theme === 'wave') {
        return {
          backgroundColor: botBgColor,
          border: `1px solid ${primaryColor}15`,
          color: '#1f2937',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        };
      } else if (theme === 'minimal') {
        return {
          backgroundColor: botBgColor,
          border: `1px solid ${primaryColor}30`,
          color: '#000000',
        };
      }
      return {
        backgroundColor: botBgColor,
        border: `1px solid ${primaryColor}15`,
        color: '#1f2937',
      };
    }
  };

  // Check if business is open
  const isBusinessOpen = () => {
    // If business hours are disabled, always return true (24/7 availability)
    if (!config?.businessHours?.enabled) return true;
    if (!config?.businessHours?.schedule) return true;

    const now = new Date();
    const timezone = config.businessHours.timezone || 'America/New_York';

    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
        weekday: 'long'
      });

      const parts = formatter.formatToParts(now);
      const weekday = parts.find(p => p.type === 'weekday')?.value?.toLowerCase() || 'monday';
      const hour = parts.find(p => p.type === 'hour')?.value || '00';
      const minute = parts.find(p => p.type === 'minute')?.value || '00';

      const currentTime = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;

      const todaySchedule = config.businessHours.schedule[weekday as keyof typeof config.businessHours.schedule];

      if (!todaySchedule || todaySchedule.closed) return false;

      return currentTime >= todaySchedule.open && currentTime <= todaySchedule.close;
    } catch (error) {
      console.error('Error checking business hours:', error);
      return true;
    }
  };

  // Check for existing user details in sessionStorage OR skip if lead capture disabled
  useEffect(() => {
    if (!chatbotId || !config) return;

    console.log('Lead capture config:', config.leadCapture);
    console.log('Lead capture enabled:', config.leadCapture?.enabled);

    // If lead capture is disabled, skip the form entirely
    if (!config.leadCapture?.enabled) {
      console.log('Lead capture is disabled, skipping form');
      setUserDetailsProvided(true);
      return;
    }

    console.log('Lead capture is enabled, showing form');

    // Otherwise check for stored details
    const storageKey = `chatbot_user_${chatbotId}`;
    const storedDetails = sessionStorage.getItem(storageKey);

    if (storedDetails) {
      try {
        const details: UserDetails = JSON.parse(storedDetails);
        const dayInMs = 24 * 60 * 60 * 1000;
        const isRecent = Date.now() - details.timestamp < dayInMs;

        if (isRecent) {
          setUserName(details.name);
          setUserPhone(details.phone);
          setUserDetailsProvided(true);
        } else {
          // Clear old data
          sessionStorage.removeItem(storageKey);
        }
      } catch (error) {
        console.error('Error parsing stored user details:', error);
        sessionStorage.removeItem(storageKey);
      }
    }
  }, [chatbotId, config]);

  // Initialize welcome message
  useEffect(() => {
    if (!config || !userDetailsProvided) return;

    const baseWelcomeMsg = config.behavior?.welcomeMessage || "Welcome to our service. How can I help you today?";
    const welcomeMsg = userName ? `Hi ${userName}! ${baseWelcomeMsg}` : baseWelcomeMsg;

    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: welcomeMsg,
        timestamp: new Date(),
      },
    ]);
  }, [config, userDetailsProvided, userName]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const handleSuggestedPrompt = (prompt: string) => {
    setInputMessage(prompt);
    sendMessage(prompt);
  };

  const handleResponseOption = (option: string, messageId: string) => {
    setMessages((prev) => prev.map(msg =>
      msg.id === messageId ? { ...msg, responseOptions: undefined } : msg
    ));
    sendMessage(option);
  };

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputMessage;
    if (!textToSend.trim() || isLoading || !chatbotId) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    setShowTyping(true);

    try {
      const response = await apiRequest("POST", `/api/widget/${chatbotId}/message`, {
        message: textToSend,
        sessionId,
      });

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || config?.behavior?.fallbackMessage || "I'm sorry, I couldn't process your request.",
        timestamp: new Date(),
        responseOptions: data.responseOptions,
        links: data.links,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: config?.behavior?.fallbackMessage || "I'm sorry, something went wrong. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setShowTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Handle pre-chat form submission
  const handlePreChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPreChatError("");

    // Validate inputs
    if (!userName.trim()) {
      setPreChatError("Please enter your name");
      return;
    }

    if (!userPhone.trim()) {
      setPreChatError("Please enter your phone number");
      return;
    }

    // Basic phone validation - just check for some digits
    const phoneDigits = userPhone.replace(/\D/g, '');
    if (phoneDigits.length < 5) {
      setPreChatError("Please enter a valid phone number");
      return;
    }

    setIsPreChatSubmitting(true);

    // Save to sessionStorage
    const userDetails: UserDetails = {
      name: userName.trim(),
      phone: userPhone.trim(),
      timestamp: Date.now()
    };
    sessionStorage.setItem(`chatbot_user_${chatbotId}`, JSON.stringify(userDetails));

    // Create lead in background (don't wait for response)
    const conversationId = `conv-${Date.now()}`;
    apiRequest("POST", `/api/widget/${chatbotId}/capture-lead`, {
      name: userName.trim(),
      phone: userPhone.trim(),
      conversationId,
      source: 'pre-chat-form'
    }).catch(error => {
      console.error('Error creating lead from pre-chat form:', error);
      // Continue anyway - don't block the chat
    });

    // Small delay for better UX
    setTimeout(() => {
      setUserDetailsProvided(true);
      setIsPreChatSubmitting(false);
    }, 300);
  };

  if (chatbotLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !chatbot) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Widget not found or unavailable</p>
      </div>
    );
  }

  if (chatbot.subscription?.status === "expired" || chatbot.status !== "active") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">This chat widget is currently inactive</p>
      </div>
    );
  }

  const primaryColor = config?.branding?.primaryColor || "#3B82F6";
  const secondaryColor = config?.branding?.secondaryColor || "#10B981";
  const logoUrl = config?.branding?.logoUrl;
  const companyName = config?.branding?.companyName || chatbot.client.name;

  return (
    <div
      className={cn(
        "h-screen flex flex-col relative overflow-hidden",
        getThemeClasses()
      )}
      style={getContainerStyle()}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <AnimatedBackground theme={theme} />

      {/* Pre-chat form or Chat Interface */}
      {!userDetailsProvided ? (
        <>
          {/* Header for pre-chat */}
          <div
            className="relative p-6 text-white shadow-lg"
            style={getHeaderStyle()}
          >
            <div className="max-w-4xl mx-auto flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={companyName}
                    className="w-12 h-12 rounded-full bg-white/20 p-1"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <MessageCircle className="w-7 h-7" />
                  </div>
                )}
                <h1 className="text-2xl font-bold">{companyName}</h1>
              </div>
              {config?.widgetSettings?.enableLanguageSwitcher && config?.widgetSettings?.supportedLanguages && (
                <LanguageSwitcher
                  languages={config.widgetSettings.supportedLanguages}
                  currentLanguage={currentLanguage}
                  onLanguageChange={handleLanguageChange}
                  primaryColor="#FFFFFF"
                />
              )}
            </div>
          </div>

          {/* Pre-chat form content */}
          <div className="flex-1 flex items-center justify-center p-6">
            <div
              className={cn(
                "w-full max-w-md p-8 rounded-2xl",
                theme !== 'glass' && "bg-white",
                theme === 'minimal' ? "border-2 border-black" : "shadow-2xl"
              )}
              style={theme === 'glass' ? getGlassStyle(0.8) : undefined}
            >
              <div className="space-y-6">
                {/* Icon and welcome message */}
                <div className="text-center space-y-3">
                  <div
                    className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
                    style={{ backgroundColor: `${primaryColor}20` }}
                  >
                    <MessageCircle
                      className="w-10 h-10"
                      style={{ color: primaryColor }}
                    />
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-900">
                    {t.welcomeTo} {companyName}
                  </h2>
                  <p className="text-gray-600">
                    {t.provideDetails}
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handlePreChatSubmit} className="space-y-4">
                  <div>
                    <Input
                      type="text"
                      placeholder={t.yourName}
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      disabled={isPreChatSubmitting}
                      className={cn(
                        "w-full text-lg py-6",
                        theme === 'minimal' && "border-2 border-black rounded-none"
                      )}
                      data-testid="input-prechat-name"
                      required
                    />
                  </div>
                  <div>
                    <Input
                      type="tel"
                      placeholder={t.yourPhone}
                      value={userPhone}
                      onChange={(e) => setUserPhone(e.target.value)}
                      disabled={isPreChatSubmitting}
                      className={cn(
                        "w-full text-lg py-6",
                        theme === 'minimal' && "border-2 border-black rounded-none"
                      )}
                      data-testid="input-prechat-phone"
                      required
                    />
                  </div>

                  {preChatError && (
                    <p className="text-sm text-red-500 text-center" data-testid="text-prechat-error">
                      {preChatError}
                    </p>
                  )}

                  <Button
                    type="submit"
                    className={cn(
                      "w-full text-white text-lg py-6",
                      theme === 'minimal' && "rounded-none"
                    )}
                    style={{
                      backgroundColor: theme === 'minimal' ? '#000000' : primaryColor,
                      background: theme === 'gradient' ?
                        `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` :
                        undefined
                    }}
                    disabled={isPreChatSubmitting}
                    data-testid="button-start-chat"
                  >
                    {isPreChatSubmitting ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin w-5 h-5 border-3 border-white border-t-transparent rounded-full mr-2" />
                        {t.starting}
                      </div>
                    ) : (
                      t.startChat
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </>
      ) : (
        // Original chat interface
        <>
          {/* Header */}
          <div
            className="relative p-6 text-white shadow-lg"
            style={getHeaderStyle()}
          >
            {(theme === 'wave' || theme === 'modern') && (
              <WavePattern color={theme === 'wave' ? secondaryColor : primaryColor} opacity={0.3} />
            )}

            <div className="max-w-4xl mx-auto flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={companyName}
                    className="w-12 h-12 rounded-full bg-white/20 p-1 animate-fadeIn"
                  />
                ) : (
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center animate-fadeIn",
                    theme === 'gradient' ? "bg-white/20" : "bg-white/10"
                  )}>
                    <MessageCircle className="w-7 h-7" />
                  </div>
                )}
                <div className="animate-slideUp">
                  <h1 className="text-2xl font-bold">{companyName}</h1>
                  <div className="flex items-center gap-2 text-sm opacity-90">
                    {isBusinessOpen() ? (
                      <>
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span>{t.weAreOnline}</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4" />
                        <span>{t.currentlyOffline}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {config?.widgetSettings?.enableLanguageSwitcher && config?.widgetSettings?.supportedLanguages && (
                <LanguageSwitcher
                  languages={config.widgetSettings.supportedLanguages}
                  currentLanguage={currentLanguage}
                  onLanguageChange={handleLanguageChange}
                  primaryColor="#FFFFFF"
                />
              )}
            </div>
          </div>

          {/* Business Hours Notice - only show if business hours are enabled */}
          {config?.businessHours?.enabled && !isBusinessOpen() && (
            <div className={cn(
              "px-6 py-3 text-center animate-slideUp",
              theme === 'gradient' ? "bg-white/10 text-white" : "bg-orange-50 text-orange-600"
            )}>
              {config?.businessHours?.offlineMessage || "We're currently closed. Our business hours are Monday-Friday 9:00 AM - 5:00 PM."}
            </div>
          )}

          {/* Chat Messages */}
          <ScrollArea ref={scrollAreaRef} className="flex-1 p-6">
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={cn(
                    "message-enter",
                    message.role === "user" ? "text-right message-user" : "text-left message-bot"
                  )}
                >
                  <div
                    className={cn(
                      "inline-block max-w-2xl p-4 rounded-2xl transition-all duration-300",
                      "hover:scale-[1.01] hover:shadow-xl"
                    )}
                    style={{
                      ...getMessageStyle(message.role === "user"),
                      ...(theme === 'glass' && message.role !== "user" ? getGlassStyle(0.8) : {}),
                      borderRadius: theme === 'minimal' ? '4px' : '20px',
                      boxShadow: theme !== 'minimal' ? '0 8px 16px rgba(0, 0, 0, 0.1)' : undefined,
                    }}
                    data-testid={`message-${message.role}-${index}`}
                  >
                    <MarkdownMessage content={message.content} className="text-base" />
                    <p className={cn(
                      "text-xs mt-2",
                      message.role === "user" ? "text-white/70" : "text-gray-500"
                    )}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>

                    {/* Response Options */}
                    {message.responseOptions && message.responseOptions.length > 0 && (
                      <div className="mt-4 space-y-2 stagger-enter">
                        {message.responseOptions.map((option, optionIndex) => (
                          <Button
                            key={optionIndex}
                            variant="outline"
                            size="sm"
                            className={cn(
                              "w-full justify-start text-left widget-button",
                              "transition-all duration-300 hover:scale-[1.02]"
                            )}
                            style={{
                              ...(theme === 'glass' ? getGlassStyle(0.6) : {}),
                              animationDelay: `${optionIndex * 0.1}s`,
                              borderColor: primaryColor,
                              color: theme === 'gradient' ? 'white' : primaryColor,
                              borderWidth: theme === 'minimal' ? '2px' : '1px',
                            }}
                            onClick={() => handleResponseOption(option, message.id)}
                            data-testid={`button-response-option-${optionIndex}`}
                          >
                            {option}
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* Links */}
                    {message.links && message.links.length > 0 && (
                      <div className="mt-4 space-y-2 stagger-enter">
                        {message.links.map((link, linkIndex) => (
                          <Button
                            key={linkIndex}
                            variant="outline"
                            size="sm"
                            className={cn(
                              "w-full justify-start text-left widget-button",
                              "transition-all duration-300 hover:scale-[1.02]"
                            )}
                            style={{
                              ...(theme === 'glass' ? getGlassStyle(0.6) : {}),
                              animationDelay: `${linkIndex * 0.1}s`,
                              borderColor: primaryColor,
                              color: theme === 'gradient' ? 'white' : primaryColor,
                              borderWidth: theme === 'minimal' ? '2px' : '1px',
                            }}
                            onClick={() => window.open(link.url, '_blank')}
                            data-testid={`button-link-${linkIndex}`}
                          >
                            🔗 {link.title}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {showTyping && (
                <div className="text-left message-enter">
                  <div
                    className={cn(
                      "inline-block p-4 rounded-2xl",
                      theme === 'gradient' ? "bg-white/20" : theme !== 'glass' && "bg-gray-100"
                    )}
                    style={theme === 'glass' ? getGlassStyle(0.7) : undefined}
                  >
                    <TypingIndicator primaryColor={theme === 'gradient' ? 'white' : primaryColor} />
                  </div>
                </div>
              )}

            </div>
          </ScrollArea>

          {/* Input Area */}
          <div
            className={cn(
              "border-t p-6",
              theme === 'gradient' && "bg-white/10 border-white/20",
              theme === 'minimal' && "border-black border-t-2"
            )}
            style={theme === 'glass' ? getGlassStyle(0.5) : undefined}
          >
            <div className="max-w-4xl mx-auto">
              {/* Suggested Prompts as Quick Replies */}
              {messages.length === 1 && config?.behavior?.suggestedPrompts && config.behavior.suggestedPrompts.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {config.behavior.suggestedPrompts.map((prompt, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSuggestedPrompt(prompt)}
                        className="widget-button transition-all duration-300"
                        style={{
                          borderColor: theme === 'gradient' ? 'white' : primaryColor,
                          color: theme === 'gradient' ? 'white' : primaryColor,
                          borderWidth: theme === 'minimal' ? '2px' : '1px',
                          borderRadius: theme === 'minimal' ? '4px' : '20px',
                        }}
                        data-testid={`button-suggested-prompt-${index}`}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isBusinessOpen() ? t.typeMessage : t.leaveMessage}
                  disabled={isLoading}
                  className={cn(
                    "flex-1 text-lg transition-all duration-300",
                    "focus:scale-[1.01] focus:shadow-lg",
                    theme === 'glass' && "bg-white/50 backdrop-blur-sm text-gray-900 placeholder:text-gray-500",
                    theme === 'gradient' && "bg-white/20 text-white placeholder-white/50 border-white/30",
                    theme === 'minimal' && "border-black border-2 rounded-none"
                  )}
                  style={{
                    borderColor: theme === 'modern' || theme === 'wave' ? `${primaryColor}30` : undefined,
                  }}
                  data-testid="input-message"
                />
                <Button
                  onClick={() => sendMessage()}
                  disabled={isLoading || !inputMessage.trim()}
                  size="lg"
                  className={cn(
                    "px-8 widget-button",
                    theme === 'minimal' && "rounded-none"
                  )}
                  style={{
                    background: theme === 'gradient' ?
                      'rgba(255, 255, 255, 0.2)' :
                      theme === 'minimal' ? '#000000' :
                        `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                    border: theme === 'gradient' ? '2px solid white' : undefined,
                  }}
                  data-testid="button-send"
                >
                  <Send className="w-5 h-5" />
                  <span className={cn(isRTL ? "mr-2" : "ml-2")}>{t.send}</span>
                </Button>
              </div>

              <div className="text-center mt-4">
                <p className={cn(
                  "text-sm",
                  theme === 'gradient' ? "text-white/50" : "text-gray-400"
                )}>
                  {t.poweredBy} {companyName} Chat
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}