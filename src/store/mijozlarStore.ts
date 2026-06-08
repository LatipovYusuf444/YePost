import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CustomerKind = "mijoz" | "kompaniya" | "yetkazib";

export type Customer = {
  id: number;
  kind: CustomerKind;
  kontakt: string;
  telefon: string;
  dela: string;
  masul: string;
  yaratilganSana: string;
  avatar?: string;
  status?: string;
  manba?: string;
  tolovTuri?: string;
  manzil?: string;
  izoh?: string;
  summa?: number;
  savdolarSoni?: number;
};

type MijozlarState = {
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, "id">) => Customer;
  updateCustomer: (customerId: number, customer: Omit<Customer, "id">) => void;
  removeCustomers: (customerIds: number[]) => void;
};

export const useMijozlarStore = create<MijozlarState>()(
  persist(
    (set) => ({
      customers: [],
      addCustomer: (customer) => {
        const nextCustomer = { ...customer, id: Date.now() };

        set((state) => ({
          customers: [nextCustomer, ...state.customers],
        }));

        return nextCustomer;
      },
      updateCustomer: (customerId, customer) => {
        set((state) => ({
          customers: state.customers.map((item) =>
            item.id === customerId ? { ...customer, id: customerId } : item
          ),
        }));
      },
      removeCustomers: (customerIds) => {
        set((state) => ({
          customers: state.customers.filter((customer) => !customerIds.includes(customer.id)),
        }));
      },
    }),
    {
      name: "yepost-mijozlar-demo",
    }
  )
);
