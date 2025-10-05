"use client";

import { useEffect, useState } from "react";
import { UploadedFile } from "../types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  File,
  Music,
  Video,
  Image,
  FileText,
  Trash2,
  CheckCircle2,
  Clock,
  Eye,
  RefreshCw,
} from "lucide-react";
import { FileDetailDialog } from "./file-detail-dialog";
import { RetranscribeDialog } from "./retranscribe-dialog";

interface FileTableProps {
  files: UploadedFile[];
  onDeleteFile: (id: string) => void;
  onUpdateFile: (fileId: string, updates: Partial<UploadedFile>) => void;
  onRetranscribe: (fileId: string, language?: string, prompt?: string) => void;
}

const getFileIcon = (type: UploadedFile["type"]) => {
  switch (type) {
    case "audio":
      return <Music className="h-4 w-4" />;
    case "video":
      return <Video className="h-4 w-4" />;
    case "image":
      return <Image className="h-4 w-4" />;
    case "document":
      return <FileText className="h-4 w-4" />;
    default:
      return <File className="h-4 w-4" />;
  }
};

const formatFileSize = (bytes: number): string => {
  const mb = bytes / (1024 * 1024);
  return mb < 1 ? `${(bytes / 1024).toFixed(2)} KB` : `${mb.toFixed(2)} MB`;
};

const getFileTypeBadge = (type: UploadedFile["type"]) => {
  const colors = {
    audio: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    video: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    image: "bg-green-500/10 text-green-500 border-green-500/20",
    document: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  };

  return (
    <Badge variant="outline" className={colors[type]}>
      {type.toUpperCase()}
    </Badge>
  );
};

export function FileTable({
  files,
  onDeleteFile,
  onUpdateFile,
  onRetranscribe,
}: FileTableProps) {
  const [detailFile, setDetailFile] = useState<UploadedFile | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [retranscribeFile, setRetranscribeFile] = useState<UploadedFile | null>(
    null
  );
  const [retranscribeDialogOpen, setRetranscribeDialogOpen] = useState(false);

  const handleViewDetails = (file: UploadedFile) => {
    setDetailFile(file);
    setDetailDialogOpen(true);
  };

  const handleRetranscribe = (file: UploadedFile) => {
    setRetranscribeFile(file);
    setRetranscribeDialogOpen(true);
  };

  // Keep the selected detailFile in sync with latest files while dialog is open
  useEffect(() => {
    if (!detailDialogOpen || !detailFile) return;
    const latest = files.find((f) => f.id === detailFile.id) || null;
    if (latest && latest !== detailFile) {
      setDetailFile(latest);
    }
  }, [files, detailDialogOpen, detailFile]);

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <File className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No files uploaded yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Upload audio, video, images, or documents to get started with your
          project
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Uploaded Files</h2>
          <p className="text-sm text-muted-foreground">
            {files.length} file{files.length !== 1 ? "s" : ""} • Total size:{" "}
            {formatFileSize(files.reduce((acc, f) => acc + f.size, 0))}
          </p>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => (
              <TableRow key={file.id}>
                <TableCell>
                  <div className="flex items-center justify-center text-muted-foreground">
                    {getFileIcon(file.type)}
                  </div>
                </TableCell>
                <TableCell className="font-medium max-w-xs truncate">
                  {file.name}
                </TableCell>
                <TableCell>{getFileTypeBadge(file.type)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatFileSize(file.size)}
                </TableCell>
                <TableCell>
                  {file.indexed ? (
                    <div className="flex items-center gap-2 text-green-500">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs">Indexed</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs">Pending</span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                  {file.summary || "—"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewDetails(file)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">View & Edit Details</p>
                      </TooltipContent>
                    </Tooltip>

                    {(file.type === "audio" || file.type === "video") && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleRetranscribe(file)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Re-transcribe</p>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onDeleteFile(file.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Delete File</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialogs */}
      <FileDetailDialog
        file={detailFile}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onSave={onUpdateFile}
      />

      <RetranscribeDialog
        file={retranscribeFile}
        open={retranscribeDialogOpen}
        onOpenChange={setRetranscribeDialogOpen}
        onRetranscribe={onRetranscribe}
      />
    </div>
  );
}
