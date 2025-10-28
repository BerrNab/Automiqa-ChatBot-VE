import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PaymentLog } from "../../shared/schema";

interface PaymentStats {
  totalRevenue: number;
  failedPayments: number;
  successRate: number;
}

interface PaymentWithClient extends PaymentLog {
  client: {
    id: string;
    name: string;
  };
  subscription: {
    id: string;
    type: string;
  } | null;
}

export default function PaymentsTab() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: paymentStats, isLoading: statsLoading } = useQuery<PaymentStats>({
    queryKey: ["/api/payments/stats"],
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery<PaymentWithClient[]>({
    queryKey: ["/api/payments", statusFilter, dateFilter],
  });

  const retryPaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      await apiRequest("POST", `/api/payments/${paymentId}/retry`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/stats"] });
      toast({
        title: "Payment Retry Initiated",
        description: "Payment retry has been initiated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Retry Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500/10 text-green-500">Success</Badge>;
      case "failed":
        return <Badge className="bg-red-500/10 text-red-500">Failed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-500">Pending</Badge>;
      case "refunded":
        return <Badge className="bg-blue-500/10 text-blue-500">Refunded</Badge>;
      default:
        return <Badge className="bg-gray-500/10 text-gray-500">{status}</Badge>;
    }
  };

  const formatAmount = (amount: number, currency: string = "usd") => {
    return (amount / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    });
  };

  if (statsLoading || paymentsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold">Payment Tracking</h3>
            <p className="text-muted-foreground">Monitor payments and transaction history</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-32 h-10 bg-muted rounded animate-pulse"></div>
            <div className="w-32 h-10 bg-muted rounded animate-pulse"></div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
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
          <h3 className="text-xl font-semibold">Payment Tracking</h3>
          <p className="text-muted-foreground">Monitor payments and transaction history</p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32" data-testid="select-payment-filter">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="success">Successful</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          <Input 
            type="date" 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-32"
            data-testid="input-date-filter"
          />
        </div>
      </div>

      {/* Payment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Total Revenue</p>
                <p className="text-2xl font-bold text-green-500" data-testid="text-total-revenue">
                  {paymentStats ? formatAmount(paymentStats.totalRevenue) : "$0"}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                </svg>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">This month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Failed Payments</p>
                <p className="text-2xl font-bold text-red-500" data-testid="text-failed-payments">
                  {paymentStats ? formatAmount(paymentStats.failedPayments) : "$0"}
                </p>
              </div>
              <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Requires attention</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Success Rate</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-success-rate">
                  {paymentStats ? `${paymentStats.successRate.toFixed(1)}%` : "0%"}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Payment success rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="border-b border-border">
                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Transaction ID</th>
                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Client</th>
                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Amount</th>
                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Status</th>
                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Date</th>
                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments?.length ? (
                payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-border hover:bg-muted/30 transition-colors" data-testid={`row-payment-${payment.id}`}>
                    <td className="py-4 px-6">
                      <code className="text-sm font-mono text-muted-foreground" data-testid={`text-transaction-id-${payment.id}`}>
                        {payment.stripePaymentId || payment.id.substring(0, 16)}
                      </code>
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-medium" data-testid={`text-payment-client-${payment.id}`}>
                          {payment.client.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {payment.subscription?.type || "No subscription"}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium" data-testid={`text-payment-amount-${payment.id}`}>
                      {formatAmount(payment.amount, payment.currency)}
                    </td>
                    <td className="py-4 px-6">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="py-4 px-6 text-sm text-muted-foreground">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        {payment.status === "failed" && (
                          <Button
                            size="sm"
                            onClick={() => retryPaymentMutation.mutate(payment.id)}
                            disabled={retryPaymentMutation.isPending}
                            data-testid={`button-retry-${payment.id}`}
                          >
                            Retry
                          </Button>
                        )}
                        <button 
                          className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors" 
                          title="View Details"
                          data-testid={`button-details-${payment.id}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 px-6 text-center text-muted-foreground">
                    No payments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
