import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Image as ImageIcon, Palette, Ruler } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProductField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'color' | 'file';
  options?: string[];
  required: boolean;
  value: any;
}

interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'color' | 'file';
  options?: string[];
  required: boolean;
}

const defaultFields: ProductField[] = [
  { id: 'name', name: 'Product Name', type: 'text', required: true, value: '' },
  { id: 'category', name: 'Category', type: 'select', options: ['Carpet', 'Rug', 'Mat', 'Runner'], required: true, value: '' },
  { id: 'dimensions', name: 'Dimensions (LxW)', type: 'text', required: true, value: '' },
  { id: 'color', name: 'Color', type: 'color', required: true, value: '#000000' },
  { id: 'gsm', name: 'GSM', type: 'number', required: true, value: 0 },
  { id: 'weaveType', name: 'Weave Type', type: 'select', options: ['Hand Tufted', 'Hand Knotted', 'Machine Made', 'Flat Weave'], required: true, value: '' },
  { id: 'material', name: 'Material', type: 'select', options: ['Wool', 'Cotton', 'Silk', 'Jute', 'Synthetic'], required: true, value: '' },
  { id: 'price', name: 'Unit Price (₹)', type: 'number', required: true, value: 0 },
  { id: 'description', name: 'Description', type: 'textarea', required: false, value: '' },
];

export default function AddItem() {
  const { toast } = useToast();
  const [productFields, setProductFields] = useState<ProductField[]>(defaultFields);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [newField, setNewField] = useState<CustomField>({
    id: '',
    label: '',
    type: 'text',
    options: [],
    required: false
  });
  const [showAddField, setShowAddField] = useState(false);

  const updateFieldValue = (fieldId: string, value: any) => {
    setProductFields(fields => 
      fields.map(field => 
        field.id === fieldId ? { ...field, value } : field
      )
    );
  };

  const addCustomField = () => {
    if (!newField.label) {
      toast({
        title: "Error",
        description: "Please enter a field label",
        variant: "destructive"
      });
      return;
    }

    const customField: CustomField = {
      ...newField,
      id: Date.now().toString()
    };

    setCustomFields(prev => [...prev, customField]);
    
    const productField: ProductField = {
      id: customField.id,
      name: customField.label,
      type: customField.type,
      options: customField.options,
      required: customField.required,
      value: customField.type === 'number' ? 0 : ''
    };
    
    setProductFields(prev => [...prev, productField]);
    
    setNewField({
      id: '',
      label: '',
      type: 'text',
      options: [],
      required: false
    });
    setShowAddField(false);
    
    toast({
      title: "Success",
      description: "Custom field added successfully!",
    });
  };

  const handleSubmit = () => {
    const requiredFields = productFields.filter(field => field.required);
    const emptyRequiredFields = requiredFields.filter(field => !field.value || field.value === '');
    
    if (emptyRequiredFields.length > 0) {
      toast({
        title: "Error",
        description: `Please fill in all required fields: ${emptyRequiredFields.map(f => f.name).join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Success",
      description: "Product added successfully!",
    });
  };

  const renderField = (field: ProductField) => {
    switch (field.type) {
      case 'select':
        return (
          <Select value={field.value} onValueChange={(value) => updateFieldValue(field.id, value)}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.name}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'textarea':
        return (
          <Textarea 
            value={field.value}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            placeholder={`Enter ${field.name}`}
          />
        );
      
      case 'color':
        return (
          <div className="flex items-center gap-2">
            <Input 
              type="color"
              value={field.value}
              onChange={(e) => updateFieldValue(field.id, e.target.value)}
              className="w-12 h-10 p-1"
            />
            <Input 
              value={field.value}
              onChange={(e) => updateFieldValue(field.id, e.target.value)}
              placeholder="#000000"
            />
          </div>
        );
      
      case 'file':
        return (
          <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
            <ImageIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Click to upload image</p>
            <Input type="file" className="mt-2" accept="image/*" />
          </div>
        );
      
      default:
        return (
          <Input 
            type={field.type}
            value={field.value}
            onChange={(e) => updateFieldValue(field.id, field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
            placeholder={`Enter ${field.name}`}
          />
        );
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {productFields.map((field) => (
                <div key={field.id}>
                  <Label htmlFor={field.id} className="flex items-center gap-2">
                    {field.name}
                    {field.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                    {field.name === 'Color' && <Palette className="w-4 h-4" />}
                    {field.name.includes('Dimensions') && <Ruler className="w-4 h-4" />}
                  </Label>
                  {renderField(field)}
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button variant="outline" className="flex-1">Save as Draft</Button>
            <Button onClick={handleSubmit} className="flex-1">Add Product</Button>
          </div>
        </div>

        {/* Custom Fields Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Custom Fields
                <Button size="sm" onClick={() => setShowAddField(!showAddField)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Field
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customFields.length === 0 ? (
                <p className="text-sm text-muted-foreground">No custom fields added yet.</p>
              ) : (
                <div className="space-y-2">
                  {customFields.map((field) => (
                    <div key={field.id} className="p-2 border rounded flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{field.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {field.type} {field.required && '• Required'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {showAddField && (
            <Card>
              <CardHeader>
                <CardTitle>Add Custom Field</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="fieldLabel">Field Label</Label>
                  <Input 
                    id="fieldLabel"
                    value={newField.label}
                    onChange={(e) => setNewField(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="Enter field label"
                  />
                </div>
                
                <div>
                  <Label htmlFor="fieldType">Field Type</Label>
                  <Select 
                    value={newField.type} 
                    onValueChange={(value: any) => setNewField(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="select">Dropdown</SelectItem>
                      <SelectItem value="textarea">Long Text</SelectItem>
                      <SelectItem value="color">Color</SelectItem>
                      <SelectItem value="file">File Upload</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newField.type === 'select' && (
                  <div>
                    <Label>Options (comma separated)</Label>
                    <Input 
                      placeholder="Option 1, Option 2, Option 3"
                      onChange={(e) => setNewField(prev => ({ 
                        ...prev, 
                        options: e.target.value.split(',').map(opt => opt.trim()).filter(Boolean)
                      }))}
                    />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    id="required"
                    checked={newField.required}
                    onChange={(e) => setNewField(prev => ({ ...prev, required: e.target.checked }))}
                  />
                  <Label htmlFor="required">Required field</Label>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" onClick={addCustomField}>Add Field</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAddField(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}