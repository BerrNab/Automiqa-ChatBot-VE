import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, Edit, Trash2, Play, Settings, BarChart3, Code, Webhook, Globe, Zap, Clock, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PluginTemplate {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  tags: string[];
  is_active: boolean;
  is_public: boolean;
  config_schema: Record<string, any>;
  input_schema: Record<string, any>;
  api_configuration: Record<string, any>;
  output_schema: Record<string, any>;
}

interface ChatbotPlugin {
  id: string;
  chatbot_id: string;
  plugin_template_id: string;
  config: Record<string, any>;
  is_enabled: boolean;
  trigger_rules: Record<string, any>;
  settings: Record<string, any>;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  pluginTemplate: PluginTemplate;
}

interface ChatbotPluginsTabProps {
  chatbotId: string;
  chatbotName: string;
}

const pluginTypes = [
  { value: "n8n", label: "n8n Workflow", icon: <Webhook className="w-4 h-4" /> },
  { value: "webhook", label: "Webhook", icon: <Webhook className="w-4 h-4" /> },
  { value: "api", label: "API Integration", icon: <Globe className="w-4 h-4" /> },
  { value: "custom", label: "Custom", icon: <Code className="w-4 h-4" /> },
  { value: "integration", label: "Integration", icon: <Settings className="w-4 h-4" /> }
];

