import { useState } from "react";
import { Monitor, Smartphone, Code, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmailPreviewProps {
  html: string;
  subject?: string;
  previewText?: string;
  className?: string;
}

export function EmailPreview({ html, subject, previewText, className }: EmailPreviewProps) {
  const [view, setView] = useState<"desktop" | "mobile">("desktop");
  const [showSource, setShowSource] = useState(false);

  const wrappedHtml = `
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <style>body{margin:0;padding:16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.6;color:#1a1a1a;background:#fff}img{max-width:100%;height:auto}a{color:#2563eb}</style>
    </head><body>${html || '<p style="color:#999;text-align:center;padding:40px">No email content yet</p>'}</body></html>
  `;

  return (
    <div className={cn("rounded-lg border bg-card overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-1">
          <Button
            variant={view === "desktop" && !showSource ? "secondary" : "ghost"}
            size="sm" className="h-7 px-2 text-xs"
            onClick={() => { setView("desktop"); setShowSource(false); }}
          >
            <Monitor className="h-3 w-3 mr-1" />Desktop
          </Button>
          <Button
            variant={view === "mobile" && !showSource ? "secondary" : "ghost"}
            size="sm" className="h-7 px-2 text-xs"
            onClick={() => { setView("mobile"); setShowSource(false); }}
          >
            <Smartphone className="h-3 w-3 mr-1" />Mobile
          </Button>
          <Button
            variant={showSource ? "secondary" : "ghost"}
            size="sm" className="h-7 px-2 text-xs"
            onClick={() => setShowSource(!showSource)}
          >
            <Code className="h-3 w-3 mr-1" />Source
          </Button>
        </div>
        {subject && (
          <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
            Subject: {subject}
          </span>
        )}
      </div>

      {/* Inbox header simulation */}
      {!showSource && (subject || previewText) && (
        <div className="px-4 py-2.5 border-b bg-muted/10">
          {subject && <p className="text-sm font-semibold text-foreground truncate">{subject}</p>}
          {previewText && <p className="text-xs text-muted-foreground truncate">{previewText}</p>}
        </div>
      )}

      {/* Content */}
      {showSource ? (
        <pre className="p-3 text-xs font-mono text-muted-foreground overflow-auto max-h-[400px] bg-muted/20 whitespace-pre-wrap">
          {html || "No content"}
        </pre>
      ) : (
        <div className="flex justify-center bg-muted/10 p-4">
          <div className={cn(
            "bg-background rounded shadow-sm border transition-all duration-200",
            view === "desktop" ? "w-full max-w-[600px]" : "w-[375px]"
          )}>
            <iframe
              srcDoc={wrappedHtml}
              className="w-full border-0"
              style={{ minHeight: 300, height: "auto" }}
              sandbox="allow-same-origin"
              title="Email preview"
              onLoad={(e) => {
                const iframe = e.target as HTMLIFrameElement;
                if (iframe.contentDocument?.body) {
                  iframe.style.height = Math.max(300, iframe.contentDocument.body.scrollHeight + 40) + "px";
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
