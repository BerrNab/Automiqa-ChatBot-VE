import { AlertCircle } from "lucide-react";

interface ValidationSummaryProps {
  errors: string[];
  title?: string;
}

export default function ValidationSummary({ errors, title = "Please fix the following errors:" }: ValidationSummaryProps) {
  if (!errors || errors.length === 0) return null;

  return (
    <div className="bg-destructive/10 border border-destructive/30 rounded-md p-4 mb-6">
      <div className="flex items-start">
        <AlertCircle className="h-5 w-5 text-destructive mt-0.5 mr-2" />
        <div>
          <h4 className="font-medium text-destructive">{title}</h4>
          <ul className="list-disc pl-5 mt-1 text-sm text-destructive/90">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