export default function ChatbotPluginsTab({ chatbotId, chatbotName }: ChatbotPluginsTabProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [isTriggerDialogOpen, setIsTriggerDialogOpen] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<ChatbotPlugin | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<PluginTemplate | null>(null);
  const [activeTab, setActiveTab] = useState("installed");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state for adding/configuring plugins
  const [configFormData, setConfigFormData] = useState<Record<string, any>>({});
  const [triggerFormData, setTriggerFormData] = useState({
    keywords: [] as string[],
    messageCount: 0,
    userIntent: "",
    timeConditions: {
      businessHoursOnly: false,
      timezone: "",
      startTime: "",
      endTime: ""
    },
    conversationPatterns: {
      containsEmail: false,
      containsPhone: false,
      containsUrl: false,
      minMessageLength: 0,
      maxMessageLength: 0
    }
  });

  const [keywordInput, setKeywordInput] = useState("");

  // Fetch available plugin templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/plugins/templates"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/plugins/templates");
      if (!response.ok) throw new Error("Failed to fetch plugin templates");
      return response.json() as Promise<PluginTemplate[]>;
    }
  });

  // Fetch chatbot plugins
  const { data: plugins = [], isLoading: pluginsLoading, refetch: refetchPlugins } = useQuery({
    queryKey: ["/api/chatbots", chatbotId, "plugins"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/chatbots/${chatbotId}/plugins`);
      if (!response.ok) throw new Error("Failed to fetch chatbot plugins");
      return response.json() as Promise<ChatbotPlugin[]>;
    }
  });

  // Add plugin to chatbot mutation
  const addPluginMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const response = await apiRequest("POST", `/api/chatbots/${chatbotId}/plugins`, {
        chatbot_id: chatbotId,
        plugin_template_id: templateId,
        config: {},
        is_enabled: false,
        trigger_rules: {},
        settings: {}
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chatbots", chatbotId, "plugins"] });
      setIsAddDialogOpen(false);
      setSelectedTemplate(null);
      toast({
        title: "Success",
        description: "Plugin added to chatbot successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add plugin",
        variant: "destructive"
      });
    }
  });

  // Update plugin mutation
  const updatePluginMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ChatbotPlugin> }) => {
      const response = await apiRequest("PUT", `/api/chatbots/${chatbotId}/plugins/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chatbots", chatbotId, "plugins"] });
      setIsConfigDialogOpen(false);
      setIsTriggerDialogOpen(false);
      toast({
        title: "Success",
        description: "Plugin updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update plugin",
        variant: "destructive"
      });
    }
  });

  // Remove plugin mutation
  const removePluginMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/chatbots/${chatbotId}/plugins/${id}`);
      if (!response.ok) throw new Error("Failed to remove plugin");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chatbots", chatbotId, "plugins"] });
      toast({
        title: "Success",
        description: "Plugin removed successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove plugin",
        variant: "destructive"
      });
    }
  });

  // Toggle plugin enabled status
  const togglePluginMutation = useMutation({
    mutationFn: async ({ id, isEnabled }: { id: string; isEnabled: boolean }) => {
      const response = await apiRequest("PUT", `/api/chatbots/${chatbotId}/plugins/${id}`, { is_enabled: isEnabled });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chatbots", chatbotId, "plugins"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to toggle plugin",
        variant: "destructive"
      });
    }
  });

  const handleAddPlugin = (template: PluginTemplate) => {
    setSelectedTemplate(template);
    addPluginMutation.mutate(template.id);
  };

  const handleConfigurePlugin = (plugin: ChatbotPlugin) => {
    setSelectedPlugin(plugin);
    setConfigFormData(plugin.config);
    setIsConfigDialogOpen(true);
  };

  const handleConfigureTriggers = (plugin: ChatbotPlugin) => {
    setSelectedPlugin(plugin);
    setTriggerFormData(plugin.triggerRules || triggerFormData);
    setIsTriggerDialogOpen(true);
  };

  const handleSaveConfig = () => {
    if (!selectedPlugin) return;
    updatePluginMutation.mutate({
      id: selectedPlugin.id,
      data: { config: configFormData }
    });
  };

  const handleSaveTriggers = () => {
    if (!selectedPlugin) return;
    updatePluginMutation.mutate({
      id: selectedPlugin.id,
      data: { trigger_rules: triggerFormData }
    });
  };

  const handleTogglePlugin = (plugin: ChatbotPlugin, isEnabled: boolean) => {
    togglePluginMutation.mutate({ id: plugin.id, isEnabled });
  };

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !triggerFormData.keywords.includes(keywordInput.trim())) {
      setTriggerFormData(prev => ({
        ...prev,
        keywords: [...prev.keywords, keywordInput.trim()]
      }));
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (keywordToRemove: string) => {
    setTriggerFormData(prev => ({
      ...prev,
      keywords: prev.keywords.filter(keyword => keyword !== keywordToRemove)
    }));
  };

  const getPluginTypeIcon = (type: string) => {
    const pluginType = pluginTypes.find(t => t.value === type);
    return pluginType?.icon || <Code className="w-4 h-4" />;
  };

  const renderConfigForm = (schema: Record<string, any>, config: Record<string, any>) => {
    if (!schema.properties) return null;

    return Object.entries(schema.properties).map(([key, field]: [string, any]) => (
      <div key={key} className="space-y-2">
        <Label htmlFor={key}>
          {field.title || key}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {field.type === "string" && field.format === "uri" ? (
          <Input
            id={key}
            type="url"
            value={config[key] || ""}
            onChange={(e) => setConfigFormData(prev => ({ ...prev, [key]: e.target.value }))}
            placeholder={field.description || `Enter ${key}`}
          />
        ) : field.type === "string" ? (
          <Input
            id={key}
            type={field.format === "password" ? "password" : "text"}
            value={config[key] || ""}
            onChange={(e) => setConfigFormData(prev => ({ ...prev, [key]: e.target.value }))}
            placeholder={field.description || `Enter ${key}`}
          />
        ) : field.type === "number" ? (
          <Input
            id={key}
            type="number"
            value={config[key] || ""}
            onChange={(e) => setConfigFormData(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
            placeholder={field.description || `Enter ${key}`}
            min={field.minimum}
            max={field.maximum}
          />
        ) : field.type === "boolean" ? (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={key}
              checked={config[key] || false}
              onCheckedChange={(checked) => setConfigFormData(prev => ({ ...prev, [key]: !!checked }))}
            />
            <Label htmlFor={key}>{field.description || `Enable ${key}`}</Label>
          </div>
        ) : null}
        {field.description && (
          <p className="text-sm text-muted-foreground">{field.description}</p>
        )}
      </div>
    ));
  };

  const installedPlugins = plugins.filter(p => templates.some(t => t.id === p.pluginTemplateId));
  const availableTemplates = templates.filter(t => !plugins.some(p => p.pluginTemplateId === t.id));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Chatbot Plugins</h3>
          <p className="text-muted-foreground">Manage plugins for {chatbotName}</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Plugin
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Plugin to Chatbot</DialogTitle>
              <DialogDescription>
                Choose a plugin template to add to your chatbot
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {templatesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : availableTemplates.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No available plugins to add. All available plugins are already installed.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid gap-4">
                  {availableTemplates.map((template) => (
                    <Card key={template.id} className="cursor-pointer hover:bg-accent/50" onClick={() => handleAddPlugin(template)}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {getPluginTypeIcon(template.type)}
                              <CardTitle className="text-base">{template.name}</CardTitle>
                              <Badge variant="outline">Version {template.version}</Badge>
                            </div>
                            <CardDescription>{template.description}</CardDescription>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span className="capitalize">{template.type}</span>
                              <span>•</span>
                              <span className="capitalize">{template.category}</span>
                            </div>
                          </div>
                          <Button size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Add
                          </Button>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="installed">Installed Plugins</TabsTrigger>
          <TabsTrigger value="available">Available Plugins</TabsTrigger>
        </TabsList>
        
        <TabsContent value="installed" className="space-y-4">
          {pluginsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : installedPlugins.length === 0 ? (
            <Alert>
              <AlertDescription>
                No plugins installed yet. Click "Add Plugin" to get started.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4">
              {installedPlugins.map((plugin) => (
                <Card key={plugin.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {getPluginTypeIcon(plugin.pluginTemplate.category)}
                          <CardTitle className="text-base">{plugin.pluginTemplate.name}</CardTitle>
                          <Badge variant={plugin.is_enabled ? "default" : "secondary"}>
                            {plugin.is_enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                        <CardDescription>{plugin.pluginTemplate.description}</CardDescription>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Used {plugin.usage_count} times</span>
                          {plugin.last_used_at && (
                            <span>Last used {new Date(plugin.last_used_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={plugin.is_enabled}
                          onCheckedChange={(checked) => handleTogglePlugin(plugin, checked)}
                          disabled={togglePluginMutation.isPending}
                        />
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleConfigurePlugin(plugin)}
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Configure
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleConfigureTriggers(plugin)}
                        >
                          <Zap className="w-4 h-4 mr-2" />
                          Triggers
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => removePluginMutation.mutate(plugin.id)}
                          disabled={removePluginMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="available" className="space-y-4">
          {templatesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : availableTemplates.length === 0 ? (
            <Alert>
              <AlertDescription>
                All available plugins are already installed.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4">
              {availableTemplates.map((template) => (
                <Card key={template.id} className="cursor-pointer hover:bg-accent/50" onClick={() => handleAddPlugin(template)}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {getPluginTypeIcon(template.type)}
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <Badge variant="outline">Version {template.version}</Badge>
                        </div>
                        <CardDescription>{template.description}</CardDescription>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="capitalize">{template.type}</span>
                          <span>•</span>
                          <span className="capitalize">{template.category}</span>
                        </div>
                      </div>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Configuration Dialog */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure Plugin</DialogTitle>
            <DialogDescription>
              Set up the configuration for {selectedPlugin?.pluginTemplate.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPlugin && renderConfigForm(selectedPlugin.pluginTemplate.configSchema, configFormData)}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveConfig} disabled={updatePluginMutation.isPending}>
              {updatePluginMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trigger Rules Dialog */}
      <Dialog open={isTriggerDialogOpen} onOpenChange={setIsTriggerDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure Trigger Rules</DialogTitle>
            <DialogDescription>
              Set up when this plugin should be automatically triggered
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label>Keywords</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Plugin will trigger when any of these keywords are found in the user message
              </p>
              <div className="flex gap-2">
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder="Add keyword..."
                  onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                />
                <Button type="button" onClick={handleAddKeyword} size="sm">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {triggerFormData.keywords.map(keyword => (
                  <Badge key={keyword} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveKeyword(keyword)}>
                    {keyword} ×
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <Label htmlFor="messageCount">Message Count</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Trigger after this many messages in the conversation
              </p>
              <Input
                id="messageCount"
                type="number"
                value={triggerFormData.messageCount || ""}
                onChange={(e) => setTriggerFormData(prev => ({ 
                  ...prev, 
                  messageCount: parseInt(e.target.value) || 0 
                }))}
                placeholder="0 = disabled"
                min="0"
              />
            </div>

            <Separator />

            <div>
              <Label>Conversation Patterns</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Trigger based on patterns in the conversation
              </p>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="containsEmail"
                    checked={triggerFormData.conversationPatterns.containsEmail}
                    onCheckedChange={(checked) => setTriggerFormData(prev => ({
                      ...prev,
                      conversationPatterns: { ...prev.conversationPatterns, containsEmail: !!checked }
                    }))}
                  />
                  <Label htmlFor="containsEmail">Contains email address</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="containsPhone"
                    checked={triggerFormData.conversationPatterns.containsPhone}
                    onCheckedChange={(checked) => setTriggerFormData(prev => ({
                      ...prev,
                      conversationPatterns: { ...prev.conversationPatterns, containsPhone: !!checked }
                    }))}
                  />
                  <Label htmlFor="containsPhone">Contains phone number</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="containsUrl"
                    checked={triggerFormData.conversationPatterns.containsUrl}
                    onCheckedChange={(checked) => setTriggerFormData(prev => ({
                      ...prev,
                      conversationPatterns: { ...prev.conversationPatterns, containsUrl: !!checked }
                    }))}
                  />
                  <Label htmlFor="containsUrl">Contains URL</Label>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <Label>Time Conditions</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Restrict when the plugin can trigger
              </p>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="businessHoursOnly"
                  checked={triggerFormData.timeConditions.businessHoursOnly}
                  onCheckedChange={(checked) => setTriggerFormData(prev => ({
                    ...prev,
                    timeConditions: { ...prev.timeConditions, businessHoursOnly: !!checked }
                  }))}
                />
                <Label htmlFor="businessHoursOnly">Business hours only (9 AM - 5 PM, Mon-Fri)</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTriggerDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTriggers} disabled={updatePluginMutation.isPending}>
              {updatePluginMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Trigger Rules
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
