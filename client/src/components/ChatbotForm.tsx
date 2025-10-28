import { useState, useEffect, useRef } from "react";
import { useForm, useFormState } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { insertChatbotSchema } from "@shared/schema";
import { Plus, Trash2, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import BusinessHoursEditor from "./BusinessHoursEditor";
import AppointmentTypesEditor from "./AppointmentTypesEditor";
import ValidationSummary from "./ValidationSummary";
import BackgroundImageUpload from "./BackgroundImageUpload";
import ChatbotPreview from "./ChatbotPreview";
import KnowledgeBaseManager from "./KnowledgeBaseManager";
import type { InsertChatbot, Client, Chatbot, ChatbotConfig } from "@shared/schema";

const DEFAULT_CUSTOM_INSTRUCTIONS = `You are a helpful assistant chatbot. Your primary role is to assist users with their questions and provide helpful information based on the available knowledge base and tools.

When users ask questions:
- Provide clear, accurate, and helpful responses
- Use the knowledge base and available tools to find relevant information
- If you don't have the information, politely let them know and offer to help with something else
- Stay focused on helping users with their queries
- Be professional and courteous in all interactions`;

// Component to show which required fields need to be filled
function RequiredFieldsSummary({ control, formValues }: { control: any, formValues: any }) {
  const { errors, isDirty, isSubmitted, touchedFields } = useFormState({ control });
  const [missingFields, setMissingFields] = useState<string[]>([]);

  useEffect(() => {
    // Always check for required fields, not just when there are errors
    const fields: string[] = [];
    
    // Basic required fields
    if (!formValues.clientId || errors.clientId) fields.push('Client');
    if (!formValues.name || errors.name) fields.push('Chatbot Name');
    
    // Check nested fields in config
    const config = formValues.config || {};
    const branding = config.branding || {};
    const behavior = config.behavior || {};
    const widgetSettings = config.widgetSettings || {};
    
    // Add any other required fields from the schema
    // @ts-ignore - Ignore property access errors
    if (!behavior.welcomeMessage || (errors.config && errors.config.behavior && errors.config.behavior.welcomeMessage)) fields.push('Welcome Message');
    // @ts-ignore - Ignore property access errors
    if (!behavior.customInstructions || (errors.config && errors.config.behavior && errors.config.behavior.customInstructions)) fields.push('Custom Instructions');
    // @ts-ignore - Ignore property access errors
    if (!widgetSettings.tooltipText || (errors.config && errors.config.widgetSettings && errors.config.widgetSettings.tooltipText)) fields.push('Tooltip Text');
    
    setMissingFields(fields);
  }, [errors, isSubmitted, formValues, touchedFields]);

  if (missingFields.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
      <div className="flex items-start">
        <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 mr-2" />
        <div>
          <h4 className="font-medium text-amber-800">Please fill in required fields:</h4>
          <ul className="list-disc pl-5 mt-1 text-sm text-amber-700">
            {missingFields.map((field) => (
              <li key={field}>{field}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

interface ChatbotFormProps {
  chatbot?: Chatbot | null;
  onSubmit: (data: InsertChatbot, logoFile?: File | null, backgroundImageFile?: File | null) => void;
  isSubmitting: boolean;
  validationErrors?: string[];
}

export default function ChatbotForm({ chatbot, onSubmit, isSubmitting, validationErrors = [] }: ChatbotFormProps) {
  const [activeTab, setActiveTab] = useState("basic");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
  const [backgroundImagePreview, setBackgroundImagePreview] = useState<string | null>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const tabsListRef = useRef<HTMLDivElement>(null);

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Debug the chatbot object
  console.log('Chatbot object:', chatbot);
  
  // Parse config if it's a string and map property names
  const parsedChatbot = chatbot ? {
    ...chatbot,
    // Use clientId if available, otherwise use client_id
    clientId: chatbot.clientId || chatbot.client_id,
    config: typeof chatbot.config === 'string' ? JSON.parse(chatbot.config) : chatbot.config
  } : null;
  
  console.log('Parsed chatbot:', parsedChatbot);

  // Initialize form with default values or existing chatbot data
  const form = useForm<InsertChatbot>({
    resolver: zodResolver(insertChatbotSchema),
    defaultValues: parsedChatbot ? {
      clientId: parsedChatbot.clientId,
      name: parsedChatbot.name,
      description: parsedChatbot.description || "",
      status: parsedChatbot.status,
      config: parsedChatbot.config
    } : {
      clientId: "",
      name: "",
      description: "",
      status: "active",
      config: {
        branding: {
          primaryColor: "#3B82F6",
          secondaryColor: "#10B981",
          companyName: "",
        },
        behavior: {
          welcomeMessage: "Hello! Welcome to our service. How can I help you today?",
          suggestedPrompts: [
            "What services do you offer?",
            "How can I book an appointment?", 
            "What are your business hours?",
            "Tell me about pricing",
          ],
          fallbackMessage: "Apologies, I do not have that information. Please contact our support team for further assistance.",
          aiPersonality: "professional",
          customInstructions: DEFAULT_CUSTOM_INSTRUCTIONS,
        },
        widgetSettings: {
          tooltipText: "Chat with us!",
          position: "bottom-right" as const,
          showOnMobile: true,
          autoOpen: false,
          autoOpenDelay: 5,
          designTheme: "soft" as const,
          enableLanguageSwitcher: false,
          supportedLanguages: [{ code: 'en', name: 'English', rtl: false }],
          defaultLanguage: 'en',
        },
        businessHours: {
          enabled: false, // Disabled by default - not all chatbots need business hours
          timezone: "UTC",
          schedule: {
            monday: { open: "09:00", close: "17:00", closed: false },
            tuesday: { open: "09:00", close: "17:00", closed: false },
            wednesday: { open: "09:00", close: "17:00", closed: false },
            thursday: { open: "09:00", close: "17:00", closed: false },
            friday: { open: "09:00", close: "17:00", closed: false },
            saturday: { open: "10:00", close: "14:00", closed: false },
            sunday: { open: "00:00", close: "00:00", closed: true },
          },
          offlineMessage: "We're currently closed. Our business hours are Monday-Friday 9:00 AM - 5:00 PM.",
        },
        appointments: {
          enabled: false, // Disabled by default - not all chatbots need appointments
          types: [],
        },
        knowledgeBase: {
          autoLearn: false,
          updateFrequency: "manual" as const,
        },
        mcpTools: {
          enabled: false,
        },
        leadCapture: {
          enabled: false,
          captureMessage: "To help serve you better, would you mind sharing your contact information?",
          autoAskForLead: false,
          askAfterMessages: 3,
          thankYouMessage: "Thank you for sharing your information! How can I help you today?",
          detectFromMessages: true,
          fields: {
            name: { enabled: true, required: false, placeholder: "Your name" },
            email: { enabled: true, required: true, placeholder: "your.email@example.com" },
            phone: { enabled: true, required: false, placeholder: "+1 (555) 123-4567" }
          }
        },
        advancedSettings: {
          enableAnalytics: true,
          enableChatHistory: true,
          maxConversationLength: 100,
          sessionTimeout: 30,
          requireEmail: false,
          gdprCompliant: true,
          dataRetentionDays: 90,
          allowFileUploads: false,
          maxFileSize: 10,
          allowedFileTypes: ["pdf", "doc", "docx", "txt"],
        },
      },
    },
  });

  // Set client ID when form is initialized and chatbot has client_id
  useEffect(() => {
    if (chatbot?.client_id) {
      form.setValue("clientId", chatbot.client_id);
    }
  }, [chatbot, form]);

  // Directly manage suggested prompts with form.watch and form.setValue
  const suggestedPrompts = form.watch("config.behavior.suggestedPrompts") || [];
  
  // Watch config values for fallback colors
  const formConfig = form.watch("config");

  // Check scroll position for arrows
  const checkScroll = () => {
    if (tabsListRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsListRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  // Scroll tabs left/right
  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsListRef.current) {
      const scrollAmount = 200;
      tabsListRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Check scroll on mount and resize
  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  // Check scroll when tabs list changes
  useEffect(() => {
    if (tabsListRef.current) {
      const element = tabsListRef.current;
      element.addEventListener('scroll', checkScroll);
      return () => element.removeEventListener('scroll', checkScroll);
    }
  }, [tabsListRef.current]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (data: any) => {
    // Create a properly typed object with all required fields
    const chatbotData: InsertChatbot = {
      clientId: data.clientId || "",
      name: data.name || "",
      description: data.description || "",
      status: data.status || "active" as "active" | "inactive" | "suspended",
      widgetUrl: chatbot?.widget_url || data.widgetUrl || `widget-${Date.now()}`,
      config: data.config || {}
    };
    
    // Ensure config structure is complete
    if (!chatbotData.config) chatbotData.config = {};
    if (!chatbotData.config.branding) chatbotData.config.branding = {};
    
    // Set default colors if missing
    if (!chatbotData.config.branding.primaryColor || chatbotData.config.branding.primaryColor === "") {
      chatbotData.config.branding.primaryColor = "#3B82F6";
    }
    
    if (!chatbotData.config.branding.secondaryColor || chatbotData.config.branding.secondaryColor === "") {
      chatbotData.config.branding.secondaryColor = "#10B981";
    }
    
    // If we're editing an existing chatbot, preserve the ID
    if (chatbot?.id) {
      chatbotData.id = chatbot.id;
    }
    
    onSubmit(chatbotData, logoFile, backgroundImageFile);
  };

  // Watch form values for live preview
  const formValues = form.watch();
  const previewConfig = formValues.config as ChatbotConfig;
  const previewCompanyName = formValues.config?.branding?.companyName || "Your Company";
  const previewLogoUrl = logoPreview || formValues.config?.branding?.logoUrl;

  return (
    <Form {...form}>
      <form 
        onSubmit={form.handleSubmit(handleSubmit)} 
        className="space-y-6" 
        data-testid="form-chatbot"
      >
        {validationErrors.length > 0 && (
          <ValidationSummary errors={validationErrors} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Section - 2/3 width */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="relative">
            {showLeftArrow && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 p-0 bg-background shadow-md"
                onClick={() => scrollTabs('left')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            
            <div 
              ref={tabsListRef}
              className="overflow-x-auto scrollbar-hide"
              onScroll={checkScroll}
            >
              <TabsList className="inline-flex w-auto min-w-full">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="branding">Branding</TabsTrigger>
                <TabsTrigger value="behavior">Behavior</TabsTrigger>
                <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
                <TabsTrigger value="leadCapture">Lead Capture</TabsTrigger>
                <TabsTrigger value="hours">Hours</TabsTrigger>
                <TabsTrigger value="appointments">Appointments</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>
            </div>
            
            {showRightArrow && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 p-0 bg-background shadow-md"
                onClick={() => scrollTabs('right')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-chatbot-client">
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients?.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chatbot Name *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Customer Support Bot" 
                        {...field} 
                        data-testid="input-chatbot-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Brief description of the chatbot's purpose"
                      rows={3}
                      {...field}
                      value={field.value || ""}
                      data-testid="input-chatbot-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="config.behavior.mainLanguage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Main Language</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "en"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-main-language">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="it">Italian</SelectItem>
                        <SelectItem value="pt">Portuguese</SelectItem>
                        <SelectItem value="ar">Arabic</SelectItem>
                        <SelectItem value="zh">Chinese</SelectItem>
                        <SelectItem value="ja">Japanese</SelectItem>
                        <SelectItem value="ko">Korean</SelectItem>
                        <SelectItem value="ru">Russian</SelectItem>
                        <SelectItem value="nl">Dutch</SelectItem>
                        <SelectItem value="pl">Polish</SelectItem>
                        <SelectItem value="tr">Turkish</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="config.behavior.adaptToCustomerLanguage"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value || false}
                        onChange={field.onChange}
                        className="h-4 w-4 rounded border-gray-300"
                        data-testid="checkbox-adapt-language"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Adapt to Customer Language
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Automatically detect and respond in the customer's language
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="branding" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="config.branding.primaryColor"
                render={({ field }) => {
                  // Ensure we always have a valid hex color
                  const safeValue = field.value || "#3B82F6";
                  
                  return (
                    <FormItem>
                      <FormLabel>Primary Color</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input 
                            type="color" 
                            value={safeValue}
                            onChange={(e) => field.onChange(e.target.value)}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                            className="w-20 h-10"
                            data-testid="input-primary-color"
                          />
                          <Input 
                            value={safeValue}
                            onChange={(e) => {
                              // Validate hex color format
                              const value = e.target.value;
                              if (value === "" || /^#[0-9A-F]{6}$/i.test(value)) {
                                field.onChange(value || "#3B82F6");
                              }
                            }}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                            placeholder="#3B82F6"
                            className="flex-1"
                            data-testid="input-primary-color-text"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              
              <FormField
                control={form.control}
                name="config.branding.secondaryColor"
                render={({ field }) => {
                  // Ensure we always have a valid hex color
                  const safeValue = field.value || "#10B981";
                  
                  return (
                    <FormItem>
                      <FormLabel>Secondary Color</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input 
                            type="color" 
                            value={safeValue}
                            onChange={(e) => field.onChange(e.target.value)}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                            className="w-20 h-10"
                            data-testid="input-secondary-color"
                          />
                          <Input 
                            value={safeValue}
                            onChange={(e) => {
                              // Validate hex color format
                              const value = e.target.value;
                              if (value === "" || /^#[0-9A-F]{6}$/i.test(value)) {
                                field.onChange(value || "#10B981");
                              }
                            }}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                            placeholder="#10B981"
                            className="flex-1"
                            data-testid="input-secondary-color-text"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
            
            <div className="space-y-4 border-t pt-4 mt-4">
              <h3 className="text-sm font-semibold text-gray-700">Chat Appearance Colors</h3>
              <p className="text-xs text-muted-foreground">Customize the colors of your chat interface elements</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="config.branding.chatWindowBgColor"
                  render={({ field }) => {
                    const safeValue = field.value || "#FFFFFF";
                    return (
                      <FormItem>
                        <FormLabel>Chat Window Background</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input 
                              type="color" 
                              value={safeValue}
                              onChange={(e) => field.onChange(e.target.value)}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                              className="w-20 h-10"
                            />
                            <Input 
                              value={safeValue}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === "" || /^#[0-9A-F]{6}$/i.test(value)) {
                                  field.onChange(value || "#FFFFFF");
                                }
                              }}
                              onBlur={field.onBlur}
                              placeholder="#FFFFFF"
                              className="flex-1"
                            />
                          </div>
                        </FormControl>
                        <FormDescription className="text-xs">
                          Background color when no image is set
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                
                <FormField
                  control={form.control}
                  name="config.branding.userMessageBgColor"
                  render={({ field }) => {
                    const safeValue = field.value || formConfig?.branding?.primaryColor || "#3B82F6";
                    return (
                      <FormItem>
                        <FormLabel>User Message Background</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input 
                              type="color" 
                              value={safeValue}
                              onChange={(e) => field.onChange(e.target.value)}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                              className="w-20 h-10"
                            />
                            <Input 
                              value={safeValue}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === "" || /^#[0-9A-F]{6}$/i.test(value)) {
                                  field.onChange(value);
                                }
                              }}
                              onBlur={field.onBlur}
                              placeholder="Uses primary color"
                              className="flex-1"
                            />
                          </div>
                        </FormControl>
                        <FormDescription className="text-xs">
                          Defaults to primary color if not set
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                
                <FormField
                  control={form.control}
                  name="config.branding.botMessageBgColor"
                  render={({ field }) => {
                    const safeValue = field.value || "#F3F4F6";
                    return (
                      <FormItem>
                        <FormLabel>Bot Message Background</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input 
                              type="color" 
                              value={safeValue}
                              onChange={(e) => field.onChange(e.target.value)}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                              className="w-20 h-10"
                            />
                            <Input 
                              value={safeValue}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === "" || /^#[0-9A-F]{6}$/i.test(value)) {
                                  field.onChange(value || "#F3F4F6");
                                }
                              }}
                              onBlur={field.onBlur}
                              placeholder="#F3F4F6"
                              className="flex-1"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                
                <FormField
                  control={form.control}
                  name="config.branding.thinkingDotsColor"
                  render={({ field }) => {
                    const safeValue = field.value || formConfig?.branding?.primaryColor || "#3B82F6";
                    return (
                      <FormItem>
                        <FormLabel>Thinking Dots Color</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input 
                              type="color" 
                              value={safeValue}
                              onChange={(e) => field.onChange(e.target.value)}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                              className="w-20 h-10"
                            />
                            <Input 
                              value={safeValue}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === "" || /^#[0-9A-F]{6}$/i.test(value)) {
                                  field.onChange(value);
                                }
                              }}
                              onBlur={field.onBlur}
                              placeholder="Uses primary color"
                              className="flex-1"
                            />
                          </div>
                        </FormControl>
                        <FormDescription className="text-xs">
                          Color of typing indicator dots
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                
                <FormField
                  control={form.control}
                  name="config.branding.sendButtonColor"
                  render={({ field }) => {
                    const safeValue = field.value || formConfig?.branding?.primaryColor || "#3B82F6";
                    return (
                      <FormItem>
                        <FormLabel>Send Button Color</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input 
                              type="color" 
                              value={safeValue}
                              onChange={(e) => field.onChange(e.target.value)}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                              className="w-20 h-10"
                            />
                            <Input 
                              value={safeValue}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === "" || /^#[0-9A-F]{6}$/i.test(value)) {
                                  field.onChange(value);
                                }
                              }}
                              onBlur={field.onBlur}
                              placeholder="Uses primary color"
                              className="flex-1"
                            />
                          </div>
                        </FormControl>
                        <FormDescription className="text-xs">
                          Defaults to primary color if not set
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="config.widgetSettings.designTheme"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Design Theme</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-design-theme">
                        <SelectValue placeholder="Select a theme" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="sleek">
                        <div className="flex flex-col">
                          <span className="font-medium">Sleek</span>
                          <span className="text-xs text-muted-foreground">Modern flat design with sharp edges - Linear/Stripe style</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="soft">
                        <div className="flex flex-col">
                          <span className="font-medium">Soft</span>
                          <span className="text-xs text-muted-foreground">Rounded corners with subtle shadows - Intercom style</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="glass">
                        <div className="flex flex-col">
                          <span className="font-medium">Glass</span>
                          <span className="text-xs text-muted-foreground">Frosted glass with backdrop blur - iOS style</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="minimal">
                        <div className="flex flex-col">
                          <span className="font-medium">Minimal</span>
                          <span className="text-xs text-muted-foreground">Clean borders, no shadows - Notion style</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="elevated">
                        <div className="flex flex-col">
                          <span className="font-medium">Elevated</span>
                          <span className="text-xs text-muted-foreground">Floating cards with depth - Slack style</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose a visual style for your chatbot widget
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="config.branding.companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Your Company Name" 
                      {...field}
                      value={field.value || ""}
                      data-testid="input-company-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                {logoPreview && (
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-20 h-20 object-contain border rounded"
                  />
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="flex-1"
                  data-testid="input-logo-file"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Upload a logo image (PNG, JPG, SVG). Max size: 2MB
              </p>
            </div>
            
            <BackgroundImageUpload
              currentImageUrl={chatbot?.config?.branding?.backgroundImageUrl}
              onImageChange={(file) => setBackgroundImageFile(file)}
              onImageRemove={() => {
                setBackgroundImageFile(null);
                setBackgroundImagePreview(null);
                form.setValue('config.branding.backgroundImageUrl', undefined);
              }}
            />
          </TabsContent>
          
          <TabsContent value="behavior" className="space-y-4">
            <FormField
              control={form.control}
              name="config.behavior.welcomeMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Welcome Message</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Hello! Welcome to our service. How can I help you today?" 
                      rows={2}
                      {...field}
                      data-testid="input-welcome-message"
                    />
                  </FormControl>
                  <FormDescription>
                    The first message users see when they open the chat
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-2">
              <Label>Suggested Prompts</Label>
              <div className="space-y-2">
                {suggestedPrompts.map((prompt, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={prompt}
                      onChange={(e) => {
                        const newPrompts = [...suggestedPrompts];
                        newPrompts[index] = e.target.value;
                        form.setValue("config.behavior.suggestedPrompts", newPrompts);
                      }}
                      placeholder="Enter a suggested prompt"
                      data-testid={`input-prompt-${index}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newPrompts = suggestedPrompts.filter((_, i) => i !== index);
                        form.setValue("config.behavior.suggestedPrompts", newPrompts);
                      }}
                      data-testid={`button-remove-prompt-${index}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {suggestedPrompts.length < 5 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newPrompts = [...suggestedPrompts, ""];
                      form.setValue("config.behavior.suggestedPrompts", newPrompts);
                    }}
                    data-testid="button-add-prompt"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Prompt
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Quick action buttons to help users start conversations
              </p>
            </div>
            
            <FormField
              control={form.control}
              name="config.behavior.fallbackMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fallback Message</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="I'm sorry, I didn't understand that. Could you please rephrase?" 
                      rows={2}
                      {...field}
                      data-testid="input-fallback-message"
                    />
                  </FormControl>
                  <FormDescription>
                    Message shown when the chatbot doesn't understand
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="config.behavior.aiPersonality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AI Personality</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={typeof field.value === 'string' ? field.value : 'professional'}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-ai-personality">
                        <SelectValue placeholder="Select personality" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="formal">Formal</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="config.behavior.customInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom Instructions</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe your chatbot's role, domain, and specific guidelines (e.g., 'You help users with administrative procedures...')" 
                      rows={8}
                      {...field}
                      data-testid="input-custom-instructions"
                    />
                  </FormControl>
                  <FormDescription>
                    Domain-specific instructions for your chatbot. Technical formatting and behavior rules are handled automatically.
                    ({field.value?.length || 0}/2000 characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
          
          <TabsContent value="knowledge" className="space-y-4">
            {chatbot?.id ? (
              <KnowledgeBaseManager chatbotId={chatbot.id} />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Save Chatbot First</h3>
                    <p className="text-sm text-muted-foreground">
                      You need to save the chatbot before you can upload documents to the knowledge base.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="leadCapture" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="config.leadCapture.enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable Lead Capture</FormLabel>
                          <FormDescription>
                            Automatically capture visitor contact information during conversations
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-lead-capture-enabled"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {form.watch("config.leadCapture.enabled") && (
                    <>
                      <FormField
                        control={form.control}
                        name="config.leadCapture.captureMessage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Lead Capture Message</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="To help serve you better, would you mind sharing your contact information?"
                                rows={3}
                                {...field}
                                data-testid="input-lead-capture-message"
                              />
                            </FormControl>
                            <FormDescription>
                              Message shown when asking visitors for their contact information
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="config.leadCapture.autoAskForLead"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Auto-Ask for Lead Info</FormLabel>
                              <FormDescription>
                                Automatically ask for contact information during conversation
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-auto-ask-lead"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      {form.watch("config.leadCapture.autoAskForLead") && (
                        <FormField
                          control={form.control}
                          name="config.leadCapture.askAfterMessages"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ask After Messages</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  max="10"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 3)}
                                  data-testid="input-ask-after-messages"
                                />
                              </FormControl>
                              <FormDescription>
                                Number of messages before asking for contact information
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      <FormField
                        control={form.control}
                        name="config.leadCapture.thankYouMessage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Thank You Message</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Thank you for sharing your information! How can I help you today?"
                                rows={2}
                                {...field}
                                value={field.value || "Thank you for sharing your information! How can I help you today?"}
                                data-testid="input-thank-you-message"
                              />
                            </FormControl>
                            <FormDescription>
                              Message shown after visitor submits their contact information
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="config.leadCapture.detectFromMessages"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Detect from Messages</FormLabel>
                              <FormDescription>
                                Automatically detect contact information from conversation messages
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-detect-from-messages"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <div className="space-y-4 mt-6">
                        <h4 className="font-medium">Lead Capture Fields</h4>
                        
                        <FormField
                          control={form.control}
                          name="config.leadCapture.fields.name.enabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel>Name Field</FormLabel>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-name-field"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        {form.watch("config.leadCapture.fields.name.enabled") && (
                          <div className="grid grid-cols-2 gap-4 ml-4">
                            <FormField
                              control={form.control}
                              name="config.leadCapture.fields.name.required"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      data-testid="switch-name-required"
                                    />
                                  </FormControl>
                                  <FormLabel>Required</FormLabel>
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="config.leadCapture.fields.name.placeholder"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      placeholder="Placeholder text"
                                      {...field}
                                      value={field.value || "Your name"}
                                      data-testid="input-name-placeholder"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                        
                        <FormField
                          control={form.control}
                          name="config.leadCapture.fields.email.enabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel>Email Field</FormLabel>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-email-field"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        {form.watch("config.leadCapture.fields.email.enabled") && (
                          <div className="grid grid-cols-2 gap-4 ml-4">
                            <FormField
                              control={form.control}
                              name="config.leadCapture.fields.email.required"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      data-testid="switch-email-required"
                                    />
                                  </FormControl>
                                  <FormLabel>Required</FormLabel>
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="config.leadCapture.fields.email.placeholder"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      placeholder="Placeholder text"
                                      {...field}
                                      value={field.value || "your.email@example.com"}
                                      data-testid="input-email-placeholder"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                        
                        <FormField
                          control={form.control}
                          name="config.leadCapture.fields.phone.enabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel>Phone Field</FormLabel>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-phone-field"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        {form.watch("config.leadCapture.fields.phone.enabled") && (
                          <div className="grid grid-cols-2 gap-4 ml-4">
                            <FormField
                              control={form.control}
                              name="config.leadCapture.fields.phone.required"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      data-testid="switch-phone-required"
                                    />
                                  </FormControl>
                                  <FormLabel>Required</FormLabel>
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="config.leadCapture.fields.phone.placeholder"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      placeholder="Placeholder text"
                                      {...field}
                                      value={field.value || "+1 (555) 123-4567"}
                                      data-testid="input-phone-placeholder"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="hours" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <FormField
                  control={form.control}
                  name="config.businessHours.enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mb-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Enable Business Hours
                        </FormLabel>
                        <FormDescription>
                          Show online/offline status based on business hours (optional - disable for 24/7 chatbots)
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            
            {form.watch('config.businessHours.enabled') && (
              <BusinessHoursEditor 
                control={form.control} 
                name="config.businessHours"
              />
            )}
          </TabsContent>
          
          <TabsContent value="appointments" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <FormField
                  control={form.control}
                  name="config.appointments.enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mb-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Enable Appointment Booking
                        </FormLabel>
                        <FormDescription>
                          Allow users to book appointments through the chatbot (optional - disable if not needed)
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            
            {form.watch('config.appointments.enabled') && (
              <AppointmentTypesEditor 
                control={form.control}
                name="config.appointments.types"
              />
            )}
          </TabsContent>
          
          <TabsContent value="advanced" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <h4 className="text-sm font-medium mb-4">Widget Settings</h4>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="config.widgetSettings.mode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Widget Mode</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-widget-mode">
                              <SelectValue placeholder="Select mode" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="floating">Floating Widget</SelectItem>
                            <SelectItem value="fullpage">Fullpage</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose between floating widget (bottom corner) or fullpage mode
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="config.widgetSettings.tooltipText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tooltip Text</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Chat with us!" 
                            {...field}
                            data-testid="input-tooltip-text"
                          />
                        </FormControl>
                        <FormDescription>
                          Text shown when hovering over the chat widget
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="config.widgetSettings.position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Widget Position</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-widget-position">
                              <SelectValue placeholder="Select position" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="bottom-right">Bottom Right</SelectItem>
                            <SelectItem value="bottom-left">Bottom Left</SelectItem>
                            <SelectItem value="top-right">Top Right</SelectItem>
                            <SelectItem value="top-left">Top Left</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card className="mt-4">
              <CardContent className="pt-6">
                <h4 className="text-sm font-medium mb-4">Language & RTL Support</h4>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="config.widgetSettings.enableLanguageSwitcher"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Enable Language Switcher
                          </FormLabel>
                          <FormDescription>
                            Allow users to switch between languages in the widget
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="config.widgetSettings.defaultLanguage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Language</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "fr"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select default language" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="ar">العربية (Arabic)</SelectItem>
                            <SelectItem value="fr">Français (French)</SelectItem>
                            <SelectItem value="es">Español (Spanish)</SelectItem>
                            <SelectItem value="de">Deutsch (German)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The language shown when the widget first loads
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="space-y-2">
                    <FormLabel>Supported Languages</FormLabel>
                    <FormDescription className="mb-3">
                      Select which languages users can switch between. Arabic supports RTL (right-to-left) layout.
                    </FormDescription>
                    <div className="space-y-2">
                      {[
                        { code: 'en', name: 'English', rtl: false },
                        { code: 'ar', name: 'العربية (Arabic)', rtl: true },
                        { code: 'fr', name: 'Français (French)', rtl: false },
                        { code: 'es', name: 'Español (Spanish)', rtl: false },
                        { code: 'de', name: 'Deutsch (German)', rtl: false },
                      ].map((lang) => {
                        const supportedLanguages = form.watch('config.widgetSettings.supportedLanguages') || [];
                        const isChecked = supportedLanguages.some((l: any) => l.code === lang.code);
                        
                        return (
                          <div key={lang.code} className="flex items-center space-x-2 p-2 border rounded hover:bg-accent">
                            <input
                              type="checkbox"
                              id={`lang-${lang.code}`}
                              checked={isChecked}
                              onChange={(e) => {
                                const currentLangs = form.getValues('config.widgetSettings.supportedLanguages') || [];
                                if (e.target.checked) {
                                  form.setValue('config.widgetSettings.supportedLanguages', [
                                    ...currentLangs.filter((l: any) => l.code !== lang.code),
                                    lang
                                  ]);
                                } else {
                                  form.setValue('config.widgetSettings.supportedLanguages', 
                                    currentLangs.filter((l: any) => l.code !== lang.code)
                                  );
                                }
                              }}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <label htmlFor={`lang-${lang.code}`} className="flex-1 cursor-pointer">
                              {lang.name} {lang.rtl && <span className="text-xs text-muted-foreground">(RTL)</span>}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
            </Tabs>
            
            <RequiredFieldsSummary control={form.control} formValues={form.getValues()} />
          </div>

          {/* Preview Section - 1/3 width */}
          <div className="lg:col-span-1">
            <ChatbotPreview 
              config={previewConfig}
              companyName={previewCompanyName}
              logoUrl={previewLogoUrl}
            />
          </div>
        </div>
      </form>
    </Form>
  );
}
