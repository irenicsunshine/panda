"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useEdgeStore } from "@/lib/edgestore";
import { createOneTimeUrl } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Copy,
  FileIcon,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";

type FileEntry = {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "done" | "error";
  url?: string;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="shrink-0 p-1.5 rounded-md hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
      title="Copy URL"
    >
      {copied ? (
        <CheckCircle2 className="w-4 h-4 text-green-400" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  );
}

export function FileUploader() {
  const { edgestore } = useEdgeStore();
  const [files, setFiles] = useState<FileEntry[]>([]);

  const updateFile = (id: string, patch: Partial<FileEntry>) =>
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const newEntries: FileEntry[] = acceptedFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        progress: 0,
        status: "uploading",
      }));

      setFiles((prev) => [...newEntries, ...prev]);

      for (const entry of newEntries) {
        try {
          const res = await edgestore.publicFiles.upload({
            file: entry.file,
            onProgressChange: (progress) =>
              updateFile(entry.id, { progress }),
          });
          const token = await createOneTimeUrl(res.url);
          const oneTimeUrl = `${window.location.origin}/api/file/${token}`;
          updateFile(entry.id, { status: "done", url: oneTimeUrl, progress: 100 });
        } catch {
          updateFile(entry.id, { status: "error" });
        }
      }
    },
    [edgestore]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const doneCount = files.filter((f) => f.status === "done").length;

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-start px-4 py-16 gap-10">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-white tracking-tight">
          Drop your files
        </h1>
        <p className="text-zinc-500 text-base">
          Upload anything — get a shareable link instantly.
        </p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`relative w-full max-w-xl rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer p-12 flex flex-col items-center gap-4
          ${
            isDragActive
              ? "border-violet-500 bg-violet-500/10 scale-[1.02]"
              : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-500 hover:bg-zinc-900"
          }`}
      >
        <input {...getInputProps()} />
        <div
          className={`p-4 rounded-full transition-colors duration-300 ${
            isDragActive ? "bg-violet-500/20" : "bg-zinc-800"
          }`}
        >
          <UploadCloud
            className={`w-8 h-8 transition-colors duration-300 ${
              isDragActive ? "text-violet-400" : "text-zinc-400"
            }`}
          />
        </div>
        <div className="text-center">
          <p className="text-white font-medium text-base">
            {isDragActive ? "Release to upload" : "Drag & drop files here"}
          </p>
          <p className="text-zinc-500 text-sm mt-1">
            or{" "}
            <span className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
              browse files
            </span>
          </p>
        </div>
      </div>

      {/* Unified file list */}
      {files.length > 0 && (
        <div className="w-full max-w-xl space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-zinc-400 text-sm font-medium uppercase tracking-wider">
              Files — {doneCount}/{files.length} uploaded
            </p>
          </div>

          {files.map((entry) => (
            <div
              key={entry.id}
              className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Thumbnail or icon */}
                {entry.file.type.startsWith("image/") && entry.status === "done" && entry.url ? (
                  <div className="shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-zinc-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={entry.url}
                      alt={entry.file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                    <FileIcon className="w-5 h-5 text-zinc-400" />
                  </div>
                )}

                {/* File info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-white text-sm font-medium truncate">
                      {entry.file.name}
                    </p>
                    <Badge
                      variant="secondary"
                      className="shrink-0 text-xs bg-zinc-800 text-zinc-400 border-0"
                    >
                      {formatBytes(entry.file.size)}
                    </Badge>
                  </div>

                  {entry.status === "uploading" && (
                    <Progress
                      value={entry.progress}
                      className="mt-2 h-1.5 bg-zinc-800 [&>div]:bg-violet-500"
                    />
                  )}

                  {entry.status === "done" && entry.url && (
                    <div className="flex items-center gap-1 mt-1">
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-400 hover:text-violet-300 text-xs truncate transition-colors"
                      >
                        {entry.url}
                      </a>
                      <CopyButton text={entry.url} />
                    </div>
                  )}

                  {entry.status === "error" && (
                    <p className="text-red-400 text-xs mt-1">Upload failed</p>
                  )}
                </div>

                {/* Status icon */}
                <div className="shrink-0">
                  {entry.status === "uploading" && (
                    <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                  )}
                  {entry.status === "done" && (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  )}
                  {entry.status === "error" && (
                    <X className="w-4 h-4 text-red-400" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {files.length === 0 && (
        <p className="text-zinc-600 text-sm">No files uploaded yet.</p>
      )}

      {files.length > 0 && (
        <Button
          variant="ghost"
          className="text-zinc-600 hover:text-zinc-400 text-sm"
          onClick={() => setFiles([])}
        >
          Clear list
        </Button>
      )}
    </div>
  );
}
