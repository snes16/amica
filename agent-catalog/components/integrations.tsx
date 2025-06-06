import { Check, X } from "lucide-react";

interface AgentIntegrationsProps {
  integrations: {
    brain?: string;
    virtuals?: string;
    eacc?: string;
    uos?: string;
  };
}

const INTEGRATION_INFO = [
  { key: "brain", name: "Amica Brain" },
  { key: "virtuals", name: "Virtuals" },
  { key: "eacc", name: "EACC Marketplace" },
  { key: "uos", name: "UOS" },
] as const;

export function Integrations({ integrations }: AgentIntegrationsProps) {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <h2 className="text-2xl font-orbitron mb-6 text-gray-800">Integrations</h2>
      <div className="grid grid-cols-2 gap-4">
        {INTEGRATION_INFO.map(({ key, name }) => {
          const isActive = !!integrations[key];
          return (
            <div
              key={key}
              className={`p-4 rounded-lg border ${
                isActive ? "border-green-500 bg-green-50" : "border-gray-300 bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-roboto-mono text-sm">{name}</span>
                {isActive ? (
                  <Check className="text-green-500" size={20} />
                ) : (
                  <X className="text-gray-400" size={20} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
