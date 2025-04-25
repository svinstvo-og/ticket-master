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

// Define types for the cascading dropdown structure
interface ElementType {
  name: string;
}

interface AreaType {
  name: string;
  elements: ElementType[];
}

interface RoomType {
  name: string;
  areas: AreaType[];
}

interface FloorType {
  name: string;
  rooms: RoomType[];
}

interface BuildingType {
  name: string;
  floors: FloorType[];
}

// Full cascading data structure for dependent dropdowns
const cascadingData: BuildingType[] = [
  {
    name: "Building A",
    floors: [
      {
        name: "Přízemí",
        rooms: [
          {
            name: "A001 - Recepce",
            areas: [
              {
                name: "Klimatizační a ventilační systémy",
                elements: [
                  { name: "Klimatizace 1" },
                  { name: "Ventilace A" }
                ]
              },
              {
                name: "Elektroinstalace",
                elements: [
                  { name: "Osvětlení" },
                  { name: "Zásuvkové okruhy" }
                ]
              }
            ]
          },
          {
            name: "A002 - Lobby",
            areas: [
              {
                name: "Výtahy",
                elements: [
                  { name: "Výtah 1" },
                  { name: "Výtah 2" }
                ]
              },
              {
                name: "Elektroinstalace",
                elements: [
                  { name: "Hlavní rozvaděč" },
                  { name: "Osvětlení" }
                ]
              }
            ]
          },
          {
            name: "A003 - Zasedací místnost",
            areas: [
              {
                name: "Klimatizační a ventilační systémy",
                elements: [
                  { name: "Klimatizace 2" }
                ]
              },
              {
                name: "Vodoinstalace",
                elements: [
                  { name: "Rozvody vody" }
                ]
              }
            ]
          }
        ]
      },
      {
        name: "1. patro",
        rooms: [
          {
            name: "A101 - Kancelář",
            areas: [
              {
                name: "Klimatizační a ventilační systémy",
                elements: [
                  { name: "Klimatizace 1" }
                ]
              },
              {
                name: "Elektroinstalace",
                elements: [
                  { name: "Osvětlení" },
                  { name: "Zásuvkové okruhy" }
                ]
              }
            ]
          },
          {
            name: "A102 - Zasedací místnost",
            areas: [
              {
                name: "Klimatizační a ventilační systémy",
                elements: [
                  { name: "Klimatizace 2" }
                ]
              }
            ]
          },
          {
            name: "A103 - Kuchyňka",
            areas: [
              {
                name: "Vodoinstalace",
                elements: [
                  { name: "Rozvody vody" },
                  { name: "Odpadní systém" }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    name: "Building B",
    floors: [
      {
        name: "Přízemí",
        rooms: [
          {
            name: "B001 - Jídelna",
            areas: [
              {
                name: "Klimatizační a ventilační systémy",
                elements: [
                  { name: "Ventilace B" }
                ]
              },
              {
                name: "Vodoinstalace",
                elements: [
                  { name: "Sanitární zařízení" }
                ]
              }
            ]
          },
          {
            name: "B002 - Sklad",
            areas: [
              {
                name: "Výtahy",
                elements: [
                  { name: "Nákladní výtah" }
                ]
              }
            ]
          }
        ]
      },
      {
        name: "1. patro",
        rooms: [
          {
            name: "B101 - Kancelář",
            areas: [
              {
                name: "Klimatizační a ventilační systémy",
                elements: [
                  { name: "Klimatizace 1" }
                ]
              }
            ]
          },
          {
            name: "B102 - Zasedací místnost",
            areas: [
              {
                name: "Elektroinstalace",
                elements: [
                  { name: "Osvětlení" }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    name: "Building C",
    floors: [
      {
        name: "Přízemí",
        rooms: [
          {
            name: "C001 - Recepce",
            areas: [
              {
                name: "Výtahy",
                elements: [
                  { name: "Výtah 1" },
                  { name: "Výtah 2" }
                ]
              }
            ]
          },
          {
            name: "C002 - Bezpečnostní místnost",
            areas: [
              {
                name: "Elektroinstalace",
                elements: [
                  { name: "Záložní zdroj" }
                ]
              }
            ]
          }
        ]
      },
      {
        name: "1. patro",
        rooms: [
          {
            name: "C101 - Showroom",
            areas: [
              {
                name: "Klimatizační a ventilační systémy",
                elements: [
                  { name: "Klimatizace 2" }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
];

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
    console.log("Form submitted with data:", data);
    
    // Need to handle createdBy, which should come from the server
    ticketMutation.mutate(data);
  }

  // Handle building selection change
  const handleBuildingChange = (value: string) => {
    // Update building field
    form.setValue("building", value);
    setSelectedBuilding(value);
    
    // Reset dependent fields
    form.setValue("floor", "");
    form.setValue("room", "");
    form.setValue("area", "");
    form.setValue("element", "");
    setSelectedFloor("");
    setSelectedRoom("");
    setSelectedArea("");
    setSelectedElement("");
  };
  
  // Handle floor selection change
  const handleFloorChange = (value: string) => {
    // Update floor field
    form.setValue("floor", value);
    setSelectedFloor(value);
    
    // Reset dependent fields
    form.setValue("room", "");
    form.setValue("area", "");
    form.setValue("element", "");
    setSelectedRoom("");
    setSelectedArea("");
    setSelectedElement("");
  };
  
  // Handle room selection change
  const handleRoomChange = (value: string) => {
    // Update room field
    form.setValue("room", value);
    setSelectedRoom(value);
    
    // Reset dependent fields
    form.setValue("area", "");
    form.setValue("element", "");
    setSelectedArea("");
    setSelectedElement("");
  };
  
  // Handle area selection change
  const handleAreaChange = (value: string) => {
    // Update area field
    form.setValue("area", value);
    setSelectedArea(value);
    
    // Reset element when area changes
    form.setValue("element", "");
    setSelectedElement("");
  };
  
  // Handle element selection change
  const handleElementChange = (value: string) => {
    // Update element field
    form.setValue("element", value);
    setSelectedElement(value);
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
                          {cascadingData.map((building) => (
                            <SelectItem key={building.name} value={building.name}>
                              {building.name.replace("Building ", "Budova ")}
                            </SelectItem>
                          ))}
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
                            cascadingData.find(b => b.name === selectedBuilding)?.floors.map((floor) => (
                              <SelectItem key={floor.name} value={floor.name}>
                                {floor.name}
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
                          {selectedBuilding && selectedFloor && 
                            cascadingData.find(b => b.name === selectedBuilding)
                            ?.floors.find(f => f.name === selectedFloor)
                            ?.rooms.map((room) => (
                              <SelectItem key={room.name} value={room.name}>
                                {room.name}
                              </SelectItem>
                            ))
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
                          {selectedBuilding && selectedFloor && selectedRoom && 
                            cascadingData.find(b => b.name === selectedBuilding)
                            ?.floors.find(f => f.name === selectedFloor)
                            ?.rooms.find(r => r.name === selectedRoom)
                            ?.areas.map((area) => (
                              <SelectItem key={area.name} value={area.name}>
                                {area.name}
                              </SelectItem>
                            ))
                          }
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
                          {selectedBuilding && selectedFloor && selectedRoom && selectedArea && 
                            cascadingData.find(b => b.name === selectedBuilding)
                            ?.floors.find(f => f.name === selectedFloor)
                            ?.rooms.find(r => r.name === selectedRoom)
                            ?.areas.find(a => a.name === selectedArea)
                            ?.elements.map((element) => (
                              <SelectItem key={element.name} value={element.name}>
                                {element.name}
                              </SelectItem>
                            ))
                          }
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
