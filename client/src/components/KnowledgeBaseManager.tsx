import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  FileText, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Download 
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface KnowledgeBaseDocument {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  status: "uploaded" | "processing" | "ready" | "error";
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface KnowledgeBaseManagerProps {
  chatbotId: string;
}

export default function KnowledgeBaseManager({ chatbotId }: KnowledgeBaseManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());

  // Fetch knowledge base documents
  const { data: documents, isLoading } = useQuery<KnowledgeBaseDocument[]>({
    queryKey: ['/api/admin/chatbots', chatbotId, 'kb', 'documents'],
    refetchInterval: 5000, // Poll every 5 seconds to check processing status
  });

  // Upload document mutation
  const uploadDocumentMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('document', file);
      
      const response = await apiRequest('POST', `/api/admin/chatbots/${chatbotId}/kb/upload`, formData);
      return response.json();
    },
    onMutate: async (file) => {
      // Add file to uploading set
      setUploadingFiles(prev => new Set(prev).add(file.name));
    },
    onSuccess: (data) => {
      toast({
        title: "Document uploaded successfully",
        description: `${data.filename} is being processed and will be available shortly.`,
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/admin/chatbots', chatbotId, 'kb', 'documents'],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: (data, error, file) => {
      // Remove file from uploading set
      setUploadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(file.name);
        return newSet;
      });
    },
  });

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await apiRequest('DELETE', `/api/admin/chatbots/${chatbotId}/kb/documents/${documentId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Document deleted",
        description: "The document has been removed from the knowledge base.",
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/admin/chatbots', chatbotId, 'kb', 'documents'],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/json'
      ];

      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Unsupported file type",
          description: `${file.name} is not a supported file type. Please upload PDF, DOC, DOCX, TXT, or JSON files.`,
          variant: "destructive",
        });
        return;
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} is too large. Maximum file size is 10MB.`,
          variant: "destructive",
        });
        return;
      }

      uploadDocumentMutation.mutate(file);
    });

    // Clear the input
    event.target.value = '';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploaded':
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'uploaded':
        return <Badge variant="secondary">Uploaded</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      case 'ready':
        return <Badge variant="default">Ready</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Loading knowledge base...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Documents
          </CardTitle>
          <CardDescription>
            Upload documents to enhance your chatbot's knowledge base. Supported formats: PDF, DOC, DOCX, TXT, JSON (Max 10MB per file)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop files here or click to browse
            </p>
            <input
              id="kb-file-input"
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.json"
              className="hidden"
              onChange={handleFileUpload}
              data-testid="input-kb-upload"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('kb-file-input')?.click()}
              disabled={uploadDocumentMutation.isPending}
              data-testid="button-browse-files"
            >
              {uploadDocumentMutation.isPending ? 'Uploading...' : 'Browse Files'}
            </Button>
          </div>
          
          {/* Upload Progress */}
          {uploadingFiles.size > 0 && (
            <div className="mt-4 space-y-2">
              {Array.from(uploadingFiles).map((fileName) => (
                <div key={fileName} className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm flex-1">{fileName}</span>
                  <Progress value={undefined} className="w-20" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Knowledge Base Documents ({documents?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!documents || documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No documents uploaded</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload your first document to start building your chatbot's knowledge base.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  data-testid={`document-${doc.id}`}
                >
                  <div className="flex items-start gap-3 flex-1">
                    {getStatusIcon(doc.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">{doc.filename}</h4>
                        {getStatusBadge(doc.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(doc.size)} • Uploaded {new Date(doc.createdAt).toLocaleString()}
                      </p>
                      {doc.status === 'error' && doc.errorMessage && (
                        <p className="text-xs text-red-600 mt-1">{doc.errorMessage}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteDocumentMutation.mutate(doc.id)}
                      disabled={deleteDocumentMutation.isPending}
                      data-testid={`button-delete-${doc.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}