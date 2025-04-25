import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useUsers } from "@/hooks/use-users";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UpdateUser, passwordChangeSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, UserCheck, UserX } from "lucide-react";

// Schema for the profile edit form
const profileFormSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email address"),
  department: z.string().optional(),
  role: z.string().optional()
});

// Schema for password change form
const passwordFormSchema = passwordChangeSchema;

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

// Get initials from name for avatar
function getInitials(name: string): string {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

// Get localized role name
function getRoleDisplayName(role: string): string {
  switch (role) {
    case 'user':
      return 'Uživatel';
    case 'admin':
      return 'Admin';
    case 'manager':
      return 'Vedoucí oddělení';
    case 'technician':
      return 'Technik';
    default:
      return role;
  }
}

export default function UserProfilePage() {
  const { user, isLoading: isAuthLoading, logoutMutation } = useAuth();
  const { getUserById, updateUserMutation, changePasswordMutation, resetPasswordMutation, setUserStatusMutation, users, isLoadingUsers } = useUsers();
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("profile");

  // Get current user details (may contain more info than the auth context)
  const {
    data: currentUserDetails,
    isLoading: isUserDetailsLoading
  } = getUserById(user?.id || 0);

  // Get selected user details (for admin section)
  const {
    data: selectedUserDetails,
    isLoading: isSelectedUserLoading
  } = getUserById(selectedUserId || 0);

  const isLoading = isAuthLoading || isUserDetailsLoading;
  const isAdmin = user?.role === "admin";

  // Profile edit form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: currentUserDetails?.fullName || "",
      email: currentUserDetails?.email || "",
      department: currentUserDetails?.department || "",
      role: currentUserDetails?.role || "user"
    },
    values: {
      fullName: currentUserDetails?.fullName || "",
      email: currentUserDetails?.email || "",
      department: currentUserDetails?.department || "",
      role: currentUserDetails?.role || "user"
    }
  });

  // Admin user edit form
  const adminUserForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: selectedUserDetails?.fullName || "",
      email: selectedUserDetails?.email || "",
      department: selectedUserDetails?.department || "",
      role: selectedUserDetails?.role || "user"
    },
    values: {
      fullName: selectedUserDetails?.fullName || "",
      email: selectedUserDetails?.email || "",
      department: selectedUserDetails?.department || "",
      role: selectedUserDetails?.role || "user"
    }
  });

  // Password change form
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      oldPassword: "",
      newPassword: ""
    }
  });

  // Handle profile update
  const onProfileSubmit = (data: ProfileFormValues) => {
    if (!user) return;
    
    updateUserMutation.mutate({
      id: user.id,
      userData: data
    });
  };

  // Handle admin user update
  const onAdminUserSubmit = (data: ProfileFormValues) => {
    if (!selectedUserId) return;
    
    updateUserMutation.mutate({
      id: selectedUserId,
      userData: data
    });
  };

  // Handle password change
  const onPasswordSubmit = (data: PasswordFormValues) => {
    if (!user) return;
    
    changePasswordMutation.mutate({
      id: user.id,
      passwordData: data
    }, {
      onSuccess: () => {
        passwordForm.reset();
      }
    });
  };

  // Handle password reset
  const handlePasswordReset = () => {
    if (!selectedUserId) return;
    
    resetPasswordMutation.mutate(selectedUserId);
  };

  // Handle user activation/deactivation
  const handleSetUserStatus = (active: boolean) => {
    if (!selectedUserId) return;
    
    setUserStatusMutation.mutate({
      id: selectedUserId,
      isActive: active
    });
  };

  // If not authenticated, show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If no user, redirect handled by ProtectedRoute
  
  return (
    <div>
      {/* Navigation Header */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/">
                <span className="text-xl font-bold text-blue-600 cursor-pointer">
                  TechTicket
                </span>
              </Link>
              
              <nav className="hidden md:ml-10 md:flex items-center space-x-8">
                <Link href="/dashboard">
                  <span className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium cursor-pointer">
                    Dashboard
                  </span>
                </Link>
                <Link href="/tickets">
                  <span className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium cursor-pointer">
                    Nový Tiket
                  </span>
                </Link>
                <Link href="/profile">
                  <span className="text-blue-600 px-3 py-2 text-sm font-medium cursor-pointer border-b-2 border-blue-600">
                    Můj Profil
                  </span>
                </Link>
              </nav>
            </div>
            
            <div className="hidden md:flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {user?.username}
              </div>
              <Button variant="outline" size="sm" onClick={() => logoutMutation.mutate()}>
                Odhlásit se
              </Button>
            </div>
            
            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <Button variant="ghost" size="sm" className="text-gray-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6"
                >
                  <line x1="4" x2="20" y1="12" y2="12" />
                  <line x1="4" x2="20" y1="6" y2="6" />
                  <line x1="4" x2="20" y1="18" y2="18" />
                </svg>
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto py-10 px-4 sm:px-6">
        <h1 className="text-3xl font-bold mb-6">Uživatelský profil</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="profile">Můj profil</TabsTrigger>
            <TabsTrigger value="password">Změna hesla</TabsTrigger>
            {isAdmin && <TabsTrigger value="admin">Správa uživatelů</TabsTrigger>}
          </TabsList>
        
          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Informace o profilu</CardTitle>
                <CardDescription>
                  Aktualizujte své osobní údaje a nastavení
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-8 mb-8">
                  <div className="flex flex-col items-center justify-center">
                    <Avatar className="h-24 w-24 mb-4">
                      <AvatarFallback className="text-xl">
                        {getInitials(currentUserDetails?.fullName || user?.username || '')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                      <p className="text-lg font-semibold">{currentUserDetails?.fullName || user?.username}</p>
                      <Badge variant="outline" className="mt-1">
                        {getRoleDisplayName(currentUserDetails?.role || 'user')}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <Form {...profileForm}>
                      <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                        <FormField
                          control={profileForm.control}
                          name="fullName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Celé jméno</FormLabel>
                              <FormControl>
                                <Input placeholder="Zadejte vaše celé jméno" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={profileForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="Zadejte váš email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={profileForm.control}
                          name="department"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Oddělení</FormLabel>
                              <FormControl>
                                <Input placeholder="Zadejte vaše oddělení" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button 
                          type="submit" 
                          disabled={updateUserMutation.isPending}
                          className="w-full sm:w-auto"
                        >
                          {updateUserMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Uložit změny
                        </Button>
                      </form>
                    </Form>
                  </div>
                </div>
                
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-2">Informace o účtu</h3>
                  <Separator className="mb-4" />
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Uživatelské jméno:</span>
                      <span className="font-medium">{user?.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Stav účtu:</span>
                      <span className="font-medium">
                        {currentUserDetails?.isActive ? (
                          <span className="flex items-center text-green-600">
                            <UserCheck className="h-4 w-4 mr-1" /> Aktivní
                          </span>
                        ) : (
                          <span className="flex items-center text-red-600">
                            <UserX className="h-4 w-4 mr-1" /> Neaktivní
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vytvořeno:</span>
                      <span className="font-medium">
                        {currentUserDetails?.createdAt ? new Date(currentUserDetails.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Password Tab */}
          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle>Změna hesla</CardTitle>
                <CardDescription>
                  Aktualizujte své heslo pro zachování bezpečnosti účtu
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                    <FormField
                      control={passwordForm.control}
                      name="oldPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Aktuální heslo</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Zadejte vaše aktuální heslo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nové heslo</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Zadejte nové heslo" {...field} />
                          </FormControl>
                          <FormDescription>
                            Heslo musí mít alespoň 6 znaků
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      disabled={changePasswordMutation.isPending}
                      className="w-full sm:w-auto"
                    >
                      {changePasswordMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Aktualizovat heslo
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Admin Tab (only visible to admins) */}
          {isAdmin && (
            <TabsContent value="admin">
              <Card>
                <CardHeader>
                  <CardTitle>Správa uživatelů</CardTitle>
                  <CardDescription>
                    Správa uživatelů, rolí a přístupových oprávnění
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* User List */}
                    <div className="lg:col-span-1 border rounded-lg p-4">
                      <h3 className="text-lg font-medium mb-4">Uživatelé</h3>
                      {isLoadingUsers ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : (
                        <ScrollArea className="h-[400px]">
                          <div className="space-y-2 pr-4">
                            {users.map((u) => (
                              <div 
                                key={u.id}
                                className={`flex items-center justify-between p-3 rounded-md cursor-pointer hover:bg-accent ${
                                  selectedUserId === u.id ? 'bg-accent' : ''
                                }`}
                                onClick={() => setSelectedUserId(u.id)}
                              >
                                <div className="flex items-center space-x-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="text-xs">
                                      {getInitials(u.fullName || u.username)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{u.fullName || u.username}</p>
                                    <p className="text-xs text-muted-foreground">{getRoleDisplayName(u.role || 'user')}</p>
                                  </div>
                                </div>
                                {!u.isActive && (
                                  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                                    Neaktivní
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </div>
                    
                    {/* User Details & Edit */}
                    <div className="lg:col-span-2">
                      {selectedUserId && selectedUserDetails ? (
                        <div>
                          <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-medium">Upravit uživatele</h3>
                            <div className="flex space-x-2">
                              {/* Password Reset Dialog */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm">Resetovat heslo</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Resetování hesla uživatele</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tato akce vygeneruje nové dočasné heslo pro uživatele.
                                      Uživatel si bude muset heslo změnit při příštím přihlášení. Opravdu chcete pokračovat?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Zrušit</AlertDialogCancel>
                                    <AlertDialogAction onClick={handlePasswordReset}>Resetovat heslo</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              
                              {/* User Activation/Deactivation Dialog */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant={selectedUserDetails.isActive ? "destructive" : "default"}
                                    size="sm"
                                  >
                                    {selectedUserDetails.isActive ? "Deaktivovat uživatele" : "Aktivovat uživatele"}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      {selectedUserDetails.isActive ? "Deaktivace uživatelského účtu" : "Aktivace uživatelského účtu"}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {selectedUserDetails.isActive 
                                        ? "Tato akce zabrání uživateli v přihlášení a přístupu do systému. Opravdu chcete deaktivovat tento účet?"
                                        : "Tato akce umožní uživateli znovu se přihlásit a přistupovat do systému. Opravdu chcete aktivovat tento účet?"}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Zrušit</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleSetUserStatus(!selectedUserDetails.isActive)}
                                    >
                                      {selectedUserDetails.isActive ? "Deaktivovat" : "Aktivovat"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                          
                          <Form {...adminUserForm}>
                            <form onSubmit={adminUserForm.handleSubmit(onAdminUserSubmit)} className="space-y-6">
                              <FormField
                                control={adminUserForm.control}
                                name="fullName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Celé jméno</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Zadejte celé jméno" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={adminUserForm.control}
                                name="email"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                      <Input type="email" placeholder="Zadejte email" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                  control={adminUserForm.control}
                                  name="department"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Oddělení</FormLabel>
                                      <FormControl>
                                        <Input placeholder="Zadejte oddělení" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={adminUserForm.control}
                                  name="role"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Role</FormLabel>
                                      <Select 
                                        onValueChange={field.onChange} 
                                        defaultValue={field.value}
                                        value={field.value}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Vyberte roli" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="user">Uživatel</SelectItem>
                                          <SelectItem value="admin">Admin</SelectItem>
                                          <SelectItem value="manager">Vedoucí oddělení</SelectItem>
                                          <SelectItem value="technician">Technik</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              
                              <Button 
                                type="submit" 
                                disabled={updateUserMutation.isPending}
                              >
                                {updateUserMutation.isPending && (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Uložit změny
                              </Button>
                            </form>
                          </Form>
                          
                          {/* User Info */}
                          <div className="mt-8">
                            <h3 className="text-lg font-medium mb-2">Informace o účtu</h3>
                            <Separator className="mb-4" />
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Uživatelské jméno:</span>
                                <span className="font-medium">{selectedUserDetails.username}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Stav účtu:</span>
                                <span className={`font-medium ${selectedUserDetails.isActive ? 'text-green-600' : 'text-red-600'}`}>
                                  {selectedUserDetails.isActive ? 'Aktivní' : 'Neaktivní'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Vytvořeno:</span>
                                <span className="font-medium">
                                  {selectedUserDetails.createdAt ? new Date(selectedUserDetails.createdAt).toLocaleDateString() : 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full py-12">
                          <p className="text-muted-foreground text-center mb-4">
                            Vyberte uživatele ze seznamu pro zobrazení a úpravu jeho údajů
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}