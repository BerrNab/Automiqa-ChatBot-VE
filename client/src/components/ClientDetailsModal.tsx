import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { ClientWithChatbots } from "../../shared/schema";

interface ClientDetailsModalProps {
  client: ClientWithChatbots;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ClientDetailsModal({ client, open, onOpenChange }: ClientDetailsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Client Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Company Name</p>
                <p className="font-medium">{client.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Industry</p>
                <p className="font-medium">{client.industry}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contact Email</p>
                <p className="font-medium">{client.contactEmail}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-1">
                  {client.status === "active" ? (
                    <Badge className="bg-green-500/10 text-green-500">Active</Badge>
                  ) : (
                    <Badge className="bg-gray-500/10 text-gray-500">Inactive</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {client.description && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
              <p className="text-sm">{client.description}</p>
            </div>
          )}

          {/* Portal Access */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Portal Access</h3>
            <div className="flex items-center space-x-2">
              {(client as any).authEmail ? (
                <>
                  <Badge className="bg-green-500/10 text-green-500">Enabled</Badge>
                  <span className="text-sm text-muted-foreground">
                    Access email: {(client as any).authEmail}
                  </span>
                </>
              ) : (
                <Badge className="bg-gray-500/10 text-gray-500">Disabled</Badge>
              )}
            </div>
          </div>

          {/* Chatbots */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Chatbots ({client.chatbots.length})
            </h3>
            {client.chatbots.length > 0 ? (
              <div className="space-y-2">
                {client.chatbots.map((chatbot) => (
                  <div
                    key={chatbot.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{chatbot.name}</p>
                      {chatbot.description && (
                        <p className="text-sm text-muted-foreground">{chatbot.description}</p>
                      )}
                    </div>
                    <Badge className="bg-blue-500/10 text-blue-500">
                      {chatbot.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No chatbots configured yet</p>
            )}
          </div>

          {/* Metadata */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Metadata</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Created At</p>
                <p className="text-sm font-medium">
                  {new Date(client.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="text-sm font-medium">
                  {new Date(client.updatedAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Client ID</p>
                <p className="text-sm font-mono">{client.id}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
