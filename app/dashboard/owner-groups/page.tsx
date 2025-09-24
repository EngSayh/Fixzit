'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Building2, 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  UserCheck,
  AlertCircle,
  CheckCircle,
  Settings
} from 'lucide-react';

interface OwnerGroup {
  _id: string;
  buildingId: string;
  ownerIds: string[];
  primaryContactUserId: string;
  fmVendorId?: string;
  realEstateAgentId?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Building {
  _id: string;
  name: string;
  address: string;
  city: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface ServiceContract {
  _id: string;
  scope: 'PROPERTY' | 'OWNER_GROUP';
  scopeRef: string;
  contractorType: 'FM_COMPANY' | 'REAL_ESTATE_AGENT';
  contractorRef: string;
  startDate: string;
  endDate: string;
  terms: string;
  sla: string;
  status: 'draft' | 'active' | 'ended';
}

export default function OwnerGroupsPage() {
  const [ownerGroups, setOwnerGroups] = useState<OwnerGroup[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [serviceContracts, setServiceContracts] = useState<ServiceContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<OwnerGroup | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    buildingId: '',
    ownerIds: [] as string[],
    primaryContactUserId: '',
    fmVendorId: '',
    realEstateAgentId: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // In a real app, you'd get the owner ID from authentication
      const ownerId = 'temp-owner-id';
      
      const [groupsRes, buildingsRes, usersRes, contractsRes] = await Promise.all([
        fetch(`/api/owners/groups?ownerId=${ownerId}`),
        fetch('/api/buildings'),
        fetch('/api/users'),
        fetch(`/api/contracts?ownerId=${ownerId}`)
      ]);

      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        setOwnerGroups(groupsData);
      }

      if (buildingsRes.ok) {
        const buildingsData = await buildingsRes.json();
        setBuildings(buildingsData);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }

      if (contractsRes.ok) {
        const contractsData = await contractsRes.json();
        setServiceContracts(contractsData);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Failed to load owner group data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingGroup 
        ? `/api/owners/groups/${editingGroup._id}`
        : '/api/owners/groups';
      
      const method = editingGroup ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Owner group saved successfully' });
        loadData();
        setIsDialogOpen(false);
        setEditingGroup(null);
        setFormData({
          buildingId: '',
          ownerIds: [],
          primaryContactUserId: '',
          fmVendorId: '',
          realEstateAgentId: ''
        });
      } else {
        setMessage({ type: 'error', text: 'Failed to save owner group' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save owner group' });
    }
  };

  const handleEdit = (group: OwnerGroup) => {
    setEditingGroup(group);
    setFormData({
      buildingId: group.buildingId,
      ownerIds: group.ownerIds,
      primaryContactUserId: group.primaryContactUserId,
      fmVendorId: group.fmVendorId || '',
      realEstateAgentId: group.realEstateAgentId || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this owner group?')) {
      return;
    }

    try {
      const response = await fetch(`/api/owners/groups/${groupId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Owner group deleted successfully' });
        loadData();
      } else {
        setMessage({ type: 'error', text: 'Failed to delete owner group' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete owner group' });
    }
  };

  const getBuildingName = (buildingId: string) => {
    const building = buildings.find(b => b._id === buildingId);
    return building?.name || 'Unknown Building';
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u._id === userId);
    return user?.name || 'Unknown User';
  };

  const getContractStatus = (buildingId: string) => {
    const contract = serviceContracts.find(c => c.scopeRef === buildingId);
    return contract?.status || 'none';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading owner groups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Owner Groups Management</h1>
          <p className="text-gray-600">Manage property ownership groups and primary contacts</p>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Owner Groups Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Owner Groups
                </CardTitle>
                <CardDescription>
                  Manage building ownership groups and assign primary contacts
                </CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingGroup(null);
                    setFormData({
                      buildingId: '',
                      ownerIds: [],
                      primaryContactUserId: '',
                      fmVendorId: '',
                      realEstateAgentId: ''
                    });
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Owner Group
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingGroup ? 'Edit Owner Group' : 'Add New Owner Group'}
                    </DialogTitle>
                    <DialogDescription>
                      Configure building ownership and primary contact assignment
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="buildingId">Building</Label>
                      <Select 
                        value={formData.buildingId} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, buildingId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a building" />
                        </SelectTrigger>
                        <SelectContent>
                          {buildings.map((building) => (
                            <SelectItem key={building._id} value={building._id}>
                              {building.name} - {building.address}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="primaryContactUserId">Primary Contact User</Label>
                      <Select 
                        value={formData.primaryContactUserId} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, primaryContactUserId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select primary contact" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user._id} value={user._id}>
                              {user.name} ({user.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="fmVendorId">Facility Management Company (Optional)</Label>
                      <Input
                        id="fmVendorId"
                        value={formData.fmVendorId}
                        onChange={(e) => setFormData(prev => ({ ...prev, fmVendorId: e.target.value }))}
                        placeholder="Enter FM company ID or name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="realEstateAgentId">Real Estate Agent (Optional)</Label>
                      <Input
                        id="realEstateAgentId"
                        value={formData.realEstateAgentId}
                        onChange={(e) => setFormData(prev => ({ ...prev, realEstateAgentId: e.target.value }))}
                        placeholder="Enter real estate agent ID or name"
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingGroup ? 'Update' : 'Create'} Group
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {ownerGroups.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Owner Groups</h3>
                <p className="text-gray-600 mb-4">Create your first owner group to get started</p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Owner Group
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Building</TableHead>
                    <TableHead>Primary Contact</TableHead>
                    <TableHead>Owners</TableHead>
                    <TableHead>Service Contract</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ownerGroups.map((group) => (
                    <TableRow key={group._id}>
                      <TableCell className="font-medium">
                        {getBuildingName(group.buildingId)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-blue-500" />
                          {getUserName(group.primaryContactUserId)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {group.ownerIds.length} owner{group.ownerIds.length !== 1 ? 's' : ''}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            getContractStatus(group.buildingId) === 'active' ? 'default' :
                            getContractStatus(group.buildingId) === 'draft' ? 'secondary' :
                            'outline'
                          }
                        >
                          {getContractStatus(group.buildingId)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={group.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {group.active ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(group)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(group._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Service Contracts */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Service Contracts
            </CardTitle>
            <CardDescription>
              Manage contracts with facility management companies and real estate agents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {serviceContracts.length === 0 ? (
              <div className="text-center py-8">
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Service Contracts</h3>
                <p className="text-gray-600">Create contracts to manage your property services</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Building</TableHead>
                    <TableHead>Contractor Type</TableHead>
                    <TableHead>Contractor</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceContracts.map((contract) => (
                    <TableRow key={contract._id}>
                      <TableCell className="font-medium">
                        {getBuildingName(contract.scopeRef)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {contract.contractorType === 'FM_COMPANY' ? 'FM Company' : 'Real Estate Agent'}
                        </Badge>
                      </TableCell>
                      <TableCell>{contract.contractorRef}</TableCell>
                      <TableCell>{new Date(contract.startDate).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(contract.endDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            contract.status === 'active' ? 'default' :
                            contract.status === 'draft' ? 'secondary' :
                            'outline'
                          }
                        >
                          {contract.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}