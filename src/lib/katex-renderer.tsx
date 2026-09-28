import React from 'react';
import katex from 'katex';

interface MathRendererProps {
  content: string;
  className?: string;
  block?: boolean;
}

/**
 * Render text with inline and display math LaTeX formulas
 * Supported delimiters:
 * $$...$$ or \[...\] for display (block) math
 * $...$ or \(...\) for inline math
 */
export const MathRenderer: React.FC<MathRendererProps> = ({ content, className = '', block = false }) => {
  if (!content) return null;

  // Function to render math LaTeX safely
  const renderMathSafely = (latex: string, isDisplayMode: boolean) => {
    try {
      return katex.renderToString(latex, {
        displayMode: isDisplayMode,
        throwOnError: false,
        output: 'htmlAndMathml',
      });
    } catch {
      return latex;
    }
  };

  // Split content by display math $$...$$ and inline math $...$
  const parseContent = (text: string) => {
    // Regex for $$...$$ or $...$ or \[...\] or \(...\)
    const regex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^\$\n]+?\$|\\\([\s\S]*?\\\))/g;
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (!part) return null;

      // Block math: $$...$$ or \[...\]
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const math = part.slice(2, -2).trim();
        const html = renderMathSafely(math, true);
        return (
          <div
            key={index}
            className="my-2 overflow-x-auto text-center"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }
      if (part.startsWith('\\[') && part.endsWith('\\]')) {
        const math = part.slice(2, -2).trim();
        const html = renderMathSafely(math, true);
        return (
          <div
            key={index}
            className="my-2 overflow-x-auto text-center"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }

      // Inline math: $...$ or \(...\)
      if (part.startsWith('$') && part.endsWith('$')) {
        const math = part.slice(1, -1).trim();
        const html = renderMathSafely(math, false);
        return (
          <span
            key={index}
            className="inline-block px-0.5"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }
      if (part.startsWith('\\(') && part.endsWith('\\)')) {
        const math = part.slice(2, -2).trim();
        const html = renderMathSafely(math, false);
        return (
          <span
            key={index}
            className="inline-block px-0.5"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }

      // Plain text with line breaks
      return (
        <span key={index} className="whitespace-pre-wrap">
          {part}
        </span>
      );
    });
  };

  return <div className={`inline-block ${className}`}>{parseContent(content)}</div>;
};

export default MathRenderer;
