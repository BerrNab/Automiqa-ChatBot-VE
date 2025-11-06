import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Edit, Trash2, Play, Settings, BarChart3, Code, Webhook, Globe, ArrowLeft, ArrowRight, Terminal } from "lucide-react";

interface PluginTemplate {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  tags: string[];
  isActive: boolean;
  isPublic: boolean;
  configSchema: string;
  apiConfiguration: string;
  inputSchema: string;
  outputSchema: string;
  createdAt: string;
  updatedAt: string;
}

interface PluginStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  activeInstances: number;
}

const pluginCategories = [
  "general",
  "communication",
  "analytics",
  "automation",
  "integration",
  "data",
  "external"
];

export default function PluginsTab() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<PluginTemplate | null>(null);
  const [activeTab, setActiveTab] = useState("templates");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const totalWizardSteps = 4;

  // Form state for creating/editing plugins
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "general",
    tags: [] as string[],
    isActive: true,
    isPublic: true,
    configSchema: "{}",
    apiConfiguration: {
      url: "",
      method: "POST",
      headers: [] as { key: string; value: string }[],
    },
    inputSchema: "{}",
    outputSchema: "{}"
  });

  const [tagInput, setTagInput] = useState("");
  const [showCurlImport, setShowCurlImport] = useState(false);
  const [curlCommand, setCurlCommand] = useState("");

  // Fetch plugin templates
  const { data: plugins = [], isLoading, error } = useQuery({
    queryKey: ["/api/plugins/templates/admin"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/plugins/templates/admin");
      return response.json() as Promise<PluginTemplate[]>;
    }
  });

  // Create plugin mutation
  const createPluginMutation = useMutation({
    mutationFn: async (data: any) => {
      if (typeof data.apiConfiguration === 'string') {
        data.apiConfiguration = JSON.parse(data.apiConfiguration);
      }
      const response = await apiRequest("POST", "/api/plugins/templates/admin", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plugins/templates/admin"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Plugin template created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create plugin",
        variant: "destructive"
      });
    }
  });

  // Update plugin mutation
  const updatePluginMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PUT", `/api/plugins/templates/admin/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plugins/templates/admin"] });
      setIsEditDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Plugin template updated successfully"
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

  // Delete plugin mutation
  const deletePluginMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/plugins/templates/admin/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plugins/templates/admin"] });
      toast({
        title: "Success",
        description: "Plugin template deleted successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete plugin",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: "general",
      tags: [],
      isActive: true,
      isPublic: true,
      configSchema: "{}",
      apiConfiguration: "{}",
      inputSchema: "{}",
      outputSchema: "{}"
    });
    setTagInput("");
    setWizardStep(1);
  };

  const nextStep = () => {
    try {
      if (wizardStep === 2) {
        JSON.parse(formData.configSchema);
      }
      if (wizardStep === 4) {
        JSON.parse(formData.inputSchema);
        if (formData.outputSchema.trim() !== "" && formData.outputSchema.trim() !== "{}") {
          JSON.parse(formData.outputSchema);
        }
      }

      if (wizardStep < totalWizardSteps) {
        setWizardStep(wizardStep + 1);
      }
    } catch (error) {
      toast({
        title: "Validation Error",
        description: "Invalid JSON in one of the schema fields.",
        variant: "destructive",
      });
    }
  };

  const prevStep = () => {
    if (wizardStep > 1) {
      setWizardStep(wizardStep - 1);
    }
  };

  const parseCurlCommand = (curl: string) => {
    try {
      let command = curl
        .replace(/\\\n/g, ' ')
        .replace(/\^\n/g, ' ')
        .replace(/\^"/g, '"')
        .replace(/\^\^/g, '^')
        .replace(/\s+/g, ' ')
        .trim();

      const urlMatch = command.match(/curl\s+(?:-X\s+\w+\s+)?["']?(https?:\/\/[^\s"'^]+)["']?/) || command.match(/["']?(https?:\/\/[^\s"'^]+)["']?/);
      if (!urlMatch) {
        throw new Error('Could not extract URL from cURL command');
      }
      const url = urlMatch[1].replace(/"/g, '').replace(/\^/g, '');

      const methodMatch = command.match(/-X\s+(GET|POST|PUT|DELETE|PATCH)/i);
      const method = methodMatch ? methodMatch[1].toUpperCase() : 'POST';

      const headerRegex = /-H\s+["']([^:]+):\s*([^"']+)["']/g;
      const extractedHeaders: { key: string; value: string }[] = [];
      let headerMatch;
      while ((headerMatch = headerRegex.exec(command)) !== null) {
        const key = headerMatch[1].trim();
        const value = headerMatch[2].trim();
        if (!['sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform', 'User-Agent', 'Referer', 'Accept'].includes(key)) {
          extractedHeaders.push({ key, value });
        }
      }

      const dataMatch = command.match(/--data(?:-raw|-binary)?\s+["'](.+?)["']\s*$/s) || command.match(/--data(?:-raw|-binary)?\s+["'](.+?)["']/) || command.match(/-d\s+["'](.+?)["']/s);
      
      let bodyData = null;
      if (dataMatch) {
        try {
          let jsonStr = dataMatch[1]
            .replace(/\^\{/g, '{')
            .replace(/\^\}/g, '}')
            .replace(/\^\\"/g, '"')
            .replace(/\\"/g, '"')
            .replace(/\^\^"/g, '"')
            .replace(/\^"/g, '"')
            .trim();
          bodyData = JSON.parse(jsonStr);
        } catch (e) {
          console.error('Failed to parse JSON body:', e);
          try {
            let cleanJson = dataMatch[1]
              .replace(/\^/g, '')
              .replace(/\\"/g, '"');
            bodyData = JSON.parse(cleanJson);
          } catch (e2) {
            console.error('Second JSON parse attempt failed:', e2);
          }
        }
      }

      setFormData(prev => ({
        ...prev,
        apiConfiguration: {
          url,
          method,
          headers: extractedHeaders
        }
      }));

      if (bodyData && typeof bodyData === 'object') {
        const properties: Record<string, { type: string; description: string }> = {};
        Object.keys(bodyData).forEach(key => {
          properties[key] = {
            type: 'string',
            description: `${key} field`
          };
        });
        setFormData(prev => ({
          ...prev,
          inputSchema: JSON.stringify({ type: 'object', properties, required: [] }, null, 2)
        }));
      }

      toast({ title: 'Success', description: 'cURL command imported successfully!' });
      setShowCurlImport(false);
      setCurlCommand('');
    } catch (error: any) {
      console.error('Error parsing cURL:', error);
      toast({ title: 'Error', description: error.message || 'Failed to parse cURL command', variant: 'destructive' });
    }
  };

  const handleEditPlugin = (plugin: PluginTemplate) => {
    setSelectedPlugin(plugin);
    setFormData({
      name: plugin.name,
      description: plugin.description || "",
      category: plugin.category,
      tags: plugin.tags || [],
      isActive: plugin.is_active,
      isPublic: plugin.is_public,
      configSchema: JSON.stringify(plugin.config_schema, null, 2),
      apiConfiguration: plugin.api_configuration || { url: "", method: "POST", headers: [] },
      inputSchema: JSON.stringify(plugin.input_schema, null, 2),
      outputSchema: JSON.stringify(plugin.output_schema, null, 2)
    });
    setWizardStep(1);
    setIsEditDialogOpen(true);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = (isEdit: boolean = false) => {
    try {
      let payload: any;

      if (isEdit && selectedPlugin) {
        // For editing, only send the fields that can be changed
        payload = {
          name: formData.name,
          tags: formData.tags,
          isActive: formData.isActive,
          isPublic: formData.isPublic,
        };
        updatePluginMutation.mutate({ id: selectedPlugin.id, data: payload });
      } else {
        // For creating, send all fields with proper validation
        payload = {
          ...formData,
          apiConfiguration: JSON.stringify(formData.apiConfiguration),
          configSchema: JSON.parse(formData.configSchema),
          inputSchema: JSON.parse(formData.inputSchema),
          outputSchema: formData.outputSchema.trim() === "" || formData.outputSchema.trim() === "{}" ? {} : JSON.parse(formData.outputSchema),
        };
        createPluginMutation.mutate(payload);
      }
    } catch (error) {
      toast({
        title: "Validation Error",
        description: "Invalid JSON in one of the schema fields.",
        variant: "destructive",
      });
    }
  };

  const getPluginCategoryIcon = (category: string) => {
    switch (category) {
      case "communication": return <Globe className="w-4 h-4" />;
      case "analytics": return <BarChart3 className="w-4 h-4" />;
      case "automation": return <Settings className="w-4 h-4" />;
      case "integration": return <Webhook className="w-4 h-4" />;
      default: return <Code className="w-4 h-4" />;
    }
  };

  if (error) {
    return (
      <Alert>
        <AlertDescription>
          Failed to load plugin templates: {error instanceof Error ? error.message : 'Unknown error'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Plugin Manager</h2>
          <p className="text-muted-foreground">Create and manage API-based plugin templates</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Plugin
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Plugin Template</DialogTitle>
              <DialogDescription>
                Define a new API-based plugin template that clients can add to their chatbots
              </DialogDescription>
            </DialogHeader>
            
            {/* Wizard Progress */}
            <div className="flex items-center justify-between mb-6">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= wizardStep ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {step}
                  </div>
                  {step < 4 && (
                    <div className={`w-16 h-1 mx-2 ${
                      step < wizardStep ? 'bg-primary' : 'bg-muted'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            {/* Wizard Step 1: Basic Info */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Plugin Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Email Service Plugin"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this plugin does..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {pluginCategories.map(category => (
                          <SelectItem key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Tags</Label>
                    <div className="flex gap-2">
                      <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        placeholder="Add tag"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                      />
                      <Button type="button" onClick={handleAddTag} size="sm">
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {formData.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveTag(tag)}>
                          {tag} ×
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Wizard Step 2: Config Schema */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="configSchema">Configuration Schema</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Define the configuration properties users need to set up (API keys, URLs, etc.)
                  </p>
                  <Textarea
                    id="configSchema"
                    value={formData.configSchema}
                    onChange={(e) => setFormData(prev => ({ ...prev, configSchema: e.target.value }))}
                    placeholder='{"type": "object", "properties": {"apiKey": {"type": "string"}}}'
                    rows={8}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            )}

            {/* Wizard Step 3: API Configuration */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">API Configuration</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowCurlImport(true)}>
                    <Terminal className="w-4 h-4 mr-2" />
                    Import from cURL
                  </Button>
                </div>
                
                <div>
                  <Label htmlFor="apiUrl">API URL</Label>
                  <Input
                    id="apiUrl"
                    value={formData.apiConfiguration.url}
                    onChange={(e) => setFormData(prev => ({ ...prev, apiConfiguration: { ...prev.apiConfiguration, url: e.target.value } }))}
                    placeholder="https://api.example.com/endpoint"
                  />
                  <p className="text-sm text-muted-foreground">
                    Use <code>{'{{config.property}}'}</code> to reference values from the config schema.
                  </p>
                </div>

                <div>
                  <Label htmlFor="httpMethod">HTTP Method</Label>
                  <Select
                    value={formData.apiConfiguration.method}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, apiConfiguration: { ...prev.apiConfiguration, method: value } }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(method => (
                        <SelectItem key={method} value={method}>{method}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Headers</Label>
                  <div className="space-y-2">
                    {formData.apiConfiguration.headers.map((header, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={header.key}
                          onChange={(e) => {
                            const newHeaders = [...formData.apiConfiguration.headers];
                            newHeaders[index].key = e.target.value;
                            setFormData(prev => ({ ...prev, apiConfiguration: { ...prev.apiConfiguration, headers: newHeaders } }));
                          }}
                          placeholder="Header Name"
                        />
                        <Input
                          value={header.value}
                          onChange={(e) => {
                            const newHeaders = [...formData.apiConfiguration.headers];
                            newHeaders[index].value = e.target.value;
                            setFormData(prev => ({ ...prev, apiConfiguration: { ...prev.apiConfiguration, headers: newHeaders } }));
                          }}
                          placeholder="Header Value"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newHeaders = formData.apiConfiguration.headers.filter((_, i) => i !== index);
                            setFormData(prev => ({ ...prev, apiConfiguration: { ...prev.apiConfiguration, headers: newHeaders } }));
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newHeaders = [...formData.apiConfiguration.headers, { key: '', value: '' }];
                        setFormData(prev => ({ ...prev, apiConfiguration: { ...prev.apiConfiguration, headers: newHeaders } }));
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Header
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Wizard Step 4: Input & Output Schemas */}
            {wizardStep === 4 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="inputSchema">Input Schema (Request Body)</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Define the structure of data that will be sent to the API
                  </p>
                  <Textarea
                    id="inputSchema"
                    value={formData.inputSchema}
                    onChange={(e) => setFormData(prev => ({ ...prev, inputSchema: e.target.value }))}
                    placeholder='{"type": "object", "properties": {"email": {"type": "string"}, "message": {"type": "string"}}}'
                    rows={6}
                    className="font-mono text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="outputSchema">Output Schema (Response)</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Define the structure of data expected from the API response
                  </p>
                  <Textarea
                    id="outputSchema"
                    value={formData.outputSchema}
                    onChange={(e) => setFormData(prev => ({ ...prev, outputSchema: e.target.value }))}
                    placeholder='{"type": "object", "properties": {"success": {"type": "boolean"}, "message": {"type": "string"}}}'
                    rows={6}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="flex justify-between">
              <div>
                {wizardStep > 1 && (
                  <Button type="button" variant="outline" onClick={prevStep}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                )}
              </div>
              
              <div className="flex gap-2">
                {wizardStep < totalWizardSteps ? (
                  <Button type="button" onClick={nextStep}>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button onClick={() => handleSubmit()} disabled={createPluginMutation.isPending}>
                    {createPluginMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Create Plugin
                  </Button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates">Plugin Templates</TabsTrigger>
          <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="templates" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <div className="grid gap-4">
              {plugins.map((plugin) => (
                <Card key={plugin.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {getPluginCategoryIcon(plugin.category)}
                          <CardTitle className="text-lg">{plugin.name}</CardTitle>
                          <Badge variant={plugin.is_active ? "default" : "secondary"}>
                            {plugin.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant={plugin.is_public ? "default" : "outline"}>
                            {plugin.is_public ? "Public" : "Private"}
                          </Badge>
                        </div>
                        <CardDescription>{plugin.description}</CardDescription>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Category: {plugin.category}</span>
                          <span>•</span>
                          <span>Version: {plugin.version}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {plugin.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditPlugin(plugin)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deletePluginMutation.mutate(plugin.id)}
                          disabled={deletePluginMutation.isPending}
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

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Usage Analytics</h3>
                <p className="text-sm text-muted-foreground">
                  Plugin usage statistics and analytics will be available here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* cURL Import Dialog */}
      <Dialog open={showCurlImport} onOpenChange={setShowCurlImport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import from cURL</DialogTitle>
            <DialogDescription>
              Paste a cURL command to automatically configure the API request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={curlCommand}
              onChange={(e) => setCurlCommand(e.target.value)}
              placeholder="Paste cURL command here"
              rows={8}
              className="font-mono text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCurlImport(false)}>Cancel</Button>
            <Button onClick={() => parseCurlCommand(curlCommand)}>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Plugin Template</DialogTitle>
            <DialogDescription>
              Update the plugin template configuration
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Plugin Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter plugin name"
              />
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="edit-isActive">Active</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isPublic"
                  checked={formData.isPublic}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPublic: checked }))}
                />
                <Label htmlFor="edit-isPublic">Public</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleSubmit(true)} disabled={updatePluginMutation.isPending}>
              {updatePluginMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update Plugin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
