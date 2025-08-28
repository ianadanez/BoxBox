
import React, { useState, useEffect, useRef } from 'react';
import { Driver, Team } from '../../types';

interface DriverAutocompleteProps {
  id: string;
  value: string | null | undefined;
  onChange: (driverId: string | null) => void;
  drivers: Driver[];
  teams: Team[];
  disabled?: boolean;
  usedDrivers?: (string | null | undefined)[];
}

const DriverAutocomplete: React.FC<DriverAutocompleteProps> = ({
  id,
  value,
  onChange,
  drivers,
  teams,
  disabled = false,
  usedDrivers = [],
}) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<Driver[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const getTeamColor = (teamId: string) => teams.find(t => t.id === teamId)?.color || 'bg-gray-500';

  useEffect(() => {
    const selectedDriver = drivers.find(d => d.id === value);
    setInputValue(selectedDriver ? selectedDriver.name : '');
  }, [value, drivers]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        // Reset to current valid selection if user clicks away without choosing
        const selectedDriver = drivers.find(d => d.id === value);
        setInputValue(selectedDriver ? selectedDriver.name : '');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value, drivers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setInputValue(query);

    // Clear selection if text doesn't match a valid driver
    if (drivers.find(d => d.name.toLowerCase() === query.toLowerCase())?.id !== value) {
      onChange(null);
    }
    
    if (query.trim().length > 0) {
      const filtered = drivers.filter(driver =>
        driver.name.toLowerCase().includes(query.toLowerCase()) &&
        (!usedDrivers?.includes(driver.id) || driver.id === value)
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (driver: Driver) => {
    onChange(driver.id);
    setInputValue(driver.name);
    setShowSuggestions(false);
  };

  const handleFocus = () => {
     if (inputValue.trim().length > 0) {
       const filtered = drivers.filter(driver =>
        driver.name.toLowerCase().includes(inputValue.toLowerCase()) &&
        (!usedDrivers?.includes(driver.id) || driver.id === value)
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
     } else {
       // Show all available drivers if input is empty on focus
       const availableDrivers = drivers.filter(driver => !usedDrivers?.includes(driver.id) || driver.id === value);
       setSuggestions(availableDrivers);
       setShowSuggestions(true);
     }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        id={id}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        disabled={disabled}
        autoComplete="off"
        className="w-full bg-[var(--background-light)] border border-[var(--border-color)] rounded-md p-2.5 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-red)] focus:border-[var(--accent-red)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        placeholder="-- Buscar piloto --"
      />
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-[var(--background-medium)] border border-[var(--border-color)] rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map(driver => (
            <li
              key={driver.id}
              // Use onMouseDown to trigger before onBlur from the input
              onMouseDown={() => handleSuggestionClick(driver)}
              className="p-3 cursor-pointer hover:bg-[var(--background-light)] flex items-center space-x-3 transition-colors"
            >
              <div className={`w-1.5 h-8 rounded-full ${getTeamColor(driver.teamId)}`}></div>
               <div>
                  <p className="font-semibold text-white">{driver.name}</p>
                  <p className="text-xs text-gray-400">{teams.find(t => t.id === driver.teamId)?.name}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DriverAutocomplete;
