'use client';

import Link from 'next/link';
import { useState } from 'react';
import { User, Settings, Shield, Bell } from 'lucide-react';

export default function ProfilePage() {
  const [user] = useState({
    name: 'Admin User',
    email: 'admin@fixzit.co',
    role: 'Administrator',
    joinDate: 'January 2024'
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">My Profile</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-[#0061A8] rounded-full flex items-center justify-center mx-auto mb-4">
                <User size={32} className="text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">{user.name}</h2>
              <p className="text-gray-600">{user.email}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-[#00A859] text-white text-sm rounded-full">
                {user.role}
              </span>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-sm text-gray-600">Member Since</span>
                <span className="text-sm font-medium">{user.joinDate}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-sm text-gray-600">Account Status</span>
                <span className="text-sm font-medium text-green-600">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Tabs */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md">
            <div className="border-b border-gray-200">
              <div className="flex">
                <button className="px-6 py-3 text-sm font-medium text-[#0061A8] border-b-2 border-[#0061A8]">
                  Account Settings
                </button>
                <button className="px-6 py-3 text-sm font-medium text-gray-500 hover:text-gray-700">
                  Notifications
                </button>
                <button className="px-6 py-3 text-sm font-medium text-gray-500 hover:text-gray-700">
                  Security
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    defaultValue={user.name}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    defaultValue={user.email}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+966 50 123 4567"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                    Cancel
                  </button>
                  <button className="px-4 py-2 bg-[#0061A8] text-white rounded-lg hover:bg-[#0061A8]/90">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/settings" className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <Settings className="h-6 w-6 text-[#0061A8] mb-2" />
            <h3 className="font-medium text-gray-900">System Settings</h3>
            <p className="text-sm text-gray-600">Configure application preferences</p>
          </Link>

          <Link href="/notifications" className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <Bell className="h-6 w-6 text-[#00A859] mb-2" />
            <h3 className="font-medium text-gray-900">Notification Settings</h3>
            <p className="text-sm text-gray-600">Manage alerts and notifications</p>
          </Link>

          <Link href="/security" className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <Shield className="h-6 w-6 text-[#FFB400] mb-2" />
            <h3 className="font-medium text-gray-900">Security Settings</h3>
            <p className="text-sm text-gray-600">Password and access management</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
