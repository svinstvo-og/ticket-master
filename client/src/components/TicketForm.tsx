import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTicketSchema } from "@shared/schema";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { parseQrCode } from "@/lib/utils";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

import QrScanner from "./QrScanner";
import PrioritySelector from "./PrioritySelector";
import FileUpload from "./FileUpload";
import Alert from "./Alert";

// Define types for location data from the database
interface Element {
  id: number;
  name: string;
  area_id: number;
}

interface Area {
  id: number;
  name: string;
  room_id: number;
  elements?: Element[];
}

interface Room {
  id: number;
  name: string;
  floor_id: number;
  areas?: Area[];
}

interface Floor {
  id: number;
  name: string;
  building_id: number;
  rooms?: Room[];
}

interface Building {
  id: number;
  name: string;
  address?: string;
  floors?: Floor[];
}

// Extend the schema with additional validation
const formSchema = insertTicketSchema.extend({});

type TicketFormValues = z.infer<typeof formSchema>;

interface TicketFormProps {
  onSubmitSuccess: () => void;
}

export default function TicketForm({ onSubmitSuccess }: TicketFormProps) {
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [qrAlert, setQrAlert] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  }>({
    show: false,
    message: "",
    type: "success",
  });
  
  // State for the dependent dropdowns
  const [selectedBuilding, setSelectedBuilding] = useState<string>("");
  const [selectedFloor, setSelectedFloor] = useState<string>("");
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [selectedArea, setSelectedArea] = useState<string>("");
  const [selectedElement, setSelectedElement] = useState<string>("");
  
  // State for storing IDs corresponding to selected names
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(null);
  const [selectedFloorId, setSelectedFloorId] = useState<number | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<number | null>(null);
  
  // Fetch location hierarchy data
  const { data: locationData, isLoading: isLocationDataLoading } = useQuery<Building[]>({
    queryKey: ['/api/location-hierarchy'],
    refetchOnWindowFocus: false,
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
      floor: "",
      room: "",
      area: "",
      element: "",
      priority: "Nízká",
      attachments: [],
      // Status, employee and manager fields are now handled by the server
    },
  });

  // Submit handler
  const ticketMutation = useMutation({
    mutationFn: async (data: TicketFormValues) => {
      console.log("Starting ticket submission with data:", data);
      
      // Create FormData for file upload
      const formData = new FormData();

      try {
        // Convert attachments to files
        if (data.attachments && Array.isArray(data.attachments)) {
          // Remove attachments from the ticket data temporarily
          const ticketData = { ...data };
          delete ticketData.attachments;

          // Log the final ticket data for debugging
          console.log("Final ticket data:", ticketData);
          
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
          console.log("No attachments in form data");
          formData.append("ticketData", JSON.stringify(data));
        }

        // Log the form data contents
        console.log("Submitting form data:", [...formData.entries()]);
        
        const response = await apiRequest("POST", "/api/tickets", formData);
        console.log("Server response:", response);
        return response.json();
      } catch (error) {
        console.error("Error in mutationFn:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Ticket created successfully:", data);
      toast({
        title: "Tiket vytvořen",
        description: "Váš tiket byl úspěšně odeslán."
        // No variant needed - using default success styling
      });
      resetForm(); // Using our resetForm function which also resets location IDs
      onSubmitSuccess();
    },
    onError: (error) => {
      toast({
        title: "Chyba při odesílání tiketu",
        description:
          error.message ||
          "Při odesílání vašeho tiketu došlo k chybě. Zkuste to prosím znovu.",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: TicketFormValues) {
    console.log("Form submitted with data:", data);
    
    // Check for required values
    if (!data.title || !data.description || !data.category || !data.priority) {
      toast({
        title: "Chybějící údaje",
        description: "Vyplňte prosím všechny povinné údaje.",
        variant: "destructive"
      });
      return;
    }
    
    // Make sure all required location IDs are available
    if (!selectedBuildingId || !selectedFloorId || !selectedRoomId || !selectedAreaId || !selectedElementId) {
      console.error("Missing required location IDs");
      toast({
        title: "Chybějící umístění",
        description: "Vyberte prosím všechny úrovně umístění (budova, patro, místnost, oblast, prvek).",
        variant: "destructive"
      });
      return;
    }
    
    // Prepare the data with IDs instead of names
    const ticketData = {
      ...data,
      buildingId: selectedBuildingId as number, // Type assertion since we verified these aren't null
      floorId: selectedFloorId as number,
      roomId: selectedRoomId as number,
      areaId: selectedAreaId as number,
      elementId: selectedElementId as number
    };
    
    console.log("Submitting ticket with IDs:", ticketData);
    
    // createdBy will be automatically added by the server from the authenticated user
    ticketMutation.mutate(ticketData);
  }

  // Handle building selection change
  const handleBuildingChange = (value: string) => {
    if (!locationData) return;
    
    // Find the building by name
    const building = locationData.find(b => b.name === value);
    
    // Update building field and ID
    form.setValue("building", value);
    setSelectedBuilding(value);
    
    if (building) {
      setSelectedBuildingId(building.id);
    }
    
    // Reset dependent fields
    form.setValue("floor", "");
    form.setValue("room", "");
    form.setValue("area", "");
    form.setValue("element", "");
    setSelectedFloor("");
    setSelectedRoom("");
    setSelectedArea("");
    setSelectedElement("");
    setSelectedFloorId(null);
    setSelectedRoomId(null);
    setSelectedAreaId(null);
    setSelectedElementId(null);
  };
  
  // Handle floor selection change
  const handleFloorChange = (value: string) => {
    if (!locationData || !selectedBuilding) return;
    
    // Find the floor by name
    const building = locationData.find(b => b.name === selectedBuilding);
    const floor = building?.floors?.find(f => f.name === value);
    
    // Update floor field and ID
    form.setValue("floor", value);
    setSelectedFloor(value);
    
    if (floor) {
      setSelectedFloorId(floor.id);
    }
    
    // Reset dependent fields
    form.setValue("room", "");
    form.setValue("area", "");
    form.setValue("element", "");
    setSelectedRoom("");
    setSelectedArea("");
    setSelectedElement("");
    setSelectedRoomId(null);
    setSelectedAreaId(null);
    setSelectedElementId(null);
  };
  
  // Handle room selection change
  const handleRoomChange = (value: string) => {
    if (!locationData || !selectedBuilding || !selectedFloor) return;
    
    // Find the room by name
    const building = locationData.find(b => b.name === selectedBuilding);
    const floor = building?.floors?.find(f => f.name === selectedFloor);
    const room = floor?.rooms?.find(r => r.name === value);
    
    // Update room field and ID
    form.setValue("room", value);
    setSelectedRoom(value);
    
    if (room) {
      setSelectedRoomId(room.id);
    }
    
    // Reset dependent fields
    form.setValue("area", "");
    form.setValue("element", "");
    setSelectedArea("");
    setSelectedElement("");
    setSelectedAreaId(null);
    setSelectedElementId(null);
  };
  
  // Handle area selection change
  const handleAreaChange = (value: string) => {
    if (!locationData || !selectedBuilding || !selectedFloor || !selectedRoom) return;
    
    // Find the area by name
    const building = locationData.find(b => b.name === selectedBuilding);
    const floor = building?.floors?.find(f => f.name === selectedFloor);
    const room = floor?.rooms?.find(r => r.name === selectedRoom);
    const area = room?.areas?.find(a => a.name === value);
    
    // Update area field and ID
    form.setValue("area", value);
    setSelectedArea(value);
    
    if (area) {
      setSelectedAreaId(area.id);
    }
    
    // Reset element when area changes
    form.setValue("element", "");
    setSelectedElement("");
    setSelectedElementId(null);
  };
  
  // Handle element selection change
  const handleElementChange = (value: string) => {
    if (!locationData || !selectedBuilding || !selectedFloor || !selectedRoom || !selectedArea) return;
    
    // Find the element by name
    const building = locationData.find(b => b.name === selectedBuilding);
    const floor = building?.floors?.find(f => f.name === selectedFloor);
    const room = floor?.rooms?.find(r => r.name === selectedRoom);
    const area = room?.areas?.find(a => a.name === selectedArea);
    const element = area?.elements?.find(e => e.name === value);
    
    // Update element field and ID
    form.setValue("element", value);
    setSelectedElement(value);
    
    if (element) {
      setSelectedElementId(element.id);
    }
  };
  
  // QR scanner handlers
  const handleQrScan = (result: string) => {
    const qrData = parseQrCode(result);

    if (qrData) {
      // Set building and update dependent dropdowns
      handleBuildingChange(qrData.building);
      
      // Show success alert
      setQrAlert({
        show: true,
        message: `QR kód úspěšně naskenován. Budova: ${qrData.building}`,
        type: "success",
      });

      // Close QR scanner
      setShowQrScanner(false);
    } else {
      // Show error alert
      setQrAlert({
        show: true,
        message: `Neplatný formát QR kódu. Očekávaný formát: "Building A|Facility 1"`,
        type: "error",
      });
    }
  };

  const resetForm = () => {
    form.reset();
    setShowQrScanner(false);
    setSelectedBuilding("");
    setSelectedFloor("");
    setSelectedRoom("");
    setSelectedArea("");
    setSelectedElement("");
    setSelectedBuildingId(null);
    setSelectedFloorId(null);
    setSelectedRoomId(null);
    setSelectedAreaId(null);
    setSelectedElementId(null);
  };

  return (
    <Card className="w-full max-w-3xl mx-auto overflow-hidden">
      <div className="bg-blue-600 p-4 sm:p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-white text-xl sm:text-2xl font-semibold">
            Formulář pro Odeslání Tiketu
          </h1>
          <div className="space-x-2">
            <Button
              variant="secondary"
              onClick={() => setShowQrScanner((prev) => !prev)}
              className="bg-white text-blue-600 hover:bg-blue-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Skenovat QR
            </Button>
            <Button
              variant="secondary"
              onClick={resetForm}
              className="bg-white text-blue-600 hover:bg-blue-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Manuální Režim
            </Button>
          </div>
        </div>
      </div>

      {/* QR Scanner */}
      {showQrScanner && (
        <QrScanner
          onScan={handleQrScan}
          onClose={() => setShowQrScanner(false)}
        />
      )}

      {/* Alert for QR code scanning */}
      <Alert
        show={qrAlert.show}
        message={qrAlert.message}
        type={qrAlert.type}
        onClose={() => setQrAlert((prev) => ({ ...prev, show: false }))}
      />

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 sm:p-6">
          <div className="space-y-6">
            {/* Basic Info Section */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Informace o Tiketu
              </h2>
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nadpis *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Stručný popis problému"
                          {...field}
                        />
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
                      <FormLabel>Popis *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Podrobný popis problému"
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
                      <FormLabel>Kategorie *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Vyberte kategorii" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="IT">IT</SelectItem>
                          <SelectItem value="Facility">Facility</SelectItem>
                          <SelectItem value="Production">Výroba</SelectItem>
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
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Umístění
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="building"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budova *</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          handleBuildingChange(value);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Vyberte budovu" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLocationDataLoading ? (
                            <SelectItem value="loading">Načítání...</SelectItem>
                          ) : locationData && locationData.length > 0 ? (
                            locationData.map((building) => (
                              <SelectItem key={building.id} value={building.name}>
                                {building.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-data">Žádná data</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="floor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Patro *</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          handleFloorChange(value);
                        }}
                        value={field.value}
                        disabled={!selectedBuilding}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Vyberte patro" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLocationDataLoading ? (
                            <SelectItem value="loading">Načítání...</SelectItem>
                          ) : selectedBuilding && locationData ? (
                            locationData.find(b => b.name === selectedBuilding)?.floors?.map((floor) => (
                              <SelectItem key={floor.id} value={floor.name}>
                                {floor.name}
                              </SelectItem>
                            )) || <SelectItem value="no-floors">Žádná patra</SelectItem>
                          ) : (
                            <SelectItem value="no-data">Vyberte budovu</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      {!selectedBuilding && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Nejdříve vyberte budovu
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="room"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Místnost *</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          handleRoomChange(value);
                        }}
                        value={field.value}
                        disabled={!selectedBuilding || !selectedFloor}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Vyberte místnost" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLocationDataLoading ? (
                            <SelectItem value="loading">Načítání...</SelectItem>
                          ) : selectedBuilding && selectedFloor && locationData ? (
                            locationData.find(b => b.name === selectedBuilding)
                            ?.floors?.find(f => f.name === selectedFloor)
                            ?.rooms?.map((room) => (
                              <SelectItem key={room.id} value={room.name}>
                                {room.name}
                              </SelectItem>
                            )) || <SelectItem value="no-rooms">Žádné místnosti</SelectItem>
                          ) : (
                            <SelectItem value="no-data">Vyberte patro</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      {!selectedFloor && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Nejdříve vyberte patro
                        </p>
                      )}
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="area"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Oblast *</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          handleAreaChange(value);
                        }}
                        value={field.value}
                        disabled={!selectedBuilding || !selectedFloor || !selectedRoom}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Vyberte oblast" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLocationDataLoading ? (
                            <SelectItem value="loading">Načítání...</SelectItem>
                          ) : selectedBuilding && selectedFloor && selectedRoom && locationData ? (
                            locationData.find(b => b.name === selectedBuilding)
                            ?.floors?.find(f => f.name === selectedFloor)
                            ?.rooms?.find(r => r.name === selectedRoom)
                            ?.areas?.map((area) => (
                              <SelectItem key={area.id} value={area.name}>
                                {area.name}
                              </SelectItem>
                            )) || <SelectItem value="no-areas">Žádné oblasti</SelectItem>
                          ) : (
                            <SelectItem value="no-data">Vyberte místnost</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      {!selectedRoom && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Nejdříve vyberte místnost
                        </p>
                      )}
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="element"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prvek *</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          handleElementChange(value);
                        }}
                        value={field.value}
                        disabled={!selectedBuilding || !selectedFloor || !selectedRoom || !selectedArea}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Vyberte prvek" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLocationDataLoading ? (
                            <SelectItem value="loading">Načítání...</SelectItem>
                          ) : selectedBuilding && selectedFloor && selectedRoom && selectedArea && locationData ? (
                            locationData.find(b => b.name === selectedBuilding)
                            ?.floors?.find(f => f.name === selectedFloor)
                            ?.rooms?.find(r => r.name === selectedRoom)
                            ?.areas?.find(a => a.name === selectedArea)
                            ?.elements?.map((element) => (
                              <SelectItem key={element.id} value={element.name}>
                                {element.name}
                              </SelectItem>
                            )) || <SelectItem value="no-elements">Žádné prvky</SelectItem>
                          ) : (
                            <SelectItem value="no-data">Vyberte oblast</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      {!selectedArea && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Nejdříve vyberte oblast
                        </p>
                      )}
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Priority Section */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Priorita
              </h2>
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priorita *</FormLabel>
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
              </div>
            </div>

            {/* Attachments Section */}
            <FormField
              control={form.control}
              name="attachments"
              render={({ field }) => (
                <FormItem>
                  <div>
                    <h2 className="text-lg font-medium text-gray-900 mb-4">
                      Přílohy
                    </h2>
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
              <Button type="button" variant="outline" onClick={resetForm}>
                Resetovat
              </Button>
              <Button 
                type="submit" 
                disabled={ticketMutation.isPending}
                onClick={() => console.log("Submit button clicked", form.getValues())}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {ticketMutation.isPending ? "Odesílání..." : "Odeslat Tiket"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </Card>
  );
}
