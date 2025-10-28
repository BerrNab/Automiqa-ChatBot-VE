import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ChatbotWithClient, WidgetAnalytics } from "../../shared/schema";

interface ChatbotWidget extends ChatbotWithClient {
  analytics?: WidgetAnalytics;
}

export default function WidgetsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: widgets, isLoading } = useQuery<ChatbotWidget[]>({
    queryKey: ["/api/widgets"],
  });

  const regenerateWidgetMutation = useMutation({
    mutationFn: async (chatbotId: string) => {
      const response = await apiRequest("POST", `/api/widgets/${chatbotId}/regenerate`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/widgets"] });
      toast({
        title: "Widget Regenerated",
        description: "New widget URL has been generated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Regeneration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to Clipboard",
        description: `${type} has been copied to your clipboard`,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string, subscriptionStatus?: string) => {
    if (status === "active" && subscriptionStatus === "active") {
      return <Badge className="bg-green-500/10 text-green-500">Active</Badge>;
    } else if (status === "active" && subscriptionStatus === "trial") {
      return <Badge className="bg-blue-500/10 text-blue-500">Trial</Badge>;
    } else if (subscriptionStatus === "expired") {
      return <Badge className="bg-red-500/10 text-red-500">Expired</Badge>;
    } else {
      return <Badge className="bg-gray-500/10 text-gray-500">Inactive</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold">Widget URLs</h3>
            <p className="text-muted-foreground">Generate and manage chatbot widget embed codes</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-48 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Widget URLs</h3>
          <p className="text-muted-foreground">Generate and manage chatbot widget embed codes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {widgets?.length ? (
          widgets.map((widget) => (
            <Card key={widget.id} data-testid={`card-widget-${widget.id}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold" data-testid={`text-widget-name-${widget.id}`}>
                        {widget.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">{widget.client.name}</p>
                    </div>
                  </div>
                  {getStatusBadge(widget.status, widget.subscription?.status)}
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Widget URL</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Input 
                        value={widget.widgetUrl} 
                        readOnly 
                        className="font-mono text-sm"
                        data-testid={`input-widget-url-${widget.id}`}
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => copyToClipboard(widget.widgetUrl, "Widget URL")}
                        data-testid={`button-copy-url-${widget.id}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                        </svg>
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Embed Code</label>
                    <div className="mt-1 bg-muted rounded-lg p-3">
                      <code className="text-xs font-mono text-muted-foreground break-all" data-testid={`text-embed-code-${widget.id}`}>
                        {`<script src="${widget.widgetUrl}.js"></script>`}
                      </code>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-2 text-xs"
                      onClick={() => copyToClipboard(`<script src="${widget.widgetUrl}.js"></script>`, "Embed Code")}
                      data-testid={`button-copy-embed-${widget.id}`}
                    >
                      Copy Embed Code
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Status:</span>
                        <span className={`font-medium ml-1 ${
                          widget.status === "active" ? "text-green-500" : "text-gray-500"
                        }`}>
                          {widget.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Views:</span>
                        <span className="font-medium ml-1" data-testid={`text-views-${widget.id}`}>
                          {widget.analytics?.views || 0}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => regenerateWidgetMutation.mutate(widget.id)}
                        disabled={regenerateWidgetMutation.isPending}
                        data-testid={`button-regenerate-${widget.id}`}
                      >
                        Regenerate
                      </Button>
                      <button 
                        className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors" 
                        title="Widget Settings"
                        data-testid={`button-settings-${widget.id}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">No Widgets Found</h3>
            <p className="text-muted-foreground">Create chatbots to generate widget URLs</p>
          </div>
        )}
      </div>
    </div>
  );
}
