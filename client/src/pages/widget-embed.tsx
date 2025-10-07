import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/queryClient";
import type { ChatbotWithClient, ChatbotConfig } from "@shared/schema";
import { MessageCircle, Send, X, Clock, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  responseOptions?: string[];
}

interface LeadInfo {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
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

// Lead capture form component
const LeadCaptureForm = ({ 
  config, 
  onSubmit, 
  onCancel, 
  existingInfo 
}: {
  config: ChatbotConfig | undefined;
  onSubmit: (leadInfo: LeadInfo) => void;
  onCancel: () => void;
  existingInfo: LeadInfo;
}) => {
  const [leadInfo, setLeadInfo] = useState<LeadInfo>(existingInfo);
  const fields = config?.leadCapture?.fields;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(leadInfo);
  };
  
  const primaryColor = config?.branding?.primaryColor || '#3B82F6';
  
  return (
    <Card className="my-3 border-0 shadow-sm bg-gray-50">
      <CardContent className="p-4">
        <p className="text-sm mb-3 text-gray-700">
          {config?.leadCapture?.captureMessage || "To help serve you better, would you mind sharing your contact information?"}
        </p>
        <form onSubmit={handleSubmit} className="space-y-2">
          {fields?.name?.enabled && (
            <Input
              type="text"
              placeholder={fields.name.placeholder || "Your name"}
              value={leadInfo.name || ""}
              onChange={(e) => setLeadInfo({ ...leadInfo, name: e.target.value })}
              required={fields.name.required}
              data-testid="input-lead-name"
              className="text-sm"
            />
          )}
          {fields?.email?.enabled && (
            <Input
              type="email"
              placeholder={fields.email.placeholder || "your.email@example.com"}
              value={leadInfo.email || ""}
              onChange={(e) => setLeadInfo({ ...leadInfo, email: e.target.value })}
              required={fields.email.required}
              data-testid="input-lead-email"
              className="text-sm"
            />
          )}
          {fields?.phone?.enabled && (
            <Input
              type="tel"
              placeholder={fields.phone.placeholder || "+1 (555) 123-4567"}
              value={leadInfo.phone || ""}
              onChange={(e) => setLeadInfo({ ...leadInfo, phone: e.target.value })}
              required={fields.phone.required}
              data-testid="input-lead-phone"
              className="text-sm"
            />
          )}
          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              size="sm"
              style={{ backgroundColor: primaryColor }}
              className="flex-1 text-white"
              data-testid="button-submit-lead"
            >
              Submit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              data-testid="button-cancel-lead"
            >
              Skip
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default function WidgetEmbed() {
  const { chatbotId } = useParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [capturedLeadInfo, setCapturedLeadInfo] = useState<LeadInfo>({});
  const [messageCount, setMessageCount] = useState(0);
  const [conversationId] = useState(`conv-${Date.now()}`);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const autoOpenTimeoutRef = useRef<NodeJS.Timeout>();
  const [sessionId] = useState(`widget-${Date.now()}`);
  
  // Pre-chat form states
  const [userDetailsProvided, setUserDetailsProvided] = useState(false);
  const [userName, setUserName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [preChatError, setPreChatError] = useState("");
  const [isPreChatSubmitting, setIsPreChatSubmitting] = useState(false);

  const { data: chatbot, isLoading: chatbotLoading, error } = useQuery<ChatbotWithClient>({
    queryKey: ["/api/widget", chatbotId],
    enabled: !!chatbotId,
  });

  // Cast config to ChatbotConfig type for proper typing
  const config = chatbot?.config as ChatbotConfig | undefined;
  const theme = config?.widgetSettings?.designTheme || 'soft';
  
  // Get theme-specific classes
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

  const getHeaderStyle = () => {
    const baseStyle: React.CSSProperties = {};
    const primaryColor = config?.branding?.primaryColor || '#3B82F6';
    
    if (theme === 'sleek') {
      return {
        ...baseStyle,
        backgroundColor: primaryColor,
        borderRadius: '0',
        borderBottom: 'none',
      };
    } else if (theme === 'soft') {
      return {
        ...baseStyle,
        backgroundColor: primaryColor,
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
        backgroundColor: primaryColor,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
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
    const userMessageBgColor = config?.branding?.userMessageBgColor || primaryColor;
    const botMessageBgColor = config?.branding?.botMessageBgColor || '#F3F4F6';
    const textColor = isLightColor(userMessageBgColor) ? '#000000' : '#ffffff';
    
    if (isUser) {
      if (theme === 'sleek') {
        return {
          backgroundColor: userMessageBgColor,
          color: textColor,
          borderRadius: '8px',
        };
      } else if (theme === 'soft') {
        return {
          backgroundColor: userMessageBgColor,
          color: textColor,
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.06)',
        };
      } else if (theme === 'glass') {
        return {
          backgroundColor: `${userMessageBgColor}90`,
          backdropFilter: 'blur(12px) saturate(180%)',
          WebkitBackdropFilter: 'blur(12px) saturate(180%)',
          color: textColor,
          border: `1px solid ${userMessageBgColor}40`,
        };
      } else if (theme === 'minimal') {
        return {
          backgroundColor: userMessageBgColor,
          color: textColor,
          border: `1px solid ${userMessageBgColor}`,
          borderRadius: '6px',
        };
      } else if (theme === 'elevated') {
        return {
          backgroundColor: userMessageBgColor,
          color: textColor,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.06)',
        };
      }
      return {
        backgroundColor: userMessageBgColor,
        color: textColor,
      };
    } else {
      const botTextColor = isLightColor(botMessageBgColor) ? '#1f2937' : '#ffffff';
      if (theme === 'sleek') {
        return {
          backgroundColor: botMessageBgColor,
          color: botTextColor,
          borderRadius: '8px',
        };
      } else if (theme === 'soft') {
        return {
          backgroundColor: botMessageBgColor,
          color: botTextColor,
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
        };
      } else if (theme === 'glass') {
        return {
          backgroundColor: `${botMessageBgColor}90`,
          backdropFilter: 'blur(12px) saturate(180%)',
          WebkitBackdropFilter: 'blur(12px) saturate(180%)',
          border: `1px solid rgba(0, 0, 0, 0.06)`,
          color: botTextColor,
        };
      } else if (theme === 'minimal') {
        return {
          backgroundColor: botMessageBgColor,
          border: `1px solid #e5e7eb`,
          color: botTextColor,
          borderRadius: '6px',
        };
      } else if (theme === 'elevated') {
        return {
          backgroundColor: botMessageBgColor,
          color: botTextColor,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        };
      }
      return {
        backgroundColor: botMessageBgColor,
        color: botTextColor,
      };
    }
  };

  // Check if business is open
  const isBusinessOpen = () => {
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

  // Check for existing user details in sessionStorage
  useEffect(() => {
    if (!chatbotId) return;
    
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
  }, [chatbotId]);

  // Initialize welcome message and auto-open
  useEffect(() => {
    if (!config || !userDetailsProvided) return;

    const welcomeMsg = config.behavior?.welcomeMessage || "Welcome to our service. How can I help you today?";
    
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: welcomeMsg,
        timestamp: new Date(),
      },
    ]);

    if (config.widgetSettings?.autoOpen && !isWidgetOpen) {
      const delay = (config.widgetSettings.autoOpenDelay || 5) * 1000;
      autoOpenTimeoutRef.current = setTimeout(() => {
        setIsWidgetOpen(true);
      }, delay);
    }

    return () => {
      if (autoOpenTimeoutRef.current) {
        clearTimeout(autoOpenTimeoutRef.current);
      }
    };
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

  // Check if should display on mobile
  const shouldShowOnMobile = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    return !isMobile || config?.widgetSettings?.showOnMobile !== false;
  };

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

  // Helper functions for lead detection
  const detectEmail = (text: string): string | null => {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const match = text.match(emailRegex);
    return match ? match[0] : null;
  };

  const detectPhone = (text: string): string | null => {
    const phoneRegex = /(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const match = text.match(phoneRegex);
    return match ? match[0] : null;
  };

  const detectName = (text: string): string | null => {
    const namePatterns = [
      /my name is ([A-Z][a-z]+(\s[A-Z][a-z]+)?)/i,
      /i'm ([A-Z][a-z]+(\s[A-Z][a-z]+)?)/i,
      /i am ([A-Z][a-z]+(\s[A-Z][a-z]+)?)/i,
      /call me ([A-Z][a-z]+(\s[A-Z][a-z]+)?)/i,
    ];
    
    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const captureLead = async (leadInfo: LeadInfo, isFromForm: boolean = false) => {
    if (!chatbotId || !config?.leadCapture?.enabled) return;
    
    try {
      const response = await apiRequest("POST", `/api/widget/${chatbotId}/capture-lead`, {
        ...leadInfo,
        conversationId,
        source: "widget",
        message: leadInfo.message || messages[0]?.content || "No initial message",
      });
      
      if (response.ok) {
        setLeadCaptured(true);
        setCapturedLeadInfo((prev) => ({ ...prev, ...leadInfo }));
        
        if (isFromForm) {
          // Add thank you message
          const thankYouMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: config?.leadCapture?.thankYouMessage || "Thank you for sharing your information! How can I help you today?",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, thankYouMessage]);
        }
      }
    } catch (error) {
      console.error("Failed to capture lead:", error);
    }
  };
  
  const handleLeadFormSubmit = (leadInfo: LeadInfo) => {
    setShowLeadForm(false);
    captureLead(leadInfo, true);
  };
  
  const handleLeadFormCancel = () => {
    setShowLeadForm(false);
    setLeadCaptured(true); // Mark as captured to avoid asking again
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
    setMessageCount((prev) => prev + 1);
    
    // Detect lead information if enabled
    if (config?.leadCapture?.enabled && config?.leadCapture?.detectFromMessages && !leadCaptured) {
      const detectedEmail = detectEmail(textToSend);
      const detectedPhone = detectPhone(textToSend);
      const detectedName = detectName(textToSend);
      
      if (detectedEmail || detectedPhone || detectedName) {
        const newLeadInfo = {
          ...capturedLeadInfo,
          ...(detectedEmail && { email: detectedEmail }),
          ...(detectedPhone && { phone: detectedPhone }),
          ...(detectedName && { name: detectedName }),
        };
        setCapturedLeadInfo(newLeadInfo);
        
        // Capture lead if we have at least an email or phone
        if (newLeadInfo.email || newLeadInfo.phone) {
          await captureLead(newLeadInfo, false);
        }
      }
    }

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
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
      
      // Check if should ask for lead after specified messages
      if (
        config?.leadCapture?.enabled && 
        config?.leadCapture?.autoAskForLead && 
        !leadCaptured && 
        !showLeadForm &&
        messageCount >= (config?.leadCapture?.askAfterMessages || 3)
      ) {
        setShowLeadForm(true);
      }
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

  if (!shouldShowOnMobile()) {
    return null;
  }

  if (chatbotLoading) {
    return null;
  }

  if (error || !chatbot) {
    return null;
  }

  if (chatbot.subscription?.status === "expired" || chatbot.status !== "active") {
    return null;
  }

  const primaryColor = config?.branding?.primaryColor || "#3B82F6";
  const secondaryColor = config?.branding?.secondaryColor || "#10B981";
  const logoUrl = config?.branding?.logoUrl;
  const companyName = config?.branding?.companyName || chatbot.client.name;

  return (
    <>
      {/* Floating widget button */}
      {!isWidgetOpen && shouldShowOnMobile() && (
        <TooltipProvider>
          <Tooltip open={showTooltip}>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setIsWidgetOpen(true)}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className={cn(
                  "fixed z-50 rounded-full shadow-lg w-14 h-14 widget-button",
                  "transition-all duration-300 hover:scale-110 active:scale-95",
                  config?.widgetSettings?.position === "bottom-left" && "bottom-4 left-4",
                  config?.widgetSettings?.position === "bottom-right" && "bottom-4 right-4",
                  config?.widgetSettings?.position === "top-left" && "top-4 left-4",
                  config?.widgetSettings?.position === "top-right" && "top-4 right-4",
                  !config?.widgetSettings?.position && "bottom-4 right-4"
                )}
                style={{
                  backgroundColor: primaryColor,
                  backgroundImage: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  boxShadow: `0 8px 24px ${primaryColor}50, 0 4px 12px ${primaryColor}30`,
                  animation: 'pulse 2s infinite',
                  border: 'none',
                }}
                data-testid="button-widget-open"
              >
                <MessageCircle className="w-6 h-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{config?.widgetSettings?.tooltipText || "Chat with us!"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Chat widget */}
      {isWidgetOpen && shouldShowOnMobile() && (
        <Card
          className={cn(
            "fixed z-50 flex flex-col",
            "transition-all duration-300",
            getThemeClasses(),
            config?.widgetSettings?.position === "bottom-left" && "bottom-4 left-4",
            config?.widgetSettings?.position === "bottom-right" && "bottom-4 right-4",
            config?.widgetSettings?.position === "top-left" && "top-4 left-4",
            config?.widgetSettings?.position === "top-right" && "top-4 right-4",
            !config?.widgetSettings?.position && "bottom-4 right-4",
            isMinimized ? "w-80 h-16" : "w-96 h-[600px]",
            theme === 'glass' && "glass-effect",
            theme === 'wave' && "overflow-hidden"
          )}
          style={{
            animation: 'scaleIn 0.3s ease-out',
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
            background: config?.branding?.backgroundImageUrl
              ? `url(${config.branding.backgroundImageUrl})`
              : theme === 'glass' 
                ? 'rgba(255, 255, 255, 0.7)' 
                : (config?.branding?.chatWindowBgColor || '#ffffff'),
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backdropFilter: theme === 'glass' ? 'blur(20px) saturate(180%)' : undefined,
            WebkitBackdropFilter: theme === 'glass' ? 'blur(20px) saturate(180%)' : undefined,
            border: theme === 'minimal' ? '1px solid #e5e7eb' : theme === 'glass' ? '1px solid rgba(255, 255, 255, 0.2)' : 'none',
          }}
        >
          {/* Pre-chat form or Chat Interface */}
          {!userDetailsProvided ? (
            <div className="flex flex-col h-full">
              {/* Header for pre-chat */}
              <div 
                className="px-4 py-3 flex items-center justify-between relative overflow-hidden"
                style={getHeaderStyle()}
                data-testid="prechat-header"
              >
                <div className="flex items-center gap-2">
                  {logoUrl && (
                    <img 
                      src={logoUrl} 
                      alt={companyName} 
                      className="h-6 w-6 object-contain filter brightness-0 invert"
                    />
                  )}
                  <span className="text-white font-medium">{companyName}</span>
                </div>
                <Button
                  onClick={() => setIsWidgetOpen(false)}
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20 p-1 h-6 w-6"
                  data-testid="button-close-prechat"
                >
                  <X className="w-4 h-4" />
                </Button>
                {theme === 'wave' && <WavePattern color="white" opacity={0.1} />}
              </div>
              
              {/* Pre-chat form content */}
              <div className="flex-1 p-6 flex flex-col items-center justify-center bg-white">
                <div className="w-full max-w-sm space-y-4">
                  {/* Icon and welcome message */}
                  <div className="text-center space-y-2">
                    <div 
                      className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
                      style={{ backgroundColor: `${config?.branding?.primaryColor || '#3B82F6'}20` }}
                    >
                      <MessageCircle 
                        className="w-8 h-8" 
                        style={{ color: config?.branding?.primaryColor || '#3B82F6' }}
                      />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Welcome to {companyName}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Please provide your details to start chatting
                    </p>
                  </div>
                  
                  {/* Form */}
                  <form onSubmit={handlePreChatSubmit} className="space-y-3">
                    <div>
                      <Input
                        type="text"
                        placeholder="Your name"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        disabled={isPreChatSubmitting}
                        className="w-full"
                        data-testid="input-prechat-name"
                        required
                      />
                    </div>
                    <div>
                      <Input
                        type="tel"
                        placeholder="Your phone number"
                        value={userPhone}
                        onChange={(e) => setUserPhone(e.target.value)}
                        disabled={isPreChatSubmitting}
                        className="w-full"
                        data-testid="input-prechat-phone"
                        required
                      />
                    </div>
                    
                    {preChatError && (
                      <p className="text-sm text-red-500" data-testid="text-prechat-error">
                        {preChatError}
                      </p>
                    )}
                    
                    <Button
                      type="submit"
                      className="w-full text-white"
                      style={{ backgroundColor: config?.branding?.primaryColor || '#3B82F6' }}
                      disabled={isPreChatSubmitting}
                      data-testid="button-start-chat"
                    >
                      {isPreChatSubmitting ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                          Starting...
                        </div>
                      ) : (
                        'Start Chat'
                      )}
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            // Original chat interface
            <>
          {/* Header */}
          <div
            className="relative flex items-center justify-between p-4 text-white rounded-t-lg cursor-pointer overflow-hidden"
            style={getHeaderStyle()}
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {(theme === 'wave' || theme === 'modern') && !isMinimized && (
              <WavePattern color={theme === 'wave' ? secondaryColor : primaryColor} opacity={0.3} />
            )}
            
            <div className="flex items-center gap-3 relative z-10">
              {logoUrl ? (
                <img src={logoUrl} alt={companyName} className="w-12 h-12 rounded-full bg-white/20" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
              )}
              <div>
                <h3 className="font-semibold">
                  {companyName}
                </h3>
                {!isMinimized && (
                  <div className="flex items-center gap-1 text-xs opacity-90">
                    {isBusinessOpen() ? (
                      <>
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span>Online</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3" />
                        <span>Offline</span>
                      </>
                    )}
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
                className="text-white hover:bg-white/20 p-1"
              >
                <ChevronDown className={cn("w-4 h-4 transition-transform", isMinimized && "rotate-180")} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsWidgetOpen(false);
                }}
                className="text-white hover:bg-white/20 p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {!isMinimized && (
            <>
              {/* Business Hours Notice */}
              {!isBusinessOpen() && (
                <div className="px-4 py-2 bg-orange-50 text-orange-600 text-sm text-center">
                  {config?.businessHours?.offlineMessage || "We're currently closed."}
                </div>
              )}
              
              {/* Messages */}
              <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
                <div className="space-y-4">
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
                          "inline-block max-w-[80%] p-3 rounded-2xl transition-all duration-300",
                          "hover:scale-[1.02] hover:shadow-lg",
                          theme === 'glass' && message.role !== "user" && "glass-effect"
                        )}
                        style={{
                          ...getMessageStyle(message.role === "user"),
                          borderRadius: theme === 'sleek' ? '8px' : theme === 'minimal' ? '6px' : theme === 'soft' ? '16px' : '18px',
                        }}
                        data-testid={`message-${message.role}-${index}`}
                      >
                        <p className="text-sm">{message.content}</p>
                        {/* Response Options */}
                        {message.responseOptions && message.responseOptions.length > 0 && (
                          <div className="mt-3 space-y-2 stagger-enter">
                            {message.responseOptions.map((option, optionIndex) => (
                              <Button
                                key={optionIndex}
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "w-full justify-start text-left widget-button",
                                  "transition-all duration-300 hover:scale-[1.02]",
                                  theme === 'glass' && "glass-effect"
                                )}
                                style={{
                                  animationDelay: `${optionIndex * 0.1}s`,
                                  borderColor: primaryColor,
                                  color: primaryColor,
                                }}
                                onClick={() => handleResponseOption(option, message.id)}
                                data-testid={`button-response-option-${optionIndex}`}
                              >
                                {option}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Lead Capture Form */}
                  {showLeadForm && !leadCaptured && (
                    <LeadCaptureForm
                      config={config}
                      onSubmit={handleLeadFormSubmit}
                      onCancel={handleLeadFormCancel}
                      existingInfo={capturedLeadInfo}
                    />
                  )}
                  
                  {/* Typing Indicator */}
                  {showTyping && (
                    <div className="text-left message-enter">
                      <div className={cn(
                        "inline-block p-3 rounded-2xl",
                        theme === 'glass' ? "glass-effect" : "bg-gray-100"
                      )}>
                        <TypingIndicator primaryColor={config?.branding?.thinkingDotsColor || primaryColor} />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              {/* Suggested Prompts */}
              {messages.length === 1 && config?.behavior?.suggestedPrompts && config.behavior.suggestedPrompts.length > 0 && (
                <div className="px-4 pb-2">
                  <div className="flex flex-wrap gap-2 stagger-enter">
                    {config.behavior.suggestedPrompts.map((prompt, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSuggestedPrompt(prompt)}
                        className={cn(
                          "text-xs widget-button transition-all duration-300",
                          theme === 'glass' && "glass-effect"
                        )}
                        style={{
                          animationDelay: `${index * 0.1}s`,
                          borderColor: primaryColor,
                          color: primaryColor,
                        }}
                        data-testid={`button-suggested-prompt-${index}`}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Input area */}
              <div className={cn(
                "p-4 border-t",
                theme === 'glass' && "glass-effect"
              )}>
                <div className="flex gap-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    disabled={isLoading}
                    className={cn(
                      "flex-1 transition-all duration-300",
                      "focus:scale-[1.02] focus:shadow-lg",
                      theme === 'glass' && "bg-white/50 backdrop-blur-sm",
                      theme === 'minimal' && "border-black rounded-none"
                    )}
                    data-testid="input-message"
                  />
                  <Button
                    onClick={() => sendMessage()}
                    disabled={isLoading || !inputMessage.trim()}
                    size="sm"
                    className="widget-button"
                    style={{
                      backgroundColor: config?.branding?.sendButtonColor || primaryColor,
                      borderRadius: theme === 'sleek' ? '6px' : theme === 'minimal' ? '4px' : '8px',
                      boxShadow: theme === 'elevated' ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none',
                    }}
                    data-testid="button-send"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
          </>
        )}
        </Card>
      )}
    </>
  );
}