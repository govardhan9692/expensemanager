import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Client, ClientBasicInfo, ClientService, ClientStatus, ClientType, PaymentTerms, RecurringSettings } from '@/types/client';
import { RecurringServiceForm } from './RecurringServiceForm';
import { Plus, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

interface AddEditClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (clientData: Partial<Client>) => Promise<void>;
  client?: Client | null;
  userId: string;
  userName: string;
}

const predefinedTypes: ClientType[] = ['Clients', 'Projects', 'Rentals', 'Products'];
const predefinedCategories = ['Travel', 'Materials/Supplies', 'Software/Tools', 'Outsourcing', 'Marketing'];

const AddEditClientModal = ({ 
  open, 
  onOpenChange, 
  onSave, 
  client,
  userId,
  userName
}: AddEditClientModalProps) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Basic Info
  const [name, setName] = useState('');
  const [type, setType] = useState<ClientType>('Clients');
  const [customType, setCustomType] = useState('');
  const [status, setStatus] = useState<ClientStatus>('Active');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isOngoing, setIsOngoing] = useState(true);

  // Services
  const [services, setServices] = useState<Partial<ClientService>[]>([]);
  const [currentService, setCurrentService] = useState<Partial<ClientService>>({
    serviceName: '',
    expectedAmount: 0,
    paymentTerms: 'full'
  });

  // Categories
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customCategory, setCustomCategory] = useState('');

  useEffect(() => {
    if (client) {
      // Edit mode - populate form
      setName(client.basicInfo.name);
      setType(client.basicInfo.type);
      setStatus(client.basicInfo.status);
      setDescription(client.basicInfo.description);
      setContactEmail(client.basicInfo.contactEmail);
      setContactPhone(client.basicInfo.contactPhone);
      setStartDate(client.basicInfo.startDate);
      setEndDate(client.basicInfo.endDate || '');
      setIsOngoing(!client.basicInfo.endDate);
      setServices(client.services);
      setSelectedCategories(client.customExpenseCategories);
    } else {
      // Reset form for new client
      resetForm();
    }
  }, [client, open]);

  const resetForm = () => {
    setName('');
    setType('Clients');
    setCustomType('');
    setStatus('Active');
    setDescription('');
    setContactEmail('');
    setContactPhone('');
    setStartDate('');
    setEndDate('');
    setIsOngoing(true);
    setServices([]);
    setCurrentService({
      serviceName: '',
      expectedAmount: 0,
      paymentTerms: 'full'
    });
    setSelectedCategories([]);
    setCustomCategory('');
    setStep(1);
  };

  const handleAddService = () => {
    if (!currentService.serviceName || !currentService.expectedAmount) {
      toast.error('Please enter service name and amount');
      return;
    }

    const serviceId = `service_${Date.now()}`;
    const newService: ClientService = {
      serviceId,
      serviceName: currentService.serviceName,
      expectedAmount: currentService.expectedAmount,
      paymentTerms: currentService.paymentTerms || 'full',
      ...(currentService.paymentTerms === 'partial' && currentService.paymentSchedule ? { paymentSchedule: currentService.paymentSchedule } : {}),
      ...(currentService.paymentTerms === 'recurring' && currentService.recurring ? { recurring: currentService.recurring } : {})
    };

    setServices([...services, newService]);
    setCurrentService({
      serviceName: '',
      expectedAmount: 0,
      paymentTerms: 'full'
    });
    toast.success('Service added');
  };

  const handleRemoveService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const handleAddCategory = () => {
    if (customCategory.trim()) {
      if (!selectedCategories.includes(customCategory.trim())) {
        setSelectedCategories([...selectedCategories, customCategory.trim()]);
        setCustomCategory('');
      } else {
        toast.error('Category already added');
      }
    }
  };

  const handleRemoveCategory = (category: string) => {
    setSelectedCategories(selectedCategories.filter(c => c !== category));
  };

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      toast.error('Client name is required');
      return;
    }

    const finalType = type === 'custom' ? customType : type;
    if (!finalType) {
      toast.error('Please select or enter a client type');
      return;
    }

    if (services.length === 0) {
      toast.error('Please add at least one service');
      return;
    }

    setLoading(true);
    try {
      const basicInfo: ClientBasicInfo = {
        name: name.trim(),
        type: finalType,
        status,
        description: description.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        startDate: startDate || new Date().toISOString(),
        ...(isOngoing ? {} : { endDate }),
        createdBy: {
          userId,
          name: userName
        },
        createdAt: client?.basicInfo.createdAt || new Date().toISOString()
      };

      const totalExpectedIncome = services.reduce((sum, s) => sum + (s.expectedAmount || 0), 0);

      const clientData: Partial<Client> = {
        basicInfo,
        services: services as ClientService[],
        financialSummary: {
          totalExpectedIncome,
          totalReceivedIncome: client?.financialSummary.totalReceivedIncome || 0,
          totalPendingIncome: totalExpectedIncome - (client?.financialSummary.totalReceivedIncome || 0),
          totalExpenses: client?.financialSummary.totalExpenses || 0,
          netProfit: (client?.financialSummary.totalReceivedIncome || 0) - (client?.financialSummary.totalExpenses || 0)
        },
        customExpenseCategories: selectedCategories
      };

      await onSave(clientData);
      resetForm();
      onOpenChange(false);
      toast.success(client ? 'Client updated successfully' : 'Client created successfully');
    } catch (error) {
      console.error('Error saving client:', error);
      toast.error('Failed to save client');
    } finally {
      setLoading(false);
    }
  };

  const canProceedToStep2 = name.trim() && (type !== 'custom' || customType.trim());
  const canProceedToStep3 = services.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {client ? 'Edit Client/Project' : 'Add New Client/Project'}
          </DialogTitle>
          <div className="flex gap-2 mt-4">
            <Badge variant={step === 1 ? 'default' : 'outline'}>1. Basic Info</Badge>
            <Badge variant={step === 2 ? 'default' : 'outline'}>2. Services</Badge>
            <Badge variant={step === 3 ? 'default' : 'outline'}>3. Categories</Badge>
          </div>
        </DialogHeader>

        {/* Step 1: Basic Information */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Client/Project Name *</Label>
              <Input
                id="name"
                placeholder="ABC Company"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select value={type} onValueChange={(value) => setType(value as ClientType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {predefinedTypes.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                  <SelectItem value="custom">+ Add Custom Type</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {type === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="customType">Custom Type *</Label>
                <Input
                  id="customType"
                  placeholder="e.g., Subscriptions, Investments"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as ClientStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Pending Payment">Pending Payment</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Project details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Contact Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@company.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Contact Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 234 567 8900"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={isOngoing}
                />
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="ongoing"
                    checked={isOngoing}
                    onCheckedChange={(checked) => setIsOngoing(checked as boolean)}
                  />
                  <Label htmlFor="ongoing" className="text-sm font-normal cursor-pointer">
                    Ongoing
                  </Label>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!canProceedToStep2}>
                Next: Add Services
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Services */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <h3 className="font-semibold">Add Service</h3>
              
              <div className="space-y-2">
                <Label htmlFor="serviceName">Service Name *</Label>
                <Input
                  id="serviceName"
                  placeholder="Social Media Management"
                  value={currentService.serviceName}
                  onChange={(e) => setCurrentService({ ...currentService, serviceName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expectedAmount">Expected Amount *</Label>
                <Input
                  id="expectedAmount"
                  type="number"
                  placeholder="25000"
                  value={currentService.expectedAmount || ''}
                  onChange={(e) => setCurrentService({ ...currentService, expectedAmount: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Terms</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="full"
                      name="paymentTerms"
                      checked={currentService.paymentTerms === 'full'}
                      onChange={() => setCurrentService({ ...currentService, paymentTerms: 'full' })}
                    />
                    <Label htmlFor="full" className="font-normal cursor-pointer">Full Payment (one-time)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="partial"
                      name="paymentTerms"
                      checked={currentService.paymentTerms === 'partial'}
                      onChange={() => setCurrentService({ ...currentService, paymentTerms: 'partial' })}
                    />
                    <Label htmlFor="partial" className="font-normal cursor-pointer">Partial Payments (installments)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="recurring"
                      name="paymentTerms"
                      checked={currentService.paymentTerms === 'recurring'}
                      onChange={() => setCurrentService({ ...currentService, paymentTerms: 'recurring', recurring: currentService.recurring })}
                    />
                    <Label htmlFor="recurring" className="font-normal cursor-pointer">Recurring</Label>
                  </div>
                </div>
              </div>

              {currentService.paymentTerms === 'recurring' && (
                <RecurringServiceForm
                  amount={currentService.expectedAmount || 0}
                  onChange={(settings) => setCurrentService({ ...currentService, recurring: settings as RecurringSettings })}
                  initialSettings={currentService.recurring}
                />
              )}

              <Button onClick={handleAddService} className="w-full" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Service
              </Button>
            </div>

            {/* Services List */}
            {services.length > 0 && (
              <div className="space-y-2">
                <Label>Added Services ({services.length})</Label>
                {services.map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{service.serviceName}</div>
                      <div className="text-sm text-muted-foreground">
                        ${service.expectedAmount?.toLocaleString()} - {service.paymentTerms === 'full' ? 'Full Payment' : service.paymentTerms === 'partial' ? 'Partial' : 'Recurring'}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveService(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <div className="text-sm font-semibold p-2 bg-primary/10 rounded">
                  Total Expected: ${services.reduce((sum, s) => sum + (s.expectedAmount || 0), 0).toLocaleString()}
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={!canProceedToStep3}>
                Next: Categories
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Categories */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client-Specific Expense Categories (Optional)</Label>
              <p className="text-sm text-muted-foreground">
                Select categories relevant to this client's expenses
              </p>
            </div>

            <div className="space-y-2">
              {predefinedCategories.map(category => (
                <div key={category} className="flex items-center gap-2">
                  <Checkbox
                    id={category}
                    checked={selectedCategories.includes(category)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedCategories([...selectedCategories, category]);
                      } else {
                        handleRemoveCategory(category);
                      }
                    }}
                  />
                  <Label htmlFor={category} className="font-normal cursor-pointer">
                    {category}
                  </Label>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customCategory">Add Custom Category</Label>
              <div className="flex gap-2">
                <Input
                  id="customCategory"
                  placeholder="Custom category name"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                />
                <Button onClick={handleAddCategory} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {selectedCategories.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Categories</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedCategories.map(category => (
                    <Badge key={category} variant="secondary">
                      {category}
                      <button
                        onClick={() => handleRemoveCategory(category)}
                        className="ml-2 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Saving...' : client ? 'Update Client' : 'Create Client'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddEditClientModal;
