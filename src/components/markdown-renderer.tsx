import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function stabilizeMath(content: string) {
  return content
    .replace(/\\underbrace\{([^{}]+)\}_\{([^{}]+)\}/g, "$1")
    .replace(/\\overbrace\{([^{}]+)\}\^\{([^{}]+)\}/g, "$1")
    .replace(/\\underbrace\{([^{}]+)\}_\{\\text\{([^{}]+)\}\}/g, "$1")
    .replace(/\\\(([\s\S]+?)\\\)/g, (_match, expression: string) => `$${expression}$`)
    .replace(/\\\[([\s\S]+?)\\\]/g, (_match, expression: string) => `$$${expression}$$`);
}

export function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  const safeContent = stabilizeMath(content);

  return (
    <div className={`prose prose-sm max-w-none dark:prose-invert ${className || ""}`}>
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {safeContent}
      </ReactMarkdown>
    </div>
  );
}
