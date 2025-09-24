'use client';
import { useState } from 'react';

/**
 * Page component that renders a form for creating a new property listing.
 *
 * Renders inputs for seller type, purpose, building number, and postal code, with conditional
 * fields: a FAL License input when seller type is "broker" and an Ejar eligibility selector when
 * purpose is "rent". Clicking "Save" validates the building number (must be exactly 4 digits)
 * and postal code (must be exactly 5 digits); validation errors are displayed inline. If there
 * are no validation errors, an alert with "Saved" is shown.
 */
export default function NewPropertyPage() {
  const [sellerType, setSellerType] = useState('owner');
  const [purpose, setPurpose] = useState('sale');
  const [buildingNumber, setBuildingNumber] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [falLicenseNumber, setFalLicenseNumber] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const save = () => {
    const errs: string[] = [];
    if (!/^\d{4}$/.test(buildingNumber)) errs.push('Building number must be 4 digits');
    if (!/^\d{5}$/.test(postalCode)) errs.push('Postal code must be 5 digits');
    setErrors(errs);
    if (errs.length === 0) alert('Saved');
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold mb-4">New Property Listing</h1>

      <label className="block">Seller Type</label>
      <select name="sellerType" className="border rounded px-3 py-2" value={sellerType} onChange={(e)=>setSellerType(e.target.value)}>
        <option value="owner">Owner</option>
        <option value="broker">Broker</option>
      </select>

      {sellerType === 'broker' && (
        <div className="space-y-2">
          <label className="block">FAL License</label>
          <input name="falLicenseNumber" className="border rounded px-3 py-2" value={falLicenseNumber} onChange={(e)=>setFalLicenseNumber(e.target.value)} placeholder="FAL-1234567890" />
          <div className="text-xs text-gray-500">FAL-1234567890</div>
        </div>
      )}

      <label className="block">Purpose</label>
      <select name="purpose" className="border rounded px-3 py-2" value={purpose} onChange={(e)=>setPurpose(e.target.value)}>
        <option value="sale">Sale</option>
        <option value="rent">Rent</option>
      </select>

      {purpose === 'rent' && (
        <div className="space-y-2">
          <label className="block">Ejar Eligible</label>
          <select name="ejarEligible" className="border rounded px-3 py-2">
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
          <div className="text-xs text-gray-500">Ejar program eligibility</div>
        </div>
      )}

      <div className="space-y-2">
        <label className="block">Building Number</label>
        <input name="buildingNumber" className="border rounded px-3 py-2" value={buildingNumber} onChange={(e)=>setBuildingNumber(e.target.value)} />
      </div>
      <div className="space-y-2">
        <label className="block">Postal Code</label>
        <input name="postalCode" className="border rounded px-3 py-2" value={postalCode} onChange={(e)=>setPostalCode(e.target.value)} />
      </div>

      {errors.map((e)=> (
        <div key={e} className="text-red-600">{e}</div>
      ))}

      <button className="mt-4 px-4 py-2 bg-[#0061A8] text-white rounded" onClick={save}>Save</button>
    </div>
  );
}


