import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AssignSubscriptionModal from "@/components/AssignSubscriptionModal";
import type { SubscriptionWithClient } from "../../shared/schema";

export default function SubscriptionsTab() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subscriptions, isLoading } = useQuery<SubscriptionWithClient[]>({
    queryKey: ["/api/subscriptions", statusFilter],
    queryFn: async () => {
      const url = statusFilter && statusFilter !== "all" 
        ? `/api/subscriptions?status=${encodeURIComponent(statusFilter)}`
        : "/api/subscriptions";
      
      const response = await fetch(url, {
        credentials: "include",
      });
      
      if (!response.ok) {
        const text = (await response.text()) || response.statusText;
        throw new Error(`${response.status}: ${text}`);
      }
      
      return await response.json();
    },
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ subscriptionId, action, data }: { 
      subscriptionId: string; 
      action: string; 
      data?: any 
    }) => {
      await apiRequest("PATCH", `/api/subscriptions/${subscriptionId}/${action}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      
      const actionMessages: Record<string, string> = {
        "convert-to-paid": "Converted to paid subscription",
        "extend-trial": "Trial period extended",
        "suspend": "Subscription suspended",
        "reactivate": "Subscription reactivated",
      };
      
      toast({
        title: "Subscription Updated",
        description: actionMessages[variables.action] || "Subscription updated successfully",
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-500">Active</Badge>;
      case "trial":
        return <Badge className="bg-blue-500/10 text-blue-500">Trial</Badge>;
      case "expired":
        return <Badge className="bg-red-500/10 text-red-500">Expired</Badge>;
      case "cancelled":
        return <Badge className="bg-gray-500/10 text-gray-500">Cancelled</Badge>;
      case "payment_due":
        return <Badge className="bg-yellow-500/10 text-yellow-500">Payment Due</Badge>;
      default:
        return <Badge className="bg-gray-500/10 text-gray-500">{status}</Badge>;
    }
  };

  const formatAmount = (amount: number) => {
    return (amount / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  };

  const getRemainingDays = (endDate: string | Date | null) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold">Subscription Management</h3>
            <p className="text-muted-foreground">Manage client subscriptions and payment status</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-32 h-10 bg-muted rounded animate-pulse"></div>
            <div className="w-40 h-10 bg-muted rounded animate-pulse"></div>
          </div>
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
          <h3 className="text-xl font-semibold">Subscription Management</h3>
          <p className="text-muted-foreground">Manage client subscriptions and payment status</p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32" data-testid="select-status-filter">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="payment_due">Payment Due</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={() => setAssignModalOpen(true)}
            data-testid="button-assign-subscription"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            Assign Subscription
          </Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="border-b border-border">
                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Client</th>
                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Plan</th>
                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Status</th>
                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Billing Cycle</th>
                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Next Payment</th>
                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions?.length ? (
                subscriptions.map((subscription) => {
                  const remainingDays = getRemainingDays(subscription.trialEnd || subscription.paidUntil);
                  
                  return (
                    <tr key={subscription.id} className="border-b border-border hover:bg-muted/30 transition-colors" data-testid={`row-subscription-${subscription.id}`}>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {subscription.client.name.substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium" data-testid={`text-client-name-${subscription.id}`}>
                              {subscription.client.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {subscription.chatbot?.name || "No chatbot assigned"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-medium capitalize" data-testid={`text-plan-type-${subscription.id}`}>
                            {subscription.type}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {subscription.monthlyAmount > 0 ? formatAmount(subscription.monthlyAmount) + "/month" : "Free"}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {getStatusBadge(subscription.status)}
                      </td>
                      <td className="py-4 px-6 text-sm">
                        {subscription.type === "trial" ? "Trial" : "Monthly"}
                      </td>
                      <td className="py-4 px-6 text-sm">
                        {subscription.status === "trial" && remainingDays !== null ? (
                          <span className={remainingDays <= 3 ? "text-yellow-500" : ""}>
                            {remainingDays > 0 ? `${remainingDays} days remaining` : "Expired"}
                          </span>
                        ) : subscription.paidUntil ? (
                          formatDate(subscription.paidUntil.toString())
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          {subscription.status === "trial" && (
                            <Button
                              size="sm"
                              onClick={() => updateSubscriptionMutation.mutate({
                                subscriptionId: subscription.id,
                                action: "convert-to-paid",
                                data: { type: "basic", monthlyAmount: 2900 }
                              })}
                              disabled={updateSubscriptionMutation.isPending}
                              data-testid={`button-convert-${subscription.id}`}
                            >
                              Convert to Paid
                            </Button>
                          )}
                          
                          {subscription.status === "active" && (
                            <button 
                              className="p-1 text-red-500 hover:text-red-400 rounded transition-colors" 
                              title="Suspend"
                              onClick={() => updateSubscriptionMutation.mutate({
                                subscriptionId: subscription.id,
                                action: "suspend"
                              })}
                              disabled={updateSubscriptionMutation.isPending}
                              data-testid={`button-suspend-${subscription.id}`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                              </svg>
                            </button>
                          )}
                          
                          <button 
                            className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors" 
                            title="Payment History"
                            data-testid={`button-history-${subscription.id}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                          </button>
                          
                          <button 
                            className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors" 
                            title="Modify Subscription"
                            data-testid={`button-modify-${subscription.id}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 px-6 text-center text-muted-foreground">
                    No subscriptions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AssignSubscriptionModal 
        open={assignModalOpen} 
        onOpenChange={setAssignModalOpen} 
      />
    </div>
  );
}
