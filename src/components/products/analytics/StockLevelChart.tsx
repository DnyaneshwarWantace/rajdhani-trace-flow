import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StockLevelChartProps {
  data: { name: string; current: number; min: number; max: number }[];
}

export default function StockLevelChart({ data }: StockLevelChartProps) {
  // Prepare data - take first 8 products
  const chartData = data.slice(0, 8);

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985',
        },
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
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    },
    legend: {
      data: ['Current Stock', 'Min Level', 'Max Level'],
      bottom: 10,
      textStyle: {
        color: '#374151',
        fontSize: 12,
        fontWeight: 500,
      },
      itemGap: 20,
      itemWidth: 14,
      itemHeight: 14,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true,
      backgroundColor: 'transparent',
    },
    xAxis: {
      type: 'category',
      boundaryGap: true,
      data: chartData.map((item) => item.name.length > 10 ? item.name.substring(0, 10) + '...' : item.name),
      axisLabel: {
        color: '#6b7280',
        fontSize: 11,
        rotate: -45,
        interval: 0,
        margin: 12,
      },
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
    },
    yAxis: {
      type: 'value',
      name: 'Stock Level',
      nameTextStyle: {
        color: '#6b7280',
        fontSize: 11,
      },
      axisLabel: {
        color: '#6b7280',
        fontSize: 11,
      },
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      splitLine: {
        lineStyle: {
          color: '#f3f4f6',
          type: 'solid',
          width: 1,
        },
      },
    },
    series: [
      {
        name: 'Current Stock',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        data: chartData.map((item) => item.current),
        itemStyle: {
          color: '#3b82f6',
          borderColor: '#fff',
          borderWidth: 2,
        },
        lineStyle: {
          color: '#3b82f6',
          width: 3,
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
            ],
          },
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(59, 130, 246, 0.8)',
            borderWidth: 3,
          },
        },
      },
      {
        name: 'Min Level',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        data: chartData.map((item) => item.min),
        itemStyle: {
          color: '#f59e0b',
          borderColor: '#fff',
          borderWidth: 2,
        },
        lineStyle: {
          color: '#f59e0b',
          width: 3,
          type: 'dashed',
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(245, 158, 11, 0.8)',
            borderWidth: 3,
          },
        },
      },
      {
        name: 'Max Level',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        data: chartData.map((item) => item.max),
        itemStyle: {
          color: '#10b981',
          borderColor: '#fff',
          borderWidth: 2,
        },
        lineStyle: {
          color: '#10b981',
          width: 3,
          type: 'dashed',
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(16, 185, 129, 0.8)',
            borderWidth: 3,
          },
        },
      },
    ],
  };

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">Stock Levels Overview</CardTitle>
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

