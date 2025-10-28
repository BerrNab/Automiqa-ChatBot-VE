import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import EmbedCodeModal from "./EmbedCodeModal";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Settings, Code, BarChart2, Power, Plus } from "lucide-react";
import type { ChatbotWithClient, Chatbot } from "../../shared/schema";

export default function ChatbotsTab() {
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [selectedChatbot, setSelectedChatbot] = useState<Chatbot | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: chatbots, isLoading } = useQuery<ChatbotWithClient[]>({
    queryKey: ["/api/chatbots"],
  });

  const updateChatbotStatusMutation = useMutation({
    mutationFn: async ({ chatbotId, status }: { chatbotId: string; status: string }) => {
      await apiRequest("PATCH", `/api/chatbots/${chatbotId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chatbots"] });
      toast({
        title: "Status Updated",
        description: "Chatbot status has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
            <h3 className="text-xl font-semibold">Chatbot Configuration</h3>
            <p className="text-muted-foreground">Configure and manage client chatbots</p>
          </div>
          <Button disabled>Create Chatbot</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-40 bg-muted rounded"></div>
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
          <h3 className="text-xl font-semibold">Chatbot Configuration</h3>
          <p className="text-muted-foreground">Configure and manage client chatbots</p>
        </div>
        <Button 
          onClick={() => setLocation('/admin/chatbots/create')}
          data-testid="button-create-chatbot"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Chatbot
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {chatbots?.length ? (
          chatbots.map((chatbot) => (
            <Card key={chatbot.id} className="hover:shadow-lg transition-shadow" data-testid={`card-chatbot-${chatbot.id}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold" data-testid={`text-chatbot-name-${chatbot.id}`}>{chatbot.name}</h4>
                      <p className="text-sm text-muted-foreground">{chatbot.client.name}</p>
                    </div>
                  </div>
                  {getStatusBadge(chatbot.status, chatbot.subscription?.status)}
                </div>
                
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Messages Today:</span>
                    <span className="font-medium" data-testid={`text-message-count-${chatbot.id}`}>
                      {chatbot.messageCount ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Response Rate:</span>
                    <span className="font-medium" data-testid={`text-response-rate-${chatbot.id}`}>
                      {chatbot.responseRate ?? 0}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Updated:</span>
                    <span className="font-medium">
                      {chatbot.updatedAt 
                        ? new Date(chatbot.updatedAt).toLocaleDateString()
                        : 'Never'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="secondary" 
                    className="flex-1"
                    onClick={() => setLocation(`/admin/chatbots/${chatbot.id}/edit`)}
                    data-testid={`button-configure-${chatbot.id}`}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Configure
                  </Button>
                  <button 
                    className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors" 
                    title="Get Embed Code"
                    onClick={() => {
                      setSelectedChatbot(chatbot as any);
                      setShowEmbedModal(true);
                    }}
                    data-testid={`button-widget-${chatbot.id}`}
                  >
                    <Code className="w-4 h-4" />
                  </button>
                  <button 
                    className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors" 
                    title="Analytics"
                    onClick={() => setLocation(`/admin/chatbots/${chatbot.id}/analytics`)}
                    data-testid={`button-analytics-${chatbot.id}`}
                  >
                    <BarChart2 className="w-4 h-4" />
                  </button>
                  <button 
                    className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors" 
                    title={chatbot.status === "active" ? "Deactivate" : "Activate"}
                    onClick={() => updateChatbotStatusMutation.mutate({
                      chatbotId: chatbot.id,
                      status: chatbot.status === "active" ? "inactive" : "active"
                    })}
                    disabled={updateChatbotStatusMutation.isPending}
                    data-testid={`button-toggle-status-${chatbot.id}`}
                  >
                    <Power className={`w-4 h-4 ${chatbot.status === "active" ? "text-green-500" : "text-gray-400"}`} />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">No Chatbots Found</h3>
            <p className="text-muted-foreground mb-4">Create your first chatbot to get started</p>
            <Button onClick={() => setLocation('/admin/chatbots/create')}>
              Create Chatbot
            </Button>
          </div>
        )}
      </div>

      <EmbedCodeModal
        chatbot={selectedChatbot}
        open={showEmbedModal}
        onOpenChange={(open) => {
          setShowEmbedModal(open);
          if (!open) {
            setSelectedChatbot(null);
          }
        }}
      />
    </div>
  );
}
