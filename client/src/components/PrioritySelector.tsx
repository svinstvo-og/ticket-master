import { useState } from "react";

interface PrioritySelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function PrioritySelector({ value, onChange }: PrioritySelectorProps) {
  const [selectedPriority, setSelectedPriority] = useState(value || "Nízká");

  const handlePriorityChange = (priority: string) => {
    setSelectedPriority(priority);
    onChange(priority);
  };

  const getPriorityClass = (priority: string) => {
    const baseClass = priority === "Nízká" 
      ? "priority-low" 
      : priority === "Střední" 
        ? "priority-medium" 
        : "priority-high";
        
    return `${baseClass} text-sm px-3 py-1 rounded-full cursor-pointer ${selectedPriority === priority ? 'priority-selected' : ''}`;
  };

  return (
    <div className="flex items-center space-x-3">
      <label className="flex items-center">
        <input 
          type="radio" 
          name="priority" 
          value="Nízká" 
          checked={selectedPriority === "Nízká"} 
          onChange={() => handlePriorityChange("Nízká")} 
          className="hidden" 
        />
        <span className={getPriorityClass("Nízká")}>Nízká</span>
      </label>
      
      <label className="flex items-center">
        <input 
          type="radio" 
          name="priority" 
          value="Střední" 
          checked={selectedPriority === "Střední"} 
          onChange={() => handlePriorityChange("Střední")} 
          className="hidden" 
        />
        <span className={getPriorityClass("Střední")}>Střední</span>
      </label>
      
      <label className="flex items-center">
        <input 
          type="radio" 
          name="priority" 
          value="Vysoká" 
          checked={selectedPriority === "Vysoká"}
          onChange={() => handlePriorityChange("Vysoká")} 
          className="hidden" 
        />
        <span className={getPriorityClass("Vysoká")}>Vysoká</span>
      </label>
    </div>
  );
}
