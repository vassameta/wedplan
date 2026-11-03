export type PaymentStatus = "Belum dibayar" | "DP" | "Lunas";

export type BudgetItem = {
  id: string;
  name: string;
  category: string;
  vendor: string;
  planned: number;
  actual: number;
  paymentStatus: PaymentStatus;
  dueDate: string;
  notes: string;
};

export type WeddingPlan = {
  id: string;
  name: string;
  partner: string;
  date: string;
  location: string;
  budget: number;
  guestCount: number;
  items: BudgetItem[];
  createdAt: string;
  updatedAt: string;
};
