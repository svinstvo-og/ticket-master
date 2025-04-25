import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTicketSchema } from "@shared/schema";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { parseQrCode } from "@/lib/utils";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

import QrScanner from "./QrScanner";
import PrioritySelector from "./PrioritySelector";
import FileUpload from "./FileUpload";
import Alert from "./Alert";

// Extend the schema with additional validation
const formSchema = insertTicketSchema.extend({});

type TicketFormValues = z.infer<typeof formSchema>;

interface TicketFormProps {
  onSubmitSuccess: () => void;
}

export default function TicketForm({ onSubmitSuccess }: TicketFormProps) {
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [qrAlert, setQrAlert] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false,
    message: "",
    type: "success",
  });
  const { toast } = useToast();

  // Form definition
  const form = useForm<TicketFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      building: "",
      facility: "",
      priority: "Low",
      employeeAssigned: "",
      manager: "",
      status: "Open",
      attachments: []
    },
  });

  // Submit handler
  const ticketMutation = useMutation({
    mutationFn: async (data: TicketFormValues) => {
      // Create FormData for file upload
      const formData = new FormData();
      
      // Convert attachments to files
      if (data.attachments && Array.isArray(data.attachments)) {
        // Remove attachments from the ticket data temporarily
        const ticketData = { ...data };
        delete ticketData.attachments;
        
        // Add JSON data
        formData.append("ticketData", JSON.stringify(ticketData));
        
        // Add files
        if (data.attachments.length > 0) {
          data.attachments.forEach((file) => {
            if (file instanceof File) {
              formData.append("attachments", file);
            }
          });
        }
      } else {
        formData.append("ticketData", JSON.stringify(data));
      }
      
      const response = await apiRequest("POST", "/api/tickets", formData);
      return response.json();
    },
    onSuccess: () => {
      form.reset();
      onSubmitSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error submitting ticket",
        description: error.message || "An error occurred while submitting your ticket. Please try again.",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: TicketFormValues) {
    ticketMutation.mutate(data);
  }

  // QR scanner handlers
  const handleQrScan = (result: string) => {
    const qrData = parseQrCode(result);
    
    if (qrData) {
      form.setValue("building", qrData.building);
      form.setValue("facility", qrData.facility);
      
      // Show success alert
      setQrAlert({
        show: true,
        message: `QR Code scanned successfully. Building: ${qrData.building}, Facility: ${qrData.facility}`,
        type: "success",
      });
      
      // Close QR scanner
      setShowQrScanner(false);
    } else {
      // Show error alert
      setQrAlert({
        show: true,
        message: `Invalid QR code format. Expected "Building A|Facility 1"`,
        type: "error",
      });
    }
  };
  
  const resetForm = () => {
    form.reset();
    setShowQrScanner(false);
  };

  return (
    <Card className="w-full max-w-3xl mx-auto overflow-hidden">
      <div className="bg-blue-600 p-4 sm:p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-white text-xl sm:text-2xl font-semibold">Ticket Submission Form</h1>
          <div className="space-x-2">
            <Button
              variant="secondary"
              onClick={() => setShowQrScanner(prev => !prev)}
              className="bg-white text-blue-600 hover:bg-blue-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Scan QR
            </Button>
            <Button
              variant="secondary"
              onClick={resetForm}
              className="bg-white text-blue-600 hover:bg-blue-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Manual Mode
            </Button>
          </div>
        </div>
      </div>
      
      {/* QR Scanner */}
      {showQrScanner && <QrScanner onScan={handleQrScan} onClose={() => setShowQrScanner(false)} />}
      
      {/* Alert for QR code scanning */}
      <Alert 
        show={qrAlert.show} 
        message={qrAlert.message} 
        type={qrAlert.type}
        onClose={() => setQrAlert(prev => ({ ...prev, show: false }))}
      />
      
      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 sm:p-6">
          <div className="space-y-6">
            {/* Basic Info Section */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Ticket Information</h2>
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Brief description of the issue" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Detailed explanation of the issue"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="IT">IT</SelectItem>
                          <SelectItem value="Facility">Facility</SelectItem>
                          <SelectItem value="Production">Production</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Location Section */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Location</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="building"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Building *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select building" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Building A">Building A</SelectItem>
                          <SelectItem value="Building B">Building B</SelectItem>
                          <SelectItem value="Building C">Building C</SelectItem>
                          <SelectItem value="Building D">Building D</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="facility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facility *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select facility" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Facility 1">Facility 1</SelectItem>
                          <SelectItem value="Facility 2">Facility 2</SelectItem>
                          <SelectItem value="Facility 3">Facility 3</SelectItem>
                          <SelectItem value="Facility 4">Facility 4</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Assignment Section */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Assignment Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority *</FormLabel>
                      <FormControl>
                        <PrioritySelector
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Open">Open</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Resolved">Resolved</SelectItem>
                          <SelectItem value="Closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="employeeAssigned"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee Assigned *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="John Doe">John Doe</SelectItem>
                          <SelectItem value="Jane Smith">Jane Smith</SelectItem>
                          <SelectItem value="Alex Johnson">Alex Johnson</SelectItem>
                          <SelectItem value="Sam Wilson">Sam Wilson</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="manager"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manager *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select manager" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Michael Scott">Michael Scott</SelectItem>
                          <SelectItem value="David Wallace">David Wallace</SelectItem>
                          <SelectItem value="Jan Levinson">Jan Levinson</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Attachments Section */}
            <FormField
              control={form.control}
              name="attachments"
              render={({ field }) => (
                <FormItem>
                  <div>
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Attachments</h2>
                    <FormControl>
                      <FileUpload
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-3 mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
              >
                Reset
              </Button>
              <Button type="submit" disabled={ticketMutation.isPending}>
                {ticketMutation.isPending ? "Submitting..." : "Submit Ticket"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </Card>
  );
}
