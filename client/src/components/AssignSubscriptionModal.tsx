import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "../../shared/schema";

interface AssignSubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const assignSubscriptionSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  type: z.enum(["trial", "basic", "premium"], {
    required_error: "Subscription type is required",
  }),
  monthlyAmount: z.number().min(0, "Amount must be non-negative"),
});

type AssignSubscriptionForm = z.infer<typeof assignSubscriptionSchema>;

export default function AssignSubscriptionModal({ open, onOpenChange }: AssignSubscriptionModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: open, // Only fetch when modal is open
  });

  const form = useForm<AssignSubscriptionForm>({
    resolver: zodResolver(assignSubscriptionSchema),
    defaultValues: {
      type: "trial",
      monthlyAmount: 0,
    },
  });

  const assignSubscriptionMutation = useMutation({
    mutationFn: async (data: AssignSubscriptionForm) => {
      const subscriptionData = {
        clientId: data.clientId,
        type: data.type,
        status: data.type === "trial" ? "trial" : "active",
        monthlyAmount: data.type === "trial" ? 0 : data.monthlyAmount * 100, // Convert to cents
        trialStart: data.type === "trial" ? new Date() : null,
        trialEnd: data.type === "trial" ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null, // 14 days
        paidUntil: data.type !== "trial" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null, // 30 days
      };

      const response = await apiRequest("POST", "/api/subscriptions", subscriptionData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Subscription Assigned",
        description: "Subscription has been assigned successfully",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Assignment Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const subscriptionType = form.watch("type");

  // Filter out clients who already have active subscriptions
  const availableClients = clients?.filter(client => {
    // This would ideally check if client already has an active subscription
    // For now, we'll show all clients
    return true;
  });

  const onSubmit = (data: AssignSubscriptionForm) => {
    assignSubscriptionMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Subscription</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="form-assign-subscription">
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-client">
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableClients?.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subscription Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-subscription-type">
                        <SelectValue placeholder="Select subscription type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="trial">Trial (14 days free)</SelectItem>
                      <SelectItem value="basic">Basic Plan</SelectItem>
                      <SelectItem value="premium">Premium Plan</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {subscriptionType !== "trial" && (
              <FormField
                control={form.control}
                name="monthlyAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Amount ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="29.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-monthly-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={assignSubscriptionMutation.isPending}
                data-testid="button-assign"
              >
                {assignSubscriptionMutation.isPending ? "Assigning..." : "Assign Subscription"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}