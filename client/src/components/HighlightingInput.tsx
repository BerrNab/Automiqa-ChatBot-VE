import React from 'react';

interface HighlightingInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
}

const HighlightingInput: React.FC<HighlightingInputProps> = ({ value, onChange, placeholder, className }) => {
  const renderHighlightedText = () => {
    if (!value && placeholder) {
      return <div className="text-muted-foreground whitespace-pre-wrap">{placeholder}</div>;
    }

    const parts = value.split(/(\{\{.*?\}\})/g);
    return (
      <div className="whitespace-pre-wrap">
        {parts.map((part, index) => {
          if (part.match(/(\{\{.*?\}\})/g)) {
            return <span key={index} className="text-purple-400">{part}</span>;
          }
          return <span key={index}>{part}</span>;
        })}
      </div>
    );
  };

  return (
    <div className={`relative w-full ${className}`}>
      <div className="absolute inset-0 pointer-events-none p-2 border border-transparent rounded-md text-sm leading-tight">
        {renderHighlightedText()}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e as any)}
        className="w-full p-2 bg-transparent text-transparent caret-white border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-h-[40px] leading-tight resize-none"
        placeholder={!value ? placeholder : ''}
        rows={1}
        onInput={(e) => {
          const target = e.target as HTMLTextAreaElement;
          target.style.height = 'auto';
          target.style.height = `${target.scrollHeight}px`;
        }}
      />
    </div>
  );
};

export default HighlightingInput;
