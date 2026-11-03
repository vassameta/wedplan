import type { BudgetItem, WeddingPlan } from "./types";

export const categories = [
  "Venue & Catering",
  "Dekorasi",
  "Busana & Makeup",
  "Dokumentasi",
  "Hiburan",
  "Undangan & Souvenir",
  "Akad & Administrasi",
  "Transportasi & Akomodasi",
  "Seserahan",
  "Lain-lain"
];

const sampleItems: BudgetItem[] = [
  { id: "i1", name: "Gedung / venue", category: "Venue & Catering", vendor: "Venue pilihan", planned: 25000000, actual: 0, paymentStatus: "Belum dibayar", dueDate: "", notes: "Termasuk fasilitas dasar" },
  { id: "i2", name: "Catering", category: "Venue & Catering", vendor: "", planned: 30000000, actual: 0, paymentStatus: "Belum dibayar", dueDate: "", notes: "Estimasi 500 pax" },
  { id: "i3", name: "Dekorasi pelaminan", category: "Dekorasi", vendor: "", planned: 12000000, actual: 0, paymentStatus: "Belum dibayar", dueDate: "", notes: "" },
  { id: "i4", name: "Foto & video", category: "Dokumentasi", vendor: "", planned: 8000000, actual: 0, paymentStatus: "Belum dibayar", dueDate: "", notes: "" },
  { id: "i5", name: "Makeup & busana", category: "Busana & Makeup", vendor: "", planned: 7000000, actual: 0, paymentStatus: "Belum dibayar", dueDate: "", notes: "" }
];

export const starterPlans: WeddingPlan[] = [
  {
    id: "plan-demo",
    name: "Our Wedding",
    partner: "Alya & Bima",
    date: "2027-06-12",
    location: "Jakarta",
    budget: 100000000,
    guestCount: 500,
    items: sampleItems,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];
