import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { Fragment } from "react";
import clsx from "clsx";

type Option<T extends string> = { value: T; label: string };

interface Props<T extends string> {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  className?: string;
}

const SelectField = <T extends string>({
  label,
  value,
  options,
  onChange,
  className = "",
}: Props<T>) => {
  const selected = options.find((o) => o.value === value) ?? options[0];

  return (
    <div className={clsx("space-y-1", className)}>
      <p className="muted">{label}</p>
      <Listbox value={selected} onChange={(opt) => onChange(opt.value)}>
        {({ open }) => (
          <div className="relative">
            <Listbox.Button className="relative w-full rounded-xl border border-slate-200 bg-white px-3 pr-10 py-2.5 text-left text-sm text-slate-700 shadow-sm transition hover:border-slate-300 focus:border-prBlue focus:outline-none focus:ring-2 focus:ring-prBlue/15">
              <span className="truncate">{selected?.label}</span>
              <ChevronDownIcon
                className={clsx(
                  "pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform duration-150",
                  open && "rotate-180 text-prBlue"
                )}
              />
            </Listbox.Button>
            <Transition
              as={Fragment}
              show={open}
              enter="transition ease-out duration-150"
              enterFrom="opacity-0 -translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 -translate-y-1"
            >
              <Listbox.Options className="absolute left-0 top-full z-40 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl ring-1 ring-black/5 focus:outline-none">
                {options.map((opt) => (
                  <Listbox.Option
                    key={opt.value}
                    value={opt}
                    className={({ active }) =>
                      clsx(
                        "relative cursor-pointer select-none px-3 py-2 text-sm transition",
                        active ? "bg-prBlue/10 text-prBlue" : "text-slate-700"
                      )
                    }
                  >
                    {({ selected: isSelected }) => (
                      <>
                        <span
                          className={clsx(
                            "block truncate",
                            isSelected ? "font-semibold text-ink" : "font-medium"
                          )}
                        >
                          {opt.label}
                        </span>
                        {isSelected ? (
                          <span className="absolute inset-y-0 right-3 flex items-center text-prBlue">
                            <CheckIcon className="h-4 w-4" />
                          </span>
                        ) : null}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </div>
        )}
      </Listbox>
    </div>
  );
};

export default SelectField;
