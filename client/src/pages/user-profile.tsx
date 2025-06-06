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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

export default function UserProfilePage() {
  const { user, isLoading: isAuthLoading } = useAuth();
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

  const { logoutMutation } = useAuth();
  
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
        <h1 className="text-3xl font-bold mb-6">User Profile</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="profile">My Profile</TabsTrigger>
            <TabsTrigger value="password">Change Password</TabsTrigger>
            {isAdmin && <TabsTrigger value="admin">User Management</TabsTrigger>}
          </TabsList>
        
        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and settings
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
                      {currentUserDetails?.role || 'user'}
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
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your full name" {...field} />
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
                              <Input type="email" placeholder="Enter your email" {...field} />
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
                            <FormLabel>Department</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your department" {...field} />
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
                        Save Changes
                      </Button>
                    </form>
                  </Form>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-2">Account Information</h3>
                <Separator className="mb-4" />
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Username:</span>
                    <span className="font-medium">{user?.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account Status:</span>
                    <span className="font-medium">
                      {currentUserDetails?.isActive ? (
                        <span className="flex items-center text-green-600">
                          <UserCheck className="h-4 w-4 mr-1" /> Active
                        </span>
                      ) : (
                        <span className="flex items-center text-red-600">
                          <UserX className="h-4 w-4 mr-1" /> Inactive
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
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
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
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
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter your current password" {...field} />
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
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter your new password" {...field} />
                        </FormControl>
                        <FormDescription>
                          Password must be at least 6 characters long
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
                    Update Password
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
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage users, roles, and access control
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* User List */}
                  <div className="lg:col-span-1 border rounded-lg p-4">
                    <h3 className="text-lg font-medium mb-4">Users</h3>
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
                                  <p className="text-xs text-muted-foreground">{u.role}</p>
                                </div>
                              </div>
                              {!u.isActive && (
                                <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                                  Inactive
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
                          <h3 className="text-lg font-medium">Edit User</h3>
                          <div className="flex space-x-2">
                            {/* Password Reset Dialog */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">Reset Password</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Reset User Password</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will generate a new temporary password for the user. 
                                    They will need to change it upon logging in. Are you sure you want to proceed?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={handlePasswordReset}>Reset Password</AlertDialogAction>
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
                                  {selectedUserDetails.isActive ? "Deactivate User" : "Activate User"}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    {selectedUserDetails.isActive ? "Deactivate User Account" : "Activate User Account"}
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {selectedUserDetails.isActive 
                                      ? "This will prevent the user from logging in and accessing the system. Are you sure you want to deactivate this account?"
                                      : "This will allow the user to log in and access the system again. Are you sure you want to activate this account?"}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleSetUserStatus(!selectedUserDetails.isActive)}
                                  >
                                    {selectedUserDetails.isActive ? "Deactivate" : "Activate"}
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
                                  <FormLabel>Full Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Enter full name" {...field} />
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
                                    <Input type="email" placeholder="Enter email" {...field} />
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
                                    <FormLabel>Department</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Enter department" {...field} />
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
                                          <SelectValue placeholder="Select a role" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="user">User</SelectItem>
                                        <SelectItem value="manager">Manager</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
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
                              Save Changes
                            </Button>
                          </form>
                        </Form>
                        
                        {/* User Info */}
                        <div className="mt-8">
                          <h3 className="text-lg font-medium mb-2">Account Information</h3>
                          <Separator className="mb-4" />
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Username:</span>
                              <span className="font-medium">{selectedUserDetails.username}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Account Status:</span>
                              <span className={`font-medium ${selectedUserDetails.isActive ? 'text-green-600' : 'text-red-600'}`}>
                                {selectedUserDetails.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Created:</span>
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
                          Select a user from the list to view and edit their details
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
  );
}