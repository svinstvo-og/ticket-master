import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Ticket } from "@shared/schema";
import MainNavigation from "@/components/MainNavigation";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketDetailsOpen, setTicketDetailsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Fetch tickets
  const { data: tickets = [], isLoading } = useQuery<Ticket[]>({
    queryKey: ["/api/tickets"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Delete ticket mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/tickets/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({
        title: "Tiket smazán",
        description: "Tiket byl úspěšně smazán",
      });
    },
    onError: (error) => {
      toast({
        title: "Chyba při mazání tiketu",
        description: error.message || "Při mazání tiketu došlo k chybě",
        variant: "destructive",
      });
    },
  });

  // Update ticket status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await fetch(`/api/tickets/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({
        title: "Status aktualizován",
        description: "Status tiketu byl úspěšně aktualizován",
      });
    },
    onError: (error) => {
      toast({
        title: "Chyba při aktualizaci statusu",
        description: error.message || "Při aktualizaci statusu došlo k chybě",
        variant: "destructive",
      });
    },
  });

  const handleDeleteTicket = (id: number) => {
    if (confirm("Opravdu chcete smazat tento tiket?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleUpdateStatus = (id: number, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  const handleViewDetails = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setTicketDetailsOpen(true);
  };

  // Filter tickets based on search term and status filter
  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      searchTerm === "" ||
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.building.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === null || ticket.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Get ticket counts by status
  const statusCounts = {
    Otevřený: tickets.filter((t) => t.status === "Otevřený").length,
    "Zpracovává se": tickets.filter((t) => t.status === "Zpracovává se").length,
    Vyřešený: tickets.filter((t) => t.status === "Vyřešený").length,
    Uzavřený: tickets.filter((t) => t.status === "Uzavřený").length,
  };

  // Get priority breakdown
  const priorityCounts = {
    Nízká: tickets.filter((t) => t.priority === "Nízká").length,
    Střední: tickets.filter((t) => t.priority === "Střední").length,
    Vysoká: tickets.filter((t) => t.priority === "Vysoká").length,
    Kritická: tickets.filter((t) => t.priority === "Kritická").length,
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Nízká":
        return "bg-green-100 text-green-800";
      case "Střední":
        return "bg-blue-100 text-blue-800";
      case "Vysoká":
        return "bg-orange-100 text-orange-800";
      case "Kritická":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Otevřený":
        return "bg-blue-100 text-blue-800";
      case "Zpracovává se":
        return "bg-yellow-100 text-yellow-800";
      case "Vyřešený":
        return "bg-green-100 text-green-800";
      case "Uzavřený":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <MainNavigation />
      
      <div className="container mx-auto py-6 px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Správa všech tiketů</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Celkem tiketů
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{tickets.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Otevřené tikety
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{statusCounts.Otevřený}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Zpracovává se
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-600">{statusCounts["Zpracovává se"]}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Vyřešené
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{statusCounts.Vyřešený}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Filtrovat podle stavu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button
                    variant={statusFilter === null ? "default" : "outline"} 
                    className="w-full justify-start"
                    onClick={() => setStatusFilter(null)}
                  >
                    Všechny ({tickets.length})
                  </Button>
                  <Button
                    variant={statusFilter === "Otevřený" ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setStatusFilter("Otevřený")}
                  >
                    Otevřené ({statusCounts.Otevřený})
                  </Button>
                  <Button
                    variant={statusFilter === "Zpracovává se" ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setStatusFilter("Zpracovává se")}
                  >
                    Zpracovává se ({statusCounts["Zpracovává se"]})
                  </Button>
                  <Button
                    variant={statusFilter === "Vyřešený" ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setStatusFilter("Vyřešený")}
                  >
                    Vyřešené ({statusCounts.Vyřešený})
                  </Button>
                  <Button
                    variant={statusFilter === "Uzavřený" ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setStatusFilter("Uzavřený")}
                  >
                    Uzavřené ({statusCounts.Uzavřený})
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Priorita</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Nízká</span>
                    <Badge variant="outline">{priorityCounts.Nízká}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Střední</span>
                    <Badge variant="outline">{priorityCounts.Střední}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Vysoká</span>
                    <Badge variant="outline">{priorityCounts.Vysoká}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Kritická</span>
                    <Badge variant="outline">{priorityCounts.Kritická}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <CardTitle>Seznam tiketů</CardTitle>
                  <div className="relative w-full sm:w-64">
                    <Input
                      placeholder="Vyhledat tikety..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-8"
                    />
                    <svg
                      className="absolute right-3 top-2.5 h-4 w-4 text-gray-400"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
                  </div>
                ) : filteredTickets.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Žádné tikety nenalezeny</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Nadpis</TableHead>
                          <TableHead>Priorita</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Budova</TableHead>
                          <TableHead>Akce</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTickets.map((ticket) => (
                          <TableRow key={ticket.id}>
                            <TableCell>{ticket.id}</TableCell>
                            <TableCell className="font-medium">{ticket.title}</TableCell>
                            <TableCell>
                              <Badge className={getPriorityColor(ticket.priority)}>
                                {ticket.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(ticket.status)}>
                                {ticket.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{ticket.building}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      className="h-4 w-4"
                                    >
                                      <circle cx="12" cy="12" r="1" />
                                      <circle cx="19" cy="12" r="1" />
                                      <circle cx="5" cy="12" r="1" />
                                    </svg>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Akce</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => handleViewDetails(ticket)}>
                                    Zobrazit detail
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuLabel>Změnit stav</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(ticket.id, "Otevřený")}>
                                    Otevřený
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(ticket.id, "Zpracovává se")}>
                                    Zpracovává se
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(ticket.id, "Vyřešený")}>
                                    Vyřešený
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(ticket.id, "Uzavřený")}>
                                    Uzavřený
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-700"
                                    onClick={() => handleDeleteTicket(ticket.id)}
                                  >
                                    Smazat tiket
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Ticket Details Dialog */}
        <Dialog open={ticketDetailsOpen} onOpenChange={setTicketDetailsOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Detail tiketu #{selectedTicket?.id}</DialogTitle>
              <DialogDescription>
                Vytvoření: {selectedTicket?.createdAt && new Date(selectedTicket.createdAt).toLocaleString()}
              </DialogDescription>
            </DialogHeader>

            {selectedTicket && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-sm text-gray-500">Základní informace</h3>
                    <div className="mt-2 space-y-2">
                      <div>
                        <Label className="text-xs">Nadpis</Label>
                        <p className="font-medium">{selectedTicket.title}</p>
                      </div>
                      <div>
                        <Label className="text-xs">Popis</Label>
                        <p className="text-sm">{selectedTicket.description}</p>
                      </div>
                      <div>
                        <Label className="text-xs">Kategorie</Label>
                        <p>{selectedTicket.category}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-sm text-gray-500">Stav a priorita</h3>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Status:</Label>
                        <Badge className={getStatusColor(selectedTicket.status)}>
                          {selectedTicket.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Priorita:</Label>
                        <Badge className={getPriorityColor(selectedTicket.priority)}>
                          {selectedTicket.priority}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-sm text-gray-500">Umístění</h3>
                    <div className="mt-2 space-y-2">
                      <div>
                        <Label className="text-xs">Budova</Label>
                        <p>{selectedTicket.building}</p>
                      </div>
                      <div>
                        <Label className="text-xs">Patro</Label>
                        <p>{selectedTicket.floor}</p>
                      </div>
                      <div>
                        <Label className="text-xs">Místnost</Label>
                        <p>{selectedTicket.room}</p>
                      </div>
                      <div>
                        <Label className="text-xs">Oblast</Label>
                        <p>{selectedTicket.area}</p>
                      </div>
                      <div>
                        <Label className="text-xs">Prvek</Label>
                        <p>{selectedTicket.element}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-sm text-gray-500">Přiřazení</h3>
                    <div className="mt-2 space-y-2">
                      <div>
                        <Label className="text-xs">Přiřazený zaměstnanec</Label>
                        <p>{selectedTicket.employeeAssigned}</p>
                      </div>
                      <div>
                        <Label className="text-xs">Manažer</Label>
                        <p>{selectedTicket.manager}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setTicketDetailsOpen(false)}>
                Zavřít
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}