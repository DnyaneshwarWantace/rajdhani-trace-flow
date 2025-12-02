import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Database,
  Users,
  ShoppingCart,
  Package,
  Factory,
  AlertTriangle,
  PlayCircle,
  RotateCcw
} from 'lucide-react';
import { SupabaseDemo } from '@/demo/supabaseDemo';
import {
  CustomerService,
  OrderService,
  ProductService,
  RawMaterialService,
  ProductionService,
  NotificationService,
  testSupabaseConnection
} from '@/services';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  duration?: number;
  data?: any;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  status: 'pending' | 'running' | 'completed';
}

export default function BackendTest() {
  const [testSuites, setTestSuites] = useState<TestSuite[]>([
    {
      name: 'Connection Tests',
      status: 'pending',
      tests: [
        { name: 'Supabase Connection', status: 'pending' }
      ]
    },
    {
      name: 'Customer Service Tests',
      status: 'pending',
      tests: [
        { name: 'Create Customer', status: 'pending' },
        { name: 'Get Customers', status: 'pending' },
        { name: 'Update Customer', status: 'pending' },
        { name: 'Customer Statistics', status: 'pending' }
      ]
    },
    {
      name: 'Product Service Tests',
      status: 'pending',
      tests: [
        { name: 'Create Product', status: 'pending' },
        { name: 'Create Individual Products', status: 'pending' },
        { name: 'Get Products', status: 'pending' },
        { name: 'Product Statistics', status: 'pending' }
      ]
    },
    {
      name: 'Raw Material Service Tests',
      status: 'pending',
      tests: [
        { name: 'Create Supplier', status: 'pending' },
        { name: 'Create Raw Material', status: 'pending' },
        { name: 'Get Materials', status: 'pending' },
        { name: 'Inventory Statistics', status: 'pending' }
      ]
    },
    {
      name: 'Order Service Tests',
      status: 'pending',
      tests: [
        { name: 'Create Order', status: 'pending' },
        { name: 'Update Order Status', status: 'pending' },
        { name: 'Get Orders', status: 'pending' },
        { name: 'Order Statistics', status: 'pending' }
      ]
    },
    {
      name: 'Production Service Tests',
      status: 'pending',
      tests: [
        { name: 'Create Production Batch', status: 'pending' },
        { name: 'Start Production', status: 'pending' },
        { name: 'Update Production Steps', status: 'pending' },
        { name: 'Production Statistics', status: 'pending' }
      ]
    },
    {
      name: 'Notification Service Tests',
      status: 'pending',
      tests: [
        { name: 'Create Notification', status: 'pending' },
        { name: 'Get Notifications', status: 'pending' },
        { name: 'Notification Statistics', status: 'pending' }
      ]
    }
  ]);

  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [testResults, setTestResults] = useState<any>({});

  const updateTestResult = (suiteName: string, testName: string, result: Partial<TestResult>) => {
    setTestSuites(prev => prev.map(suite => ({
      ...suite,
      tests: suite.name === suiteName
        ? suite.tests.map(test =>
            test.name === testName ? { ...test, ...result } : test
          )
        : suite.tests
    })));
  };

  const updateSuiteStatus = (suiteName: string, status: TestSuite['status']) => {
    setTestSuites(prev => prev.map(suite =>
      suite.name === suiteName ? { ...suite, status } : suite
    ));
  };

  const runTest = async (suiteName: string, testName: string, testFn: () => Promise<any>) => {
    setCurrentTest(`${suiteName} > ${testName}`);
    updateTestResult(suiteName, testName, { status: 'running' });

    const startTime = Date.now();
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;

      updateTestResult(suiteName, testName, {
        status: 'success',
        message: 'Passed',
        duration,
        data: result
      });

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      updateTestResult(suiteName, testName, {
        status: 'error',
        message: error.message || 'Test failed',
        duration
      });
      throw error;
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults({});

    try {
      // Connection Tests
      updateSuiteStatus('Connection Tests', 'running');
      await runTest('Connection Tests', 'Supabase Connection', async () => {
        return await testSupabaseConnection();
      });
      updateSuiteStatus('Connection Tests', 'completed');

      let customer: any = null;
      let product: any = null;
      let material: any = null;
      let order: any = null;

      // Customer Service Tests
      updateSuiteStatus('Customer Service Tests', 'running');
      customer = await runTest('Customer Service Tests', 'Create Customer', async () => {
        const result = await CustomerService.createCustomer({
          name: 'Test Customer',
          email: `test${Date.now()}@example.com`,
          phone: '+91 9876543210',
          customer_type: 'individual',
          address: 'Test Address',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001'
        });
        if (result.error) throw new Error(result.error);
        return result.data;
      });

      await runTest('Customer Service Tests', 'Get Customers', async () => {
        const result = await CustomerService.getCustomers({ limit: 10 });
        if (result.error) throw new Error(result.error);
        return result.data;
      });

      if (customer) {
        await runTest('Customer Service Tests', 'Update Customer', async () => {
          const result = await CustomerService.updateCustomer(customer.id, {
            phone: '+91 9876543211'
          });
          if (result.error) throw new Error(result.error);
          return result.data;
        });
      }

      await runTest('Customer Service Tests', 'Customer Statistics', async () => {
        return await CustomerService.getCustomerStats();
      });
      updateSuiteStatus('Customer Service Tests', 'completed');

      // Product Service Tests
      updateSuiteStatus('Product Service Tests', 'running');
      product = await runTest('Product Service Tests', 'Create Product', async () => {
        const result = await ProductService.createProduct({
          name: 'Test Carpet',
          category: 'Carpets',
          color: 'Red',
          size: '6x4 feet',
          selling_price: 15000,
          cost_price: 10000
        });
        if (result.error) throw new Error(result.error);
        return result.data;
      });

      if (product) {
        await runTest('Product Service Tests', 'Create Individual Products', async () => {
          const results = [];
          for (let i = 0; i < 3; i++) {
            const result = await ProductService.createIndividualProduct({
              product_id: product.id,
              production_date: new Date().toISOString().split('T')[0],
              quality_grade: 'A+',
              inspector: 'Test Inspector',
              batch_number: 'TEST001'
            });
            if (result.error) throw new Error(result.error);
            results.push(result.data);
          }
          return results;
        });
      }

      await runTest('Product Service Tests', 'Get Products', async () => {
        const result = await ProductService.getProducts({ limit: 10 });
        if (result.error) throw new Error(result.error);
        return result.data;
      });

      await runTest('Product Service Tests', 'Product Statistics', async () => {
        return await ProductService.getProductStats();
      });
      updateSuiteStatus('Product Service Tests', 'completed');

      // Raw Material Service Tests
      updateSuiteStatus('Raw Material Service Tests', 'running');
      const supplier = await runTest('Raw Material Service Tests', 'Create Supplier', async () => {
        const result = await RawMaterialService.createSupplier({
          name: 'Test Supplier',
          email: `supplier${Date.now()}@example.com`,
          phone: '+91 9876543210',
          address: 'Supplier Address'
        });
        if (result.error) throw new Error(result.error);
        return result.data;
      });

      material = await runTest('Raw Material Service Tests', 'Create Raw Material', async () => {
        const result = await RawMaterialService.createRawMaterial({
          name: 'Test Wool',
          category: 'Yarn',
          current_stock: 100,
          unit: 'kg',
          min_threshold: 20,
          max_capacity: 500,
          reorder_point: 30,
          supplier_id: supplier?.id,
          supplier_name: supplier?.name || 'Test Supplier',
          cost_per_unit: 150
        });
        if (result.error) throw new Error(result.error);
        return result.data;
      });

      await runTest('Raw Material Service Tests', 'Get Materials', async () => {
        const result = await RawMaterialService.getRawMaterials({ limit: 10 });
        if (result.error) throw new Error(result.error);
        return result.data;
      });

      await runTest('Raw Material Service Tests', 'Inventory Statistics', async () => {
        return await RawMaterialService.getInventoryStats();
      });
      updateSuiteStatus('Raw Material Service Tests', 'completed');

      // Order Service Tests
      updateSuiteStatus('Order Service Tests', 'running');
      order = await runTest('Order Service Tests', 'Create Order', async () => {
        const result = await OrderService.createOrder({
          customer_id: customer?.id,
          customer_name: customer?.name || 'Test Customer',
          customer_email: customer?.email,
          customer_phone: customer?.phone,
          items: [{
            product_id: product?.id,
            product_name: product?.name || 'Test Product',
            product_type: 'product',
            quantity: 2,
            unit_price: 15000,
            quality_grade: 'A+'
          }],
          priority: 'medium'
        });
        if (result.error) throw new Error(result.error);
        return result.data;
      });

      if (order) {
        await runTest('Order Service Tests', 'Update Order Status', async () => {
          const result = await OrderService.updateOrder(order.id, {
            status: 'accepted',
            paid_amount: 15000
          });
          if (result.error) throw new Error(result.error);
          return result.data;
        });
      }

      await runTest('Order Service Tests', 'Get Orders', async () => {
        const result = await OrderService.getOrders({ limit: 10 });
        if (result.error) throw new Error(result.error);
        return result.data;
      });

      await runTest('Order Service Tests', 'Order Statistics', async () => {
        return await OrderService.getOrderStats();
      });
      updateSuiteStatus('Order Service Tests', 'completed');

      // Production Service Tests
      updateSuiteStatus('Production Service Tests', 'running');
      const batch = await runTest('Production Service Tests', 'Create Production Batch', async () => {
        const result = await ProductionService.createProductionBatch({
          product_id: product?.id,
          order_id: order?.id,
          planned_quantity: 5,
          priority: 'high',
          operator: 'Test Operator',
          production_steps: [
            {
              step_number: 1,
              step_name: 'Material Prep',
              estimated_duration: 60
            },
            {
              step_number: 2,
              step_name: 'Production',
              estimated_duration: 120
            }
          ]
        });
        if (result.error) throw new Error(result.error);
        return result.data;
      });

      if (batch) {
        await runTest('Production Service Tests', 'Start Production', async () => {
          const result = await ProductionService.startProductionBatch(batch.id, 'Test Operator');
          if (result.error) throw new Error(result.error);
          return result.success;
        });
      }

      await runTest('Production Service Tests', 'Update Production Steps', async () => {
        const { data: steps } = await ProductionService.getProductionSteps(batch?.id || '');
        if (steps && steps.length > 0) {
          const result = await ProductionService.updateProductionStep(steps[0].id, {
            status: 'completed',
            quality_check_result: 'Passed'
          });
          if (result.error) throw new Error(result.error);
          return result.data;
        }
        return null;
      });

      await runTest('Production Service Tests', 'Production Statistics', async () => {
        return await ProductionService.getProductionStats();
      });
      updateSuiteStatus('Production Service Tests', 'completed');

      // Notification Service Tests
      updateSuiteStatus('Notification Service Tests', 'running');
      await runTest('Notification Service Tests', 'Create Notification', async () => {
        const result = await NotificationService.createNotification({
          type: 'system_alert',
          title: 'Test Notification',
          message: 'This is a test notification',
          priority: 'medium',
          module: 'orders'
        });
        if (result.error) throw new Error(result.error);
        return result.data;
      });

      await runTest('Notification Service Tests', 'Get Notifications', async () => {
        const result = await NotificationService.getNotifications({ limit: 5 });
        if (result.error) throw new Error(result.error);
        return result.data;
      });

      await runTest('Notification Service Tests', 'Notification Statistics', async () => {
        return await NotificationService.getNotificationStats();
      });
      updateSuiteStatus('Notification Service Tests', 'completed');

      setTestResults({
        customer,
        product,
        material,
        order,
        batch,
        summary: 'All tests completed successfully!'
      });

    } catch (error) {
      console.error('Test suite failed:', error);
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  const runQuickDemo = async () => {
    setIsRunning(true);
    setCurrentTest('Running Complete Demo');

    try {
      await SupabaseDemo.runCompleteDemo();
      setTestResults({
        summary: 'Complete demo executed successfully! Check console for detailed logs.'
      });
    } catch (error) {
      console.error('Demo failed:', error);
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  const getOverallProgress = () => {
    const allTests = testSuites.flatMap(suite => suite.tests);
    const completedTests = allTests.filter(test => test.status === 'success' || test.status === 'error');
    return Math.round((completedTests.length / allTests.length) * 100);
  };

  const getTestIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'running': return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      default: return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6">

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Test Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={runAllTests}
              disabled={isRunning}
              className="gap-2"
            >
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              Run All Tests
            </Button>
            <Button
              onClick={runQuickDemo}
              disabled={isRunning}
              variant="outline"
              className="gap-2"
            >
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              Run Quick Demo
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Tests
            </Button>
          </div>

          {isRunning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-muted-foreground">{getOverallProgress()}%</span>
              </div>
              <Progress value={getOverallProgress()} className="w-full" />
              {currentTest && (
                <p className="text-xs text-muted-foreground">
                  Currently running: {currentTest}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Results */}
      <Tabs defaultValue="tests" className="w-full">
        <TabsList>
          <TabsTrigger value="tests">Test Results</TabsTrigger>
          <TabsTrigger value="data">Test Data</TabsTrigger>
        </TabsList>

        <TabsContent value="tests" className="space-y-4">
          {testSuites.map((suite) => (
            <Card key={suite.name}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{suite.name}</span>
                  <Badge variant={
                    suite.status === 'completed' ? 'default' :
                    suite.status === 'running' ? 'secondary' : 'outline'
                  }>
                    {suite.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {suite.tests.map((test) => (
                    <div key={test.name} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        {getTestIcon(test.status)}
                        <span className="font-medium">{test.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {test.duration && (
                          <span className="text-xs text-muted-foreground">
                            {test.duration}ms
                          </span>
                        )}
                        {test.message && (
                          <span className={`text-xs ${
                            test.status === 'error' ? 'text-destructive' : 'text-muted-foreground'
                          }`}>
                            {test.message}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Data</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(testResults).length > 0 ? (
                <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-96">
                  {JSON.stringify(testResults, null, 2)}
                </pre>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No test data available. Run tests to see results.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Instructions */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Before running tests:</strong> Make sure you have executed the SQL schema in your Supabase project.
          Check the SUPABASE_SETUP.md file for detailed setup instructions.
        </AlertDescription>
      </Alert>
    </div>
  );
}