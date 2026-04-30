"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import DOMPurify from "dompurify";
import {
  Bold, Italic, Link, List, ListOrdered, Eye, Code, Type, Smartphone, Monitor,
  User, Building, Mail, Calendar, Variable, Search, Plus, X, Palette,
  AlignLeft, AlignCenter, AlignRight, Heading1, Heading2, Quote, Undo, Redo,
  MousePointerClick, Check, ChevronDown, SeparatorHorizontal, Image as ImageIcon, Paperclip, Strikethrough
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface EmailAttachment {
  id: string;
  filename: string;
  size: number;
  content: string; // base64
  mimeType: string;
}

interface RichEmailEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  className?: string;
  subject?: string;
  previewText?: string;
  attachments?: EmailAttachment[];
  onAttachmentsChange?: (attachments: EmailAttachment[]) => void;
}

// Available variables for insertion
const VARIABLES = [
  { key: "first_name", label: "First Name", icon: User, category: "Contact" },
  { key: "last_name", label: "Last Name", icon: User, category: "Contact" },
  { key: "name", label: "Full Name", icon: User, category: "Contact" },
  { key: "email", label: "Email", icon: Mail, category: "Contact" },
  { key: "company", label: "Company", icon: Building, category: "Contact" },
  { key: "phone", label: "Phone", icon: PhoneIcon, category: "Contact" },
  { key: "date", label: "Current Date", icon: Calendar, category: "System" },
];

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

// Button preset styles
const BUTTON_PRESETS = [
  { name: "Primary", bg: "#0e9aa7", color: "#ffffff", borderRadius: "6px" },
  { name: "Secondary", bg: "#6366f1", color: "#ffffff", borderRadius: "6px" },
  { name: "Success", bg: "#22c55e", color: "#ffffff", borderRadius: "6px" },
  { name: "Dark", bg: "#1f2937", color: "#ffffff", borderRadius: "6px" },
  { name: "Outline", bg: "transparent", color: "#0e9aa7", border: "2px solid #0e9aa7", borderRadius: "6px" },
];

type EditorMode = "visual" | "html" | "preview";
type PreviewDevice = "desktop" | "mobile";

