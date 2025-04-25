import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export default function MainNavigation() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (!user) return null;

  return (
    <div className="bg-white border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/">
              <span className="text-xl font-bold text-blue-600 cursor-pointer">
                TechTicket
              </span>
            </Link>
            <nav className="hidden md:ml-10 md:flex items-center space-x-4">
              <NavLink href="/dashboard" isActive={location === "/dashboard"}>
                Dashboard
              </NavLink>
              <NavLink href="/tickets" isActive={location === "/tickets"}>
                Nový Tiket
              </NavLink>
            </nav>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              {user.username}
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Odhlásit se
            </Button>
          </div>

          {/* Mobile Navigation */}
          <div className="flex md:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
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
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>TechTicket</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col space-y-4 mt-6">
                  <MobileNavLink 
                    href="/dashboard" 
                    isActive={location === "/dashboard"}
                    onClick={() => setMobileOpen(false)}
                  >
                    Dashboard
                  </MobileNavLink>
                  <MobileNavLink 
                    href="/tickets" 
                    isActive={location === "/tickets"}
                    onClick={() => setMobileOpen(false)}
                  >
                    Nový Tiket
                  </MobileNavLink>
                  <div className="pt-4 mt-4 border-t">
                    <div className="text-sm text-gray-600 mb-2">
                      Přihlášen jako: {user.username}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        handleLogout();
                        setMobileOpen(false);
                      }}
                    >
                      Odhlásit se
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavLink({ href, children, isActive }: { href: string; children: React.ReactNode; isActive?: boolean }) {
  return (
    <Link href={href}>
      <span className={`px-3 py-2 text-sm font-medium rounded-md cursor-pointer ${
        isActive
          ? "bg-blue-50 text-blue-600"
          : "text-gray-700 hover:bg-gray-100"
      }`}>
        {children}
      </span>
    </Link>
  );
}

function MobileNavLink({ 
  href, 
  children, 
  isActive, 
  onClick 
}: { 
  href: string; 
  children: React.ReactNode; 
  isActive?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link href={href}>
      <span
        className={`block px-3 py-2 text-base font-medium rounded-md cursor-pointer ${
          isActive
            ? "bg-blue-50 text-blue-600"
            : "text-gray-700 hover:bg-gray-100"
        }`}
        onClick={onClick}
      >
        {children}
      </span>
    </Link>
  );
}