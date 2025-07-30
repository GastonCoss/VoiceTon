'use client';

import { Dispatch, SetStateAction } from 'react';

export type Lead = {
  prénom?: string;
  nom?: string;
  poste?: string;
  entreprise?: string;
  email?: string;
  téléphone?: string;
};

type Props = {
  leads: Lead[];
  setLeads: Dispatch<SetStateAction<Lead[]>>;
};

export default function LeadTable({ leads, setLeads }: Props) {
  const updateLead = (index: number, field: keyof Lead, value: string) => {
    const updatedLeads = [...leads];
    updatedLeads[index][field] = value;
    setLeads(updatedLeads);
  };

  return (
    <div className="overflow-x-auto mt-6">
      <table className="min-w-full table-auto border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-4 py-2">Prénom</th>
            <th className="border px-4 py-2">Nom</th>
            <th className="border px-4 py-2">Poste</th>
            <th className="border px-4 py-2">Entreprise</th>
            <th className="border px-4 py-2">Email</th>
            <th className="border px-4 py-2">Téléphone</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead, index) => (
            <tr key={index}>
              {(['prénom', 'nom', 'poste', 'entreprise', 'email', 'téléphone'] as (keyof Lead)[]).map((field) => (
                <td key={field} className="border px-4 py-2">
                  <input
                    type="text"
                    value={lead[field] || ''}
                    onChange={(e) => updateLead(index, field, e.target.value)}
                    className="w-full p-1 border rounded"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
