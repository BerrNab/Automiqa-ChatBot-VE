import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/LandingPage";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import ClientLogin from "@/pages/client-login";
import ClientDashboard from "@/pages/client-dashboard";
import WidgetEmbed from "@/pages/widget-embed";
import WidgetFullpage from "@/pages/widget-fullpage";
import ChatbotAnalytics from "@/pages/ChatbotAnalytics";

function Router() {
  return (
    <Switch>
      <Route path="/">{() => <LandingPage />}</Route>
      <Route path="/admin/login">{() => <AdminLogin />}</Route>
      <Route path="/admin">{() => <AdminDashboard />}</Route>
      <Route path="/admin/chatbots/create">{() => <AdminDashboard />}</Route>
      <Route path="/admin/chatbots/:id/analytics">{() => <ChatbotAnalytics />}</Route>
      <Route path="/admin/chatbots/:id/edit">{(params) => <AdminDashboard params={params} />}</Route>
      <Route path="/client/login">{() => <ClientLogin />}</Route>
      <Route path="/client/dashboard">{() => <ClientDashboard />}</Route>
      <Route path="/widget/:chatbotId/fullpage">{() => <WidgetFullpage />}</Route>
      <Route path="/widget/:chatbotId">{() => <WidgetEmbed />}</Route>
      <Route path="/:rest*">{() => <NotFound />}</Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="dark">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
