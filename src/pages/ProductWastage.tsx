import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import MaterialConsumptionService, { MaterialConsumption } from '@/services/api/materialConsumptionService';
import { Search, Filter, Download, RefreshCw, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function ProductWastage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [consumptionData, setConsumptionData] = useState<MaterialConsumption[]>([]);
  const [filteredData, setFilteredData] = useState<MaterialConsumption[]>([]);
  const [summary, setSummary] = useState({
    totalQuantity: 0,
    totalWaste: 0,
    totalCost: 0,
    wastePercentage: 0,
    itemCount: 0
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [wasteTypeFilter, setWasteTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [materialFilter, setMaterialFilter] = useState<string>('all');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [total, setTotal] = useState(0);

  // Get unique materials for filter
  const uniqueMaterials = Array.from(
    new Set(consumptionData.map(item => item.material_id))
  ).map(id => {
    const item = consumptionData.find(c => c.material_id === id);
    return { id, name: item?.material_name || '' };
  });

  // Load data
  const loadData = async () => {
    setLoading(true);
    try {
      const filters: any = {
        material_type: 'product', // Only products
        page,
        limit
      };

      if (dateRange.start) filters.start_date = dateRange.start;
      if (dateRange.end) filters.end_date = dateRange.end;

      const { data, error } = await MaterialConsumptionService.getMaterialConsumption(filters);

      if (error) {
        toast({
          title: 'Error',
          description: error,
          variant: 'destructive'
        });
        return;
      }

      if (data?.data) {
        const records = data.data.filter((item: MaterialConsumption) => 
          item.waste_quantity > 0 // Only show records with waste
        );
        setConsumptionData(records);
        setTotal(data.pagination?.total || records.length);
        calculateSummary(records);
      }
    } catch (error) {
      console.error('Error loading wastage data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load wastage data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary statistics
  const calculateSummary = (data: MaterialConsumption[]) => {
    const stats = MaterialConsumptionService.getConsumptionStats(data);
    setSummary(stats);
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...consumptionData];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.material_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.production_batch_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Waste type filter
    if (wasteTypeFilter !== 'all') {
      filtered = filtered.filter(item => item.waste_type === wasteTypeFilter);
    }

    // Material filter
    if (materialFilter !== 'all') {
      filtered = filtered.filter(item => item.material_id === materialFilter);
    }

    setFilteredData(filtered);
    calculateSummary(filtered);
  }, [searchTerm, wasteTypeFilter, materialFilter, consumptionData]);

  // Load data on mount and when filters change
  useEffect(() => {
    loadData();
  }, [page, dateRange.start, dateRange.end]);

  // Get waste type badge variant
  const getWasteTypeBadge = (type: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      scrap: 'destructive',
      defective: 'destructive',
      excess: 'secondary',
      normal: 'outline'
    };
    return variants[type] || 'outline';
  };

  // Calculate waste percentage
  const calculateWastePercentage = (quantityUsed: number, wasteQuantity: number): number => {
    if (quantityUsed === 0) return 0;
    return Number(((wasteQuantity / quantityUsed) * 100).toFixed(2));
  };

  // Export data
  const exportData = () => {
    const csvHeaders = [
      'Material Name',
      'Material ID',
      'Production Batch ID',
      'Quantity Used',
      'Unit',
      'Waste Quantity',
      'Waste Type',
      'Waste Percentage',
      'Consumed At',
      'Operator',
      'Machine',
      'Step',
      'Notes'
    ];

    const csvRows = filteredData.map(item => [
      item.material_name,
      item.material_id,
      item.production_batch_id,
      item.quantity_used,
      item.unit,
      item.waste_quantity,
      item.waste_type,
      calculateWastePercentage(item.quantity_used, item.waste_quantity),
      format(new Date(item.consumed_at), 'yyyy-MM-dd HH:mm:ss'),
      item.operator || '',
      item.machine_name || '',
      item.step_name || '',
      item.notes || ''
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `product-wastage-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Success',
      description: 'Wastage data exported successfully'
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Product Wastage</h1>
          <p className="text-muted-foreground mt-1">
            Track and analyze waste generated from product consumption in production
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportData} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Waste</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalWaste.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Across {summary.itemCount} records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Waste Percentage</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.wastePercentage.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">
              Of total quantity used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quantity Used</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalQuantity.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Total material consumed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Records</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredData.length}</div>
            <p className="text-xs text-muted-foreground">
              With waste recorded
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter wastage records by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Material name or batch ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Waste Type */}
            <div className="space-y-2">
              <Label htmlFor="waste-type">Waste Type</Label>
              <Select value={wasteTypeFilter} onValueChange={setWasteTypeFilter}>
                <SelectTrigger id="waste-type">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="scrap">Scrap</SelectItem>
                  <SelectItem value="defective">Defective</SelectItem>
                  <SelectItem value="excess">Excess</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Material */}
            <div className="space-y-2">
              <Label htmlFor="material">Material</Label>
              <Select value={materialFilter} onValueChange={setMaterialFilter}>
                <SelectTrigger id="material">
                  <SelectValue placeholder="All materials" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Materials</SelectItem>
                  {uniqueMaterials.map((material) => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range - Start */}
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
          </div>

          {/* Date Range - End */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wastage Table */}
      <Card>
        <CardHeader>
          <CardTitle>Wastage Records</CardTitle>
          <CardDescription>
            Showing {filteredData.length} records with waste
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No wastage records found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Batch ID</TableHead>
                    <TableHead>Quantity Used</TableHead>
                    <TableHead>Waste Quantity</TableHead>
                    <TableHead>Waste %</TableHead>
                    <TableHead>Waste Type</TableHead>
                    <TableHead>Individual Products</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Operator</TableHead>
                    <TableHead>Machine</TableHead>
                    <TableHead>Step</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item) => {
                    const wastePercentage = calculateWastePercentage(item.quantity_used, item.waste_quantity);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.material_name}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {item.production_batch_id}
                          </code>
                        </TableCell>
                        <TableCell>
                          {item.quantity_used.toFixed(2)} {item.unit}
                        </TableCell>
                        <TableCell className="font-semibold text-destructive">
                          {item.waste_quantity.toFixed(2)} {item.unit}
                        </TableCell>
                        <TableCell>
                          <Badge variant={wastePercentage > 20 ? 'destructive' : wastePercentage > 10 ? 'secondary' : 'outline'}>
                            {wastePercentage}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getWasteTypeBadge(item.waste_type)}>
                            {item.waste_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.individual_product_ids && item.individual_product_ids.length > 0 ? (
                            <Badge variant="outline" className="text-xs">
                              {item.individual_product_ids.length} product{item.individual_product_ids.length > 1 ? 's' : ''}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(item.consumed_at), 'MMM dd, yyyy HH:mm')}
                        </TableCell>
                        <TableCell>{item.operator || '-'}</TableCell>
                        <TableCell>{item.machine_name || '-'}</TableCell>
                        <TableCell>{item.step_name || '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} records
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * limit >= total}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

