import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ClientService } from '@/types/client';
import { RefreshCw, Pause, Play, Settings } from 'lucide-react';
import dayjs from 'dayjs';

interface RecurringControlPanelProps {
  service: ClientService;
  onGenerate: () => Promise<void>;
  onPause: (reason: string) => Promise<void>;
  onResume: () => Promise<void>;
  onEditSettings: () => void;
}

export const RecurringControlPanel = ({
  service,
  onGenerate,
  onPause,
  onResume,
  onEditSettings,
}: RecurringControlPanelProps) => {
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePause = async () => {
    setLoading(true);
    try {
      await onPause(pauseReason);
      setPauseDialogOpen(false);
      setPauseReason('');
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    setLoading(true);
    try {
      await onResume();
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      await onGenerate();
    } finally {
      setLoading(false);
    }
  };

  if (!service.recurring) return null;

  const { recurring } = service;
  const isPaused = recurring.isPaused;

  return (
    <>
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Recurring Service Control</span>
            {isPaused ? (
              <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700">
                ⏸️ PAUSED
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-green-500/10 text-green-700">
                ✅ ACTIVE
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isPaused ? (
            <>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Frequency</p>
                  <p className="font-medium capitalize">{recurring.frequency}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Generate Ahead</p>
                  <p className="font-medium">{recurring.generateAheadCount} payments</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Generated</p>
                  <p className="font-medium">
                    {recurring.lastGenerated 
                      ? dayjs(recurring.lastGenerated).format('MMM D, YYYY')
                      : 'Not yet'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Next Due</p>
                  <p className="font-medium">
                    {recurring.nextDueDate 
                      ? dayjs(recurring.nextDueDate).format('MMM D, YYYY')
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>
              
              <div className="text-sm">
                <p className="text-muted-foreground">Total Generated</p>
                <p className="font-medium">{recurring.totalGenerated || 0} payments</p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={handleGenerate}
                  disabled={loading}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate Now
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => setPauseDialogOpen(true)}
                  disabled={loading}
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onEditSettings}
                  disabled={loading}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Paused On</p>
                  <p className="font-medium">
                    {recurring.pausedAt 
                      ? dayjs(recurring.pausedAt).format('MMM D, YYYY')
                      : 'N/A'
                    }
                  </p>
                </div>
                {recurring.pausedReason && (
                  <div>
                    <p className="text-muted-foreground">Reason</p>
                    <p className="font-medium">{recurring.pausedReason}</p>
                  </div>
                )}
              </div>

              <Button 
                className="w-full"
                onClick={handleResume}
                disabled={loading}
              >
                <Play className="w-4 h-4 mr-2" />
                Resume Recurring
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pause Dialog */}
      <Dialog open={pauseDialogOpen} onOpenChange={setPauseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause Recurring Payments</DialogTitle>
            <DialogDescription>
              Service: {service.serviceName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              ⚠️ Pausing will stop automatic payment generation. Existing scheduled payments will remain.
            </p>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Client on vacation"
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                rows={3}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              You can resume anytime from this control panel.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPauseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePause} disabled={loading}>
              Pause Recurring
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
