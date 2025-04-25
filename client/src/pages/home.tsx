import { useState } from "react";
import TicketForm from "@/components/TicketForm";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export default function Home() {
  const [submitted, setSubmitted] = useState(false);
  const { user, logoutMutation } = useAuth();
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Simple header */}
      <header className="bg-white border-b border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex-shrink-0 flex items-center">
            <Link href="/">
              <span className="cursor-pointer text-xl font-bold text-blue-600">Ticket System</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {user && (
              <span className="text-sm text-gray-600">
                Přihlášen jako: <span className="font-medium">{user.username}</span>
              </span>
            )}
            <Button 
              variant="outline"
              onClick={() => logoutMutation.mutate()}
            >
              Odhlásit se
            </Button>
          </div>
        </div>
      </header>
      
      <div className="flex-grow flex items-center justify-center px-4 py-8">
        {submitted ? (
          <Card className="w-full max-w-3xl mx-auto overflow-hidden">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-green-100 rounded-full mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Tiket byl úspěšně odeslán!</h2>
                <p className="text-gray-600 mb-6">Váš tiket byl odeslán a bude brzy zpracován.</p>
                <Button
                  onClick={() => setSubmitted(false)}
                >
                  Odeslat další tiket
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <TicketForm onSubmitSuccess={() => setSubmitted(true)} />
        )}
      </div>
    </div>
  );
}
