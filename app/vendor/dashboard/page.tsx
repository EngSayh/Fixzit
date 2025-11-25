"use client";

import { useState, useEffect } from "react";
import { Package, TrendingUp, Clock, Star } from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";

export default function VendorDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    revenue: 0,
    rating: 0,
  });

  const [products, setProducts] = useState<
    Array<{
      id: number;
      title: string;
      stock: number;
      price: number;
      sold: number;
    }>
  >([]);
  const [orders, setOrders] = useState<
    Array<{
      id: string;
      customer: string;
      total: number;
      status: string;
    }>
  >([]);

  useEffect(() => {
    // Fetch vendor stats
    fetchVendorData();
  }, []);

  const fetchVendorData = async () => {
    // Mock data - replace with API calls
    setStats({
      totalProducts: 24,
      totalOrders: 156,
      revenue: 45780.5,
      rating: 4.7,
    });

    setProducts([
      { id: 1, title: "AC Filter 24x24", stock: 150, price: 89.99, sold: 45 },
      { id: 2, title: "PVC Pipe 2 inch", stock: 500, price: 45.5, sold: 120 },
    ]);

    setOrders([
      {
        id: "ORD-001",
        customer: "Acme Corp",
        total: 1250.0,
        status: "Processing",
      },
      {
        id: "ORD-002",
        customer: "Tech Solutions",
        total: 3400.0,
        status: "Shipped",
      },
    ]);
  };

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-8">
          Vendor Dashboard
        </h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-card rounded-2xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{stats.totalProducts}</p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
              </div>
              <Clock className="h-8 w-8 text-success" />
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold">
                  SAR {stats.revenue.toFixed(2)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-warning" />
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rating</p>
                <p className="text-2xl font-bold">{stats.rating}/5.0</p>
              </div>
              <Star className="h-8 w-8 text-accent fill-current" />
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-card rounded-2xl shadow mb-8">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">My Products</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase">
                    Product
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase">
                    Price
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase">
                    Sold
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4">{product.title}</td>
                    <td className="px-6 py-4">{product.stock}</td>
                    <td className="px-6 py-4">SAR {product.price}</td>
                    <td className="px-6 py-4">{product.sold}</td>
                    <td className="px-6 py-4">
                      <button className="text-primary hover:underline">
                        {t("common.edit", "Edit")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-card rounded-2xl shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Recent Orders</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase">
                    Total
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4">{order.id}</td>
                    <td className="px-6 py-4">{order.customer}</td>
                    <td className="px-6 py-4">SAR {order.total.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          order.status === "Shipped"
                            ? "bg-success/10 text-success-foreground"
                            : "bg-warning/10 text-warning-foreground"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
