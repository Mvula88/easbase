'use client';

import React, { useCallback, useState, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  Panel,
  NodeTypes,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { TableNode } from './table-node';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Database,
  Plus,
  Download,
  Upload,
  Code,
  Play,
  Save,
  Wand2,
  Eye,
  Settings,
} from 'lucide-react';

const nodeTypes: NodeTypes = {
  tableNode: TableNode,
};

export interface TableSchema {
  id: string;
  name: string;
  columns: {
    name: string;
    type: string;
    isPrimary?: boolean;
    isForeign?: boolean;
    isNullable?: boolean;
    defaultValue?: string;
  }[];
  position: { x: number; y: number };
}

interface VisualSchemaEditorProps {
  onSchemaChange?: (schema: TableSchema[]) => void;
  onGenerateSQL?: (schema: TableSchema[]) => void;
  initialSchema?: TableSchema[];
}

export function VisualSchemaEditor({
  onSchemaChange,
  onGenerateSQL,
  initialSchema = [],
}: VisualSchemaEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showSQL, setShowSQL] = useState(false);
  const [generatedSQL, setGeneratedSQL] = useState('');

  // Initialize nodes from schema
  React.useEffect(() => {
    if (initialSchema.length > 0) {
      const newNodes = initialSchema.map((table) => ({
        id: table.id,
        type: 'tableNode',
        position: table.position,
        data: {
          table,
          onUpdate: (updatedTable: TableSchema) => handleTableUpdate(updatedTable),
          onDelete: (tableId: string) => handleTableDelete(tableId),
        },
      }));
      setNodes(newNodes);
    }
  }, [initialSchema]);

  const onConnect = useCallback(
    (params: Connection) => {
      const edge = {
        ...params,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#8b5cf6' },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#8b5cf6',
        },
      };
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges]
  );

  const handleTableUpdate = (updatedTable: TableSchema) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === updatedTable.id) {
          return {
            ...node,
            data: {
              ...node.data,
              table: updatedTable,
            },
          };
        }
        return node;
      })
    );
  };

  const handleTableDelete = (tableId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== tableId));
    setEdges((eds) => eds.filter((edge) => edge.source !== tableId && edge.target !== tableId));
  };

  const addNewTable = () => {
    const newTable: TableSchema = {
      id: `table_${Date.now()}`,
      name: `table_${nodes.length + 1}`,
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true },
        { name: 'created_at', type: 'timestamptz', defaultValue: 'NOW()' },
      ],
      position: { x: 250, y: 250 },
    };

    const newNode: Node = {
      id: newTable.id,
      type: 'tableNode',
      position: newTable.position,
      data: {
        table: newTable,
        onUpdate: handleTableUpdate,
        onDelete: handleTableDelete,
      },
    };

    setNodes((nds) => [...nds, newNode]);
  };

  const generateSQL = () => {
    const tables = nodes.map((node) => node.data.table as TableSchema);
    const sql = tables
      .map((table) => {
        const columns = table.columns
          .map((col) => {
            let colDef = `  ${col.name} ${col.type.toUpperCase()}`;
            if (col.isPrimary) colDef += ' PRIMARY KEY';
            if (col.defaultValue) colDef += ` DEFAULT ${col.defaultValue}`;
            if (!col.isNullable && !col.isPrimary) colDef += ' NOT NULL';
            return colDef;
          })
          .join(',\n');

        return `-- Table: ${table.name}
CREATE TABLE ${table.name} (
${columns}
);

-- Enable RLS
ALTER TABLE ${table.name} ENABLE ROW LEVEL SECURITY;`;
      })
      .join('\n\n');

    setGeneratedSQL(sql);
    setShowSQL(true);
    onGenerateSQL?.(tables);
  };

  const exportSchema = () => {
    const schema = nodes.map((node) => ({
      ...node.data.table,
      position: node.position,
    }));
    const dataStr = JSON.stringify(schema, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = 'schema.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importSchema = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const schema = JSON.parse(e.target?.result as string);
          const newNodes = schema.map((table: TableSchema) => ({
            id: table.id,
            type: 'tableNode',
            position: table.position,
            data: {
              table,
              onUpdate: handleTableUpdate,
              onDelete: handleTableDelete,
            },
          }));
          setNodes(newNodes);
        } catch (error) {
          console.error('Failed to import schema:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  // Common templates
  const applyTemplate = (template: 'ecommerce' | 'saas' | 'social') => {
    let tables: TableSchema[] = [];

    if (template === 'ecommerce') {
      tables = [
        {
          id: 'users',
          name: 'users',
          columns: [
            { name: 'id', type: 'uuid', isPrimary: true },
            { name: 'email', type: 'text', isNullable: false },
            { name: 'name', type: 'text' },
            { name: 'created_at', type: 'timestamptz', defaultValue: 'NOW()' },
          ],
          position: { x: 100, y: 100 },
        },
        {
          id: 'products',
          name: 'products',
          columns: [
            { name: 'id', type: 'uuid', isPrimary: true },
            { name: 'name', type: 'text', isNullable: false },
            { name: 'price', type: 'decimal(10,2)' },
            { name: 'stock', type: 'integer', defaultValue: '0' },
            { name: 'created_at', type: 'timestamptz', defaultValue: 'NOW()' },
          ],
          position: { x: 400, y: 100 },
        },
        {
          id: 'orders',
          name: 'orders',
          columns: [
            { name: 'id', type: 'uuid', isPrimary: true },
            { name: 'user_id', type: 'uuid', isForeign: true },
            { name: 'total', type: 'decimal(10,2)' },
            { name: 'status', type: 'text', defaultValue: "'pending'" },
            { name: 'created_at', type: 'timestamptz', defaultValue: 'NOW()' },
          ],
          position: { x: 250, y: 300 },
        },
      ];
    }

    const newNodes = tables.map((table) => ({
      id: table.id,
      type: 'tableNode',
      position: table.position,
      data: {
        table,
        onUpdate: handleTableUpdate,
        onDelete: handleTableDelete,
      },
    }));

    setNodes(newNodes);
    
    // Auto-connect foreign keys
    const newEdges: Edge[] = [];
    tables.forEach((table) => {
      table.columns.forEach((col) => {
        if (col.isForeign && col.name.includes('_id')) {
          const targetTable = col.name.replace('_id', 's');
          if (tables.find((t) => t.name === targetTable)) {
            newEdges.push({
              id: `${table.id}-${targetTable}`,
              source: table.id,
              target: targetTable,
              type: 'smoothstep',
              animated: true,
              style: { stroke: '#8b5cf6' },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#8b5cf6',
              },
            });
          }
        }
      });
    });
    setEdges(newEdges);
  };

  return (
    <div className="w-full h-[800px] relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-gray-50 dark:bg-gray-900"
      >
        <Background />
        <Controls />
        <MiniMap 
          nodeColor={(node) => '#8b5cf6'}
          style={{
            backgroundColor: '#f3f4f6',
          }}
        />
        
        {/* Toolbar */}
        <Panel position="top-left" className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
          <div className="flex gap-2">
            <Button onClick={addNewTable} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Table
            </Button>
            
            <div className="relative">
              <Button variant="outline" size="sm">
                <Wand2 className="w-4 h-4 mr-2" />
                Templates
              </Button>
              <div className="absolute top-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 hidden group-hover:block">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => applyTemplate('ecommerce')}
                  className="w-full justify-start"
                >
                  E-commerce
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => applyTemplate('saas')}
                  className="w-full justify-start"
                >
                  SaaS
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => applyTemplate('social')}
                  className="w-full justify-start"
                >
                  Social Media
                </Button>
              </div>
            </div>
            
            <Button variant="outline" size="sm" onClick={generateSQL}>
              <Code className="w-4 h-4 mr-2" />
              Generate SQL
            </Button>
            
            <Button variant="outline" size="sm" onClick={exportSchema}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" asChild>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </span>
              </Button>
              <input
                type="file"
                accept=".json"
                onChange={importSchema}
                className="hidden"
              />
            </label>
          </div>
        </Panel>
      </ReactFlow>

      {/* SQL Preview Modal */}
      {showSQL && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Generated SQL</h2>
                <Button variant="ghost" onClick={() => setShowSQL(false)}>
                  ✕
                </Button>
              </div>
              
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-[60vh]">
                <pre className="text-sm">
                  <code>{generatedSQL}</code>
                </pre>
              </div>
              
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => navigator.clipboard.writeText(generatedSQL)}>
                  Copy SQL
                </Button>
                <Button onClick={() => setShowSQL(false)}>Close</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}