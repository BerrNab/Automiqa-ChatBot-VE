import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

export function MarkdownMessage({ content, className = '' }: MarkdownMessageProps) {
  // Detect if content is RTL (Arabic, Hebrew, etc.)
  const isRTL = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(content);
  
  return (
    <div className={className} dir={isRTL ? 'rtl' : 'ltr'} style={{ textAlign: isRTL ? 'right' : 'left' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
        // Headings
        h1: ({ children }) => <h1 className="text-xl font-bold mb-2 mt-4">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-bold mb-1 mt-2">{children}</h3>,
        
        // Paragraphs
        p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
        
        // Lists
        ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        
        // Emphasis
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        
        // Code
        code: ({ children, className }) => {
          const isInline = !className;
          return isInline ? (
            <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono">
              {children}
            </code>
          ) : (
            <code className="block bg-gray-100 dark:bg-gray-800 p-2 rounded text-sm font-mono overflow-x-auto">
              {children}
            </code>
          );
        },
        
        // Blockquotes
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-3 my-2 italic text-gray-700 dark:text-gray-300">
            {children}
          </blockquote>
        ),
        
        // Links
        a: ({ children, href }) => (
          <a href={href} className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
        
        // Horizontal rule
        hr: () => <hr className="my-3 border-gray-300 dark:border-gray-600" />,
      }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
