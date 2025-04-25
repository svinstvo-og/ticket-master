import { useState } from "react";

interface PrioritySelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function PrioritySelector({ value, onChange }: PrioritySelectorProps) {
  const [selectedPriority, setSelectedPriority] = useState(value || "Low");

  const handlePriorityChange = (priority: string) => {
    setSelectedPriority(priority);
    onChange(priority);
  };

  const getPriorityClass = (priority: string) => {
    const baseClass = priority === "Low" 
      ? "priority-low" 
      : priority === "Medium" 
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
          value="Low" 
          checked={selectedPriority === "Low"} 
          onChange={() => handlePriorityChange("Low")} 
          className="hidden" 
        />
        <span className={getPriorityClass("Low")}>Low</span>
      </label>
      
      <label className="flex items-center">
        <input 
          type="radio" 
          name="priority" 
          value="Medium" 
          checked={selectedPriority === "Medium"} 
          onChange={() => handlePriorityChange("Medium")} 
          className="hidden" 
        />
        <span className={getPriorityClass("Medium")}>Medium</span>
      </label>
      
      <label className="flex items-center">
        <input 
          type="radio" 
          name="priority" 
          value="High" 
          checked={selectedPriority === "High"}
          onChange={() => handlePriorityChange("High")} 
          className="hidden" 
        />
        <span className={getPriorityClass("High")}>High</span>
      </label>
    </div>
  );
}
