import React from 'react';
import { PASSWORD_REQUIREMENTS } from '../Schema/register.schema'; 

interface Props {
  password: string;
}

export const PasswordStrength = ({ password = '' }: Props) => {
  // 1. Check requirements
  const checks = PASSWORD_REQUIREMENTS.map((req) => ({
    ...req,
    met: req.regex.test(password),
  }));

  // 2. Calculate Score
  const strengthScore = checks.filter((c) => c.met).length;

  // 3. Determine Bar Color & Label Text
  let barColor = 'bg-gray-200';
  let label = 'Weak';
  
  // Logic: 0-2 = Weak (Red), 3 = Medium (Yellow), 4 = Strong (Green)
  if (strengthScore <= 2) {
      barColor = 'bg-red-500';
      label = 'Weak';
  } else if (strengthScore === 3) {
      barColor = 'bg-yellow-500';
      label = 'Medium';
  } else {
      barColor = 'bg-green-500'; // Matches your bright green
      label = 'Strong';
  }

  return (
    <div className="mt-3 space-y-3">
      {/* Strength Bar */}
      <div className="flex items-center gap-3">
         <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
                className={`h-full transition-all duration-300 ${strengthScore > 0 ? barColor : 'bg-transparent'}`} 
                style={{ width: `${Math.max(5, (strengthScore / 4) * 100)}%` }}
            ></div>
         </div>
         {/* Label text is Gray, not colored, per your screenshots */}
         <span className="text-xs font-medium text-gray-500 min-w-[3rem] text-right">
             {password.length > 0 ? label : ''}
         </span>
      </div>

      {/* Rules Checklist */}
      <ul className="grid grid-cols-1 gap-1.5">
        {checks.map((req) => (
          <li 
            key={req.id} 
            className={`text-xs flex items-center gap-2 transition-colors duration-200 ${
                req.met ? 'text-green-600 font-medium' : 'text-gray-400'
            }`}
          >
            {/* ICON LOGIC:
               Met:   Green Check Circle (fa-circle-check)
               Unmet: Gray Solid Circle  (fa-circle) 
            */}
            <i className={`fa-solid ${req.met ? 'fa-circle-check text-green-500' : 'fa-circle text-gray-300'} text-[10px]`}></i>
            {req.label}
          </li>
        ))}
      </ul>
    </div>
  );
};