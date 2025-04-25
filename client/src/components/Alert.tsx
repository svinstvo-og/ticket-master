import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface AlertProps {
  show: boolean;
  message: string;
  type: "success" | "error";
  onClose: () => void;
  autoHideDuration?: number;
}

export default function Alert({ 
  show, 
  message, 
  type = "success", 
  onClose,
  autoHideDuration = 5000 
}: AlertProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, autoHideDuration);
      
      return () => clearTimeout(timer);
    }
  }, [show, autoHideDuration, onClose]);
  
  if (!show) return null;
  
  return (
    <div 
      className={cn(
        "fixed top-4 right-4 max-w-sm w-full p-4 rounded shadow-md z-50 border-l-4",
        type === "success" 
          ? "bg-green-50 border-green-500" 
          : "bg-red-50 border-red-500"
      )}
      role="alert"
    >
      <div className="flex">
        <div className="flex-shrink-0">
          {type === "success" ? (
            <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <div className="ml-3">
          <p className={cn(
            "text-sm",
            type === "success" ? "text-green-700" : "text-red-700"
          )}>
            {message}
          </p>
        </div>
        <div className="ml-auto pl-3">
          <button 
            onClick={onClose}
            className={cn(
              "inline-flex focus:outline-none",
              type === "success" ? "text-green-700" : "text-red-700"
            )}
          >
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
