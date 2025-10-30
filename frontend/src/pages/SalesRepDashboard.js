import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { salesRepAPI } from '../services/api';
import { Users, Calendar, UserCheck, Package, FileSpreadsheet, UserPlus, FileText } from 'lucide-react';
import CustomerManagement from '../components/CustomerManagement';
import BulkImport from '../components/BulkImport';
import CustomerForm from '../components/CustomerForm';
import ProductForm from '../components/ProductForm';
import InvoiceFormWithDropdown from '../components/InvoiceFormWithDropdown';
import PersonalAgenda from '../components/PersonalAgenda';
import ProductCatalogDetail from '../components/ProductCatalogDetail';
import TaskManagement from '../components/TaskManagement';

const SalesRepDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await salesRepAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Satış Temsilcisi Paneli">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card data-testid="stat-customers">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Müşteri</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_customers || 0}</div>
          </CardContent>
        </Card>

        <Card data-testid="stat-tasks">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Günlük Görevler</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
          </CardContent>
        </Card>

        <Card data-testid="stat-assigned">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verilen Görevler</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="agenda" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agenda" data-testid="tab-agenda">
            <Calendar className="mr-2 h-4 w-4" />
            Ajanda & Yapılacaklar
          </TabsTrigger>
          <TabsTrigger value="catalog" data-testid="tab-catalog">
            <Package className="mr-2 h-4 w-4" />
            Ürün Kataloğu
          </TabsTrigger>
          <TabsTrigger value="tasks" data-testid="tab-tasks">
            <UserCheck className="mr-2 h-4 w-4" />
            Görev Yönetimi
          </TabsTrigger>
          <TabsTrigger value="customers" data-testid="tab-customers">
            <Users className="mr-2 h-4 w-4" />
            Müşteriler
          </TabsTrigger>
          <TabsTrigger value="add-customer" data-testid="tab-add-customer">
            <UserPlus className="mr-2 h-4 w-4" />
            Müşteri Ekle
          </TabsTrigger>
          <TabsTrigger value="add-product" data-testid="tab-add-product">
            <Package className="mr-2 h-4 w-4" />
            Ürün Ekle
          </TabsTrigger>
          <TabsTrigger value="add-invoice" data-testid="tab-add-invoice">
            <FileText className="mr-2 h-4 w-4" />
            Fatura Oluştur
          </TabsTrigger>
          <TabsTrigger value="bulk-import" data-testid="tab-bulk-import">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel Veri Girişi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agenda">
          <PersonalAgenda />
        </TabsContent>

        <TabsContent value="catalog">
          <ProductCatalogDetail />
        </TabsContent>

        <TabsContent value="tasks">
          <TaskManagement />
        </TabsContent>

        <TabsContent value="customers">
          <CustomerManagement onUpdate={loadStats} />
        </TabsContent>

        <TabsContent value="add-customer">
          <CustomerForm onSuccess={loadStats} />
        </TabsContent>

        <TabsContent value="add-product">
          <ProductForm onSuccess={loadStats} />
        </TabsContent>

        <TabsContent value="add-invoice">
          <InvoiceFormWithDropdown onSuccess={loadStats} />
        </TabsContent>

        <TabsContent value="bulk-import">
          <BulkImport />
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default SalesRepDashboard;
