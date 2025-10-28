import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CreateClientModal from "./CreateClientModal";
import ClientCredentialsModal from "./ClientCredentialsModal.tsx";
import ClientDetailsModal from "./ClientDetailsModal";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ClientWithChatbots } from "../../shared/schema";

export default function ClientsTab() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientWithChatbots | null>(null);
  const [editingClient, setEditingClient] = useState<ClientWithChatbots | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clients, isLoading } = useQuery<ClientWithChatbots[]>({
    queryKey: ["/api/clients"],
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      await apiRequest("DELETE", `/api/clients/${clientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Client Deleted",
        description: "Client has been successfully deleted",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string, chatbotCount: number) => {
    if (status === "active" && chatbotCount > 0) {
      return <Badge className="bg-green-500/10 text-green-500">Active</Badge>;
    } else if (status === "active" && chatbotCount === 0) {
      return <Badge className="bg-blue-500/10 text-blue-500">Setup Required</Badge>;
    } else {
      return <Badge className="bg-gray-500/10 text-gray-500">Inactive</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold">Client Management</h3>
            <p className="text-muted-foreground">Create and manage client business entities</p>
          </div>
          <Button disabled>Create Client</Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Client Management</h3>
          <p className="text-muted-foreground">Create and manage client business entities</p>
        </div>
        <Button 
          onClick={() => {
            setEditingClient(null);
            setShowCreateModal(true);
          }}
          data-testid="button-create-client"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
          Create Client
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="border-b border-border">
                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Client Name</th>
                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Contact Email</th>
                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Status</th>
                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Portal Access</th>
                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Chatbots</th>
                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Created</th>
                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients?.length ? (
                clients.map((client) => (
                  <tr key={client.id} className="border-b border-border hover:bg-muted/30 transition-colors" data-testid={`row-client-${client.id}`}>
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-medium" data-testid={`text-client-name-${client.id}`}>{client.name}</p>
                        <p className="text-sm text-muted-foreground">{client.industry}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-muted-foreground">{client.contactEmail}</td>
                    <td className="py-4 px-6">
                      {getStatusBadge(client.status, client.chatbots.length)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        {(client as any).authEmail ? (
                          <Badge className="bg-green-500/10 text-green-500">Enabled</Badge>
                        ) : (
                          <Badge className="bg-gray-500/10 text-gray-500">Disabled</Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedClient(client);
                            setShowCredentialsModal(true);
                          }}
                          data-testid={`button-manage-access-${client.id}`}
                        >
                          Manage Access
                        </Button>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium" data-testid={`text-chatbot-count-${client.id}`}>
                          {client.chatbots.length}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          chatbot{client.chatbots.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-muted-foreground">
                      {new Date(client.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <button 
                          className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors" 
                          title="Edit"
                          onClick={() => {
                            setEditingClient(client);
                            setShowCreateModal(true);
                          }}
                          data-testid={`button-edit-client-${client.id}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </button>
                        <button 
                          className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors" 
                          title="View Details"
                          onClick={() => {
                            setSelectedClient(client);
                            setShowDetailsModal(true);
                          }}
                          data-testid={`button-view-client-${client.id}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                          </svg>
                        </button>
                        <button 
                          className="p-1 text-red-500 hover:text-red-400 rounded transition-colors" 
                          title="Delete"
                          onClick={() => deleteClientMutation.mutate(client.id)}
                          disabled={deleteClientMutation.isPending}
                          data-testid={`button-delete-client-${client.id}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 px-6 text-center text-muted-foreground">
                    No clients found. Create your first client to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <CreateClientModal 
        open={showCreateModal} 
        onOpenChange={(open) => {
          setShowCreateModal(open);
          if (!open) setEditingClient(null);
        }}
        client={editingClient}
      />

      {selectedClient && (
        <>
          <ClientCredentialsModal
            client={selectedClient}
            open={showCredentialsModal}
            onOpenChange={setShowCredentialsModal}
          />
          <ClientDetailsModal
            client={selectedClient}
            open={showDetailsModal}
            onOpenChange={setShowDetailsModal}
          />
        </>
      )}
    </div>
  );
}
