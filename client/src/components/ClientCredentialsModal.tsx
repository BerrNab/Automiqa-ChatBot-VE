import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { clientCredentialsSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ClientWithChatbots, ClientCredentials, ClientPortalStatus } from "@shared/schema";
import { Copy, Key, Shield, UserCheck, UserX, ExternalLink } from "lucide-react";

interface ClientCredentialsModalProps {
  client: ClientWithChatbots;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ClientCredentialsModal({ client, open, onOpenChange }: ClientCredentialsModalProps) {
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current portal status
  const { data: portalStatus, isLoading: statusLoading } = useQuery<ClientPortalStatus>({
    queryKey: [`/api/clients/${client.id}/portal-status`],
    enabled: open,
  });

  const form = useForm<ClientCredentials>({
    resolver: zodResolver(clientCredentialsSchema),
    defaultValues: {
      authEmail: "",
      password: "",
    },
  });

  // Generate credentials mutation
  const generateCredentialsMutation = useMutation({
    mutationFn: async (data: ClientCredentials) => {
      const response = await apiRequest("POST", `/api/clients/${client.id}/credentials`, data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${client.id}/portal-status`] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Credentials Generated",
        description: `Portal access enabled for ${client.name}. Share the login details securely with your client.`,
      });
      setShowGenerateForm(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Generate Credentials",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Revoke access mutation
  const revokeAccessMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/clients/${client.id}/credentials`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${client.id}/portal-status`] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Access Revoked",
        description: `Portal access has been disabled for ${client.name}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Revoke Access",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ClientCredentials) => {
    generateCredentialsMutation.mutate(data);
  };

  const generateSecurePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    form.setValue("password", password);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Please copy the text manually",
        variant: "destructive",
      });
    }
  };

  if (statusLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Client Portal Access - {client.name}</DialogTitle>
            <DialogDescription>Manage portal access and credentials for this client.</DialogDescription>
          </DialogHeader>
          <div className="py-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading portal status...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Key className="w-5 h-5" />
            <span>Client Portal Access - {client.name}</span>
          </DialogTitle>
          <DialogDescription>Manage portal access and credentials for this client.</DialogDescription>
        </DialogHeader>

        {/* Current Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Current Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Portal Access:</span>
              {portalStatus?.hasAccess ? (
                <Badge className="bg-green-500/10 text-green-500 flex items-center space-x-1">
                  <UserCheck className="w-3 h-3" />
                  <span>Enabled</span>
                </Badge>
              ) : (
                <Badge className="bg-gray-500/10 text-gray-500 flex items-center space-x-1">
                  <UserX className="w-3 h-3" />
                  <span>Disabled</span>
                </Badge>
              )}
            </div>

            {portalStatus?.hasAccess && portalStatus.authEmail && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Login Email:</span>
                  <div className="flex items-center space-x-2">
                    <code className="bg-muted px-2 py-1 rounded text-sm">{portalStatus.authEmail}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(portalStatus.authEmail!, "Email")}
                      data-testid="button-copy-email"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium">Portal URL:</span>
                  <div className="flex items-center space-x-2">
                    <code className="bg-muted px-2 py-1 rounded text-sm max-w-64 truncate">{portalStatus.portalUrl}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(portalStatus.portalUrl, "Portal URL")}
                      data-testid="button-copy-url"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(portalStatus.portalUrl, '_blank')}
                      data-testid="button-open-portal"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-4">
          {!portalStatus?.hasAccess ? (
            // Generate Credentials Section
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Generate Portal Access</CardTitle>
              </CardHeader>
              <CardContent>
                {!showGenerateForm ? (
                  <div className="text-center space-y-4">
                    <p className="text-muted-foreground">
                      This client doesn't have portal access yet. Generate credentials to enable their access.
                    </p>
                    <Button 
                      onClick={() => setShowGenerateForm(true)}
                      data-testid="button-enable-access"
                    >
                      <Key className="w-4 h-4 mr-2" />
                      Enable Portal Access
                    </Button>
                  </div>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="form-generate-credentials">
                      <FormField
                        control={form.control}
                        name="authEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Login Email</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="client@example.com" 
                                {...field} 
                                data-testid="input-auth-email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <div className="flex items-center space-x-2">
                              <FormControl>
                                <Input 
                                  type="text" 
                                  placeholder="Enter a secure password" 
                                  {...field} 
                                  data-testid="input-password"
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={generateSecurePassword}
                                data-testid="button-generate-password"
                              >
                                Generate
                              </Button>
                            </div>
                            <FormMessage />
                            <p className="text-xs text-muted-foreground">
                              Minimum 8 characters with letters and numbers
                            </p>
                          </FormItem>
                        )}
                      />
                      
                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium text-amber-800 dark:text-amber-200">Security Note</p>
                            <p className="text-amber-700 dark:text-amber-300 mt-1">
                              Share these credentials securely with your client. Consider using encrypted communication 
                              or asking them to change the password after first login.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-end space-x-3 pt-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowGenerateForm(false)}
                          data-testid="button-cancel-generate"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={generateCredentialsMutation.isPending}
                          data-testid="button-submit-credentials"
                        >
                          {generateCredentialsMutation.isPending ? "Generating..." : "Generate Credentials"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          ) : (
            // Revoke Access Section
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-red-600">Revoke Portal Access</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  This will disable the client's portal access and invalidate their login credentials.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      disabled={revokeAccessMutation.isPending}
                      data-testid="button-revoke-access"
                    >
                      <UserX className="w-4 h-4 mr-2" />
                      {revokeAccessMutation.isPending ? "Revoking..." : "Revoke Access"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Revoke Portal Access</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to revoke portal access for <strong>{client.name}</strong>? 
                        This will prevent them from logging into their client portal and cannot be undone 
                        without generating new credentials.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel data-testid="button-cancel-revoke">Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => revokeAccessMutation.mutate()}
                        className="bg-red-600 hover:bg-red-700"
                        data-testid="button-confirm-revoke"
                      >
                        Revoke Access
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}