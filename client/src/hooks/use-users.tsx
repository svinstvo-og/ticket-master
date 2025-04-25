import { useQuery, useMutation, UseMutationResult } from "@tanstack/react-query";
import { User, UpdateUser, PasswordChange } from "@shared/schema";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type UserWithoutPassword = Omit<User, "password">;

export function useUsers() {
  const { toast } = useToast();

  // Get all users (admin only)
  const { 
    data: users = [], 
    isLoading: isLoadingUsers,
    error: usersError,
    refetch: refetchUsers
  } = useQuery<UserWithoutPassword[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      return await res.json();
    },
    enabled: true, // This will automatically be filtered on the server side if not admin
  });

  // Get a specific user
  const getUserById = (id: number) => {
    return useQuery<UserWithoutPassword>({
      queryKey: ["/api/users", id],
      queryFn: async () => {
        const res = await apiRequest("GET", `/api/users/${id}`);
        return await res.json();
      }
    });
  };

  // Update user profile
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, userData }: { id: number, userData: Partial<UpdateUser> }) => {
      const res = await apiRequest("PATCH", `/api/users/${id}`, userData);
      return await res.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", updatedUser.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      toast({
        title: "Profile Updated",
        description: "User profile has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Change password (own user only)
  const changePasswordMutation = useMutation({
    mutationFn: async ({ id, passwordData }: { id: number, passwordData: PasswordChange }) => {
      const res = await apiRequest("POST", `/api/users/${id}/change-password`, passwordData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Updated",
        description: "Your password has been successfully changed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Password Change Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Reset password (admin only)
  const resetPasswordMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/users/${id}/reset-password`);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Password Reset",
        description: `The user's password has been reset. Temporary password: ${data.temporaryPassword}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Password Reset Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Set user active status (admin only)
  const setUserStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number, isActive: boolean }) => {
      const res = await apiRequest("POST", `/api/users/${id}/set-active`, { isActive });
      return await res.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", updatedUser.id] });
      
      toast({
        title: updatedUser.isActive ? "User Activated" : "User Deactivated",
        description: `User has been ${updatedUser.isActive ? "activated" : "deactivated"} successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Status Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  return {
    users,
    isLoadingUsers,
    usersError,
    refetchUsers,
    getUserById,
    updateUserMutation,
    changePasswordMutation,
    resetPasswordMutation,
    setUserStatusMutation
  };
}