import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TopDemandChartProps {
  data: {
    _id: {
      product_id: string;
      product_name: string;
      year: number;
      month: number;
    };
    count: number;
  }[];
}

export default function TopDemandChart({ data }: TopDemandChartProps) {
  // Group by product and sum counts
  const productMap = new Map<string, { name: string; total: number }>();

  data.forEach((item) => {
    const existing = productMap.get(item._id.product_id);
    if (existing) {
      existing.total += item.count;
    } else {
      productMap.set(item._id.product_id, {
        name: item._id.product_name,
        total: item.count,
      });
    }
  });

  // Convert to array and sort
  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: (params: any) => {
        const item = params[0];
        return `${item.name}<br/>Units Sold: ${item.value}`;
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
      data: topProducts.map((item) => item.name),
      axisLabel: {
        rotate: 45,
        fontSize: 11,
        color: '#6b7280',
        interval: 0,
        formatter: (value: string) => {
          return value.length > 15 ? value.substring(0, 15) + '...' : value;
        },
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
        name: 'Demand',
        type: 'bar',
        data: topProducts.map((item) => item.total),
        itemStyle: {
          color: '#10b981',
          borderRadius: [4, 4, 0, 0],
        },
        emphasis: {
          itemStyle: {
            color: '#059669',
          },
        },
      },
    ],
  };

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">
          Top Products by Demand
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
