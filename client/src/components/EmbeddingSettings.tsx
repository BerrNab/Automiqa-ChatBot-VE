import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FormDescription } from "@/components/ui/form";
import { 
  Settings2, 
  ChevronDown, 
  ChevronUp,
  Sparkles,
  Zap,
  Globe,
  FileJson,
  FileSpreadsheet,
  FileText,
  File,
  Info,
  CheckCircle
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Embedding model presets for user-friendly selection
const EMBEDDING_PRESETS = {
  "multilingual": {
    label: "Multilingual (Best for Arabic, Mixed Languages)",
    model: "text-embedding-3-large",
    dimensions: 1536,
    icon: Globe,
    description: "Optimized for Arabic, French, and mixed-language content with high accuracy",
    recommended: true,
  },
  "english": {
    label: "English Optimized (Faster)",
    model: "text-embedding-3-small",
    dimensions: 1536,
    icon: Zap,
    description: "Fast processing for English-only content with good accuracy",
  },
  "legacy": {
    label: "Legacy Model (Compatible)",
    model: "text-embedding-ada-002",
    dimensions: 1536,
    icon: Sparkles,
    description: "Older stable model for backward compatibility",
  },
};

type PresetKey = keyof typeof EMBEDDING_PRESETS;

interface ChunkingStrategy {
  json?: {
    preserveStructure: boolean;
    maxDepth: number;
    chunkSize: number;
    includeKeys: boolean;
  };
  csv?: {
    rowsPerChunk: number;
    includeHeaders: boolean;
    columnSeparator: string;
  };
  excel?: {
    rowsPerChunk: number;
    includeHeaders: boolean;
    includeSheetName: boolean;
    sheetsToProcess?: string[];
  };
  pdf?: {
    chunkSize: number;
    overlap: number;
    preserveParagraphs: boolean;
  };
  text?: {
    chunkSize: number;
    overlap: number;
    respectSentences: boolean;
  };
}

interface EmbeddingSettingsProps {
  embeddingModel: string;
  embeddingDimensions: number;
  chunkingStrategy: ChunkingStrategy;
  onEmbeddingModelChange: (model: string) => void;
  onEmbeddingDimensionsChange: (dimensions: number) => void;
  onChunkingStrategyChange: (strategy: ChunkingStrategy) => void;
}

export default function EmbeddingSettings({
  embeddingModel,
  embeddingDimensions,
  chunkingStrategy,
  onEmbeddingModelChange,
  onEmbeddingDimensionsChange,
  onChunkingStrategyChange,
}: EmbeddingSettingsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Determine current preset based on model and dimensions
  const getCurrentPreset = (): PresetKey | "custom" => {
    for (const [key, preset] of Object.entries(EMBEDDING_PRESETS)) {
      if (preset.model === embeddingModel && preset.dimensions === embeddingDimensions) {
        return key as PresetKey;
      }
    }
    return "custom";
  };

  const currentPreset = getCurrentPreset();

  const handlePresetChange = (presetKey: string) => {
    console.log('EmbeddingSettings: handlePresetChange called with', presetKey);
    console.log('EmbeddingSettings: current values', { embeddingModel, embeddingDimensions });
    
    if (presetKey === "custom") {
      setShowAdvanced(true);
      return;
    }
    
    const preset = EMBEDDING_PRESETS[presetKey as PresetKey];
    if (preset) {
      console.log('EmbeddingSettings: applying preset', preset);
      onEmbeddingModelChange(preset.model);
      onEmbeddingDimensionsChange(preset.dimensions);
    }
  };

  const updateChunkingStrategy = (
    fileType: keyof ChunkingStrategy,
    updates: Partial<ChunkingStrategy[typeof fileType]>
  ) => {
    onChunkingStrategyChange({
      ...chunkingStrategy,
      [fileType]: {
        ...chunkingStrategy[fileType],
        ...updates,
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          AI Processing Settings
        </CardTitle>
        <CardDescription>
          Configure how your documents are processed for the best search results
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Simple Preset Selection */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Processing Mode</Label>
          <p className="text-sm text-muted-foreground">
            Choose the best mode for your content type
          </p>
          
          <div className="grid gap-3">
            {Object.entries(EMBEDDING_PRESETS).map(([key, preset]) => {
              const Icon = preset.icon;
              const isSelected = currentPreset === key;
              
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handlePresetChange(key)}
                  className={`
                    relative flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all
                    text-left hover:shadow-md active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/20
                    ${isSelected 
                      ? 'border-primary bg-primary/5 shadow-sm' 
                      : 'border-muted hover:border-primary/50 hover:bg-muted/50'
                    }
                  `}
                >
                  <div className={`
                    p-2 rounded-lg transition-colors
                    ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}
                  `}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{preset.label}</span>
                      {preset.recommended && (
                        <Badge variant="secondary" className="text-xs">Recommended</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {preset.description}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-primary" />
                      <CheckCircle className="h-4 w-4 text-primary" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Advanced Settings Toggle */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Settings2 className="h-4 w-4" />
                Advanced Settings
              </span>
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-6 pt-4">
            {/* Manual Model Selection */}
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <Label>Embedding Model</Label>
              <Select value={embeddingModel} onValueChange={onEmbeddingModelChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text-embedding-3-large">
                    text-embedding-3-large (Best Quality)
                  </SelectItem>
                  <SelectItem value="text-embedding-3-small">
                    text-embedding-3-small (Faster)
                  </SelectItem>
                  <SelectItem value="text-embedding-ada-002">
                    text-embedding-ada-002 (Legacy)
                  </SelectItem>
                </SelectContent>
              </Select>
              
              <div className="space-y-2 mt-4">
                <div className="flex items-center justify-between">
                  <Label>Vector Dimensions</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          1536 dimensions provides excellent quality while staying within database limits
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Slider
                  value={[embeddingDimensions]}
                  onValueChange={(value) => onEmbeddingDimensionsChange(value[0])}
                  min={1536}
                  max={1536}
                  step={1}
                  className="w-full"
                  disabled
                />
                <div className="flex justify-center text-xs text-muted-foreground">
                  <span>1536 dimensions (optimal for all models)</span>
                </div>
                <FormDescription>
                  1536 dimensions provides excellent quality while staying within database limits
                </FormDescription>
              </div>
            </div>

            {/* File-Type Specific Settings */}
            <div className="space-y-4">
              <Label className="text-base font-medium">File Processing Settings</Label>
              <p className="text-sm text-muted-foreground">
                Customize how each file type is processed
              </p>

              {/* JSON Settings */}
              <div className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center gap-2">
                  <FileJson className="h-4 w-4 text-orange-500" />
                  <Label className="font-medium">JSON Files</Label>
                </div>
                
                <div className="grid gap-4 pl-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Preserve Structure</Label>
                      <p className="text-xs text-muted-foreground">Keep JSON hierarchy in chunks</p>
                    </div>
                    <Switch
                      checked={chunkingStrategy.json?.preserveStructure ?? true}
                      onCheckedChange={(checked) => 
                        updateChunkingStrategy('json', { preserveStructure: checked })
                      }
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Chunk Size: {chunkingStrategy.json?.chunkSize ?? 500} chars</Label>
                    <Slider
                      value={[chunkingStrategy.json?.chunkSize ?? 500]}
                      onValueChange={([value]) => 
                        updateChunkingStrategy('json', { chunkSize: value })
                      }
                      min={100}
                      max={2000}
                      step={100}
                    />
                  </div>
                </div>
              </div>

              {/* CSV/Excel Settings */}
              <div className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-green-500" />
                  <Label className="font-medium">CSV & Excel Files</Label>
                </div>
                
                <div className="grid gap-4 pl-6">
                  <div className="space-y-2">
                    <Label>Rows per Chunk: {chunkingStrategy.csv?.rowsPerChunk ?? 10}</Label>
                    <Slider
                      value={[chunkingStrategy.csv?.rowsPerChunk ?? 10]}
                      onValueChange={([value]) => {
                        updateChunkingStrategy('csv', { rowsPerChunk: value });
                        updateChunkingStrategy('excel', { rowsPerChunk: value });
                      }}
                      min={1}
                      max={50}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Group this many rows together for better context
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Include Headers</Label>
                      <p className="text-xs text-muted-foreground">Repeat column names in each chunk</p>
                    </div>
                    <Switch
                      checked={chunkingStrategy.csv?.includeHeaders ?? true}
                      onCheckedChange={(checked) => {
                        updateChunkingStrategy('csv', { includeHeaders: checked });
                        updateChunkingStrategy('excel', { includeHeaders: checked });
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* PDF/Text Settings */}
              <div className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-red-500" />
                  <Label className="font-medium">PDF & Text Files</Label>
                </div>
                
                <div className="grid gap-4 pl-6">
                  <div className="space-y-2">
                    <Label>Chunk Size: {chunkingStrategy.pdf?.chunkSize ?? 1000} chars</Label>
                    <Slider
                      value={[chunkingStrategy.pdf?.chunkSize ?? 1000]}
                      onValueChange={([value]) => {
                        updateChunkingStrategy('pdf', { chunkSize: value });
                        updateChunkingStrategy('text', { chunkSize: value });
                      }}
                      min={200}
                      max={4000}
                      step={100}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Overlap: {chunkingStrategy.pdf?.overlap ?? 200} chars</Label>
                    <Slider
                      value={[chunkingStrategy.pdf?.overlap ?? 200]}
                      onValueChange={([value]) => {
                        updateChunkingStrategy('pdf', { overlap: value });
                        updateChunkingStrategy('text', { overlap: value });
                      }}
                      min={0}
                      max={500}
                      step={50}
                    />
                    <p className="text-xs text-muted-foreground">
                      Overlap between chunks for better context continuity
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Preserve Paragraphs</Label>
                      <p className="text-xs text-muted-foreground">Try not to break paragraphs</p>
                    </div>
                    <Switch
                      checked={chunkingStrategy.pdf?.preserveParagraphs ?? true}
                      onCheckedChange={(checked) => 
                        updateChunkingStrategy('pdf', { preserveParagraphs: checked })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-700 dark:text-blue-300">
                When to re-upload documents?
              </p>
              <p className="text-blue-600 dark:text-blue-400 mt-1">
                If you change these settings, you'll need to re-upload your documents 
                for the new settings to take effect. Existing documents will continue 
                to use their original processing settings.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
