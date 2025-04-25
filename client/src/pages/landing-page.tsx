import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const { user, logoutMutation } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-blue-600">Ticket System</span>
            </div>
            
            {/* Desktop navigation */}
            <nav className="hidden md:flex space-x-8 items-center">
              <Link href="/" className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium">
                Domů
              </Link>
              
              {user ? (
                <>
                  <Link href="/tickets" className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium">
                    Moje tikety
                  </Link>
                  <Button 
                    onClick={() => logoutMutation.mutate()}
                    variant="outline"
                  >
                    Odhlásit se
                  </Button>
                </>
              ) : (
                <Link href="/auth">
                  <Button>Přihlásit se</Button>
                </Link>
              )}
            </nav>
            
            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button
                type="button"
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <span className="sr-only">Otevřít hlavní menu</span>
                {isMenuOpen ? (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="pt-2 pb-3 space-y-1">
              <Link href="/">
                <span className="text-gray-700 hover:bg-gray-50 block px-3 py-2 text-base font-medium">
                  Domů
                </span>
              </Link>
              
              {user ? (
                <>
                  <Link href="/tickets">
                    <span className="text-gray-700 hover:bg-gray-50 block px-3 py-2 text-base font-medium">
                      Moje tikety
                    </span>
                  </Link>
                  <button
                    onClick={() => logoutMutation.mutate()}
                    className="w-full text-left text-gray-700 hover:bg-gray-50 block px-3 py-2 text-base font-medium"
                  >
                    Odhlásit se
                  </button>
                </>
              ) : (
                <Link href="/auth">
                  <span className="text-gray-700 hover:bg-gray-50 block px-3 py-2 text-base font-medium">
                    Přihlásit se
                  </span>
                </Link>
              )}
            </div>
          </div>
        )}
      </header>
      
      {/* Hero section */}
      <main className="flex-grow">
        <div className="bg-gray-50">
          <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
                Systém pro Odeslání Tiketů
              </h1>
              <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-500">
                Jednoduchý a efektivní způsob, jak nahlásit a sledovat problémy ve vaší organizaci.
              </p>
              <div className="mt-10 flex justify-center">
                {user ? (
                  <Link href="/tickets">
                    <Button className="px-8 py-3 text-base font-medium">
                      Zobrazit moje tikety
                    </Button>
                  </Link>
                ) : (
                  <Link href="/auth">
                    <Button className="px-8 py-3 text-base font-medium">
                      Začít
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Features */}
        <div className="py-12 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="lg:text-center">
              <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">Funkce</h2>
              <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                Jednoduchý způsob hlášení problémů
              </p>
              <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
                Náš systém poskytuje uživatelům mnoho funkcí pro snadné hlášení a sledování problémů.
              </p>
            </div>

            <div className="mt-10">
              <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-3 md:gap-x-8 md:gap-y-10">
                <div className="relative">
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div className="ml-16">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Snadné odesílání tiketů</h3>
                    <p className="mt-2 text-base text-gray-500">
                      Vytvářejte a odesílejte tikety rychle a jednoduše pomocí našeho formuláře.
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="ml-16">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">QR kódy pro rychlé zadání</h3>
                    <p className="mt-2 text-base text-gray-500">
                      Naskenujte QR kód pro automatické vyplnění údajů o budově a zařízení.
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="ml-16">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Sledování stavu</h3>
                    <p className="mt-2 text-base text-gray-500">
                      Sledujte stav vašich tiketů a dostávejte aktualizace o jejich řešení.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-800">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-base text-gray-400">
              &copy; 2025 Ticket Submission System. Všechna práva vyhrazena.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}