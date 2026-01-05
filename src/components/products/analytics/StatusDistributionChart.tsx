import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StatusDistributionChartProps {
  data: {
    name: string;
    value: number;
    color: string;
  }[];
  title?: string;
}

export default function StatusDistributionChart({ data, title = 'Status Distribution' }: StatusDistributionChartProps) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
      backgroundColor: '#fff',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      borderRadius: 8,
      padding: [8, 12],
      textStyle: {
        color: '#374151',
        fontSize: 12,
      },
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'center',
      textStyle: {
        color: '#374151',
        fontSize: 13,
        fontWeight: 500,
      },
      itemGap: 12,
      itemWidth: 12,
      itemHeight: 12,
      formatter: (name: string) => {
        const item = data.find(d => d.name === name);
        if (!item) return name;
        const total = data.reduce((sum, d) => sum + d.value, 0);
        const percentage = total > 0 ? ((item.value / total) * 100).toFixed(2) : '0.00';
        return `${name}: ${item.value} (${percentage}%)`;
      },
    },
    series: [
      {
        name: title,
        type: 'pie',
        radius: ['45%', '75%'],
        center: ['60%', '50%'],
        avoidLabelOverlap: true,
        minAngle: 5, // Minimum angle for small slices (makes tiny slices more visible)
        itemStyle: {
          borderRadius: 6,
          borderColor: 'transparent', // Remove white border
          borderWidth: 0, // No border
        },
        label: {
          show: true,
          position: 'outside',
          formatter: (params: any) => {
            const total = data.reduce((sum, d) => sum + d.value, 0);
            const percentage = total > 0 ? ((params.value / total) * 100).toFixed(2) : '0.00';
            // Only show label if percentage is less than 1%
            if (parseFloat(percentage) < 1 && parseFloat(percentage) > 0) {
              return `${params.name}\n${percentage}%`;
            }
            return ''; // Don't show label for large slices
          },
          fontSize: 11,
          color: '#374151',
          fontWeight: 500,
        },
        labelLine: {
          show: true,
          length: 15,
          length2: 10,
          lineStyle: {
            color: '#9ca3af',
            width: 1,
          },
          // Only show line for items with visible labels
          showAbove: true,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.2)',
          },
          scale: true,
          scaleSize: 5,
        },
        data: data.map((item) => ({
          value: item.value,
          name: item.name,
          itemStyle: {
            color: item.color,
          },
        })),
      },
    ],
  };

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-64 sm:h-80 bg-white rounded-lg border border-gray-200 p-4">
          <ReactECharts
            option={option}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'svg' }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

