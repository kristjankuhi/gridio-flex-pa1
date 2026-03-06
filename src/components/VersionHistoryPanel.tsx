import { useState } from 'react';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePriceCurve } from '@/store/priceCurveStore';

interface VersionHistoryPanelProps {
  open: boolean;
  onClose: () => void;
  onRestore: (versionId: string) => void;
}

export function VersionHistoryPanel({
  open,
  onClose,
  onRestore,
}: VersionHistoryPanelProps) {
  const { versions } = usePriceCurve();
  const [previewId, setPreviewId] = useState<string | null>(null);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="bg-card border-border w-96">
        <SheetHeader>
          <SheetTitle className="text-base">Version History</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-2">
          {versions.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No saved versions yet
            </p>
          )}
          {versions.map((version) => (
            <button
              key={version.id}
              onClick={() =>
                setPreviewId(version.id === previewId ? null : version.id)
              }
              className={`w-full text-left rounded-md border px-4 py-3 transition-colors ${
                version.isActive
                  ? 'border-primary/50 bg-primary/5'
                  : previewId === version.id
                    ? 'border-border bg-muted/50'
                    : 'border-transparent hover:border-border hover:bg-muted/30'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-muted-foreground">
                  {format(version.createdAt, 'HH:mm, d MMM')}
                </span>
                {version.isActive && (
                  <Badge className="text-[10px] px-1.5 py-0 bg-primary/20 text-primary border-0">
                    Active
                  </Badge>
                )}
              </div>
              <p className="text-xs text-foreground">{version.summary}</p>
            </button>
          ))}
        </div>

        {previewId && !versions.find((v) => v.id === previewId)?.isActive && (
          <div className="absolute bottom-6 left-6 right-6">
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                onRestore(previewId);
                setPreviewId(null);
                onClose();
              }}
            >
              Restore this version
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
