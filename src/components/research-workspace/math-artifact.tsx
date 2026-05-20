import { MarkdownRenderer } from "@/components/markdown-renderer";

export function MathArtifact({ formula }: { formula: string }) {
  return (
    <div className="overflow-x-auto rounded-md border bg-background px-3 py-2">
      <MarkdownRenderer content={formula} className="reader-page text-sm" />
    </div>
  );
}
