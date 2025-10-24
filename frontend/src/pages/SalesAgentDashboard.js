import React from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Users, TrendingUp } from 'lucide-react';
import CustomerManagement from '../components/CustomerManagement';
import CustomerInvoiceStats from '../components/CustomerInvoiceStats';

const SalesAgentDashboard = () => {
  return (
    <Layout title="Plasiyer Paneli">
      <Tabs defaultValue="customers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="customers" data-testid="tab-customers">
            <Users className="mr-2 h-4 w-4" />
            Müşteriler
          </TabsTrigger>
          <TabsTrigger value="stats" data-testid="tab-stats">
            <TrendingUp className="mr-2 h-4 w-4" />
            Fatura İstatistikleri
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customers">
          <CustomerManagement />
        </TabsContent>

        <TabsContent value="stats">
          <CustomerInvoiceStats />
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default SalesAgentDashboard;
