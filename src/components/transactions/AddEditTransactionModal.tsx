import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Client, ClientService, PaymentScheduleItem } from '@/types/client';
import { Image as ImageIcon, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AddEditTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TransactionFormData) => Promise<void>;
  type: 'income' | 'expense';
  clients: Client[];
  categories: string[];
  preSelectedClientId?: string | null;
  editingTransaction?: {
    id: string;
    amount: number;
    category: string;
    description: string;
    date: string;
    clientId?: string | null;
    serviceId?: string | null;
    clientExpenseCategory?: string | null;
    paymentScheduleId?: string | null;
  } | null;
}

export interface TransactionFormData {
  id?: string; // Add id for editing
  type: 'income' | 'expense';
  amount: string;
  category: string;
  description: string;
  date: string;
  imageFile: File | null;
  clientId: string | null;
  clientName: string | null;
  clientType: string | null;
  serviceId: string | null;
  serviceName: string | null;
  clientExpenseCategory: string | null;
  paymentScheduleId: string | null;
  linkedToSchedule: boolean;
}

const AddEditTransactionModal = ({
  open,
  onOpenChange,
  onSubmit,
  type,
  clients,
  categories,
  preSelectedClientId = null,
  editingTransaction = null
}: AddEditTransactionModalProps) => {
  const [formData, setFormData] = useState<TransactionFormData>({
    type,
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    imageFile: null,
    clientId: null,
    clientName: null,
    clientType: null,
    serviceId: null,
    serviceName: null,
    clientExpenseCategory: null,
    paymentScheduleId: null,
    linkedToSchedule: false
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedService, setSelectedService] = useState<ClientService | null>(null);
  const [selectedScheduleItem, setSelectedScheduleItem] = useState<PaymentScheduleItem | null>(null);

  const activeClients = clients.filter(c => c.basicInfo.status === 'Active');

  useEffect(() => {
    if (open) {
      // If editing, pre-fill form data
      if (editingTransaction) {
        setFormData({
          id: editingTransaction.id,
          type,
          amount: editingTransaction.amount.toString(),
          category: editingTransaction.category,
          description: editingTransaction.description,
          date: editingTransaction.date,
          imageFile: null,
          clientId: editingTransaction.clientId || null,
          clientName: null,
          clientType: null,
          serviceId: editingTransaction.serviceId || null,
          serviceName: null,
          clientExpenseCategory: editingTransaction.clientExpenseCategory || null,
          paymentScheduleId: editingTransaction.paymentScheduleId || null,
          linkedToSchedule: !!editingTransaction.paymentScheduleId
        });
        
        // Set selected client if exists
        if (editingTransaction.clientId) {
          const client = clients.find(c => c.id === editingTransaction.clientId);
          if (client) {
            setSelectedClient(client);
            // Set selected service if exists
            if (editingTransaction.serviceId) {
              const service = client.services.find(s => s.serviceId === editingTransaction.serviceId);
              if (service) {
                setSelectedService(service);
              }
            }
          }
        }
      } else {
        // Adding new transaction
        setFormData({
          type,
          amount: '',
          category: '',
          description: '',
          date: new Date().toISOString().split('T')[0],
          imageFile: null,
          clientId: null,
          clientName: null,
          clientType: null,
          serviceId: null,
          serviceName: null,
          clientExpenseCategory: null,
          paymentScheduleId: null,
          linkedToSchedule: false
        });
      }
      
      setImageFile(null);

      // If a client is pre-selected (and not editing), set it
      if (preSelectedClientId && !editingTransaction) {
        handleClientChange(preSelectedClientId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, type, preSelectedClientId, editingTransaction]);

  const handleClientChange = (clientId: string) => {
    if (clientId === 'none') {
      setSelectedClient(null);
      setSelectedService(null);
      setSelectedScheduleItem(null);
      setFormData(prev => ({
        ...prev,
        clientId: null,
        clientName: null,
        clientType: null,
        serviceId: null,
        serviceName: null,
        clientExpenseCategory: null,
        paymentScheduleId: null,
        linkedToSchedule: false
      }));
    } else {
      const client = clients.find(c => c.id === clientId);
      if (client) {
        setSelectedClient(client);
        setFormData(prev => ({
          ...prev,
          clientId: client.id,
          clientName: client.basicInfo.name,
          clientType: client.basicInfo.type,
          serviceId: null,
          serviceName: null,
          paymentScheduleId: null,
          linkedToSchedule: false
        }));
        
        // Auto-select if only one service
        if (client.services.length === 1) {
          handleServiceChange(client.services[0].serviceId);
        }
      }
    }
  };

  const handleServiceChange = (serviceId: string) => {
    const service = selectedClient?.services.find(s => s.serviceId === serviceId);
    if (service) {
      setSelectedService(service);
      setFormData(prev => ({
        ...prev,
        serviceId: service.serviceId,
        serviceName: service.serviceName,
        paymentScheduleId: null,
        linkedToSchedule: false
      }));
      setSelectedScheduleItem(null);
    }
  };

  const handleScheduleChange = (scheduleId: string) => {
    if (scheduleId === 'none') {
      setSelectedScheduleItem(null);
      setFormData(prev => ({
        ...prev,
        paymentScheduleId: null,
        linkedToSchedule: false
      }));
    } else {
      const item = selectedService?.paymentSchedule?.find(p => p.scheduleId === scheduleId);
      if (item) {
        setSelectedScheduleItem(item);
        setFormData(prev => ({
          ...prev,
          amount: item.amount.toString(),
          paymentScheduleId: item.scheduleId,
          linkedToSchedule: true
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (selectedClient && !formData.serviceId) {
      toast.error('Please select a service');
      return;
    }

    setUploading(true);
    try {
      await onSubmit({ ...formData, imageFile });
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting transaction:', error);
    } finally {
      setUploading(false);
    }
  };

  const pendingScheduleItems = selectedService?.paymentSchedule?.filter(
    p => p.status === 'pending'
  ) || [];

  const amountMismatchWarning = selectedScheduleItem && 
    parseFloat(formData.amount || '0') !== selectedScheduleItem.amount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingTransaction ? 'Edit' : 'Add'} {type === 'income' ? 'Income' : 'Expense'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client Link */}
          <div className="space-y-2">
            <Label htmlFor="client">Link to Client/Project (Optional)</Label>
            <Select value={formData.clientId || 'none'} onValueChange={handleClientChange}>
              <SelectTrigger>
                <SelectValue placeholder="None - General Business" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="none">None - General Business</SelectItem>
                {activeClients.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                      --- Clients ---
                    </div>
                    {activeClients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.basicInfo.name} • {client.basicInfo.type}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Service (conditional) */}
          {selectedClient && (
            <div className="space-y-2">
              <Label htmlFor="service">Service *</Label>
              <Select value={formData.serviceId || ''} onValueChange={handleServiceChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {selectedClient.services.map(service => (
                    <SelectItem key={service.serviceId} value={service.serviceId}>
                      {service.serviceName} - ${service.expectedAmount.toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Payment Schedule (conditional - income only) */}
          {type === 'income' && selectedService && pendingScheduleItems.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="schedule">Link to Payment Schedule</Label>
              <Select value={formData.paymentScheduleId || 'none'} onValueChange={handleScheduleChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Not linked to schedule" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="none">Not linked to schedule</SelectItem>
                  {pendingScheduleItems.map((item, index) => (
                    <SelectItem key={item.scheduleId} value={item.scheduleId}>
                      Payment {index + 1} - {new Date(item.dueDate).toLocaleDateString()} - ${item.amount.toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedScheduleItem && (
                <p className="text-xs text-muted-foreground">
                  ℹ️ Selecting this will mark the payment as paid
                </p>
              )}
            </div>
          )}

          {/* Warning for amount mismatch */}
          {amountMismatchWarning && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                ⚠️ Amount differs from scheduled payment (${selectedScheduleItem?.amount.toLocaleString()})
              </AlertDescription>
            </Alert>
          )}

          {/* Client Expense Category (conditional - expense only) */}
          {type === 'expense' && selectedClient && selectedClient.customExpenseCategories.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="clientExpenseCategory">Expense Category for Client</Label>
              <Select 
                value={formData.clientExpenseCategory || ''} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, clientExpenseCategory: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {selectedClient.customExpenseCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Visual Indicator */}
          {selectedClient && (
            <div className="p-3 bg-primary/10 rounded-lg space-y-1">
              <div className="font-semibold text-sm">🔗 Linking to: {selectedClient.basicInfo.name}</div>
              <div className="text-xs text-muted-foreground">
                Expected: ${selectedClient.financialSummary.totalExpectedIncome.toLocaleString()} | 
                Received: ${selectedClient.financialSummary.totalReceivedIncome.toLocaleString()}
              </div>
              {type === 'income' && formData.amount && (
                <div className="text-xs font-medium text-success">
                  This adds: +${parseFloat(formData.amount).toLocaleString()}
                </div>
              )}
              {type === 'expense' && formData.amount && (
                <div className="text-xs font-medium text-danger">
                  This adds expense: -${parseFloat(formData.amount).toLocaleString()}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add details..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Receipt Image (Optional)</Label>
            <div className="flex items-center gap-3">
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setImageFile(file);
                }}
                className="flex-1"
              />
              <ImageIcon className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? 'Saving...' : (editingTransaction ? 'Update' : `Add ${type === 'income' ? 'Income' : 'Expense'}`)}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddEditTransactionModal;
