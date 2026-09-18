export function toLocalDatetimeInput(dateStrOrObj: string | Date | null | undefined): string {
    if (!dateStrOrObj) return "";
    const date = typeof dateStrOrObj === "string" ? new Date(dateStrOrObj) : dateStrOrObj;
    if (isNaN(date.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromLocalDatetimeInputToIso(localStr: string | null | undefined): string | null {
    if (!localStr) return null;
    const date = new Date(localStr);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
}