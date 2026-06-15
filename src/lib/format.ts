export const fmtBRL = (n: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n ?? 0));

export const fmtNumber = (n: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR").format(Number(n ?? 0));

export const fmtDate = (d: string | null | undefined) => {
  if (!d) return "-";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
};

export const maskCpfCnpj = (v: string) => {
  const x = v.replace(/\D/g, "");
  if (x.length <= 11) {
    return x.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return x
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
};

export const maskPhone = (v: string) => {
  const x = v.replace(/\D/g, "").slice(0, 11);
  if (x.length <= 10) return x.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
  return x.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
};
