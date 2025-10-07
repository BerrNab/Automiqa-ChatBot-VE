import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams, useRoute } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ChatbotForm from "@/components/ChatbotForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { InsertChatbot, Chatbot } from "@shared/schema";

interface EditChatbotPageProps {
  id?: string;
}

export default function EditChatbotPage({ id: propId }: EditChatbotPageProps = {}) {
  // Use either the prop id or get it from URL params
  const routeParams = useParams<{ id: string }>();
  const id = propId || routeParams?.id;
  
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
  
  // Log the ID for debugging
  console.log('EditChatbotPage - ID:', id, 'PropID:', propId, 'RouteParams:', routeParams);
  
  // Redirect to dashboard if no ID is available
  useEffect(() => {
    if (!id) {
      console.error('No chatbot ID provided');
      toast({
        title: "Error",
        description: "No chatbot ID provided",
        variant: "destructive"
      });
      setLocation("/admin");
    }
  }, [id, setLocation, toast]);

  // Fetch the chatbot data
  const { data: chatbot, isLoading, error } = useQuery<Chatbot>({
    queryKey: [`/api/chatbots/${id}`],
    enabled: !!id,
    retry: false, // Don't retry on error
    // Use onSuccess and onError callbacks instead of directly in the options
  });
  
  // Handle error with useEffect instead
  useEffect(() => {
    if (error) {
      console.error('Error fetching chatbot:', error);
      let errorMessage = "Could not load chatbot data";
      
      // Check if it's a 404 error
      if (error instanceof Error && error.message.includes('404')) {
        errorMessage = `Chatbot with ID ${id} not found. It may have been deleted.`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error Loading Chatbot",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [error, id, toast]);

  const updateChatbotMutation = useMutation({
    mutationFn: async (data: InsertChatbot) => {
      try {
        console.log('Updating chatbot with ID:', id, 'Data:', data);
        const response = await apiRequest("PUT", `/api/chatbots/${id}`, data);
        const updatedChatbot = await response.json();
        console.log('Updated chatbot:', updatedChatbot);
        
        // Upload logo if provided
        if (logoFile) {
          const formData = new FormData();
          formData.append("logo", logoFile);
          await apiRequest("POST", `/api/chatbots/${id}/logo`, formData);
        }
        
        // Upload background image if provided
        if (backgroundImageFile) {
          const formData = new FormData();
          formData.append("backgroundImage", backgroundImageFile);
          await apiRequest("POST", `/api/chatbots/${id}/background`, formData);
        }
        
        return updatedChatbot;
      } catch (error: any) {
        // Handle validation errors
        console.error('Error updating chatbot:', error);
        if (error.message) {
          setValidationErrors([error.message]);
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chatbots"] });
      queryClient.invalidateQueries({ queryKey: [`/api/chatbots/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Chatbot Updated",
        description: "Chatbot has been updated successfully",
      });
      setLocation("/admin"); // Navigate back to admin dashboard
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: InsertChatbot, logo: File | null, backgroundImage: File | null) => {
    setValidationErrors([]);
    setLogoFile(logo);
    setBackgroundImageFile(backgroundImage);
    updateChatbotMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading chatbot data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !chatbot) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-destructive">!</span>
            </div>
            <h2 className="text-xl font-semibold mb-2">Error Loading Chatbot</h2>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error ? error.message : "Could not load chatbot data"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Attempted to load chatbot with ID: {id || 'undefined'}
            </p>
            <Button onClick={() => setLocation("/admin")}>
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
        <h1 className="text-3xl font-bold">Edit Chatbot</h1>
        <p className="text-muted-foreground mt-2">
          Update configuration for {chatbot.name}
        </p>
      </div>

      <div className="bg-card border rounded-lg shadow-sm p-6">
        <ChatbotForm 
          chatbot={chatbot}
          onSubmit={handleSubmit}
          isSubmitting={updateChatbotMutation.isPending}
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
            disabled={updateChatbotMutation.isPending}
            onClick={() => document.querySelector('form')?.requestSubmit()}
          >
            {updateChatbotMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
