export function splitString(s: string) : string[] {
    return s.indexOf(" ") != -1 ? s.split(" ") : s.split(",");
}
