import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MonthlySalesChartProps {
  data: {
    year: number;
    month: number;
    month_name: string;
    label: string;
    total_sold: number;
    unique_products: number;
  }[];
}

export default function MonthlySalesChart({ data }: MonthlySalesChartProps) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const item = params[0];
        const dataItem = data[item.dataIndex];
        return `${item.name}<br/>Sold: ${item.value}<br/>Products: ${dataItem?.unique_products || 0}`;
      },
      backgroundColor: '#fff',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      borderRadius: 8,
      padding: [8, 12],
      textStyle: {
        color: '#374151',
        fontSize: 12,
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.map((item) => item.label),
      axisLabel: {
        rotate: 45,
        fontSize: 11,
        color: '#6b7280',
      },
      axisLine: {
        lineStyle: {
          color: '#e5e7eb',
        },
      },
    },
    yAxis: {
      type: 'value',
      name: 'Units Sold',
      nameTextStyle: {
        color: '#6b7280',
        fontSize: 12,
      },
      axisLabel: {
        fontSize: 11,
        color: '#6b7280',
      },
      splitLine: {
        lineStyle: {
          color: '#f3f4f6',
        },
      },
    },
    series: [
      {
        name: 'Sales',
        type: 'line',
        data: data.map((item) => item.total_sold),
        smooth: true,
        itemStyle: {
          color: '#10b981',
        },
        lineStyle: {
          width: 3,
          color: '#10b981',
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color: 'rgba(16, 185, 129, 0.3)',
              },
              {
                offset: 1,
                color: 'rgba(16, 185, 129, 0.05)',
              },
            ],
          },
        },
        emphasis: {
          focus: 'series',
        },
      },
    ],
  };

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">
          Monthly Sales Trend
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-80 bg-white rounded-lg border border-gray-200 p-4">
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
