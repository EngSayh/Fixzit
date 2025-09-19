import React, { useState, useCallback, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  ReactFlowProvider,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

// Custom Node Components
import StartNode from './workflow-nodes/StartNode';
import TaskNode from './workflow-nodes/TaskNode';
import ApprovalNode from './workflow-nodes/ApprovalNode';
import ConditionNode from './workflow-nodes/ConditionNode';
import NotificationNode from './workflow-nodes/NotificationNode';
import DelayNode from './workflow-nodes/DelayNode';
import ScriptNode from './workflow-nodes/ScriptNode';
import ApiNode from './workflow-nodes/ApiNode';
import EndNode from './workflow-nodes/EndNode';

const nodeTypes = {
  start: StartNode,
  task: TaskNode,
  approval: ApprovalNode,
  condition: ConditionNode,
  notification: NotificationNode,
  delay: DelayNode,
  script: ScriptNode,
  api: ApiNode,
  end: EndNode,
};

const initialNodes: Node[] = [
  {
    id: 'start-1',
    type: 'start',
    position: { x: 250, y: 50 },
    data: { label: 'Start' },
  },
];

const initialEdges: Edge[] = [];

interface WorkflowDesignerProps {
  workflow?: any;
  onSave: (workflow: any) => void;
  onTest?: (workflow: any) => void;
}

export const WorkflowDesigner: React.FC<WorkflowDesignerProps> = ({
  workflow,
  onSave,
  onTest,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(workflow?.nodes || initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(workflow?.edges || initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [workflowConfig, setWorkflowConfig] = useState({
    name: workflow?.name || '',
    description: workflow?.description || '',
    version: workflow?.version || '1.0.0',
    settings: {
      timeout: workflow?.settings?.timeout || 3600000,
      retryAttempts: workflow?.settings?.retryAttempts || 3,
      retryDelay: workflow?.settings?.retryDelay || 5000,
      parallel: workflow?.settings?.parallel || false,
    },
  });

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type || !reactFlowBounds) {
        return;
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: getDefaultNodeData(type),
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const getDefaultNodeData = (type: string) => {
    switch (type) {
      case 'start':
        return { label: 'Start' };
      case 'task':
        return {
          label: 'Task',
          config: {
            title: 'New Task',
            description: 'Task description',
            assignTo: 'user',
            dueDate: '1d',
            priority: 'medium',
          },
        };
      case 'approval':
        return {
          label: 'Approval',
          config: {
            title: 'Approval Required',
            description: 'Please review and approve',
            approvers: ['manager'],
            requiredApprovals: 1,
            dueDate: '2d',
          },
        };
      case 'condition':
        return {
          label: 'Condition',
          config: {
            condition: 'data.status === "approved"',
          },
        };
      case 'notification':
        return {
          label: 'Notification',
          config: {
            title: 'Notification',
            message: 'Workflow notification',
            recipients: ['user'],
            channels: ['email'],
          },
        };
      case 'delay':
        return {
          label: 'Delay',
          config: {
            delay: '1h',
          },
        };
      case 'script':
        return {
          label: 'Script',
          config: {
            script: '// Your custom script here\nreturn { success: true };',
          },
        };
      case 'api':
        return {
          label: 'API Call',
          config: {
            method: 'GET',
            url: 'https://api.example.com/data',
            headers: {},
            timeout: 30000,
          },
        };
      case 'end':
        return { label: 'End' };
      default:
        return { label: type };
    }
  };

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const updateNodeData = (nodeId: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node
      )
    );
  };

  const deleteSelectedNode = () => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
      setEdges((eds) => eds.filter((edge) => 
        edge.source !== selectedNode.id && edge.target !== selectedNode.id
      ));
      setSelectedNode(null);
    }
  };

  const saveWorkflow = () => {
    const workflowData = {
      ...workflowConfig,
      nodes,
      edges,
      updatedAt: new Date(),
    };

    onSave(workflowData);
  };

  const testWorkflow = () => {
    if (onTest) {
      const workflowData = {
        ...workflowConfig,
        nodes,
        edges,
      };
      onTest(workflowData);
    }
  };

  const NodeToolbox = () => (
    <Card className="w-64">
      <CardHeader>
        <CardTitle>Workflow Nodes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {[
          { type: 'start', label: 'Start', color: 'bg-green-100 text-green-800' },
          { type: 'task', label: 'Task', color: 'bg-blue-100 text-blue-800' },
          { type: 'approval', label: 'Approval', color: 'bg-yellow-100 text-yellow-800' },
          { type: 'condition', label: 'Condition', color: 'bg-purple-100 text-purple-800' },
          { type: 'notification', label: 'Notification', color: 'bg-orange-100 text-orange-800' },
          { type: 'delay', label: 'Delay', color: 'bg-gray-100 text-gray-800' },
          { type: 'script', label: 'Script', color: 'bg-indigo-100 text-indigo-800' },
          { type: 'api', label: 'API Call', color: 'bg-cyan-100 text-cyan-800' },
          { type: 'end', label: 'End', color: 'bg-red-100 text-red-800' },
        ].map((nodeType) => (
          <Badge
            key={nodeType.type}
            className={`${nodeType.color} cursor-pointer p-2 w-full justify-center`}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData('application/reactflow', nodeType.type);
              event.dataTransfer.effectAllowed = 'move';
            }}
          >
            {nodeType.label}
          </Badge>
        ))}
      </CardContent>
    </Card>
  );

  const NodeProperties = () => {
    if (!selectedNode) {
      return (
        <Card className="w-80">
          <CardHeader>
            <CardTitle>Node Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Select a node to edit its properties</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="w-80">
        <CardHeader>
          <CardTitle>
            {selectedNode.data.label} Properties
            <Button
              variant="destructive"
              size="sm"
              className="ml-2"
              onClick={deleteSelectedNode}
            >
              Delete
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="node-label">Label</Label>
            <Input
              id="node-label"
              value={selectedNode.data.label}
              onChange={(e) =>
                updateNodeData(selectedNode.id, { label: e.target.value })
              }
            />
          </div>

          {selectedNode.type === 'task' && (
            <TaskNodeProperties
              config={selectedNode.data.config}
              onChange={(config) => updateNodeData(selectedNode.id, { config })}
            />
          )}

          {selectedNode.type === 'approval' && (
            <ApprovalNodeProperties
              config={selectedNode.data.config}
              onChange={(config) => updateNodeData(selectedNode.id, { config })}
            />
          )}

          {selectedNode.type === 'condition' && (
            <ConditionNodeProperties
              config={selectedNode.data.config}
              onChange={(config) => updateNodeData(selectedNode.id, { config })}
            />
          )}

          {selectedNode.type === 'notification' && (
            <NotificationNodeProperties
              config={selectedNode.data.config}
              onChange={(config) => updateNodeData(selectedNode.id, { config })}
            />
          )}

          {selectedNode.type === 'delay' && (
            <DelayNodeProperties
              config={selectedNode.data.config}
              onChange={(config) => updateNodeData(selectedNode.id, { config })}
            />
          )}

          {selectedNode.type === 'script' && (
            <ScriptNodeProperties
              config={selectedNode.data.config}
              onChange={(config) => updateNodeData(selectedNode.id, { config })}
            />
          )}

          {selectedNode.type === 'api' && (
            <ApiNodeProperties
              config={selectedNode.data.config}
              onChange={(config) => updateNodeData(selectedNode.id, { config })}
            />
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="h-screen flex">
      {/* Left Sidebar - Toolbox */}
      <div className="w-64 p-4 border-r bg-gray-50">
        <NodeToolbox />
      </div>

      {/* Main Canvas */}
      <div className="flex-1 relative">
        <ReactFlowProvider>
          <div className="h-full" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
            >
              <Controls />
              <MiniMap />
              <Background variant="dots" gap={12} size={1} />
              
              {/* Top Panel - Workflow Actions */}
              <Panel position="top-center">
                <div className="flex space-x-2">
                  <Button onClick={saveWorkflow} variant="default">
                    Save Workflow
                  </Button>
                  {onTest && (
                    <Button onClick={testWorkflow} variant="outline">
                      Test Workflow
                    </Button>
                  )}
                </div>
              </Panel>
            </ReactFlow>
          </div>
        </ReactFlowProvider>
      </div>

      {/* Right Sidebar - Properties */}
      <div className="w-80 p-4 border-l bg-gray-50">
        <Tabs defaultValue="node" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="node">Node</TabsTrigger>
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
          </TabsList>
          
          <TabsContent value="node">
            <NodeProperties />
          </TabsContent>
          
          <TabsContent value="workflow">
            <Card>
              <CardHeader>
                <CardTitle>Workflow Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="workflow-name">Name</Label>
                  <Input
                    id="workflow-name"
                    value={workflowConfig.name}
                    onChange={(e) =>
                      setWorkflowConfig((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />
                </div>
                
                <div>
                  <Label htmlFor="workflow-description">Description</Label>
                  <Textarea
                    id="workflow-description"
                    value={workflowConfig.description}
                    onChange={(e) =>
                      setWorkflowConfig((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>
                
                <div>
                  <Label htmlFor="workflow-version">Version</Label>
                  <Input
                    id="workflow-version"
                    value={workflowConfig.version}
                    onChange={(e) =>
                      setWorkflowConfig((prev) => ({
                        ...prev,
                        version: e.target.value,
                      }))
                    }
                  />
                </div>
                
                <Separator />
                
                <div>
                  <Label htmlFor="timeout">Timeout (ms)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={workflowConfig.settings.timeout}
                    onChange={(e) =>
                      setWorkflowConfig((prev) => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          timeout: parseInt(e.target.value),
                        },
                      }))
                    }
                  />
                </div>
                
                <div>
                  <Label htmlFor="retry-attempts">Retry Attempts</Label>
                  <Input
                    id="retry-attempts"
                    type="number"
                    value={workflowConfig.settings.retryAttempts}
                    onChange={(e) =>
                      setWorkflowConfig((prev) => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          retryAttempts: parseInt(e.target.value),
                        },
                      }))
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Node Property Components
const TaskNodeProperties: React.FC<{ config: any; onChange: (config: any) => void }> = ({
  config,
  onChange,
}) => (
  <div className="space-y-3">
    <div>
      <Label>Title</Label>
      <Input
        value={config.title}
        onChange={(e) => onChange({ ...config, title: e.target.value })}
      />
    </div>
    <div>
      <Label>Description</Label>
      <Textarea
        value={config.description}
        onChange={(e) => onChange({ ...config, description: e.target.value })}
      />
    </div>
    <div>
      <Label>Assign To</Label>
      <Select
        value={config.assignTo}
        onValueChange={(value) => onChange({ ...config, assignTo: value })}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="user">Current User</SelectItem>
          <SelectItem value="manager">Manager</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="role:technician">Technician Role</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div>
      <Label>Priority</Label>
      <Select
        value={config.priority}
        onValueChange={(value) => onChange({ ...config, priority: value })}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="urgent">Urgent</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
);

const ApprovalNodeProperties: React.FC<{ config: any; onChange: (config: any) => void }> = ({
  config,
  onChange,
}) => (
  <div className="space-y-3">
    <div>
      <Label>Title</Label>
      <Input
        value={config.title}
        onChange={(e) => onChange({ ...config, title: e.target.value })}
      />
    </div>
    <div>
      <Label>Description</Label>
      <Textarea
        value={config.description}
        onChange={(e) => onChange({ ...config, description: e.target.value })}
      />
    </div>
    <div>
      <Label>Required Approvals</Label>
      <Input
        type="number"
        value={config.requiredApprovals}
        onChange={(e) => onChange({ ...config, requiredApprovals: parseInt(e.target.value) })}
      />
    </div>
  </div>
);

const ConditionNodeProperties: React.FC<{ config: any; onChange: (config: any) => void }> = ({
  config,
  onChange,
}) => (
  <div className="space-y-3">
    <div>
      <Label>Condition</Label>
      <Textarea
        value={config.condition}
        onChange={(e) => onChange({ ...config, condition: e.target.value })}
        placeholder="e.g., data.status === 'approved'"
      />
    </div>
  </div>
);

const NotificationNodeProperties: React.FC<{ config: any; onChange: (config: any) => void }> = ({
  config,
  onChange,
}) => (
  <div className="space-y-3">
    <div>
      <Label>Title</Label>
      <Input
        value={config.title}
        onChange={(e) => onChange({ ...config, title: e.target.value })}
      />
    </div>
    <div>
      <Label>Message</Label>
      <Textarea
        value={config.message}
        onChange={(e) => onChange({ ...config, message: e.target.value })}
      />
    </div>
  </div>
);

const DelayNodeProperties: React.FC<{ config: any; onChange: (config: any) => void }> = ({
  config,
  onChange,
}) => (
  <div className="space-y-3">
    <div>
      <Label>Delay</Label>
      <Input
        value={config.delay}
        onChange={(e) => onChange({ ...config, delay: e.target.value })}
        placeholder="e.g., 1h, 30m, 2d"
      />
    </div>
  </div>
);

const ScriptNodeProperties: React.FC<{ config: any; onChange: (config: any) => void }> = ({
  config,
  onChange,
}) => (
  <div className="space-y-3">
    <div>
      <Label>Script</Label>
      <Textarea
        value={config.script}
        onChange={(e) => onChange({ ...config, script: e.target.value })}
        rows={10}
        className="font-mono"
      />
    </div>
  </div>
);

const ApiNodeProperties: React.FC<{ config: any; onChange: (config: any) => void }> = ({
  config,
  onChange,
}) => (
  <div className="space-y-3">
    <div>
      <Label>Method</Label>
      <Select
        value={config.method}
        onValueChange={(value) => onChange({ ...config, method: value })}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="GET">GET</SelectItem>
          <SelectItem value="POST">POST</SelectItem>
          <SelectItem value="PUT">PUT</SelectItem>
          <SelectItem value="DELETE">DELETE</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div>
      <Label>URL</Label>
      <Input
        value={config.url}
        onChange={(e) => onChange({ ...config, url: e.target.value })}
      />
    </div>
    <div>
      <Label>Timeout (ms)</Label>
      <Input
        type="number"
        value={config.timeout}
        onChange={(e) => onChange({ ...config, timeout: parseInt(e.target.value) })}
      />
    </div>
  </div>
);

export default WorkflowDesigner;