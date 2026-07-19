import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export type PrinterMake = 'Bambulab' | 'Elegoo';

export function getMakeForModel(code: string, name?: string): PrinterMake {
  if (!code) return 'Bambulab';
  if (code.startsWith('EG-') || (name && (name.includes('Centauri') || name.includes('Elegoo')))) {
    return 'Elegoo';
  }
  return 'Bambulab';
}

interface MakeModelSelectorProps {
  models: Record<string, string>;
  value: string;
  onChange: (modelCode: string) => void;
  disabled?: boolean;
}

export function MakeModelSelector({ models, value, onChange, disabled }: MakeModelSelectorProps) {
  const [selectedMake, setSelectedMake] = useState<PrinterMake>(() =>
    getMakeForModel(value, models[value])
  );

  useEffect(() => {
    if (value && models[value]) {
      const currentMake = getMakeForModel(value, models[value]);
      if (currentMake !== selectedMake) {
        setSelectedMake(currentMake);
      }
    }
  }, [value, models]);

  // Group models by Make
  const bambuModels = Object.entries(models).filter(
    ([code, name]) => getMakeForModel(code, name) === 'Bambulab'
  );
  const elegooModels = Object.entries(models).filter(
    ([code, name]) => getMakeForModel(code, name) === 'Elegoo'
  );

  const availableModelsForMake = selectedMake === 'Elegoo' ? elegooModels : bambuModels;

  const handleMakeChange = (make: PrinterMake) => {
    setSelectedMake(make);
    const targetModels = make === 'Elegoo' ? elegooModels : bambuModels;
    if (targetModels.length > 0) {
      onChange(targetModels[0][0]);
    }
  };

  return (
    <div className="space-y-3">
      {/* 1. Printer Make Select */}
      <div>
        <label className="text-xs text-bambu-gray font-medium block mb-1">
          Printer Make
        </label>
        <div className="relative">
          <select
            value={selectedMake}
            onChange={(e) => handleMakeChange(e.target.value as PrinterMake)}
            disabled={disabled}
            className="w-full bg-bambu-dark-secondary border border-bambu-dark-tertiary rounded-md px-3 py-1.5 text-white text-sm appearance-none cursor-pointer disabled:opacity-50 pr-10"
          >
            <option value="Bambulab">Bambulab</option>
            <option value="Elegoo">Elegoo</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bambu-gray pointer-events-none" />
        </div>
      </div>

      {/* 2. Supported Printer Model Select */}
      <div>
        <label className="text-xs text-bambu-gray font-medium block mb-1">
          Supported Model ({selectedMake})
        </label>
        <div className="relative">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full bg-bambu-dark-secondary border border-bambu-dark-tertiary rounded-md px-3 py-1.5 text-white text-sm appearance-none cursor-pointer disabled:opacity-50 pr-10"
          >
            {availableModelsForMake.map(([code, name]) => (
              <option key={code} value={code}>
                {name} ({code})
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bambu-gray pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
