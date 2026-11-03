export function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number.isFinite(value) ? value : 0);
}

export function shortRupiah(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  if (Math.abs(n) >= 1_000_000_000) return `Rp${(n / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  if (Math.abs(n) >= 1_000_000) return `Rp${(n / 1_000_000).toFixed(1).replace(".", ",")} jt`;
  if (Math.abs(n) >= 1_000) return `Rp${(n / 1_000).toFixed(0)} rb`;
  return rupiah(n);
}

export function dateLabel(value: string) {
  if (!value) return "Tanggal belum ditentukan";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value + "T00:00:00"));
}
