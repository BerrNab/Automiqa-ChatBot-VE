import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Check, Globe, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Chatbot } from "../../shared/schema";

interface EmbedCodeModalProps {
  chatbot: Chatbot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EmbedCodeModal({ chatbot, open, onOpenChange }: EmbedCodeModalProps) {
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  if (!chatbot) return null;
  
  const config = chatbot.config as any;
  const mode = config?.widgetSettings?.mode || "floating";
  const baseUrl = window.location.origin;
  
  // Generate floating widget embed code
  const floatingEmbedCode = `<!-- Chat Widget - Floating -->
<script>
  (function() {
    const script = document.createElement('script');
    script.src = '${baseUrl}/widget-embed.js';
    script.setAttribute('data-chatbot-id', '${chatbot.id}');
    script.setAttribute('data-mode', 'floating');
    script.async = true;
    document.body.appendChild(script);
  })();
</script>`;
  
  // Generate fullpage embed code
  const fullpageEmbedCode = `<!-- Chat Widget - Fullpage -->
<iframe
  src="${baseUrl}/widget/${chatbot.id}"
  width="100%"
  height="600"
  frameborder="0"
  style="border: 1px solid #e5e7eb; border-radius: 8px;"
  title="${chatbot.name} Chat"
></iframe>`;
  
  // Generate direct link
  const fullpageLink = `${baseUrl}/widget/${chatbot.id}`;
  
  const copyToClipboard = async (code: string, codeId: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(codeId);
      toast({
        title: "Copied!",
        description: "Embed code copied to clipboard",
      });
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Please try selecting and copying the code manually",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Embed Code for {chatbot.name}</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue={mode === "fullpage" ? "fullpage" : "floating"} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="floating" data-testid="tab-floating">
              <MessageCircle className="w-4 h-4 mr-2" />
              Floating Widget
            </TabsTrigger>
            <TabsTrigger value="fullpage" data-testid="tab-fullpage">
              <Globe className="w-4 h-4 mr-2" />
              Fullpage
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="floating" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Floating Widget</CardTitle>
                <CardDescription>
                  A chat bubble that appears in the corner of your website
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Instructions:</h4>
                    <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                      <li>Copy the code below</li>
                      <li>Paste it into your website's HTML, just before the closing &lt;/body&gt; tag</li>
                      <li>The widget will automatically appear on your pages</li>
                      <li>Widget position can be configured in the chatbot settings</li>
                    </ol>
                  </div>
                  
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                      <code>{floatingEmbedCode}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(floatingEmbedCode, 'floating')}
                      data-testid="button-copy-floating"
                    >
                      {copiedCode === 'floating' ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    <strong>Note:</strong> The floating widget will respect your configured settings including position, colors, and auto-open behavior.
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="fullpage" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fullpage Chat</CardTitle>
                <CardDescription>
                  Embed the chat as a full interface on your page
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Option 1: Iframe Embed</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Embed the chat directly into your page with an iframe:
                    </p>
                    <div className="relative">
                      <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                        <code>{fullpageEmbedCode}</code>
                      </pre>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(fullpageEmbedCode, 'iframe')}
                        data-testid="button-copy-iframe"
                      >
                        {copiedCode === 'iframe' ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Option 2: Direct Link</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Share this link directly or use it in your navigation:
                    </p>
                    <div className="relative">
                      <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                        <code>{fullpageLink}</code>
                      </pre>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(fullpageLink, 'link')}
                        data-testid="button-copy-link"
                      >
                        {copiedCode === 'link' ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-4">
                    <Button
                      variant="outline"
                      onClick={() => window.open(fullpageLink, '_blank')}
                      data-testid="button-preview"
                    >
                      <Globe className="w-4 h-4 mr-2" />
                      Preview Fullpage Chat
                    </Button>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    <strong>Customization:</strong> You can adjust the iframe width and height to fit your design. The chat interface is responsive and will adapt to the container size.
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <h4 className="text-sm font-medium mb-2">Current Configuration</h4>
          <div className="text-xs space-y-1">
            <div><strong>Mode:</strong> {mode === "fullpage" ? "Fullpage" : "Floating Widget"}</div>
            {mode === "floating" && (
              <>
                <div><strong>Position:</strong> {config?.widgetSettings?.position || "bottom-right"}</div>
                <div><strong>Auto-open:</strong> {config?.widgetSettings?.autoOpen ? "Yes" : "No"}</div>
              </>
            )}
            <div><strong>Primary Color:</strong> {config?.branding?.primaryColor || "#3B82F6"}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}