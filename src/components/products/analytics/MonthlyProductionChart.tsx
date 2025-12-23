import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MonthlyProductionChartProps {
  data: {
    year: number;
    month: number;
    month_name: string;
    label: string;
    total_batches: number;
    total_quantity: number;
    completed_batches: number;
    unique_products: number;
  }[];
}

export default function MonthlyProductionChart({ data }: MonthlyProductionChartProps) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const dataItem = data[params[0].dataIndex];
        return `${params[0].name}<br/>
          Quantity: ${dataItem.total_quantity}<br/>
          Batches: ${dataItem.total_batches}<br/>
          Completed: ${dataItem.completed_batches}<br/>
          Products: ${dataItem.unique_products}`;
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
    legend: {
      data: ['Total Quantity', 'Total Batches'],
      top: 10,
      textStyle: {
        color: '#374151',
        fontSize: 12,
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
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
    yAxis: [
      {
        type: 'value',
        name: 'Quantity',
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
      {
        type: 'value',
        name: 'Batches',
        nameTextStyle: {
          color: '#6b7280',
          fontSize: 12,
        },
        axisLabel: {
          fontSize: 11,
          color: '#6b7280',
        },
        splitLine: {
          show: false,
        },
      },
    ],
    series: [
      {
        name: 'Total Quantity',
        type: 'bar',
        data: data.map((item) => item.total_quantity),
        itemStyle: {
          color: '#3b82f6',
          borderRadius: [4, 4, 0, 0],
        },
      },
      {
        name: 'Total Batches',
        type: 'line',
        yAxisIndex: 1,
        data: data.map((item) => item.total_batches),
        smooth: true,
        itemStyle: {
          color: '#f59e0b',
        },
        lineStyle: {
          width: 3,
          color: '#f59e0b',
        },
      },
    ],
  };

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">
          Monthly Production Trend
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
