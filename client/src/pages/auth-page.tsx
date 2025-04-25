import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Extend the schema with validation rules
const loginFormSchema = insertUserSchema
  .extend({
    username: z.string().min(3, {
      message: "Uživatelské jméno musí mít alespoň 3 znaky",
    }),
    password: z.string().min(6, {
      message: "Heslo musí mít alespoň 6 znaků",
    }),
  });

const registerFormSchema = insertUserSchema
  .extend({
    username: z.string().min(3, {
      message: "Uživatelské jméno musí mít alespoň 3 znaky",
    }),
    password: z.string().min(6, {
      message: "Heslo musí mít alespoň 6 znaků",
    }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hesla se neshodují",
    path: ["confirmPassword"],
  });

type LoginFormValues = z.infer<typeof loginFormSchema>;
type RegisterFormValues = z.infer<typeof registerFormSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("login");
  const [location, navigate] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();

  // If user is already logged in, redirect to home page
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  function onLoginSubmit(data: LoginFormValues) {
    loginMutation.mutate(data);
  }

  function onRegisterSubmit(data: RegisterFormValues) {
    const { confirmPassword, ...registerData } = data;
    registerMutation.mutate(registerData);
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left column - Auth form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Ticket Submission System
            </CardTitle>
            <CardDescription className="text-center">
              Přihlaste se nebo si vytvořte účet pro odeslání tiketu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              defaultValue="login"
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Přihlášení</TabsTrigger>
                <TabsTrigger value="register">Registrace</TabsTrigger>
              </TabsList>
              
              {/* Login Form */}
              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Uživatelské jméno</FormLabel>
                          <FormControl>
                            <Input placeholder="zadejte uživatelské jméno" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Heslo</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="zadejte heslo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Přihlašování..." : "Přihlásit se"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              {/* Register Form */}
              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Uživatelské jméno</FormLabel>
                          <FormControl>
                            <Input placeholder="zadejte uživatelské jméno" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Heslo</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="zadejte heslo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Potvrzení hesla</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="potvrzení hesla" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Vytváření účtu..." : "Vytvořit účet"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              {activeTab === "login" ? (
                "Nemáte účet? "
              ) : (
                "Již máte účet? "
              )}
              <Button
                variant="link"
                className="p-0 h-auto font-normal"
                onClick={() => setActiveTab(activeTab === "login" ? "register" : "login")}
              >
                {activeTab === "login" ? "Registrujte se" : "Přihlaste se"}
              </Button>
            </p>
          </CardFooter>
        </Card>
      </div>
      
      {/* Right column - Hero section */}
      <div className="flex-1 bg-blue-600 p-6 flex flex-col justify-center">
        <div className="max-w-md mx-auto text-white">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Systém pro odesílání tiketů
          </h1>
          <p className="text-lg mb-6">
            Jednoduchý a efektivní způsob, jak nahlásit problémy a sledovat jejich řešení.
          </p>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="bg-blue-500 p-2 rounded mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-xl">Snadné odesílání tiketů</h3>
                <p>Vytvářejte a odesílejte tikety rychle a jednoduše pomocí našeho formuláře.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-blue-500 p-2 rounded mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-xl">QR kódy pro rychlé zadání</h3>
                <p>Naskenujte QR kód pro automatické vyplnění údajů o budově a zařízení.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-blue-500 p-2 rounded mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-xl">Přehledný systém</h3>
                <p>Sledujte stav vašich tiketů a dostávejte aktualizace o jejich řešení.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}