"use client";

import { UploadButton, UploadDropzone } from "@/lib/uploadthing";
import { ourFileRouter } from "@/app/api/uploadthing/core";
import { toast } from "sonner";

interface FileUploadProps {
  endpoint: keyof typeof ourFileRouter;
  onChange: (url?: string, name?: string, size?: number, type?: string) => void;
  value?: string;
}

export const FileUpload = ({
  endpoint,
  onChange,
  value
}: FileUploadProps) => {
  return (
    <UploadDropzone
      endpoint={endpoint}
      onClientUploadComplete={(res) => {
        if (res && res[0]) {
          onChange(res[0].url, res[0].name, res[0].size, res[0].type);
          toast.success("Файл загружен");
        }
      }}
      onUploadError={(error: Error) => {
        toast.error(`Ошибка: ${error.message}`);
      }}
      className="ut-label:text-sm ut-allowed-content:ut-uploading:text-red-300"
    />
  );
}
