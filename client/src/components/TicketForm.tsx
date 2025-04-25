import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTicketSchema } from "@shared/schema";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
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

// Define types for the building data structure
interface RoomsByFloor {
  [floor: string]: string[];
}

interface BuildingInfo {
  floors: string[];
  rooms: RoomsByFloor;
}

interface BuildingDataType {
  [building: string]: BuildingInfo;
}

// Data for dependent dropdowns
const buildingData: BuildingDataType = {
  "Building A": {
    floors: ["Přízemí", "1. patro", "2. patro"],
    rooms: {
      "Přízemí": ["A001 - Recepce", "A002 - Lobby", "A003 - Zasedací místnost"],
      "1. patro": ["A101 - Kancelář", "A102 - Zasedací místnost", "A103 - Kuchyňka"],
      "2. patro": ["A201 - Kancelář", "A202 - Zasedací místnost", "A203 - Technická místnost"],
    }
  },
  "Building B": {
    floors: ["Přízemí", "1. patro", "2. patro", "3. patro"],
    rooms: {
      "Přízemí": ["B001 - Jídelna", "B002 - Sklad", "B003 - Kancelář"],
      "1. patro": ["B101 - Kancelář", "B102 - Zasedací místnost", "B103 - Laboratoř"],
      "2. patro": ["B201 - Kancelář", "B202 - Serverovna", "B203 - Odpočinková zóna"],
      "3. patro": ["B301 - Kancelář", "B302 - Zasedací místnost", "B303 - Archiv"],
    }
  },
  "Building C": {
    floors: ["Přízemí", "1. patro", "2. patro", "3. patro", "4. patro"],
    rooms: {
      "Přízemí": ["C001 - Recepce", "C002 - Bezpečnostní místnost", "C003 - Jídelna"],
      "1. patro": ["C101 - Showroom", "C102 - Kancelář", "C103 - Zasedací místnost"],
      "2. patro": ["C201 - Kancelář", "C202 - Zasedací místnost", "C203 - Kuchyňka"],
      "3. patro": ["C301 - Kancelář", "C302 - Technická místnost", "C303 - Laboratoř"],
      "4. patro": ["C401 - Kancelář", "C402 - Zasedací místnost", "C403 - Relaxační zóna"],
    }
  },
  "Building D": {
    floors: ["Přízemí", "1. patro"],
    rooms: {
      "Přízemí": ["D001 - Výrobní hala", "D002 - Sklad", "D003 - Šatny"],
      "1. patro": ["D101 - Kancelář", "D102 - Zasedací místnost", "D103 - Kontrolní místnost"],
    }
  }
};

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
  const [selectedArea, setSelectedArea] = useState<string>("");
  const [selectedBuilding, setSelectedBuilding] = useState<string>("");
  const [selectedFloor, setSelectedFloor] = useState<string>("");
  
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
        title: "Chyba při odesílání tiketu",
        description:
          error.message ||
          "Při odesílání vašeho tiketu došlo k chybě. Zkuste to prosím znovu.",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: TicketFormValues) {
    ticketMutation.mutate(data);
  }

  // Handle building selection change
  const handleBuildingChange = (value: string) => {
    // Update building field
    form.setValue("building", value);
    setSelectedBuilding(value);
    
    // Reset floor and room when building changes
    form.setValue("floor", "");
    form.setValue("room", "");
    setSelectedFloor("");
  };
  
  // Handle floor selection change
  const handleFloorChange = (value: string) => {
    // Update floor field
    form.setValue("floor", value);
    setSelectedFloor(value);
    
    // Reset room when floor changes
    form.setValue("room", "");
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
    setSelectedArea("");
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
                          <SelectItem value="Building A">Budova A</SelectItem>
                          <SelectItem value="Building B">Budova B</SelectItem>
                          <SelectItem value="Building C">Budova C</SelectItem>
                          <SelectItem value="Building D">Budova D</SelectItem>
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
                          {selectedBuilding && 
                            buildingData[selectedBuilding as keyof typeof buildingData]?.floors.map((floor) => (
                              <SelectItem key={floor} value={floor}>
                                {floor}
                              </SelectItem>
                            ))
                          }
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
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!selectedBuilding || !selectedFloor}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Vyberte místnost" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {selectedBuilding && selectedFloor && 
                            (buildingData[selectedBuilding] && 
                             buildingData[selectedBuilding].rooms[selectedFloor] ?
                               buildingData[selectedBuilding].rooms[selectedFloor].map((room: string) => (
                                 <SelectItem key={room} value={room}>
                                   {room}
                                 </SelectItem>
                               ))
                             : null)
                          }
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
                          field.onChange(value);
                          setSelectedArea(value);
                          // Reset the element value when area changes
                          form.setValue("element", "");
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Vyberte oblast" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Výtahy">Výtahy</SelectItem>
                          <SelectItem value="Klimatizační a ventilační systémy">Klimatizační a ventilační systémy</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
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
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!selectedArea} // Disable until an area is selected
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Vyberte prvek" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {selectedArea === "Výtahy" && (
                            <SelectItem value="Výtah">Výtah</SelectItem>
                          )}
                          {selectedArea === "Klimatizační a ventilační systémy" && (
                            <SelectItem value="Klimatizace">Klimatizace</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
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
              <Button type="submit" disabled={ticketMutation.isPending}>
                {ticketMutation.isPending ? "Odesílání..." : "Odeslat Tiket"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </Card>
  );
}
