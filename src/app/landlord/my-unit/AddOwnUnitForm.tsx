"use client";

import { useActionState } from "react";
import { addOwnUnitAction, type AddOwnUnitState } from "./actions";

const initialState: AddOwnUnitState = { error: null };

export function AddOwnUnitForm({
  houses,
  spaceTypes,
}: {
  houses: { id: string; houseNumber: string }[];
  spaceTypes: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(addOwnUnitAction, initialState);
  const disabled = houses.length === 0 || spaceTypes.length === 0;

  return (
    <div>
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="houseId" className="block text-sm font-medium text-slate-700">
            House
          </label>
          <select
            id="houseId"
            name="houseId"
            required
            defaultValue={houses.length === 1 ? houses[0].id : ""}
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="" disabled>
              Select a house
            </option>
            {houses.map((house) => (
              <option key={house.id} value={house.id}>
                {house.houseNumber}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="livingSpaceTypeId" className="block text-sm font-medium text-slate-700">
            Living space
          </label>
          <select
            id="livingSpaceTypeId"
            name="livingSpaceTypeId"
            required
            defaultValue=""
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="" disabled>
              Select a type
            </option>
            {spaceTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="moveInDate" className="block text-sm font-medium text-slate-700">
            Move-in date
          </label>
          <input
            id="moveInDate"
            name="moveInDate"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
        <button
          type="submit"
          disabled={pending || disabled}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add my unit"}
        </button>
      </form>

      {disabled && (
        <p className="mt-2 text-sm text-slate-500">
          You need at least one house before adding your own unit. Living space types are set up
          by Admin.
        </p>
      )}
      {state.error && <p className="mt-2 text-sm text-red-700">{state.error}</p>}
    </div>
  );
}
