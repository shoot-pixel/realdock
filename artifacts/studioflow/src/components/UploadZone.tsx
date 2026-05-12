import { useState, useRef, useCallback, DragEvent, ChangeEvent } from "react";
import { Upload, X, CheckCircle2, AlertCircle, ImageIcon, Film, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { getListMediaQueryKey, getGetProjectStatsQueryKey } from "@workspace/api-client-react";

interface FileUploadState {
  id: string;
  file: File;
  status: "pending" | "requesting" | "uploading" | "saving" | "done" | "error";
  progress: number;
  error?: string;
  objectPath?: string;
}

interface UploadZoneProps {
  projectId: number;
}

const ACCEPTED_TYPES = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/webp",
  "image/tiff", "image/heic", "image/heif", "image/gif",
  "image/bmp", "video/mp4", "video/quicktime", "video/mov",
  "video/avi", "video/webm", "video/x-msvideo",
]);

function getMediaType(mimeType: string): "photo" | "video" {
  return mimeType.startsWith("video/") ? "video" : "photo";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  if (!file.type.startsWith("image/")) return null;
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth, height: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

function getAuthToken(): string | null {
  return localStorage.getItem("sf_token");
}

export default function UploadZone({ projectId }: UploadZoneProps) {
  const [files, setFiles] = useState<FileUploadState[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const processFiles = useCallback(async (rawFiles: File[]) => {
    const valid = rawFiles.filter(f => ACCEPTED_TYPES.has(f.type));
    if (valid.length === 0) return;

    const newEntries: FileUploadState[] = valid.map(f => ({
      id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
      file: f,
      status: "pending",
      progress: 0,
    }));

    setFiles(prev => [...prev, ...newEntries]);

    for (const entry of newEntries) {
      const token = getAuthToken();
      if (!token) {
        setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: "error", error: "Not authenticated" } : f));
        continue;
      }

      try {
        setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: "requesting", progress: 5 } : f));

        const urlRes = await fetch("/api/storage/uploads/request-url", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ name: entry.file.name, size: entry.file.size, contentType: entry.file.type || "application/octet-stream" }),
        });
        if (!urlRes.ok) throw new Error("Failed to get upload URL");
        const { uploadURL, objectPath } = await urlRes.json();

        setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: "uploading", progress: 20, objectPath } : f));

        const xhr = new XMLHttpRequest();
        await new Promise<void>((resolve, reject) => {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = 20 + Math.round((e.loaded / e.total) * 65);
              setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, progress: pct } : f));
            }
          };
          xhr.onload = () => xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`));
          xhr.onerror = () => reject(new Error("Network error during upload"));
          xhr.open("PUT", uploadURL);
          xhr.setRequestHeader("Content-Type", entry.file.type || "application/octet-stream");
          xhr.send(entry.file);
        });

        setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: "saving", progress: 90 } : f));

        const dims = await getImageDimensions(entry.file);
        const servingUrl = `/api/storage${objectPath}`;
        const sizeMb = entry.file.size / (1024 * 1024);

        const mediaRes = await fetch(`/api/projects/${projectId}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({
            filename: entry.file.name,
            originalUrl: servingUrl,
            thumbnailUrl: servingUrl,
            mediaType: getMediaType(entry.file.type),
            mimeType: entry.file.type || "application/octet-stream",
            sizeMb: Math.round(sizeMb * 100) / 100,
            width: dims?.width ?? null,
            height: dims?.height ?? null,
            tags: [],
          }),
        });
        if (!mediaRes.ok) throw new Error("Failed to save media record");

        setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: "done", progress: 100 } : f));
        queryClient.invalidateQueries({ queryKey: getListMediaQueryKey(projectId) });
        queryClient.invalidateQueries({ queryKey: getGetProjectStatsQueryKey(projectId) });

      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: "error", error: msg, progress: 0 } : f));
      }
    }
  }, [projectId, queryClient]);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    processFiles(dropped);
  }, [processFiles]);

  const handleFileInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    processFiles(selected);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [processFiles]);

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearDone = () => {
    setFiles(prev => prev.filter(f => f.status !== "done"));
  };

  const activeFiles = files.filter(f => f.status !== "done");
  const doneFiles = files.filter(f => f.status === "done");
  const isUploading = files.some(f => ["requesting", "uploading", "saving"].includes(f.status));

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false); }}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        data-testid="upload-drop-zone"
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? "border-primary bg-primary/8 scale-[1.01]"
            : "border-border hover:border-primary/50 hover:bg-muted/30"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileInput}
          className="hidden"
          data-testid="upload-file-input"
        />

        <div className="flex flex-col items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
            isDragging ? "bg-primary/20" : "bg-muted"
          }`}>
            {isUploading ? (
              <Loader2 className={`w-6 h-6 animate-spin ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
            ) : (
              <Upload className={`w-6 h-6 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
            )}
          </div>
          <div>
            <p className={`text-sm font-medium ${isDragging ? "text-primary" : "text-foreground"}`}>
              {isDragging ? "Drop files here" : "Drag & drop photos or videos"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              or <span className="text-primary underline-offset-2 underline">browse files</span> · JPEG, PNG, WEBP, TIFF, HEIC, MP4, MOV
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground/60">Original quality preserved — no compression</p>
        </div>
      </div>

      {/* Upload progress list */}
      {files.length > 0 && (
        <div className="space-y-2" data-testid="upload-file-list">
          {/* Active/error files */}
          {activeFiles.map(f => (
            <div key={f.id} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3" data-testid={`upload-item-${f.status}`}>
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                {getMediaType(f.file.type) === "video"
                  ? <Film className="w-4 h-4 text-muted-foreground" />
                  : <ImageIcon className="w-4 h-4 text-muted-foreground" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-xs font-medium text-foreground truncate">{f.file.name}</p>
                  <span className="text-[10px] text-muted-foreground shrink-0">{formatBytes(f.file.size)}</span>
                </div>
                {f.status === "error" ? (
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3 text-destructive shrink-0" />
                    <p className="text-[11px] text-destructive truncate">{f.error}</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${f.progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 w-8 text-right">
                      {f.status === "requesting" ? "Init" :
                       f.status === "uploading" ? `${f.progress}%` :
                       f.status === "saving" ? "Saving" : ""}
                    </span>
                  </div>
                )}
              </div>
              {(f.status === "error") && (
                <button
                  onClick={() => removeFile(f.id)}
                  className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}

          {/* Done summary */}
          {doneFiles.length > 0 && (
            <div className="flex items-center justify-between bg-primary/5 border border-primary/15 rounded-xl px-4 py-2.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                <p className="text-xs font-medium text-foreground">
                  {doneFiles.length} {doneFiles.length === 1 ? "file" : "files"} uploaded successfully
                </p>
              </div>
              <button
                onClick={clearDone}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
