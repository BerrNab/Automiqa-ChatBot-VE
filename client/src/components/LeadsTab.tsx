import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Lead, LeadWithClient } from "../../shared/schema";
import {
  Search,
  Download,
  MessageCircle,
  User,
  Mail,
  Phone,
  Calendar,
  Filter,
  FileDown,
  StickyNote,
} from "lucide-react";

interface LeadsTabProps {
  clientId: string;
}

export default function LeadsTab({ clientId }: LeadsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [chatbotFilter, setChatbotFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [leadNotes, setLeadNotes] = useState("");
  const { toast } = useToast();

  // Fetch leads
  const { data: leads = [], isLoading } = useQuery<LeadWithClient[]>({
    queryKey: ["/api/client/leads"],
  });

  // Fetch chatbots for filtering
  const { data: chatbots = [] } = useQuery({
    queryKey: ["/api/client/chatbots"],
  });

  // Update lead status mutation
  const updateLeadMutation = useMutation({
    mutationFn: async ({
      leadId,
      status,
      notes,
    }: {
      leadId: string;
      status: string;
      notes?: string;
    }) => {
      const response = await apiRequest("PATCH", `/api/client/leads/${leadId}`, {
        status,
        notes,
      });
      if (!response.ok) throw new Error("Failed to update lead");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/leads"] });
      toast({
        title: "Lead Updated",
        description: "Lead status has been updated successfully.",
      });
      setShowNotesDialog(false);
      setSelectedLead(null);
      setLeadNotes("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update lead. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter leads based on search and filters
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      searchTerm === "" ||
      lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone?.includes(searchTerm);

    const matchesStatus =
      statusFilter === "all" || lead.status === statusFilter;

    const matchesChatbot =
      chatbotFilter === "all" || lead.chatbotId === chatbotFilter;

    return matchesSearch && matchesStatus && matchesChatbot;
  });

  // Export to CSV function
  const exportToCSV = () => {
    const headers = ["Name", "Email", "Phone", "Chatbot", "Status", "Message", "Captured At", "Notes"];
    const csvContent = [
      headers.join(","),
      ...filteredLeads.map((lead) =>
        [
          lead.name || "",
          lead.email || "",
          lead.phone || "",
          lead.chatbot?.name || "",
          lead.status,
          `"${(lead.message || "").replace(/"/g, '""')}"`,
          new Date(lead.capturedAt).toLocaleDateString(),
          `"${(lead.notes || "").replace(/"/g, '""')}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leads-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: `Exported ${filteredLeads.length} leads to CSV.`,
    });
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-500";
      case "contacted":
        return "bg-yellow-500";
      case "qualified":
        return "bg-purple-500";
      case "converted":
        return "bg-green-500";
      case "lost":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  // Handle status update
  const handleStatusUpdate = (lead: Lead, newStatus: string) => {
    if (newStatus === lead.status) return;
    
    setSelectedLead(lead);
    setLeadNotes(lead.notes || "");
    
    if (newStatus === "contacted" || newStatus === "qualified" || newStatus === "converted") {
      // Show notes dialog for important status changes
      setShowNotesDialog(true);
    } else {
      // Direct update for other statuses
      updateLeadMutation.mutate({
        leadId: lead.id,
        status: newStatus,
      });
    }
  };

  // Submit status update with notes
  const submitStatusUpdate = () => {
    if (!selectedLead) return;
    
    const newStatus = statusFilter === "all" ? selectedLead.status : statusFilter;
    updateLeadMutation.mutate({
      leadId: selectedLead.id,
      status: newStatus,
      notes: leadNotes,
    });
  };

  const newLeadsCount = leads.filter((lead) => lead.status === "new").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Leads</h2>
          <p className="text-muted-foreground">
            Manage and track your captured leads
          </p>
        </div>
        <div className="flex gap-2">
          {newLeadsCount > 0 && (
            <Badge variant="default" className="bg-blue-500">
              {newLeadsCount} New
            </Badge>
          )}
          <Button
            onClick={exportToCSV}
            disabled={filteredLeads.length === 0}
            data-testid="button-export-leads"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-leads"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
            <Select value={chatbotFilter} onValueChange={setChatbotFilter}>
              <SelectTrigger data-testid="select-chatbot-filter">
                <SelectValue placeholder="Filter by chatbot" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Chatbots</SelectItem>
                {chatbots.map((chatbot: any) => (
                  <SelectItem key={chatbot.id} value={chatbot.id}>
                    {chatbot.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading leads...
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {searchTerm || statusFilter !== "all" || chatbotFilter !== "all"
                ? "No leads found matching your filters."
                : "No leads captured yet. Leads will appear here when visitors share their contact information."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Chatbot</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Captured</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <div className="space-y-1">
                        {lead.name && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-muted-foreground" />
                            <span className="font-medium">{lead.name}</span>
                          </div>
                        )}
                        {lead.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-muted-foreground" />
                            <a
                              href={`mailto:${lead.email}`}
                              className="text-sm text-blue-600 hover:underline"
                            >
                              {lead.email}
                            </a>
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            <a
                              href={`tel:${lead.phone}`}
                              className="text-sm text-blue-600 hover:underline"
                            >
                              {lead.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm">{lead.chatbot?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={lead.message || ""}>
                        {lead.message || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={lead.status}
                        onValueChange={(value) => handleStatusUpdate(lead, value)}
                      >
                        <SelectTrigger 
                          className="w-32 h-8"
                          data-testid={`select-status-${lead.id}`}
                        >
                          <Badge className={getStatusColor(lead.status)}>
                            {lead.status}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="qualified">Qualified</SelectItem>
                          <SelectItem value="converted">Converted</SelectItem>
                          <SelectItem value="lost">Lost</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {new Date(lead.capturedAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedLead(lead);
                          setLeadNotes(lead.notes || "");
                          setShowNotesDialog(true);
                        }}
                        data-testid={`button-notes-${lead.id}`}
                      >
                        <StickyNote className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Notes Dialog */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lead Notes</DialogTitle>
            <DialogDescription>
              Add notes or update the status for this lead.
            </DialogDescription>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Contact Information</Label>
                <div className="text-sm space-y-1">
                  {selectedLead.name && <div>Name: {selectedLead.name}</div>}
                  {selectedLead.email && <div>Email: {selectedLead.email}</div>}
                  {selectedLead.phone && <div>Phone: {selectedLead.phone}</div>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={leadNotes}
                  onChange={(e) => setLeadNotes(e.target.value)}
                  placeholder="Add notes about this lead..."
                  rows={4}
                  data-testid="textarea-lead-notes"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNotesDialog(false);
                setSelectedLead(null);
                setLeadNotes("");
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={submitStatusUpdate}
              disabled={updateLeadMutation.isPending}
              data-testid="button-save-notes"
            >
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}