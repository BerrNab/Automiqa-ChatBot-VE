import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import DashboardTab from "@/components/DashboardTab";
import ClientsTab from "@/components/ClientsTab";
import ChatbotsTab from "@/components/ChatbotsTab";
import SubscriptionsTab from "@/components/SubscriptionsTab";
import WidgetsTab from "@/components/WidgetsTab";
import PaymentsTab from "@/components/PaymentsTab";
import CreateChatbot from "@/pages/create-chatbot";
import EditChatbot from "@/pages/edit-chatbot";

export type TabType = "dashboard" | "clients" | "chatbots" | "subscriptions" | "widgets" | "payments";

export default function AdminDashboard({ params }: { params?: { id?: string } } = {}) {
  // Log the params for debugging
  console.log('AdminDashboard - Params:', params);
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  
  // Check for nested routes
  const [matchCreate] = useRoute("/admin/chatbots/create");
  const [matchEdit, editParams] = useRoute<{ id: string }>("/admin/chatbots/:id/edit");
  
  // Set active tab based on route and handle navigation
  useEffect(() => {
    if (matchCreate || matchEdit) {
      setActiveTab("chatbots");
    }
  }, [matchCreate, matchEdit]);
  
  // Handle tab changes when on create/edit pages
  const handleTabChange = (tab: TabType) => {
    // If we're on a create/edit page, navigate back to the main dashboard with the selected tab
    if (matchCreate || matchEdit) {
      setLocation("/admin");
      // Set the tab after a short delay to ensure the navigation happens first
      setTimeout(() => setActiveTab(tab), 100);
    } else {
      // Normal tab change
      setActiveTab(tab);
    }
  };

  // Check authentication
  const { data: authData, isLoading, error } = useQuery({
    queryKey: ["/api/admin/me"],
    retry: false,
  });

  useEffect(() => {
    if (!isLoading && (error || !authData)) {
      setLocation("/");
    }
  }, [authData, isLoading, error, setLocation]);

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

  const tabInfo = {
    dashboard: {
      title: "Dashboard Overview",
      subtitle: "Monitor your SaaS platform performance"
    },
    clients: {
      title: "Client Management",
      subtitle: "Create and manage client business entities"
    },
    chatbots: {
      title: "Chatbot Configuration",
      subtitle: "Configure and manage client chatbots"
    },
    subscriptions: {
      title: "Subscription Management",
      subtitle: "Manage client subscriptions and payment status"
    },
    widgets: {
      title: "Widget URLs",
      subtitle: "Generate and manage chatbot widget embed codes"
    },
    payments: {
      title: "Payment Tracking",
      subtitle: "Monitor payments and transaction history"
    }
  };

  const renderTabContent = () => {
    // Handle nested chatbot routes
    if (matchCreate) {
      return <CreateChatbot />;
    }
    
    if (matchEdit && editParams) {
      // Make sure the ID is correctly passed to the EditChatbot component
      console.log('Edit params:', editParams);
      // Pass the ID directly from the URL params
      const chatbotId = editParams.id;
      console.log('Passing chatbot ID to EditChatbot:', chatbotId);
      return <EditChatbot id={chatbotId} />;
    }
    
    // Handle regular tabs
    switch (activeTab) {
      case "dashboard":
        return <DashboardTab />;
      case "clients":
        return <ClientsTab />;
      case "chatbots":
        return <ChatbotsTab />;
      case "subscriptions":
        return <SubscriptionsTab />;
      case "widgets":
        return <WidgetsTab />;
      case "payments":
        return <PaymentsTab />;
      default:
        return <DashboardTab />;
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title={tabInfo[activeTab].title}
          subtitle={tabInfo[activeTab].subtitle}
        />
        <div className="flex-1 overflow-auto p-6">
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
}
