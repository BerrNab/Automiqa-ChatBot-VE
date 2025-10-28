import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ChatbotForm from "@/components/ChatbotForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { InsertChatbot } from "../../shared/schema";

export default function CreateChatbotPage() {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);

  const createChatbotMutation = useMutation({
    mutationFn: async (data: InsertChatbot) => {
      try {
        const response = await apiRequest("POST", "/api/chatbots", data);
        const chatbot = await response.json();
        
        // Upload logo if provided
        if (logoFile && chatbot.id) {
          const formData = new FormData();
          formData.append("logo", logoFile);
          await apiRequest("POST", `/api/chatbots/${chatbot.id}/logo`, formData);
        }
        
        // Upload background image if provided
        if (backgroundImageFile && chatbot.id) {
          const formData = new FormData();
          formData.append("backgroundImage", backgroundImageFile);
          await apiRequest("POST", `/api/chatbots/${chatbot.id}/background`, formData);
        }
        
        return chatbot;
      } catch (error: any) {
        // Handle validation errors
        if (error.message) {
          setValidationErrors([error.message]);
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chatbots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Chatbot Created",
        description: "New chatbot has been created successfully",
      });
      setLocation("/admin"); // Navigate back to admin dashboard
    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: InsertChatbot, logo: File | null, backgroundImage: File | null) => {
    setValidationErrors([]);
    setLogoFile(logo);
    setBackgroundImageFile(backgroundImage);
    createChatbotMutation.mutate(data);
  };

  return (
    <div className="container max-w-[1600px] py-8">
      <div className="mb-8">
        <Button 
          variant="ghost" 
          className="mb-4"
          onClick={() => setLocation("/admin")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold">Create New Chatbot</h1>
        <p className="text-muted-foreground mt-2">
          Configure a new chatbot for your client
        </p>
      </div>

      <div className="bg-card border rounded-lg shadow-sm p-6">
        <ChatbotForm 
          onSubmit={handleSubmit}
          isSubmitting={createChatbotMutation.isPending}
          validationErrors={validationErrors}
        />

        <div className="flex items-center justify-end space-x-3 mt-6">
          <Button 
            variant="outline"
            type="button"
            onClick={() => setLocation("/admin")}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            disabled={createChatbotMutation.isPending}
            onClick={() => document.querySelector('form')?.requestSubmit()}
          >
            {createChatbotMutation.isPending ? "Saving..." : "Create Chatbot"}
          </Button>
        </div>
      </div>
    </div>
  );
}
