import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { LucideProps } from 'lucide-react';

interface DropdownSectionCardProps {
  title: string;
  icon: React.ComponentType<LucideProps>;
  valueCount: number;
  unitCount: number;
  children: React.ReactNode;
}

export default function DropdownSectionCard({
  title,
  icon: Icon,
  valueCount,
  unitCount,
  children,
}: DropdownSectionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="w-5 h-5" />
          {title}
          <Badge variant="secondary" className="ml-auto">
            {valueCount} values, {unitCount} units
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

