
import React from 'react';
import { BellowsPart } from '../types';

interface SpecsTableProps {
  part: BellowsPart | null;
}

const SpecsTable: React.FC<SpecsTableProps> = ({ part }) => {
  if (!part) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg">
        <p className="text-gray-400 font-light">Select a part number to view specifications</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200 mt-6">
      <div className="bg-white px-6 py-4 border-b border-gray-100">
        <h3 className="text-sm font-bold text-[#C80A37] uppercase tracking-wider">Technical Specifications</h3>
      </div>
      <div className="p-0">
        <table className="min-w-full divide-y divide-gray-100">
          <tbody className="bg-white divide-y divide-gray-100 text-sm">
             {[
               { label: "Bellows ID", value: `${part.bellows_id_in}"` },
               { label: "Bellows OD", value: `${part.bellows_od_in}"` },
               { label: "Live Length", value: `${part.live_length_ll_in}"` },
               { label: "Axial Spring Rate", value: `${part.axial_spring_rate_lbf_in} lbf/in` },
               { label: "Lateral Spring Rate", value: `${part.lateral_spring_rate_lbf_in} lbf/in` },
               { label: "Angular Spring Rate", value: `${part.angular_spring_rate_ft_lbs_deg} ft-lbs/deg` },
               { label: "Axial Movement", value: `${part.axial_movement_in}"` },
               { label: "Lateral Movement", value: `${part.lateral_movement_in}"` },
               { label: "Angular Movement", value: `${part.angular_movement_deg}°` },
               { label: "Max Allowable Pressure", value: `${part.max_allowable_pressure_psig} psig` },
             ].map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-3.5 whitespace-nowrap font-medium text-[#414042] w-1/2">{row.label}</td>
                  <td className="px-6 py-3.5 whitespace-nowrap text-[#414042] font-semibold">{row.value}</td>
                </tr>
             ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SpecsTable;
