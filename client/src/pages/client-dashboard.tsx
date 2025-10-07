import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, MessageCircle, Users, LogOut, ArrowLeft } from "lucide-react";
import LeadsTabComponent from "@/components/LeadsTab";

type ClientUser = {
  id: string;
  name: string;
  contactEmail: string;
  authEmail: string;
  industry?: string;
  description?: string;
  status: string;
  role: string;
  createdAt: string;
};

type ClientAuthResponse = {
  user: ClientUser;
};

type Appointment = {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  status: "scheduled" | "completed" | "cancelled";
  chatbot: {
    id: string;
    name: string;
  };
};

type Conversation = {
  id: string;
  sessionId: string;
  startedAt: string;
  lastMessageAt: string;
  chatbot: {
    id: string;
    name: string;
  };
  messages?: Message[];
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type Lead = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  source?: string;
  status: "new" | "contacted" | "qualified" | "converted" | "lost";
  createdAt: string;
  chatbot: {
    id: string;
    name: string;
  };
};

export default function ClientDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  // Check authentication
  const { data: authData, isLoading, error } = useQuery<ClientAuthResponse>({
    queryKey: ["/api/client/me"],
    retry: false,
  });

  // Fetch client data
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/client/appointments"],
    enabled: !!authData,
  });

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/client/chats"],
    enabled: !!authData,
  });

  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/client/leads"],
    enabled: !!authData,
  });

  // Fetch conversation messages when a conversation is selected
  const { data: conversationWithMessages, isLoading: messagesLoading } = useQuery<Conversation>({
    queryKey: ["/api/client/chats", selectedConversation, "messages"],
    enabled: !!selectedConversation,
  });

  useEffect(() => {
    if (!isLoading && (error || !authData)) {
      setLocation("/client/login");
    }
  }, [authData, isLoading, error, setLocation]);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/client/logout", {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.clear();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out",
      });
      setLocation("/client/login");
    },
    onError: (error: Error) => {
      toast({
        title: "Logout Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!authData) {
    return null;
  }

  const user = authData.user;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
      case 'active':
      case 'new':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'completed':
      case 'converted':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'cancelled':
      case 'lost':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'contacted':
      case 'qualified':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  // Appointments Tab Content
  const AppointmentsTab = () => (
    <div className="space-y-4">
      {appointmentsLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Appointments</h3>
            <p className="text-muted-foreground">You don't have any appointments scheduled yet.</p>
          </CardContent>
        </Card>
      ) : (
        appointments.map((appointment) => (
          <Card key={appointment.id} data-testid={`card-appointment-${appointment.id}`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2" data-testid={`text-appointment-title-${appointment.id}`}>
                    {appointment.title}
                  </h3>
                  {appointment.description && (
                    <p className="text-muted-foreground mb-3" data-testid={`text-appointment-description-${appointment.id}`}>
                      {appointment.description}
                    </p>
                  )}
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span data-testid={`text-appointment-date-${appointment.id}`}>
                      {formatDate(appointment.startTime)}
                    </span>
                    <span data-testid={`text-appointment-time-${appointment.id}`}>
                      {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                    </span>
                    <span data-testid={`text-appointment-chatbot-${appointment.id}`}>
                      via {appointment.chatbot.name}
                    </span>
                  </div>
                </div>
                <Badge 
                  className={getStatusColor(appointment.status)}
                  data-testid={`status-appointment-${appointment.id}`}
                >
                  {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  // Chats Tab Content
  const ChatsTab = () => {
    if (selectedConversation) {
      return (
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSelectedConversation(null)}
              data-testid="button-back-to-chats"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Conversations
            </Button>
          </div>
          
          {messagesLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded"></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : conversationWithMessages ? (
            <Card>
              <CardHeader>
                <CardTitle data-testid={`text-conversation-title-${conversationWithMessages.id}`}>
                  Conversation with {conversationWithMessages.chatbot.name}
                </CardTitle>
                <p className="text-sm text-muted-foreground" data-testid={`text-conversation-date-${conversationWithMessages.id}`}>
                  Started on {formatDate(conversationWithMessages.startedAt)}
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {conversationWithMessages.messages?.map((message) => (
                    <div 
                      key={message.id} 
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      data-testid={`message-${message.id}`}
                    >
                      <div className={`max-w-[70%] p-3 rounded-lg ${
                        message.role === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        <p data-testid={`text-message-content-${message.id}`}>{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.role === 'user' 
                            ? 'text-primary-foreground/70' 
                            : 'text-muted-foreground'
                        }`} data-testid={`text-message-time-${message.id}`}>
                          {formatTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">Conversation not found.</p>
              </CardContent>
            </Card>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {conversationsLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-16 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Conversations</h3>
              <p className="text-muted-foreground">You haven't started any conversations yet.</p>
            </CardContent>
          </Card>
        ) : (
          conversations.map((conversation) => (
            <Card 
              key={conversation.id} 
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setSelectedConversation(conversation.id)}
              data-testid={`card-conversation-${conversation.id}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2" data-testid={`text-conversation-chatbot-${conversation.id}`}>
                      {conversation.chatbot.name}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span data-testid={`text-conversation-started-${conversation.id}`}>
                        Started: {formatDate(conversation.startedAt)}
                      </span>
                      <span data-testid={`text-conversation-last-message-${conversation.id}`}>
                        Last activity: {formatDate(conversation.lastMessageAt)}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span data-testid={`text-conversation-session-${conversation.id}`}>
                      Session: {conversation.sessionId}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    );
  };

  // Leads Tab Content
  const LeadsTab = () => {
    if (!authData?.user) return null;
    return <LeadsTabComponent clientId={authData.user.id} />;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-welcome-message">
              Welcome back, {user.name}
            </h1>
            <p className="text-muted-foreground" data-testid="text-user-email">
              {user.contactEmail}
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {logoutMutation.isPending ? "Logging out..." : "Logout"}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <Tabs defaultValue="appointments" className="w-full" data-testid="tabs-client-dashboard">
          <TabsList className="grid w-full grid-cols-3" data-testid="tabs-list-client-dashboard">
            <TabsTrigger value="appointments" data-testid="tab-trigger-appointments">
              <Calendar className="w-4 h-4 mr-2" />
              Appointments
            </TabsTrigger>
            <TabsTrigger value="chats" data-testid="tab-trigger-chats">
              <MessageCircle className="w-4 h-4 mr-2" />
              Chats
            </TabsTrigger>
            <TabsTrigger value="leads" data-testid="tab-trigger-leads">
              <Users className="w-4 h-4 mr-2" />
              Leads
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="appointments" className="mt-6" data-testid="tab-content-appointments">
            <AppointmentsTab />
          </TabsContent>
          
          <TabsContent value="chats" className="mt-6" data-testid="tab-content-chats">
            <ChatsTab />
          </TabsContent>
          
          <TabsContent value="leads" className="mt-6" data-testid="tab-content-leads">
            <LeadsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}