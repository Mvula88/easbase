'use client';

import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  Plus,
  Trash2,
  Key,
  Link,
  Edit2,
  Check,
  X,
  Database,
  Settings,
} from 'lucide-react';
import { TableSchema } from './visual-schema-editor';

const columnTypes = [
  'uuid',
  'text',
  'integer',
  'bigint',
  'decimal',
  'boolean',
  'timestamptz',
  'date',
  'json',
  'jsonb',
];

export function TableNode({ data }: NodeProps) {
  const { table, onUpdate, onDelete } = data;
  const [isEditing, setIsEditing] = useState(false);
  const [editingColumn, setEditingColumn] = useState<number | null>(null);
  const [tableName, setTableName] = useState(table.name);
  const [columns, setColumns] = useState(table.columns);

  const handleSave = () => {
    onUpdate({
      ...table,
      name: tableName,
      columns,
    });
    setIsEditing(false);
  };

  const addColumn = () => {
    setColumns([
      ...columns,
      {
        name: `column_${columns.length + 1}`,
        type: 'text',
        isNullable: true,
      },
    ]);
  };

  const updateColumn = (index: number, field: string, value: any) => {
    const newColumns = [...columns];
    newColumns[index] = {
      ...newColumns[index],
      [field]: value,
    };
    setColumns(newColumns);
  };

  const deleteColumn = (index: number) => {
    setColumns(columns.filter((_: any, i: number) => i !== index));
  };

  return (
    <>
      <Handle type="target" position={Position.Top} />
      
      <Card className="min-w-[300px] bg-white dark:bg-gray-800 shadow-lg">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-3 rounded-t-lg">
          <div className="flex items-center justify-between">
            {isEditing ? (
              <Input
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                className="bg-white/20 border-white/30 text-white placeholder-white/60"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4" />
                <span className="font-semibold">{table.name}</span>
              </div>
            )}
            
            <div className="flex gap-1">
              {isEditing ? (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSave}
                    className="text-white hover:bg-white/20"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsEditing(false);
                      setTableName(table.name);
                      setColumns(table.columns);
                    }}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                    className="text-white hover:bg-white/20"
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(table.id)}
                    className="text-white hover:bg-white/20"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Columns */}
        <div className="p-3">
          {columns.map((column: any, index: number) => (
            <div
              key={index}
              className="flex items-center gap-2 py-2 border-b last:border-0 group"
            >
              {editingColumn === index ? (
                <>
                  <Input
                    value={column.name}
                    onChange={(e) => updateColumn(index, 'name', e.target.value)}
                    className="flex-1 h-7 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Select
                    value={column.type}
                    onValueChange={(value) => updateColumn(index, 'type', value)}
                  >
                    <SelectTrigger className="w-24 h-7 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {columnTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingColumn(null)}
                    className="h-7 w-7 p-0"
                  >
                    <Check className="w-3 h-3" />
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1 flex-1">
                    {column.isPrimary && <Key className="w-3 h-3 text-yellow-500" />}
                    {column.isForeign && <Link className="w-3 h-3 text-blue-500" />}
                    <span className="text-sm font-medium">{column.name}</span>
                  </div>
                  <span className="text-xs text-gray-500">{column.type}</span>
                  {isEditing && (
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingColumn(index)}
                        className="h-6 w-6 p-0"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteColumn(index)}
                        className="h-6 w-6 p-0 text-red-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
          
          {isEditing && (
            <Button
              size="sm"
              variant="ghost"
              onClick={addColumn}
              className="w-full mt-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Column
            </Button>
          )}
        </div>
      </Card>
      
      <Handle type="source" position={Position.Bottom} />
    </>
  );
}