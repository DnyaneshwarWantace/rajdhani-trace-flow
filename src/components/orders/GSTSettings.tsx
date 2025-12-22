import { Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface GSTSettingsProps {
  rate: number;
  isIncluded: boolean;
  onRateChange: (rate: number) => void;
  onIncludeChange: (included: boolean) => void;
}

export default function GSTSettings({
  rate,
  isIncluded,
  onRateChange,
  onIncludeChange,
}: GSTSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          GST Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>GST Rate (%)</Label>
            <Input
              type="number"
              value={rate}
              onChange={e => onRateChange(parseFloat(e.target.value) || 0)}
              min="0"
              max="100"
              step="0.01"
            />
          </div>
          <div className="space-y-2">
            <Label>GST Status</Label>
            <div className="flex gap-2">
              <Button
                variant={isIncluded ? 'default' : 'outline'}
                size="sm"
                onClick={() => onIncludeChange(true)}
              >
                Include GST
              </Button>
              <Button
                variant={!isIncluded ? 'default' : 'outline'}
                size="sm"
                onClick={() => onIncludeChange(false)}
              >
                Exclude GST
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


