import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getTreeRecords } from '@/services/featureService';
import { generateImpactReport } from '@/services/reportService';
import { deliverFile } from '@/lib/download';
import { format } from 'date-fns';

export function ExportReportButton() {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setIsGenerating(true);
    try {
      const trees = await getTreeRecords();
      if (trees.length === 0) {
        toast({
          title: 'No data to export',
          description: 'There are no trees recorded yet.',
          variant: 'destructive',
        });
        return;
      }
      const blob = generateImpactReport(trees);
      const filename = `belize-tree-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      await deliverFile(blob, filename);
      toast({
        title: 'Report exported',
        description: `${trees.length} trees included in the PDF report.`,
      });
    } catch (error) {
      console.error('Report generation failed:', error);
      toast({
        title: 'Export failed',
        description: 'Could not generate the report. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isGenerating}
      className="gap-1.5 bg-card/80 backdrop-blur-sm"
    >
      {isGenerating ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <FileDown className="w-4 h-4" />
      )}
      <span className="hidden sm:inline">{isGenerating ? 'Generating...' : 'Export Report'}</span>
    </Button>
  );
}