export function RichEmailEditor({
  value,
  onChange,
  placeholder = "Write your email content here...",
  minHeight = 300,
  className,
  subject,
  previewText,
  attachments = [],
  onAttachmentsChange,
}: RichEmailEditorProps) {
  const [mode, setMode] = useState<EditorMode>("visual");
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");
  const [variableSearch, setVariableSearch] = useState("");
  const [showButtonDialog, setShowButtonDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [buttonConfig, setButtonConfig] = useState({
    text: "Click Here",
    url: "",
    bgColor: "#0e9aa7",
    textColor: "#ffffff",
    borderRadius: "6px",
    padding: "12px 24px",
  });
  
  // Image insertion state
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Link insertion state
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const linkInputRef = useRef<HTMLInputElement>(null);
  
  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasInitialized = useRef(false);
  const [lastSelection, setLastSelection] = useState<Range | null>(null);
  const savedLinkRange = useRef<Range | null>(null);

  // Filter variables based on search
  const filteredVariables = useMemo(() => {
    if (!variableSearch) return VARIABLES;
    const search = variableSearch.toLowerCase();
    return VARIABLES.filter(v => 
      v.label.toLowerCase().includes(search) || 
      v.key.toLowerCase().includes(search)
    );
  }, [variableSearch]);

  // Group variables by category
  const groupedVariables = useMemo(() => {
    const groups: Record<string, typeof VARIABLES> = {};
    filteredVariables.forEach(v => {
      if (!groups[v.category]) groups[v.category] = [];
      groups[v.category].push(v);
    });
    return groups;
  }, [filteredVariables]);

  // Track if component is mounted to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Initialize editor content when switching to visual mode
  useEffect(() => {
    if (editorRef.current && mode === "visual" && !hasInitialized.current && mounted) {
      editorRef.current.innerHTML = value || `<p>${placeholder}</p>`;
      hasInitialized.current = true;
    }
  }, [mode, placeholder, value, mounted]);

  // Save selection before inserting
  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      setLastSelection(selection.getRangeAt(0).cloneRange());
    }
  };

  // Restore selection and insert content
  const insertAtCursor = (html: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    
    const selection = window.getSelection();
    if (selection) {
      // Try to use last saved selection or current selection
      let range: Range | null = null;
      
      if (lastSelection && editor.contains(lastSelection.commonAncestorContainer)) {
        range = lastSelection;
      } else if (selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
        range = selection.getRangeAt(0);
      }

      if (range) {
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Delete any selected content
        range.deleteContents();
        
        // Create a temporary element to parse HTML
        const temp = document.createElement("div");
        temp.innerHTML = html;
        
        // Insert the content
        const fragment = document.createDocumentFragment();
        let lastNode: Node | null = null;
        while (temp.firstChild) {
          lastNode = temp.firstChild;
          fragment.appendChild(lastNode);
        }
        
        range.insertNode(fragment);
        
        // Move cursor after inserted content
        if (lastNode) {
          range.setStartAfter(lastNode);
          range.setEndAfter(lastNode);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        
        // Trigger change
        onChange(editor.innerHTML);
      } else {
        // Fallback: append at end
        editor.innerHTML += html;
        onChange(editor.innerHTML);
      }
    }
    
    setLastSelection(null);
  };

  // Format commands for visual editor
  const formatDoc = (command: string, value: string = "") => {
    // Ensure editor is focused before formatting
    if (document.activeElement !== editorRef.current) {
      editorRef.current?.focus();
    }
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  // Handle link insertion
  const handleLinkClick = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.toString().length === 0) {
      return;
    }
    // Save the exact range NOW before the input steals focus
    savedLinkRange.current = selection.getRangeAt(0).cloneRange();
    setShowLinkInput(true);
    setTimeout(() => linkInputRef.current?.focus(), 0);
  };

  const insertLink = () => {
    if (linkUrl && editorRef.current && savedLinkRange.current) {
      // Restore the editor focus and the saved selection
      editorRef.current.focus();
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedLinkRange.current);
      }
      document.execCommand("createLink", false, linkUrl);
      // Make all created links open in new tab and have blue underline style
      editorRef.current.querySelectorAll('a').forEach((a) => {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      });
      onChange(editorRef.current.innerHTML);
    }
    savedLinkRange.current = null;
    setShowLinkInput(false);
    setLinkUrl("");
  };

  // Insert variable
  const insertVariable = (variableKey: string) => {
    if (mode === "visual") {
      insertAtCursor(`{{${variableKey}}}`);
    } else {
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart || 0;
      const end = el.selectionEnd || 0;
      const newValue = value.slice(0, start) + `{{${variableKey}}}` + value.slice(end);
      onChange(newValue);
      setTimeout(() => {
        const newPos = start + variableKey.length + 4;
        el.setSelectionRange(newPos, newPos);
        el.focus();
      }, 0);
    }
  };

  // Insert CTA button
  const insertButton = () => {
    const buttonHtml = `
      <div style="text-align: center; margin: 20px 0;">
        <a href="${buttonConfig.url || '#'})" 
           style="display: inline-block; 
                  background-color: ${buttonConfig.bgColor}; 
                  color: ${buttonConfig.textColor}; 
                  padding: ${buttonConfig.padding}; 
                  border-radius: ${buttonConfig.borderRadius}; 
                  text-decoration: none; 
                  font-weight: 600;
                  font-size: 14px;
                  border: ${buttonConfig.bgColor === 'transparent' ? `2px solid ${buttonConfig.textColor}` : 'none'};">
          ${buttonConfig.text}
        </a>
      </div>
    `;
    
    if (mode === "visual") {
      insertAtCursor(buttonHtml);
    } else {
      onChange(value + buttonHtml);
    }
    setShowButtonDialog(false);
  };

  // Handle editor input
  const handleEditorInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  // Handle image upload
  const handleImageUpload = (file: File | undefined) => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImagePreview(result);
      setImageUrl("");
    };
    reader.readAsDataURL(file);
  };

  // Insert image at cursor
  const insertImage = () => {
    if (!imagePreview) return;
    
    const imgHtml = `<img src="${imagePreview}" style="max-width: 100%; height: auto; border-radius: 4px;" />`;
    
    if (mode === "visual") {
      insertAtCursor(imgHtml);
    } else {
      const el = textareaRef.current;
      if (el) {
        const start = el.selectionStart || 0;
        const newValue = value.slice(0, start) + imgHtml + value.slice(start);
        onChange(newValue);
      }
    }
    
    setImageUrl("");
    setImagePreview(null);
    setShowImageDialog(false);
  };

  // Handle file attachment
  const handleAttachment = (files: FileList | null) => {
    if (!files || !onAttachmentsChange) return;
    
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = (e.target?.result as string)?.split(',')[1] || '';
        const newAttachment: EmailAttachment = {
          id: Math.random().toString(36).substring(2),
          filename: file.name,
          size: file.size,
          content,
          mimeType: file.type,
        };
        onAttachmentsChange([...attachments, newAttachment]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove attachment
  const removeAttachment = (id: string) => {
    if (!onAttachmentsChange) return;
    onAttachmentsChange(attachments.filter(a => a.id !== id));
  };

  // Render email preview - emails always show with light background for accuracy
  const renderPreview = () => {
    const sanitized = DOMPurify.sanitize(value || "<p style='color:#6b7280;text-align:center;padding:40px'>Start writing your email...</p>");
    
    return (
      <div className={cn(
        "rounded-lg border border-border overflow-hidden",
        previewDevice === "mobile" ? "max-w-[375px] mx-auto" : "w-full"
      )}>
        {/* Email Header - uses card background for contrast in both modes */}
        <div className="bg-card border-b border-border px-4 py-3">
          {subject ? (
            <div>
              <p className="font-semibold text-sm text-foreground">{subject}</p>
              {previewText && <p className="text-xs text-muted-foreground mt-0.5">{previewText}</p>}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No subject line</p>
          )}
        </div>
        
        {/* Email Body - light background since emails are typically sent with white bg */}
        <div 
          className="bg-white dark:bg-gray-50 min-h-[200px] p-6"
          style={{ 
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            lineHeight: 1.6,
            color: "#374151"
          }}
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />
      </div>
    );
  };

  // Check if formatting command is active at current selection
  const isCommandActive = (command: string) => {
    if (typeof document === 'undefined') return false;
    try {
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  };

  // Toolbar button component with active state support
  // Uses onMouseDown + preventDefault to prevent stealing focus from the editor
  const ToolbarButton = ({
    icon: Icon,
    label,
    onClick,
    active,
  }: {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    active?: boolean;
  }) => (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={active ? "secondary" : "ghost"}
            size="icon"
            className={`h-8 w-8 ${active ? 'bg-primary/20 text-primary' : ''}`}
            onMouseDown={(e) => {
              e.preventDefault(); // prevent stealing focus from editor
              onClick();
            }}
          >
            <Icon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className={cn("space-y-3", className)}>
      {/* Main Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 rounded-lg border bg-muted/20">
        {/* Mode toggle */}
        <div className="flex items-center gap-1 mr-2 bg-muted rounded-md p-0.5">
          <Toggle
            pressed={mode === "visual"}
            onPressedChange={() => setMode("visual")}
            className="h-7 text-xs px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            <Type className="h-3.5 w-3.5 mr-1.5" />
            Write
          </Toggle>
          <Toggle
            pressed={mode === "preview"}
            onPressedChange={() => setMode("preview")}
            className="h-7 text-xs px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Preview
          </Toggle>
          <Toggle
            pressed={mode === "html"}
            onPressedChange={() => setMode("html")}
            className="h-7 text-xs px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            <Code className="h-3.5 w-3.5 mr-1.5" />
            HTML
          </Toggle>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {mode === "visual" && (
          <>
            {/* Text formatting */}
            <ToolbarButton icon={Bold} label="Bold" onClick={() => formatDoc("bold")} active={isCommandActive('bold')} />
            <ToolbarButton icon={Italic} label="Italic" onClick={() => formatDoc("italic")} active={isCommandActive('italic')} />
            <ToolbarButton icon={UnderlineIcon} label="Underline" onClick={() => formatDoc("underline")} active={isCommandActive('underline')} />
            <ToolbarButton icon={Strikethrough} label="Strikethrough" onClick={() => formatDoc("strikeThrough")} active={isCommandActive('strikeThrough')} />
            
            <Separator orientation="vertical" className="h-6 mx-1" />
            
            {/* Alignment */}
            <ToolbarButton icon={AlignLeft} label="Align Left" onClick={() => formatDoc("justifyLeft")} />
            <ToolbarButton icon={AlignCenter} label="Align Center" onClick={() => formatDoc("justifyCenter")} />
            <ToolbarButton icon={AlignRight} label="Align Right" onClick={() => formatDoc("justifyRight")} />
            
            <Separator orientation="vertical" className="h-6 mx-1" />
            
            {/* Lists */}
            <ToolbarButton icon={List} label="Bullet List" onClick={() => formatDoc("insertUnorderedList")} />
            <ToolbarButton icon={ListOrdered} label="Numbered List" onClick={() => formatDoc("insertOrderedList")} />
            
            <Separator orientation="vertical" className="h-6 mx-1" />
            
            {/* Insert */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 gap-1.5"
                onMouseDown={(e) => { e.preventDefault(); handleLinkClick(); }}
                disabled={showLinkInput}
              >
                <Link className="h-4 w-4" />
                <span className="text-xs">Link</span>
              </Button>
              
              {showLinkInput && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-popover border rounded-md shadow-md p-2 w-64">
                  <div className="flex gap-2">
                    <Input
                      ref={linkInputRef}
                      type="url"
                      placeholder="https://example.com"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") insertLink();
                        if (e.key === "Escape") {
                          setShowLinkInput(false);
                          setLinkUrl("");
                          savedLinkRange.current = null;
                        }
                      }}
                      className="h-8 text-xs"
                    />
                    <Button size="sm" className="h-8 px-2" onClick={insertLink}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => {
                        setShowLinkInput(false);
                        setLinkUrl("");
                        savedLinkRange.current = null;
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 gap-1.5"
              onMouseDown={(e) => { e.preventDefault(); saveSelection(); setShowImageDialog(true); }}
            >
              <ImageIcon className="h-4 w-4" />
              <span className="text-xs">Image</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 gap-1.5"
              onMouseDown={(e) => { e.preventDefault(); saveSelection(); setShowButtonDialog(true); }}
            >
              <MousePointerClick className="h-4 w-4" />
              <span className="text-xs">Button</span>
            </Button>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Undo/Redo */}
            <ToolbarButton icon={Undo} label="Undo" onClick={() => formatDoc("undo")} />
            <ToolbarButton icon={Redo} label="Redo" onClick={() => formatDoc("redo")} />
          </>
        )}

        {mode === "html" && (
          <span className="text-xs text-muted-foreground">
            Edit HTML directly
          </span>
        )}

        {mode === "preview" && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground">View as:</span>
            <Tabs value={previewDevice} onValueChange={(v) => setPreviewDevice(v as PreviewDevice)}>
              <TabsList className="h-7">
                <TabsTrigger value="desktop" className="px-2 py-1">
                  <Monitor className="h-3.5 w-3.5" />
                </TabsTrigger>
                <TabsTrigger value="mobile" className="px-2 py-1">
                  <Smartphone className="h-3.5 w-3.5" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}
      </div>

      {/* Variable Picker Bar */}
      <div className="flex items-center gap-2 p-2 rounded-lg border bg-primary/5">
        <Variable className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs font-medium text-foreground shrink-0">Insert variable:</span>
        <div className="flex flex-wrap gap-1 flex-1">
          {VARIABLES.slice(0, 4).map((variable) => (
            <Button
              key={variable.key}
              variant="outline"
              size="sm"
              className="h-6 text-[11px] px-2 bg-background border border-input hover:bg-primary hover:text-primary-foreground"
              onClick={() => insertVariable(variable.key)}
            >
              {variable.label}
            </Button>
          ))}
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[11px] px-2 gap-1"
              >
                <Plus className="h-3 w-3" />
                More
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              <div className="relative mb-2">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search variables..."
                  value={variableSearch}
                  onChange={(e) => setVariableSearch(e.target.value)}
                  className="h-8 pl-7 text-xs"
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {Object.entries(groupedVariables).map(([category, vars]) => (
                  <div key={category}>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-2 py-1">
                      {category}
                    </p>
                    {vars.map((variable) => (
                      <Button
                        key={variable.key}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-8 text-xs"
                        onClick={() => insertVariable(variable.key)}
                      >
                        <variable.icon className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                        <span className="flex-1">{variable.label}</span>
                        <code className="text-[10px] bg-muted px-1 rounded">{`{{${variable.key}}}`}</code>
                      </Button>
                    ))}
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Editor Content */}
      <div className="space-y-2">
        {mode === "visual" && (
          <div className="relative">
            <div
              ref={editorRef}
              contentEditable
              onInput={handleEditorInput}
              onMouseUp={saveSelection}
              onKeyUp={saveSelection}
              onBlur={handleEditorInput}
              className="min-h-[300px] p-4 rounded-md border border-input text-foreground resize-y overflow-auto focus:outline-none focus:ring-2 focus:ring-ring focus:border-input [&_a]:text-blue-600 [&_a]:underline [&_a]:cursor-pointer dark:[&_a]:text-blue-400"
              style={{ minHeight }}
            />
            <p className="text-[10px] text-muted-foreground mt-2">
              <span className="font-medium">Tip:</span> Select text to format it. Click "Button" to add CTAs.
            </p>
          </div>
        )}

        {mode === "html" && (
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="<p>Edit raw HTML here...</p>"
              className="min-h-[300px] resize-y font-mono text-xs bg-background text-foreground"
              style={{ minHeight }}
            />
            <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
              <Code className="h-3 w-3" />
              <span>Editing raw HTML. Variables: <code className="bg-muted px-1 rounded">{`{{first_name}}`}</code></span>
            </p>
          </div>
        )}

        {mode === "preview" && (
          <div className="space-y-2">
            {renderPreview()}
            <p className="text-[10px] text-center text-muted-foreground">
              This is how your email will appear to recipients
            </p>
          </div>
        )}
      </div>

      {/* Attachments Section */}
      {onAttachmentsChange && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Paperclip className="h-4 w-4" />
              <span>Add attachment</span>
              <input
                type="file"
                className="hidden"
                multiple
                onChange={(e) => handleAttachment(e.target.files)}
              />
            </label>
          </div>
          
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md text-sm"
                >
                  <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="max-w-[150px] truncate">{attachment.filename}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(attachment.size / 1024).toFixed(1)} KB)
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 ml-1"
                    onClick={() => removeAttachment(attachment.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Button Insert Dialog */}
      <Dialog open={showButtonDialog} onOpenChange={setShowButtonDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MousePointerClick className="h-5 w-5" />
              Insert Call-to-Action Button
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Presets */}
            <div>
              <Label className="text-xs">Quick Styles</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {BUTTON_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    className={cn(
                      "h-8 px-3 text-sm font-medium transition-all hover:opacity-90",
                      buttonConfig.bgColor === preset.bg && "ring-2 ring-primary ring-offset-2"
                    )}
                    style={{
                      backgroundColor: preset.bg,
                      color: preset.color,
                      borderRadius: preset.borderRadius,
                      border: preset.border || "none",
                    }}
                    onClick={() => setButtonConfig({
                      ...buttonConfig,
                      bgColor: preset.bg,
                      textColor: preset.color,
                      borderRadius: preset.borderRadius,
                    })}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom colors */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Background Color</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="color"
                    value={buttonConfig.bgColor}
                    onChange={(e) => setButtonConfig({ ...buttonConfig, bgColor: e.target.value })}
                    className="h-9 w-12 p-1"
                  />
                  <Input
                    value={buttonConfig.bgColor}
                    onChange={(e) => setButtonConfig({ ...buttonConfig, bgColor: e.target.value })}
                    className="h-9 flex-1 text-xs"
                    placeholder="#0e9aa7"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Text Color</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="color"
                    value={buttonConfig.textColor}
                    onChange={(e) => setButtonConfig({ ...buttonConfig, textColor: e.target.value })}
                    className="h-9 w-12 p-1"
                  />
                  <Input
                    value={buttonConfig.textColor}
                    onChange={(e) => setButtonConfig({ ...buttonConfig, textColor: e.target.value })}
                    className="h-9 flex-1 text-xs"
                    placeholder="#ffffff"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs">Button Text</Label>
              <Input
                value={buttonConfig.text}
                onChange={(e) => setButtonConfig({ ...buttonConfig, text: e.target.value })}
                className="h-9 mt-1 text-sm"
                placeholder="e.g., Get Started, Book Now"
              />
            </div>

            <div>
              <Label className="text-xs">Button Link (URL)</Label>
              <Input
                value={buttonConfig.url}
                onChange={(e) => setButtonConfig({ ...buttonConfig, url: e.target.value })}
                className="h-9 mt-1 text-sm"
                placeholder="https://example.com/action"
              />
            </div>

            <div>
              <Label className="text-xs">Corner Radius</Label>
              <Select
                value={buttonConfig.borderRadius}
                onValueChange={(v) => setButtonConfig({ ...buttonConfig, borderRadius: v })}
              >
                <SelectTrigger className="h-9 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0px">Square</SelectItem>
                  <SelectItem value="4px">Slightly Rounded</SelectItem>
                  <SelectItem value="6px">Rounded</SelectItem>
                  <SelectItem value="9999px">Pill Shape</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Live preview */}
            <div className="pt-2 border-t">
              <Label className="text-xs text-muted-foreground mb-2 block">Preview</Label>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  style={{
                    display: "inline-block",
                    backgroundColor: buttonConfig.bgColor,
                    color: buttonConfig.textColor,
                    padding: buttonConfig.padding,
                    borderRadius: buttonConfig.borderRadius,
                    textDecoration: "none",
                    fontWeight: 600,
                    fontSize: "14px",
                    border: buttonConfig.bgColor === "transparent" ? `2px solid ${buttonConfig.textColor}` : "none",
                  }}
                >
                  {buttonConfig.text}
                </a>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowButtonDialog(false)}>
              Cancel
            </Button>
            <Button onClick={insertButton}>
              <Check className="h-4 w-4 mr-1.5" />
              Insert Button
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Insert Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Insert Image
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs">Image URL</Label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="h-9 mt-1"
                placeholder="https://example.com/image.jpg"
              />
            </div>
            
            <div className="text-center text-muted-foreground text-sm">— OR —</div>
            
            <div>
              <Label className="text-xs">Upload Image</Label>
              <div className="mt-1">
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-muted rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <ImageIcon className="h-6 w-6 text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground">Click to upload</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e.target.files?.[0])}
                  />
                </label>
              </div>
            </div>

            {imagePreview && (
              <div className="pt-2">
                <Label className="text-xs text-muted-foreground mb-2 block">Preview</Label>
                <div className="p-4 bg-muted/30 rounded-lg flex justify-center">
                  <img src={imagePreview} alt="Preview" className="max-h-32 rounded" />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImageDialog(false)}>
              Cancel
            </Button>
            <Button onClick={insertImage} disabled={!imagePreview}>
              <Check className="h-4 w-4 mr-1.5" />
              Insert Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Underline icon
function UnderlineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
      <line x1="4" x2="20" y1="21" y2="21" />
    </svg>
  );
}
