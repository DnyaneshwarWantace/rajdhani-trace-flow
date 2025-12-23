import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MostProducedChartProps {
  data: {
    _id: {
      product_id: string;
      product_name: string;
    };
    total_quantity: number;
    batch_count: number;
  }[];
}

export default function MostProducedChart({ data }: MostProducedChartProps) {
  // Filter out items with undefined product names
  const validData = data.filter(item => item._id?.product_name);

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: (params: any) => {
        const item = params[0];
        const dataItem = validData[item.dataIndex];
        return `${dataItem?._id?.product_name || 'Unknown'}<br/>Quantity: ${item.value}<br/>Batches: ${dataItem?.batch_count || 0}`;
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
      data: validData.map((item) => item._id?.product_name || 'Unknown'),
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
    series: [
      {
        name: 'Quantity',
        type: 'bar',
        data: validData.map((item) => item.total_quantity),
        itemStyle: {
          color: '#3b82f6',
          borderRadius: [4, 4, 0, 0],
        },
        emphasis: {
          itemStyle: {
            color: '#2563eb',
          },
        },
      },
    ],
  };

  if (validData.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500">No production data available yet</p>
      </div>
    );
  }

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">
          Most Produced Products
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
