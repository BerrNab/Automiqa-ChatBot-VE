import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BackgroundImageUploadProps {
  currentImageUrl?: string;
  onImageChange: (file: File | null) => void;
  onImageRemove: () => void;
}

export default function BackgroundImageUpload({
  currentImageUrl,
  onImageChange,
  onImageRemove,
}: BackgroundImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validateAndProcessImage = useCallback((file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPG, PNG, WebP)",
        variant: "destructive",
      });
      return false;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return false;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    onImageChange(file);
    return true;
  }, [onImageChange, toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndProcessImage(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndProcessImage(file);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onImageRemove();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <Label>Background Image (Optional)</Label>
      <p className="text-sm text-muted-foreground">
        Upload a background image for your chatbot. Recommended size: 1920x1080px
      </p>

      {previewUrl ? (
        <Card className="relative overflow-hidden">
          <CardContent className="p-0">
            {/* Preview with aspect ratio indicator */}
            <div className="relative aspect-video bg-gray-100">
              <img
                src={previewUrl}
                alt="Background preview"
                className="w-full h-full object-cover"
              />
              {/* Overlay showing the chat area */}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 max-w-sm w-full mx-4">
                  <div className="text-center space-y-2">
                    <ImageIcon className="w-8 h-8 mx-auto text-gray-600" />
                    <p className="text-sm text-gray-600">
                      Chat widget will appear here
                    </p>
                    <p className="text-xs text-gray-500">
                      Background visible behind the chat
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Remove button */}
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={handleRemove}
            >
              <X className="w-4 h-4 mr-1" />
              Remove
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="background-image-upload"
          />
          <div className="space-y-3">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">
                Drop your image here, or{' '}
                <label
                  htmlFor="background-image-upload"
                  className="text-primary cursor-pointer hover:underline"
                >
                  browse
                </label>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG, WebP up to 5MB
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
