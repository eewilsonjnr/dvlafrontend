// Inline mock of the DVLA Central Database.
// Real integration will call the endpoint stored in config key `dvla_db_api_endpoint`.
// Each record represents a payment receipt + the applicant data that comes back from DVLA.

export interface DvlaRecord {
  invoiceNumber: string;
  paymentDate: string;
  amount: string;       // GHS
  receiptStatus: "verified" | "used" | "expired";
  permitType: "IDP" | "ICMV";
  // Applicant fields pre-populated from DVLA central DB
  surname: string;
  otherNames: string;
  dateOfBirth: string;
  placeOfBirth: string;
  homeAddress: string;
  nationalId: string;
  licenceNumber: string;
  licenceClass: string;
  licenceExpiry: string;
  nationality: string;
  gender: "M" | "F";
}

export const DVLA_STUB: DvlaRecord[] = [
  {
    invoiceNumber: "DVLA-2026-001234",
    paymentDate: "2026-05-15",
    amount: "200.00",
    receiptStatus: "verified",
    permitType: "IDP",
    surname: "MENSAH",
    otherNames: "Kwame Asante",
    dateOfBirth: "1985-03-22",
    placeOfBirth: "Accra",
    homeAddress: "Plot 14, Osu RE, Accra, Greater Accra Region",
    nationalId: "GHA-198503221",
    licenceNumber: "GR-2024-045671",
    licenceClass: "B",
    licenceExpiry: "2027-03-22",
    nationality: "GHANAIAN",
    gender: "M",
  },
  {
    invoiceNumber: "DVLA-2026-001235",
    paymentDate: "2026-05-16",
    amount: "200.00",
    receiptStatus: "verified",
    permitType: "ICMV",
    surname: "ASANTE",
    otherNames: "Abena Yaa",
    dateOfBirth: "1990-07-08",
    placeOfBirth: "Kumasi",
    homeAddress: "House 23, Adum, Kumasi, Ashanti Region",
    nationalId: "GHA-199007082",
    licenceNumber: "AS-2023-012390",
    licenceClass: "B, C",
    licenceExpiry: "2026-07-08",
    nationality: "GHANAIAN",
    gender: "F",
  },
  {
    invoiceNumber: "DVLA-2026-001236",
    paymentDate: "2026-05-17",
    amount: "200.00",
    receiptStatus: "verified",
    permitType: "IDP",
    surname: "OWUSU",
    otherNames: "Kofi Nkrumah",
    dateOfBirth: "1978-11-14",
    placeOfBirth: "Takoradi",
    homeAddress: "15 Beach Road, Takoradi, Western Region",
    nationalId: "GHA-197811143",
    licenceNumber: "WR-2022-089421",
    licenceClass: "A, B",
    licenceExpiry: "2028-11-14",
    nationality: "GHANAIAN",
    gender: "M",
  },
  {
    invoiceNumber: "DVLA-2026-001237",
    paymentDate: "2026-05-18",
    amount: "200.00",
    receiptStatus: "used",
    permitType: "IDP",
    surname: "ADJEI",
    otherNames: "Ama Serwaa",
    dateOfBirth: "1995-02-28",
    placeOfBirth: "Cape Coast",
    homeAddress: "Victoria Park Estate, Cape Coast, Central Region",
    nationalId: "GHA-199502284",
    licenceNumber: "CR-2025-003210",
    licenceClass: "B",
    licenceExpiry: "2030-02-28",
    nationality: "GHANAIAN",
    gender: "F",
  },
  {
    invoiceNumber: "DVLA-2026-001238",
    paymentDate: "2026-04-01",
    amount: "200.00",
    receiptStatus: "expired",
    permitType: "ICMV",
    surname: "BOATENG",
    otherNames: "Yaw Emmanuel",
    dateOfBirth: "1982-06-03",
    placeOfBirth: "Sunyani",
    homeAddress: "New Town, Sunyani, Bono Region",
    nationalId: "GHA-198206035",
    licenceNumber: "BR-2021-067812",
    licenceClass: "C",
    licenceExpiry: "2025-06-03",
    nationality: "GHANAIAN",
    gender: "M",
  },
  {
    invoiceNumber: "DVLA-2026-001239",
    paymentDate: "2026-05-20",
    amount: "200.00",
    receiptStatus: "verified",
    permitType: "IDP",
    surname: "ACHEAMPONG",
    otherNames: "Efua Josephine",
    dateOfBirth: "1993-09-19",
    placeOfBirth: "Tamale",
    homeAddress: "Lamashegu, Tamale, Northern Region",
    nationalId: "GHA-199309196",
    licenceNumber: "NR-2024-021543",
    licenceClass: "B",
    licenceExpiry: "2029-09-19",
    nationality: "GHANAIAN",
    gender: "F",
  },
  {
    invoiceNumber: "DVLA-2026-001240",
    paymentDate: "2026-05-21",
    amount: "200.00",
    receiptStatus: "verified",
    permitType: "ICMV",
    surname: "DARKO",
    otherNames: "Benjamin Kweku",
    dateOfBirth: "1987-12-01",
    placeOfBirth: "Ho",
    homeAddress: "Bankoe, Ho, Volta Region",
    nationalId: "GHA-198712017",
    licenceNumber: "VR-2023-044892",
    licenceClass: "B, D",
    licenceExpiry: "2027-12-01",
    nationality: "GHANAIAN",
    gender: "M",
  },
  {
    invoiceNumber: "DVLA-2026-001241",
    paymentDate: "2026-06-01",
    amount: "200.00",
    receiptStatus: "verified",
    permitType: "IDP",
    surname: "ANTWI",
    otherNames: "Priscilla Sefakor",
    dateOfBirth: "1998-04-11",
    placeOfBirth: "Koforidua",
    homeAddress: "Oyoko, Koforidua, Eastern Region",
    nationalId: "GHA-199804118",
    licenceNumber: "ER-2025-098123",
    licenceClass: "B",
    licenceExpiry: "2030-04-11",
    nationality: "GHANAIAN",
    gender: "F",
  },
];

export function lookupInvoice(invoiceNumber: string): DvlaRecord | null {
  const q = invoiceNumber.trim().toUpperCase();
  return DVLA_STUB.find(r => r.invoiceNumber.toUpperCase() === q) ?? null;
}

// Search stub by national ID, licence number, or name (surname / other names).
// Returns all matching records so the operator can pick the right one.
export function lookupByQuery(query: string): DvlaRecord[] {
  const q = query.trim().toUpperCase();
  if (!q) return [];
  return DVLA_STUB.filter(r =>
    r.nationalId.toUpperCase().includes(q) ||
    r.licenceNumber.toUpperCase().includes(q) ||
    r.surname.toUpperCase().includes(q) ||
    r.otherNames.toUpperCase().includes(q)
  );
}
