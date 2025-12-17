import { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface StockLevelChartProps {
  data: { name: string; current: number; min: number; max: number }[];
}

export default function StockLevelChart({ data }: StockLevelChartProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 50; // Show 50 products per page for better readability
  
  // Sort by stock level (lowest first to highlight issues)
  const sortedData = [...data].sort((a, b) => a.current - b.current);
  
  // Paginate the data
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const chartData = sortedData.slice(startIndex, endIndex);
  
  // Truncate product names to 3-4 words
  const truncateName = (name: string) => {
    const words = name.split(' ');
    if (words.length <= 4) return name;
    return words.slice(0, 4).join(' ') + '...';
  };

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'line',
        label: {
          backgroundColor: '#6a7985',
        },
      },
      backgroundColor: '#fff',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      borderRadius: 8,
      padding: [10, 14],
      textStyle: {
        color: '#374151',
        fontSize: 12,
      },
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      formatter: (params: any) => {
        if (!params || params.length === 0) return '';
        const dataIndex = params[0].dataIndex;
        const product = chartData[dataIndex];
        if (!product) return '';
        
        let tooltip = `<div style="font-weight: 600; margin-bottom: 6px; color: #111827;">${product.name}</div>`;
        params.forEach((param: any) => {
          const value = param.value || 0;
          const seriesName = param.seriesName;
          tooltip += `<div style="margin: 4px 0;">
            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${param.color}; margin-right: 6px;"></span>
            ${seriesName}: <strong>${value.toFixed(2)}</strong>
          </div>`;
        });
        return tooltip;
      },
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
      left: '5%',
      right: '5%',
      bottom: chartData.length > 30 ? '25%' : '20%',
      top: '12%',
      containLabel: false,
      backgroundColor: 'transparent',
    },
    xAxis: {
      type: 'category',
      boundaryGap: true,
      data: chartData.map((item) => truncateName(item.name)),
      axisLabel: {
        color: '#6b7280',
        fontSize: 10,
        rotate: -60,
        interval: 0,
        margin: 15,
        width: 80,
        overflow: 'truncate',
        ellipsis: '...',
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
        smooth: false,
        symbol: 'circle',
        symbolSize: chartData.length > 30 ? 4 : 6,
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
        smooth: false,
        symbol: 'circle',
        symbolSize: chartData.length > 30 ? 4 : 6,
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
        smooth: false,
        symbol: 'circle',
        symbolSize: chartData.length > 30 ? 4 : 6,
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
        <div className="h-80 lg:h-96 bg-white rounded-lg border border-gray-200 p-4">
          <ReactECharts
            option={option}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'svg' }}
          />
        </div>
        
        {/* Pagination Controls */}
        {sortedData.length > itemsPerPage && (
          <div className="flex items-center justify-between mt-4 px-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            
            <div className="text-sm text-gray-600">
              Page {currentPage + 1} of {totalPages} 
              <span className="ml-2 text-gray-500">
                (Showing {startIndex + 1}-{Math.min(endIndex, sortedData.length)} of {sortedData.length} products)
              </span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
              disabled={currentPage >= totalPages - 1}
              className="flex items-center gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
        
        {sortedData.length > 0 && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            Showing {sortedData.length} product{sortedData.length !== 1 ? 's' : ''} sorted by stock level (lowest first)
          </p>
        )}
      </CardContent>
    </Card>
  );
}

