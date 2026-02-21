import { useState } from "react";
import { useNavigate } from "react-router";
import { Upload, CheckCircle2, Play, Loader2 } from "lucide-react";
import { Button } from "@/shared/ui";
import { uploadTicketsCsv, processTickets } from "../services/ticketsApi";

type ProcessStage = "idle" | "processing" | "completed";

interface FileUploadState {
  file: File | null;
  uploaded: boolean;
  rows?: number;
}

export function ImportDataPage() {
  const navigate = useNavigate();
  const [fileData, setFileData] = useState<FileUploadState>({
    file: null,
    uploaded: false,
  });
  const [_validationStatus, setValidationStatus] = useState<"idle" | "valid" | "error">("idle");
  const [stage, setStage] = useState<ProcessStage>("idle");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    setFileData({ file, uploaded: false, rows: undefined });
    setValidationStatus("idle");
    setUploadError(null);
    setUploading(true);
    try {
      const result = await uploadTicketsCsv(file, true);
      setFileData({ file, uploaded: true, rows: result.rows_imported });
      setValidationStatus(result.rows_imported > 0 ? "valid" : "error");
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Ошибка загрузки файла");
      setFileData({ file, uploaded: false, rows: 0 });
      setValidationStatus("error");
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.name.endsWith(".csv")) handleFileUpload(droppedFile);
  };

  const handleStartProcessing = async () => {
    setStage("processing");
    try {
      await processTickets();
      setStage("completed");
      setTimeout(() => navigate("/requests"), 1000);
    } catch {
      setStage("idle");
      setUploadError("Ошибка обработки данных");
    }
  };

  const showUploadZone = stage === "idle" && !fileData.uploaded && !uploading;

  return (
    <div className="p-8">
      <div className="max-w-[1440px] mx-auto">
        <div className="mb-10">
          <h1 className="text-[40px] font-semibold text-foreground mb-3">Загрузка и обработка данных</h1>
          <p className="text-muted-foreground text-lg">
            Импортируйте CSV-файлы для запуска системы интеллектуального распределения
          </p>
        </div>

        {stage === "idle" && (
          <div className="mb-8">
            <div
              className="bg-card border border-border rounded-lg p-8 transition-all hover:border-primary/30"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {uploading ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Loader2 size={32} className="text-primary animate-spin mb-4" />
                  <span className="text-lg font-medium text-foreground">Загрузка файла на сервер...</span>
                  <p className="text-sm text-muted-foreground">{fileData.file?.name}</p>
                </div>
              ) : showUploadZone ? (
                <div className="border-2 border-dashed border-border rounded-lg p-16 text-center">
                  <Upload size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg text-foreground font-medium mb-2">Перетащите CSV-файл сюда</p>
                  <p className="text-sm text-muted-foreground mb-6">или выберите файл с вашего компьютера</p>
                  {uploadError && (
                    <p className="text-sm text-destructive mb-4">{uploadError}</p>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = ".csv";
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) handleFileUpload(file);
                      };
                      input.click();
                    }}
                  >
                    Выбрать файл
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex flex-col items-center gap-3 mb-8">
                    <CheckCircle2 size={24} className="text-primary" />
                    <span className="text-lg font-medium text-foreground">Файл успешно загружен</span>
                    <p className="text-sm text-muted-foreground">{fileData.file?.name}</p>
                  </div>
                  <Button onClick={handleStartProcessing} size="lg" className="h-14 px-12 text-base mb-3">
                    <Play size={20} className="mr-2" />
                    Запустить обработку
                  </Button>
                  <p className="text-xs text-muted-foreground text-center max-w-md">
                    Система выполнит AI-анализ, гео-нормализацию и распределение обращений
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {stage === "processing" && (
          <div className="bg-card border border-border rounded-lg p-8 mb-8">
            <div className="flex flex-col items-center py-12">
              <Loader2 size={48} className="text-primary animate-spin mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Обработка данных</h2>
              <p className="text-sm text-muted-foreground">Пожалуйста, подождите. Это может занять несколько минут.</p>
            </div>
          </div>
        )}

        {stage === "completed" && (
          <div className="bg-card border border-primary/20 rounded-lg p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <CheckCircle2 size={24} className="text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-foreground">Обработка завершена</h2>
                <p className="text-sm text-muted-foreground">Переход к результатам...</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
